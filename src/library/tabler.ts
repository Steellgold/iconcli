import type { FetchIconResult, IconLibrary, IconMetadata } from "./types";

export type TablerStyle = "outline" | "filled";
export type TablerStroke = 1 | 1.25 | 1.5 | 1.75 | 2;

const TABLER_LIBRARY: IconLibrary = {
  name: "tabler",
  displayName: "Tabler Icons",
  license: "MIT",
  licenseUrl: "https://github.com/tabler/tabler-icons/blob/main/LICENSE",
  website: "https://tabler.io/icons",
  copyright: "Copyright (c) 2020 Paweł Kuna",
};

// GitHub Contents API to get the SHA of the icons/outline directory
const GITHUB_ICONS_CONTENTS_API =
  "https://api.github.com/repos/tabler/tabler-icons/contents/icons";
// GitHub Git Trees API — fetches a flat directory tree without the 1000-item Contents API limit
const GITHUB_TREE_API = (sha: string) =>
  `https://api.github.com/repos/tabler/tabler-icons/git/trees/${sha}`;
const RAW_BASE =
  "https://raw.githubusercontent.com/tabler/tabler-icons/main/icons";

/**
 * Fetch all available Tabler Icons using the Git Trees API.
 *
 * The GitHub Contents API is capped at 1000 items per directory, which would
 * silently truncate Tabler's ~5500 icons. The Git Trees API for a single
 * (non-recursive) directory has no such limit.
 *
 * Strategy:
 * 1. GET /repos/.../contents/icons  → find the SHA of the "outline" subtree
 * 2. GET /repos/.../git/trees/{sha} → list all SVGs without truncation
 */
export const fetchTablerIconList = async (): Promise<IconMetadata[]> => {
  // Step 1 — resolve the SHA of icons/outline
  const contentsRes = await fetch(GITHUB_ICONS_CONTENTS_API, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  if (!contentsRes.ok) {
    throw new Error(`Failed to fetch Tabler Icons directory: ${contentsRes.status}`);
  }

  const dirs = (await contentsRes.json()) as Array<{ name: string; type: string; sha: string }>;
  const outlineEntry = dirs.find((d) => d.name === "outline" && d.type === "dir");

  if (!outlineEntry) {
    throw new Error("Could not find Tabler Icons outline directory");
  }

  // Step 2 — list all files in the outline tree (no 1000-item cap)
  const treeRes = await fetch(GITHUB_TREE_API(outlineEntry.sha), {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  if (!treeRes.ok) {
    throw new Error(`Failed to fetch Tabler Icons tree: ${treeRes.status}`);
  }

  const treeData = (await treeRes.json()) as {
    tree: Array<{ path: string; type: string }>;
    truncated: boolean;
  };

  return treeData.tree
    .filter((item) => item.type === "blob" && item.path.endsWith(".svg"))
    .map((item) => ({
      name: item.path.replace(/\.svg$/, ""),
      tags: [],
    }));
};

/**
 * Fetch SVG content for a specific Tabler Icon.
 * URL: https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/{style}/{name}.svg
 *
 * If style is "outline" and stroke is not the default (2), the stroke-width attribute
 * in the SVG is replaced before returning.
 */
export const fetchTablerIcon = async (
  iconName: string,
  style: TablerStyle,
  stroke: TablerStroke = 2
): Promise<FetchIconResult> => {
  const url = `${RAW_BASE}/${style}/${iconName}.svg`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Tabler Icon "${iconName}" (${style}): ${response.status}`
    );
  }

  let svgContent = await response.text();

  if (style === "outline" && stroke !== 2) {
    svgContent = svgContent.replace(/stroke-width="[^"]*"/g, `stroke-width="${stroke}"`);
  }

  const metadataIconName = style === "filled" ? `${iconName}-filled` : iconName;

  return {
    svgContent,
    metadata: {
      library: TABLER_LIBRARY,
      iconName: metadataIconName,
    },
  };
};

/**
 * Search Tabler Icons by name (no tags available)
 */
export const searchTablerIcons = (icons: IconMetadata[], query: string): IconMetadata[] => {
  const lowerQuery = query.toLowerCase();
  return icons.filter((icon) => icon.name.includes(lowerQuery));
};

/**
 * Parse a Tabler Icon GitHub raw URL to extract icon name and style.
 * Expected format: https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/{style}/{name}.svg
 */
export const parseTablerURL = (
  url: string
): { iconName: string; style: TablerStyle } | null => {
  try {
    const match = url.match(
      /raw\.githubusercontent\.com\/tabler\/tabler-icons\/[^/]+\/icons\/(outline|filled)\/([^/]+)\.svg/
    );
    if (!match) return null;

    const style = match[1] as TablerStyle;
    const iconName = match[2];

    return { iconName, style };
  } catch {
    return null;
  }
};

/**
 * Generate copyright header for Tabler Icons
 */
export const generateTablerCopyright = (iconName: string): string => {
  return `/**
 * Icon: ${iconName}
 * From: ${TABLER_LIBRARY.displayName} (${TABLER_LIBRARY.website})
 *
 * ${TABLER_LIBRARY.copyright}
 * @license ${TABLER_LIBRARY.license}
 * ${TABLER_LIBRARY.licenseUrl}
 */`;
};
