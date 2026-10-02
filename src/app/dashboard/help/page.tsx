import { requirePrimaryRole } from "@/lib/auth/permissions";
import { StudentHelp } from "@/components/student/StudentExtras";
export default async function Page() {
  await requirePrimaryRole("student");
  return <StudentHelp />;
}
