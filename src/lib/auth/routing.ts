/** Pure middleware routing policy; role/account admission remains server-side. */
export function authRedirect(pathname: string, search: string, signedIn: boolean) {
  if (!signedIn && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
    return `/login?next=${encodeURIComponent(pathname + search)}`;
  }
  if (signedIn && ["/login", "/signup"].includes(pathname)) return "/dashboard/overview";
  return null;
}
