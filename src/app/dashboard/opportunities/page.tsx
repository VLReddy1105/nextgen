import { DashboardPlaceholder } from "@/components/dashboard/DashboardPlaceholder";
import { Search } from "lucide-react";
export default function Page() { return <DashboardPlaceholder eyebrow="Opportunities" title="Opportunities" description="Jobs, internships and programs will appear here when publishing is available." emptyTitle="No published opportunities yet" emptyDescription="Explore projects and communities while the opportunity module is being built." icon={Search} action="Explore projects" href="/dashboard/projects" />; }
