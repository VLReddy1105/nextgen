import { MarketingSubpage } from "@/components/marketing/MarketingSubpage";

export default function CommunitiesPage() {
  return <MarketingSubpage eyebrow="Communities" title="Focused rooms for people who want to do the work." description="Communities give discussions, events, shared resources, and collaborations a clear home." items={[
    { title: "Topic communities", description: "Connect around AI, product design, research, technology, and more." },
    { title: "Local networks", description: "Meet people through universities, cities, and regional communities." },
    { title: "Working groups", description: "Create a smaller place to organize a project, initiative, or event." },
  ]} />;
}
