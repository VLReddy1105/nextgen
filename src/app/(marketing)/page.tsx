import { CommunitiesSection } from "@/components/landing/CommunitiesSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { EventsSection } from "@/components/landing/EventsSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { HeroSection } from "@/components/landing/HeroSection";
import { OpportunitiesSection } from "@/components/landing/OpportunitiesSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { RoleCards } from "@/components/landing/RoleCards";
import { TrustSection } from "@/components/landing/TrustSection";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <RoleCards />
      <OpportunitiesSection />
      <ProcessSection />
      <DashboardPreview />
      <CommunitiesSection />
      <EventsSection />
      <TrustSection />
      <FinalCTA />
    </main>
  );
}
