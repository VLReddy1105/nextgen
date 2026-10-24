import { Mentor } from "@/components/ecosystem/Mentor";
import { SpaceConnections } from "@/components/ecosystem/Connections";
import { requireAuthenticatedUser } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
export default async function Page() {
  const session = await requireAuthenticatedUser();
  if (session.profile?.primary_role === "founder") return <SpaceConnections />;
  if (session.profile?.primary_role !== "mentor")
    redirect("/dashboard/overview");
  return <Mentor mode="connections" />;
}
