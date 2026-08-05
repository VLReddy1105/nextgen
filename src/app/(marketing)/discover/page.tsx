import { MarketingSubpage } from "@/components/marketing/MarketingSubpage";

export default function DiscoverPage() {
  return <MarketingSubpage eyebrow="Discover" title="Find the parts of NextGen that fit your direction." description="Explore people, organizations, communities, events, and open opportunities through one clear discovery layer." items={[
    { title: "Relevant people", description: "Discover peers, mentors, founders, and professionals by shared interests and useful context." },
    { title: "Focused communities", description: "Join spaces built around a topic, place, discipline, or practical goal." },
    { title: "Timely activity", description: "See the conversations, events, and open calls that are useful to you now." },
  ]} />;
}
