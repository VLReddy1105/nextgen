/**
 * Redirect to a same-origin path without naming the origin.
 *
 * Route handlers run behind Vercel's proxy, where the internal request origin
 * is not necessarily the public one. Rather than reconstruct the public origin
 * from x-forwarded-host (which is a header we would then have to trust), we
 * emit a relative Location and let the browser resolve it against whatever
 * origin it actually used. RFC 7231 permits relative references in Location.
 *
 * NextResponse.redirect() cannot be used here -- it requires an absolute URL.
 *
 * @param path must start with "/"
 * @param status 303 for redirects after a POST, 307 for GET
 */
export function redirectToPath(path: string, status: 303 | 307 = 307) {
  return new Response(null, { status, headers: { Location: path } });
}
