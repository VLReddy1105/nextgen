import { Bell } from "lucide-react";
import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
export default function Page() { return <DashboardPlaceholder eyebrow="Notifications" title="Updates worth your attention." description="Application changes, messages, invitations, and event reminders will be grouped by importance." emptyTitle="You are caught up" emptyDescription="Real-time notifications will become available when authenticated activity is connected." icon={Bell} action="Return to overview" href="/dashboard/overview" />; }
