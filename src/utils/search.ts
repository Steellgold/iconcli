import type { IconMetadata } from "@/library/types";

/**
 * Score an icon against a query — higher = more relevant.
 *
 * Priority:
 *  4 — exact match          ("user" → "user")
 *  3 — starts with query    ("user" → "user-circle")
 *  2 — word boundary match  ("user" → "power-user")
 *  1 — substring in name    ("ser"  → "user-circle")
 *  0 — tag match only
 * -1 — no match
 */
export const scoreIcon = (icon: IconMetadata, query: string): number => {
  const q = query.toLowerCase();
  const name = icon.name.toLowerCase();

  if (name === q) return 4;
  if (name.startsWith(q + "-") || name.startsWith(q + "_") || name === q) return 3;
  // word boundary: query matches a full segment separated by - or _
  const segments = name.split(/[-_]/);
  if (segments.some((s) => s === q)) return 2;
  if (name.includes(q)) return 1;
  if (icon.tags?.some((t) => t.toLowerCase().includes(q))) return 0;
  return -1;
};

/**
 * Filter and sort icons by relevance to the query.
 * Icons with no match (score -1) are excluded.
 */
export const rankIcons = (icons: IconMetadata[], query: string): IconMetadata[] => {
  if (!query) return icons;
  return icons
    .map((icon) => ({ icon, score: scoreIcon(icon, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.icon.name.localeCompare(b.icon.name))
    .map(({ icon }) => icon);
};
