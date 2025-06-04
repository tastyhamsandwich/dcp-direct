import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import type { User } from "@db/database";

export type SessionPayload = {
  /** The user's _id (ObjectId by default, cast to string) from their database entry */
  userId: string;
  /** The user's authorization level, typically "USER", but could be higher for adminstrators, moderators, or otherwise */
  role: string;
  /** The timestamp of when their token will expire. */
  expiresAt: Date;
};

export interface Session {
  /**
   * The oauth provider token. If present, this can be used to make external API requests to the oauth provider used.
   */
  providerToken?: string | null;
  /**
   * The oauth provider refresh token. If present, this can be used to refresh the provider_token via the oauth provider's API.
   * Not all oauth providers return a provider refresh token. If the provider_refresh_token is missing, please refer to the oauth provider's documentation for information on how to obtain the provider refresh token.
   */
  providerRefreshToken?: string | null;
  /**
   * The access token jwt. It is recommended to set the JWT_EXPIRY to a shorter expiry value.
   */
  accessToken: string;
  /**
   * A one-time used refresh token that never expires.
   */
  refreshToken: string;
  /**
   * The number of seconds until the token expires (since it was issued). Returned when a login is confirmed.
   */
  expiresIn: number;
  /**
   * A timestamp of when the token will expire. Returned when a login is confirmed.
   */
  expiresAt?: number;
  tokenType: string;
  user: User;
}

const encodedKey = new TextEncoder().encode(process.env.JWT_SECRET);

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  path: string;
}

const cookie = {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as "lax",
    path: "/",
}

const duration = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    console.log("Failed to verify session");
    return null;
  }
}

export async function createSession(userId: string, role: string) {
  const expires = new Date(Date.now() + duration  );
  const session = await encrypt({ userId, role, expiresAt: expires });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {...cookie, expires});

  return { userId, role, expiresAt: expires }
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) {
    redirect("/login");
  }

  return { userId: session.userId as string, role: session.role as string, expiresAt: session.expiresAt as Date };
}

export async function getUserIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) return null;
  return session.userId as string;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
