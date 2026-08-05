import type { Metadata } from "next";
import { RecoveryForm } from "@/components/auth/RecoveryForm";

export const metadata: Metadata = { title: "Reset Password" };
export default function ResetPasswordPage() { return <RecoveryForm mode="reset" />; }
