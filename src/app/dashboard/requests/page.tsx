import { requirePrimaryRole } from "@/lib/auth/permissions";
import { Mentor } from "@/components/ecosystem/Mentor";
export default async function Page() {
  await requirePrimaryRole("mentor");
  return <Mentor mode="requests" />;
}
