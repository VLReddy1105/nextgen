import { MarketingSubpage } from "@/components/marketing/MarketingSubpage";

export default function EventsPage() {
  return <MarketingSubpage eyebrow="Events" title="Meet, learn, and build beyond the feed." description="Discover practical workshops, focused roundtables, community meetups, and sessions organized by credible people and organizations." items={[
    { title: "Practical sessions", description: "Join workshops with a clear topic and something useful to take away." },
    { title: "Peer meetups", description: "Meet students, founders, mentors, and professionals in a useful setting." },
    { title: "Organization events", description: "Follow university, company, and community sessions in one place." },
  ]} />;
}
