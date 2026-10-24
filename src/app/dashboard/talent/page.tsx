import { requirePrimaryRole } from "@/lib/auth/permissions";
import { Talent } from "@/components/ecosystem/Connections";
export default async function Page() {
  await requirePrimaryRole("company");
  return <Talent />;
}
