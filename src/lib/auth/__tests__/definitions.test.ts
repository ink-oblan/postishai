import { describe, expect, it } from "vitest";
import { LoginSchema, SignupSchema } from "../definitions";

describe("SignupSchema", () => {
  it("accepts valid input", () => {
    const result = SignupSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "secure1pass",
    });
    expect(result.success).toBe(true);
  });

  it("lowercases email", () => {
    const result = SignupSchema.safeParse({
      name: "John",
      email: "John@Example.COM",
      password: "secure1pass",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("trims name", () => {
    const result = SignupSchema.safeParse({
      name: "  John  ",
      email: "john@example.com",
      password: "secure1pass",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
    }
  });

  it("rejects name shorter than 2 characters", () => {
    const result = SignupSchema.safeParse({
      name: "J",
      email: "john@example.com",
      password: "secure1pass",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameErrors = result.error.flatten().fieldErrors.name;
      expect(nameErrors).toBeDefined();
      expect(nameErrors?.[0]).toContain("at least 2 characters");
    }
  });

  it("rejects invalid email", () => {
    const result = SignupSchema.safeParse({
      name: "John",
      email: "not-an-email",
      password: "secure1pass",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("rejects password shorter than 8 characters", () => {
    const result = SignupSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "abc1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwErrors = result.error.flatten().fieldErrors.password;
      expect(pwErrors).toBeDefined();
      expect(pwErrors?.some((e) => e.includes("at least 8 characters"))).toBe(true);
    }
  });

  it("rejects password without a letter", () => {
    const result = SignupSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwErrors = result.error.flatten().fieldErrors.password;
      expect(pwErrors).toBeDefined();
      expect(pwErrors?.some((e) => e.includes("at least one letter"))).toBe(true);
    }
  });

  it("rejects password without a number", () => {
    const result = SignupSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "abcdefgh",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwErrors = result.error.flatten().fieldErrors.password;
      expect(pwErrors).toBeDefined();
      expect(pwErrors?.some((e) => e.includes("at least one number"))).toBe(true);
    }
  });

  it("rejects empty fields", () => {
    const result = SignupSchema.safeParse({
      name: "",
      email: "",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid input", () => {
    const result = LoginSchema.safeParse({
      email: "john@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("lowercases email", () => {
    const result = LoginSchema.safeParse({
      email: "John@Example.COM",
      password: "anything",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("rejects invalid email", () => {
    const result = LoginSchema.safeParse({
      email: "bad",
      password: "anything",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({
      email: "john@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwErrors = result.error.flatten().fieldErrors.password;
      expect(pwErrors).toBeDefined();
      expect(pwErrors?.[0]).toContain("Password is required");
    }
  });
});
