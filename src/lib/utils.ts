export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Falls back to the email local part, then a generic label. */
export function displayName(fullName?: string | null, email?: string | null) {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  const localPart = email?.split("@")[0]?.trim();
  return localPart || "Member";
}

export function firstName(fullName?: string | null, email?: string | null) {
  return displayName(fullName, email).split(/\s+/)[0];
}

/** "Alex Morgan" -> "AM". Used for the avatar fallback in the dashboard header. */
export function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}
