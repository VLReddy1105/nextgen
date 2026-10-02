import { getSessionContext } from "@/lib/supabase/session";
import { StudentListing } from "@/components/student/StudentModules";
import { RoleWorkspace } from "@/components/ecosystem/RoleWorkspace";
export default async function Page() {
  const s = await getSessionContext();
  return s?.profile?.primary_role === "student" ? (
    <StudentListing kind="applications" />
  ) : (
    <RoleWorkspace module="applications" />
  );
}
