import type { Metadata } from "next";
import { DashboardChrome } from "@/components/layout/DashboardChrome";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <DashboardChrome>{children}</DashboardChrome>; }
