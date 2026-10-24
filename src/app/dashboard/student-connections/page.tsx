import { requirePrimaryRole } from "@/lib/auth/permissions";
import { Campus } from "@/components/ecosystem/Campus";
export default async function Page() {
  await requirePrimaryRole("university");
  return <Campus mode="connections" />;
}
