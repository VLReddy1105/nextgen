import { requirePrimaryRole } from "@/lib/auth/permissions";
import { StudentListing } from "@/components/student/StudentModules";
export default async function Page() {
  await requirePrimaryRole("student");
  return <StudentListing kind="mentorship" />;
}
