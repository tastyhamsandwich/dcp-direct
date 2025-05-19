import * as z from "zod"

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(32, { message: "Password cannot exceed 32 characters" })
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[0-9]/.test(password), { message: "Password must contain at least one number" })
  .refine((password) => /[!@#$%^&*]/.test(password), {
    message: "Password must contain at least one special character",
  });

export const loginSchema = z
.object({
  email: z.string({ required_error: "Email is required" })
    .min(1, "Email is required"),
  password: z.string({ required_error: "Password is required" })
    .min(1, "Password is required")
		.trim()
})

export const registerSchema = z
  .object({
    email: z.string({ required_error: "Email address is required" })
      .min(1, "Email address is required")
      .email("Invalid email address"),
    username: z.string({ required_error: "Username is required" })
      .min(1, "Username is required")
      .min(3, "Username must be more than 3 characters")
      .max(16, "Username cannot exceed 16 characters"),
    password: passwordSchema,
    confirmPassword: passwordSchema,
    // dob: z.string({ required_error: "Date of birth is required" }) // TEMPORARILY DISABLED
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  })

export const userSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
    balance: z.number(),
    avatar: z.string(),
    level: z.number(),
    exp: z.number(),
    role: z.enum(["USER", "ADMIN"]),
  });

export const sessionSchema = z.
  object({
    userId: z.string(),
    role: z.enum(["USER", "ADMIN"]),
    expiresAt: z.string(),
  });

export type FormState =
	| {
			errors?: {
				name?: string[];
				email?: string[];
				password?: string[];
			};
			message?: string;
		}
	| undefined;