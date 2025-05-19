import { NextRequest, NextResponse } from "next/server";
import { updateUser } from "@db/database";
import { getUserIdFromSession } from "@lib/session";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("avatar") as File;

  if (!file) {
    return NextResponse.json(
      { success: false, message: "No file uploaded" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const filename = `avatar-${uuidv4()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");

  // Ensure the directory exists
  await import("fs").then((fs) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  });

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  const userId = await getUserIdFromSession();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "User not authenticated" },
      { status: 401 }
    );
  }
  
  const user = await updateUser(userId, {avatar: filename})

  if (!user.success) {
    console.log(`Failed to update user: ${user.error || user.message}`);
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, filename });
}
