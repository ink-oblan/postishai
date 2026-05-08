import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Please enter a valid email").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  useCaseDetails: z
    .string()
    .trim()
    .max(2000, "Please keep details under 2000 characters")
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const ApprovalDetailsSchema = z.object({
  useCaseDetails: z
    .string()
    .trim()
    .min(10, "Please add at least a short note")
    .max(2000, "Please keep details under 2000 characters"),
});

export type AuthFormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        useCaseDetails?: string[];
      };
      message?: string;
      submittedEmail?: string;
    }
  | undefined;
