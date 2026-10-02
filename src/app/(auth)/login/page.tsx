import type { Metadata } from "next";
import { authErrorMessage } from "@/lib/auth/errors";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm notice={error ? authErrorMessage(error) : undefined} />;
}
