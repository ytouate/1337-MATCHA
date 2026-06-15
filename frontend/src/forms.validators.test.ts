import { describe, expect, it } from "vitest";
import { Gender } from "@/api/model";
import { passwordSchema, signUpSchema } from "@/forms.validators";

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
