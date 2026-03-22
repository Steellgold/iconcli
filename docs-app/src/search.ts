import { SEARCH_INDEX } from "virtual:search-index";

export interface SearchResult {
  path: string;
  pageTitle: string;
  heading: string;
  snippet: string;
  score: number;
}

interface IndexEntry {
  path: string;
  pageTitle: string;
  heading: string;
  text: string;
}

function excerpt(text: string, query: string, len = 140): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, len) + (text.length > len ? "…" : "");
  const start = Math.max(0, idx - 55);
  const end = Math.min(text.length, idx + 85);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export function search(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const entry of SEARCH_INDEX as IndexEntry[]) {
    const key = `${entry.path}#${entry.heading}`;
    if (seen.has(key)) continue;

    const inTitle   = entry.pageTitle.toLowerCase().includes(q);
    const inHeading = entry.heading.toLowerCase().includes(q);
    const inText    = entry.text.toLowerCase().includes(q);

    if (!inTitle && !inHeading && !inText) continue;

    seen.add(key);
    results.push({
      path: entry.path,
      pageTitle: entry.pageTitle,
      heading: entry.heading,
      snippet: excerpt(entry.text, q),
      score: inTitle ? 3 : inHeading ? 2 : 1,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
