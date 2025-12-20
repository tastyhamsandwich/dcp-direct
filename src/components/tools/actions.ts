"use server";

import { promises as fs } from "fs";
import path from "path";

async function saveFile(formData) {
	const file = formData.get("file");

	if (!file) {
		return { success: false, message: "No file provided." };
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const filename = `${Date.now()}-${file.name}`;
	const filepath = path.join(process.cwd(), "public", "upload/avatars", filename);

	try {
		await fs.writeFile(filepath, buffer);
		return {
			success: true,
			message: "File uploaded successfully.",
			filename: `/upload/avatars/${filename}`,
		};
	} catch (error) {
		console.error("Error saving file:", error);
		return { success: false, message: "Error saving file." };
	}
}

export { saveFile };
