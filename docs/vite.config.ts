import fs from "fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";

// ── Search index ────────────────────────────────────────────────────────────

interface IndexEntry {
  path: string;
  pageTitle: string;
  heading: string;
  text: string;
}

const PAGES: [string, string][] = [
  ["/", "index"],
  ["/installation", "installation"],
  ["/quick-start", "quick-start"],
  ["/usage", "usage"],
  ["/batch", "batch"],
  ["/tracking", "tracking"],
  ["/icon-libraries", "icon-libraries"],
  ["/multi-variant", "multi-variant"],
  ["/spinner", "spinner"],
  ["/ai", "ai"],
  ["/png-export", "png-export"],
  ["/configuration", "configuration"],
  ["/formatting", "formatting"],
  ["/studio", "studio"],
  ["/changelog", "changelog"],
];

function stripMdx(raw: string): string {
  return raw
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+.*$/gm, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, (m) => m.slice(1, -1))
    .replace(/<[A-Z][^>]*(?:\/>|>[\s\S]*?<\/[A-Z][^>]*>)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s{2,}/g, " ");
}

function parseEntries(raw: string, routePath: string): IndexEntry[] {
  const cleaned = stripMdx(raw);
  const lines = cleaned.split("\n");
  const entries: IndexEntry[] = [];

  let pageTitle = "";
  let currentHeading = "";
  let currentText = "";

  const flush = () => {
    const t = currentText.trim();
    if (t.length > 10) entries.push({ path: routePath, pageTitle, heading: currentHeading, text: t });
    currentText = "";
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ")) { flush(); pageTitle = line.slice(2).trim(); currentHeading = ""; }
    else if (line.startsWith("### ")) { flush(); currentHeading = line.slice(4).trim(); }
    else if (line.startsWith("## ")) { flush(); currentHeading = line.slice(3).trim(); }
    else { currentText += " " + line; }
  }
  flush();

  return entries;
}

function searchIndexPlugin(): Plugin {
  const VIRTUAL = "virtual:search-index";
  const RESOLVED = "\0" + VIRTUAL;

  return {
    name: "search-index",
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED;
    },
    load(id) {
      if (id !== RESOLVED) return;

      const pagesDir = path.resolve(__dirname, "src/pages");
      const index: IndexEntry[] = [];

      for (const [routePath, file] of PAGES) {
        const filePath = path.join(pagesDir, `${file}.mdx`);
        if (!fs.existsSync(filePath)) continue;
        const raw = fs.readFileSync(filePath, "utf-8");
        index.push(...parseEntries(raw, routePath));
      }

      return `export const SEARCH_INDEX = ${JSON.stringify(index)};`;
    },
  };
}

// ── Vite config ─────────────────────────────────────────────────────────────

export default defineConfig(async () => {
  const { default: rehypeShiki } = await import("@shikijs/rehype");

  return {
    base: "/mkicon/",
    plugins: [
      searchIndexPlugin(),
      {
        enforce: "pre",
        ...mdx({
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            [
              rehypeShiki,
              {
                theme: "one-dark-pro",
                langs: ["tsx", "typescript", "jsx", "javascript", "bash", "sh", "json", "html", "css", "vue", "svelte"],
              },
            ],
          ],
          providerImportSource: "@mdx-js/react",
        }),
      },
      react({ include: /\.(jsx|tsx)$/ }),
    ],
  };
});
