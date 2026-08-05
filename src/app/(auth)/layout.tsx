import { AuthLayout } from "@/components/auth/AuthLayout";

export default function AuthenticationLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
