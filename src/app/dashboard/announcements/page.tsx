import { Campus } from "@/components/ecosystem/Campus";
import { requirePrimaryRole } from "@/lib/auth/permissions";
export default async function Page() {
  await requirePrimaryRole("university");
  return <Campus mode="announcements" />;
}
