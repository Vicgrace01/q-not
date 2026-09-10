"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";

export type AuthFormState = {
  error?: {
    name?: string[];
    email?: string[];
    phone?: string[];
    password?: string[];
    _form?: string[];
  };
};

const SignupSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .min(7, "Phone too short")
    .max(20, "Phone too long")
    .regex(/^\+?[0-9\s-]+$/, "Invalid phone format"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function signupAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, phone, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.operator.findUnique({ where: { email } });
  if (existing) {
    return { error: { email: ["This email is already registered"] } };
  }

  const passwordHash = await hashPassword(password);
  const operator = await prisma.operator.create({
    data: { name, email, phone, passwordHash },
  });

  await setSessionCookie(operator.id);
  redirect("/dashboard");
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: { _form: ["Invalid email or password"] } };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const operator = await prisma.operator.findUnique({ where: { email } });

  // Same error for "user not found" and "wrong password".
  // This prevents an attacker from discovering which emails are registered.
  if (!operator) {
    return { error: { _form: ["Invalid email or password"] } };
  }

  const valid = await verifyPassword(parsed.data.password, operator.passwordHash);
  if (!valid) {
    return { error: { _form: ["Invalid email or password"] } };
  }

  await setSessionCookie(operator.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
