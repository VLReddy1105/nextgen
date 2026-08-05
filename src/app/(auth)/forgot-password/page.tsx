import type { Metadata } from "next";
import { RecoveryForm } from "@/components/auth/RecoveryForm";

export const metadata: Metadata = { title: "Forgot Password" };
export default function ForgotPasswordPage() { return <RecoveryForm mode="forgot" />; }
