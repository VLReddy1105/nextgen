import { requirePrimaryRole } from "@/lib/auth/permissions";
import { StudentAITools } from "@/components/student/StudentExtras";
export default async function Page() {
  await requirePrimaryRole("student");
  return <StudentAITools />;
}
