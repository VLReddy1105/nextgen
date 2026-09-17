import { FileCheck2 } from "lucide-react";
import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
export default function Page() { return <DashboardPlaceholder eyebrow="Applications" title="Applications" description="Track opportunities you apply to through GenZnect." emptyTitle="No applications yet" emptyDescription="Application tracking will be available when opportunity publishing opens." icon={FileCheck2} action="View projects" href="/dashboard/projects" />; }
