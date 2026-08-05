import { Compass } from "lucide-react";
import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
export default function Page() { return <DashboardPlaceholder eyebrow="Discover" title="Find useful people and spaces." description="Discovery will bring role-aware recommendations into one calm, searchable view." emptyTitle="Your discovery feed is being prepared" emptyDescription="Connect Supabase and recommendation data to populate personalized people, organizations, and communities." icon={Compass} action="Browse public discovery" href="/discover" />; }
