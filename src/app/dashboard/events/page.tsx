import { CalendarDays } from "lucide-react";
import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
export default function Page() { return <DashboardPlaceholder eyebrow="Events" title="Plan the sessions that matter." description="Registration, reminders, organizer updates, and attendance will live together here." emptyTitle="Your event calendar is clear" emptyDescription="Browse the public event preview and save relevant sessions after authentication is connected." icon={CalendarDays} action="Explore events" href="/events" />; }
