import { MarketingSubpage } from "@/components/marketing/MarketingSubpage";

export default function OpportunitiesPage() {
  return <MarketingSubpage eyebrow="Opportunities" title="Open roles and collaborations with useful context." description="The opportunity directory is prepared for internships, HiWi positions, working-student roles, research, projects, startup roles, mentorship, and events." items={[
    { title: "Work and research", description: "Find internships, jobs, research calls, and university roles." },
    { title: "Projects and startups", description: "Join early teams, focused projects, and founder-led opportunities." },
    { title: "Mentorship and events", description: "Build experience through conversations, workshops, and live sessions." },
  ]} />;
}
