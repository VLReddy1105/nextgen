import type { AnchorHTMLAttributes } from "react";
export default function Link({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) {
  // Next consumes this routing prop; the fixture renders only the anchor.
  void prefetch;
  return <a {...props} />;
}
