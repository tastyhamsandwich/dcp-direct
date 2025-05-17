"use server";

import { createUser } from "@db/database";
import { registerSchema, FormState } from "@lib/zod";
import signUp from "@contexts/authContext";
import { redirect } from "next/navigation";
import { createSession } from "@lib/session";

export async function registerAction(state: FormState, formData: FormData) {
  const validatedFields = registerSchema.safeParse({
    email: formData.get("email") as string,
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    dob: formData.get("dob") as string,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { username, email, password } = validatedFields.data;

  const result = await createUser({ username, email, password });

  if (result.success) {
    if (result.user.id && result.user.role)
      await createSession(result.user.id, result.user.role);
    else throw new Error("User ID or role is undefined");

    redirect("/dashboard");
  }
}
  