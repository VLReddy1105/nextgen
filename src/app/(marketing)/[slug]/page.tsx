import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingSubpage } from "@/components/marketing/MarketingSubpage";

const pages = {
  students: { title: "A clearer way to find your next step.", description: "GenZnect helps students bring opportunities, communities, events, mentors, and useful professional context into one place." },
  founders: { title: "Meet the people who can help the work move.", description: "Create a credible founder presence, share focused roles, and find collaborators with relevant interests." },
  mentors: { title: "Share experience where it can be useful.", description: "Mentors can join focused communities, support practical conversations, and respond to structured mentorship opportunities." },
  professionals: { title: "Stay connected to useful work and people.", description: "Professionals can contribute experience, join collaborations, and discover communities beyond their immediate network." },
  companies: { title: "Connect opportunity with emerging talent.", description: "Company workspaces are prepared for role publishing, applicant pipelines, events, and responsible organization access." },
  universities: { title: "Bring campus opportunities into one connected space.", description: "University workspaces can coordinate research calls, HiWi roles, student groups, events, and announcements." },
  "student-organizations": { title: "Give student-led work a visible home.", description: "Student organizations can prepare community spaces, organize events, and connect members with practical opportunities." },
  "community-partners": { title: "Build focused spaces with a clear purpose.", description: "Community partners can organize conversations, initiatives, events, and collaborative activity." },
  contact: { title: "Start a clear conversation with GenZnect.", description: "Contact workflows will be published with verified communication details before the platform opens publicly." },
  careers: { title: "Help build a professional community with purpose.", description: "Open roles will appear here when the GenZnect team begins hiring. No positions are being advertised in this preview." },
  privacy: { title: "Privacy information will be clear before launch.", description: "This frontend preview stores no submitted account data. A complete privacy policy will be published before authentication is enabled." },
  terms: { title: "Platform terms will be published before launch.", description: "This preview does not create accounts or accept legal agreements. Final terms will be reviewed and published before authentication is enabled." },
} as const;

type PageSlug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!(slug in pages)) return {};
  const page = pages[slug as PageSlug];
  return { title: page.title };
}

export default async function InformationalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in pages)) notFound();
  const page = pages[slug as PageSlug];
  return <MarketingSubpage eyebrow="GenZnect" title={page.title} description={page.description} items={[
    { title: "Clear identity", description: "Show useful professional context without turning the platform into a public résumé directory." },
    { title: "Relevant discovery", description: "Find opportunities, people, and spaces connected to what you are trying to do." },
    { title: "Responsible access", description: "The product foundation anticipates role-aware visibility and organization workflows." },
  ]} />;
}
