import { MarketingSubpage } from "@/components/marketing/MarketingSubpage";

export default function AboutPage() {
  return <MarketingSubpage eyebrow="About NextGen" title="Professional connection should lead somewhere useful." description="NextGen Community is being built as a shared professional space for people, institutions, and organizations with something meaningful to learn, offer, or build." items={[
    { title: "Clear purpose", description: "Every surface is shaped around opportunities, communities, events, and useful action." },
    { title: "Inclusive by design", description: "Students, founders, mentors, professionals, and institutions can each participate with context." },
    { title: "Responsible foundation", description: "Access, visibility, moderation, and status clarity are part of the product structure." },
  ]} />;
}
