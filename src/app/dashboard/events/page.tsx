import { CalendarDays } from "lucide-react";
import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
export default function Page() { return <DashboardPlaceholder eyebrow="Events" title="Events" description="Events hosted by the GenZnect network will appear here." emptyTitle="No events yet" emptyDescription="Event publishing and registration are planned for a later release." icon={CalendarDays} action="View communities" href="/dashboard/communities" />; }
