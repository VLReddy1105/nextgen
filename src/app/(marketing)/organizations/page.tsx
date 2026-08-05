import { MarketingSubpage } from "@/components/marketing/MarketingSubpage";

export default function OrganizationsPage() {
  return <MarketingSubpage eyebrow="For organizations" title="A structured way to show up for the next generation." description="Companies, universities, startups, student groups, and community partners can prepare role-aware spaces and clear opportunities." items={[
    { title: "Publish opportunities", description: "Share roles, research calls, programs, projects, and events with the right context." },
    { title: "Coordinate a workspace", description: "Bring team activity, applicants, members, and updates into one organized view." },
    { title: "Build trusted presence", description: "The foundation is designed to support verified organization workflows." },
  ]} />;
}
