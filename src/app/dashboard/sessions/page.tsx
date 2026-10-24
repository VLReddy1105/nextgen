import { Mentor } from "@/components/ecosystem/Mentor";
import { requirePrimaryRole } from "@/lib/auth/permissions";
export default async function Page() {
  await requirePrimaryRole("mentor");
  return <Mentor mode="sessions" />;
}
