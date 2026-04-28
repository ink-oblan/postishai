"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession } from "./dal";
import {
  ApprovalDetailsSchema,
  type AuthFormState,
  LoginSchema,
  SignupSchema,
} from "./definitions";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import { notifyApprovalDetails, notifySignupForApproval } from "./telegram-approval";

function createApprovalToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function register(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const validated = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    useCaseDetails: formData.get("useCaseDetails") || undefined,
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password, useCaseDetails } = validated.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { message: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      approvalToken: createApprovalToken(),
      approvalDetails: useCaseDetails || null,
      accounts: {
        create: {
          provider: "credentials",
          providerAccountId: email,
        },
      },
    },
  });

  await notifySignupForApproval(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { approvalNotifiedAt: new Date() },
  });
  await createSession(user.id);
  redirect("/pending-approval");
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { message: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id);
  if (!user.approvedAt) {
    redirect("/pending-approval");
  }
  redirect("/dashboard");
}

export async function submitApprovalDetails(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const validated = ApprovalDetailsSchema.safeParse({
    useCaseDetails: formData.get("useCaseDetails"),
  });

  if (!validated.success) {
    redirect("/pending-approval?details=invalid");
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { approvalDetails: validated.data.useCaseDetails },
  });

  await notifyApprovalDetails(user);
  redirect("/pending-approval?details=sent");
}
