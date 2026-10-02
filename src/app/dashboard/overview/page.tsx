import { getSessionContext } from "@/lib/supabase/session";
import { StudentOverview } from "@/components/student/StudentModules";
import { RoleWorkspace } from "@/components/ecosystem/RoleWorkspace";
export default async function Page() {
  const s = await getSessionContext();
  return s?.profile?.primary_role === "student" ? (
    <StudentOverview />
  ) : (
    <RoleWorkspace module="overview" />
  );
}
