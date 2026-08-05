import { OnboardingActions } from "@/components/onboarding/OnboardingActions";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export default function OnboardingOrganizationPage() {
  return (
    <OnboardingShell current={5}>
      <p className="text-[14px] font-semibold text-blue-700">Step 5 · Organization</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Are you connected to an organization?</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">This is optional for individual profiles. Organization access will be reviewed when verification workflows are connected.</p>
      <form className="mt-8 grid gap-6 sm:grid-cols-2">
        <label className="sm:col-span-2 text-[15px] font-semibold text-slate-800">Organization name<input placeholder="University, company, startup, or community" className="mt-2 h-13 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10" /></label>
        <label className="text-[15px] font-semibold text-slate-800">Organization type<select defaultValue="" className="mt-2 h-13 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10"><option value="" disabled>Select type</option><option>Startup</option><option>Company</option><option>University</option><option>Student organization</option><option>Community</option><option>Nonprofit</option></select></label>
        <label className="text-[15px] font-semibold text-slate-800">Your role there<input placeholder="e.g. Student researcher" className="mt-2 h-13 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10" /></label>
        <label className="sm:col-span-2 text-[15px] font-semibold text-slate-800">Organization website <span className="font-normal text-slate-500">(optional)</span><input type="url" placeholder="https://" className="mt-2 h-13 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10" /></label>
      </form>
      <OnboardingActions back="/onboarding/interests" next="/onboarding/complete" nextLabel="Finish setup" />
    </OnboardingShell>
  );
}
