import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ProfileStep } from "@/components/onboarding/ProfileStep";

export default function OnboardingProfilePage() { return <OnboardingShell current={3}><ProfileStep /></OnboardingShell>; }
