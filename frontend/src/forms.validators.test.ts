import { describe, expect, it } from "vitest";
import { Gender } from "@/api/model";
import {
  chatMessageSchema,
  forgotPasswordSchema,
  geocodeQuerySchema,
  identitySchema,
  passwordSchema,
  signUpSchema,
} from "@/forms.validators";

const validSignup = {
  first_name: "John",
  last_name: "Doe",
  username: "johndoe",
  email: "john@example.com",
  password: "Xk9@mQz2",
  confirmPassword: "Xk9@mQz2",
  gender: Gender.Male,
  birthdate: new Date("2000-06-15"),
};

describe("signUpSchema", () => {
  it("accepts valid signup payload", () => {
    const result = signUpSchema.safeParse(validSignup);
    expect(result.success).toBe(true);
  });

  it.each(["first_name", "last_name", "username", "email", "password"] as const)(
    "rejects signup when %s is missing",
    (field) => {
      const payload = { ...validSignup };
      delete payload[field];

      const result = signUpSchema.safeParse(payload);
      expect(result.success).toBe(false);
    }
  );
});

describe("passwordSchema", () => {
  it("rejects passwords containing dictionary words", () => {
    const result = passwordSchema.safeParse("Password1!");
    expect(result.success).toBe(false);
  });

  it("accepts strong non-dictionary passwords", () => {
    const result = passwordSchema.safeParse("Xk9@mQz2");
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@example.com" }).success).toBe(
      true,
    );
  });

  it("rejects invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });
});

describe("chatMessageSchema", () => {
  it("rejects empty messages", () => {
    expect(chatMessageSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects messages over 2000 characters", () => {
    expect(chatMessageSchema.safeParse("a".repeat(2001)).success).toBe(false);
  });
});

describe("geocodeQuerySchema", () => {
  it("rejects queries over 128 characters", () => {
    expect(geocodeQuerySchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("identitySchema", () => {
  it("rejects names longer than 16 characters", () => {
    expect(
      identitySchema.safeParse({
        first_name: "a".repeat(17),
        last_name: "Doe",
        email: "user@example.com",
      }).success,
    ).toBe(false);
  });
});
