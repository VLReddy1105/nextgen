import { MentorAffiliations } from "@/components/ecosystem/MentorAffiliations";
import { requireAuthenticatedUser } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
export default async function Page() {
  const session = await requireAuthenticatedUser();
  if (
    !["mentor", "company", "university"].includes(
      session.profile?.primary_role || "",
    )
  )
    redirect("/dashboard/overview");
  return <MentorAffiliations />;
}
