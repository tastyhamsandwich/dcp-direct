import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@lib/session";
import { getUserById, createUser } from "@db/database";
import { MongoClient } from "mongodb";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect("/login?error=missing_code");
  }

  // Exchange code for access token
  const params = new URLSearchParams();
  params.append("client_id", process.env.DISCORD_CLIENT_ID!);
  params.append("client_secret", process.env.DISCORD_CLIENT_SECRET!);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/oauth/discord/callback`
  );
  params.append("scope", "identify email");

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect("/login?error=token_exchange_failed");
  }

  const tokenData = await tokenRes.json() as any;
  const accessToken = tokenData.access_token;

  // Fetch user info from Discord
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect("/login?error=discord_user_fetch_failed");
  }

  const discordUser = await userRes.json() as any;

  // Find or create user in your DB
  const email = discordUser.email;
  const username = discordUser.username;
  const discordId = discordUser.id;

  // Try to find user by Discord ID or email
  let user;
  try {
    // You may want to implement getUserByDiscordId in your DB layer
    const client = new MongoClient(process.env.MONGODB_URI!);
    const db = client.db("users");
    const users = db.collection("users");
    user = await users.findOne({ $or: [{ discordId }, { email }] });

    if (!user) {
      // Create new user
      const newUser = {
        username,
        email,
        discordId,
        role: "USER",
        avatar: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
          : null,
        created: new Date(),
        lastUpdated: new Date(),
      };
      const result = await users.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }
    await client.close();
  } catch (err) {
    return NextResponse.redirect("/login?error=db_error");
  }

  // Create session
  await createSession(user._id.toString(), user.role);

  // Redirect to dashboard
  return NextResponse.redirect("/dashboard");
}
