import catalogs from "@/lib/catalogs.json";
export type CatalogKind = keyof typeof catalogs;
export { catalogs };
export const fieldCatalog: Record<string, CatalogKind> = {
  skills: "skills",
  tags: "skills",
  expertise: "skills",
  soft_skills: "soft_skills",
  interests: "interests",
  project_interests: "interests",
  community_interests: "interests",
  career_interests: "interests",
  preferred_roles: "roles",
  preferred_industries: "industries",
  preferred_locations: "locations",
  languages: "languages",
};
export function normalizeEntries(
  raw: string,
  choices: readonly string[],
  strict = false,
): string[] {
  const result: string[] = [];
  for (const part of raw
    .split(/[,;\n]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)) {
    let rest = part;
    const found: string[] = [];
    while (rest) {
      const match = [...choices]
        .sort((a, b) => b.length - a.length)
        .find(
          (c) =>
            rest === c.toLowerCase() || rest.startsWith(c.toLowerCase() + " "),
        );
      if (!match) break;
      found.push(match.toLowerCase());
      rest = rest
        .slice(match.length)
        .trim()
        .replace(/^and\s+/, "");
    }
    if (!rest && found.length) result.push(...found);
    else if (strict || part.split(/\s+/).length > 4 || part.length > 80)
      throw new Error(
        "Choose individual values from the suggestions; separate pasted values with commas.",
      );
    else result.push(part);
  }
  const unique = [...new Set(result)];
  if (unique.length > 20) throw new Error("Choose up to 20 values.");
  return unique;
}
