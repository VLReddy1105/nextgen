import { UsersRound } from "lucide-react";
import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
export default function Page() { return <DashboardPlaceholder eyebrow="Communities" title="Your focused professional spaces." description="Follow conversations, events, resources, and collaboration requests from the communities you join." emptyTitle="Choose your first community" emptyDescription="The public community preview is ready while membership data remains mocked." icon={UsersRound} action="Browse communities" href="/communities" />; }
