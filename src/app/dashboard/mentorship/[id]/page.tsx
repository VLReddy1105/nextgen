import { requirePrimaryRole } from "@/lib/auth/permissions";
import { StudentDetail } from "@/components/student/StudentDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePrimaryRole("student");
  const { id } = await params;
  return <StudentDetail kind="mentorship" id={id} />;
}
