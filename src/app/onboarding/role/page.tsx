import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { RoleSelection } from "@/components/onboarding/RoleSelection";

export default function OnboardingRolePage() { return <OnboardingShell current={2}><RoleSelection /></OnboardingShell>; }
