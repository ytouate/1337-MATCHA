import { z } from "zod";
import { Gender } from "./models";

export const signUpSchema = z
  .object({
    first_name: z
      .string()
      .min(3, "First name must be at least 3 characters")
      .max(16, "First name must not exceed 16 characters"),
    last_name: z
      .string()
      .min(3, "Last name must be at least 3 characters")
      .max(16, "Last name must not exceed 16 characters"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(16, "Username must not exceed 16 characters")
      .regex(/^[a-z0-9._]+$/, "Please enter a valid username"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(32, "Password must not exceed 32 characters")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter")
      .regex(/[a-z]/, "Password must include at least one lowercase letter")
      .regex(/\d/, "Password must include at least one number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Password must include at least one special character"
      ),
    confirmPassword: z.string(),
    gender: z.nativeEnum(Gender),
    birthdate: z.date().refine(
      (date) => {
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        const isBirthdayPassedThisYear =
          today.getMonth() > date.getMonth() ||
          (today.getMonth() === date.getMonth() &&
            today.getDate() >= date.getDate());

        const adjustedAge = isBirthdayPassedThisYear ? age : age - 1;
        return adjustedAge >= 16 && date <= today;
      },
      {
        message:
          "You must be at least 16 years old and provide a valid date of birth",
      }
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export const signinSchema = z.object({
  login: z.union([z.string().email(), z.string()]),
  password: z.string().min(8),
});
