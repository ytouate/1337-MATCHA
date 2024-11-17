import { z } from "zod";

export const signUpSchema = z
  .object({
    first_name: z.string().min(3, "First name must be at least 3 characters").max(16, "First name must not exceed 16 characters"),
    last_name: z.string().min(3, "Last name must be at least 3 characters").max(16, "Last name must not exceed 16 characters"),
    username: z.string().min(3, "Username must be at least 3 characters").max(16, "Username must not exceed 16 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(32, "Password must not exceed 32 characters")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter")
      .regex(/[a-z]/, "Password must include at least one lowercase letter")
      .regex(/\d/, "Password must include at least one number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must include at least one special character"),
    confirmPassword: z.string(),
    gender: z.string(),
    birthdate: z.date(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export const signinSchema = z.object({
  login: z.union([z.string().email(), z.string()]),
  password: z.string().min(8),
});
