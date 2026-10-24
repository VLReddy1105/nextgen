import { Campus } from "@/components/ecosystem/Campus";
import { Mentor } from "@/components/ecosystem/Mentor";
import { requireAuthenticatedUser } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
export default async function Page() {
  const session = await requireAuthenticatedUser();
  if (session.profile?.primary_role === "mentor")
    return <Mentor mode="students" />;
  if (session.profile?.primary_role !== "university")
    redirect("/dashboard/overview");
  return <Campus />;
}
