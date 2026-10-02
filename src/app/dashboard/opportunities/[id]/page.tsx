import { StudentDetail } from "@/components/student/StudentDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentDetail kind="opportunities" id={id} />;
}
