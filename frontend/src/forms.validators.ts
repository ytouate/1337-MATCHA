import { z } from "zod";

export const signUpSchema = z.object({
  first_name: z.string().min(3).max(16),
  last_name: z.string().min(3).max(16),
  username: z.string().min(3).max(16),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  gender: z.string(),
  birthdate: z.date(),
});

export const signinSchema = z.object({
  login: z.union([z.string().email(), z.string()]),
  password: z.string().min(8),
});
