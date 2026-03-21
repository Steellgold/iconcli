import type { FetchIconResult, IconLibrary, IconMetadata } from "./types";

export type HeroiconSize = 16 | 20 | 24;
export type HeroiconStyle = "solid" | "outline";

const HEROICONS_LIBRARY: IconLibrary = {
  name: "heroicons",
  displayName: "Heroicons",
  license: "MIT",
  licenseUrl: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
  website: "https://heroicons.com",
  copyright: "Copyright (c) Tailwind Labs, Inc.",
};

const GITHUB_CONTENTS_API =
  "https://api.github.com/repos/tailwindlabs/heroicons/contents/src/24/solid";
const RAW_BASE =
  "https://raw.githubusercontent.com/tailwindlabs/heroicons/master/src";

/**
 * Fetch all available Heroicons from GitHub API (using 24/solid as the canonical list)
 */
export const fetchHeroiconList = async (): Promise<IconMetadata[]> => {
  const response = await fetch(GITHUB_CONTENTS_API, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Heroicons list: ${response.status}`);
  }

  const items = (await response.json()) as Array<{ name: string; type: string }>;

  return items
    .filter((item) => item.type === "file" && item.name.endsWith(".svg"))
    .map((item) => ({
      name: item.name.replace(/\.svg$/, ""),
      tags: [],
    }));
};

/**
 * Fetch SVG content for a specific Heroicon
 * URL: https://raw.githubusercontent.com/tailwindlabs/heroicons/master/src/{size}/{style}/{name}.svg
 */
export const fetchHeroicon = async (
  iconName: string,
  size: HeroiconSize,
  style: HeroiconStyle
): Promise<FetchIconResult> => {
  const url = `${RAW_BASE}/${size}/${style}/${iconName}.svg`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Heroicon "${iconName}" (${size}/${style}): ${response.status}`
    );
  }

  const svgContent = await response.text();

  return {
    svgContent,
    metadata: {
      library: HEROICONS_LIBRARY,
      iconName: `${iconName}-${size}-${style}`,
    },
  };
};

/**
 * Returns available styles for a given size.
 * Only size 24 has the outline variant.
 */
export const getAvailableStyles = (size: HeroiconSize): HeroiconStyle[] => {
  if (size === 24) return ["solid", "outline"];
  return ["solid"];
};

/**
 * Search Heroicons by name (no tags available)
 */
export const searchHeroicons = (icons: IconMetadata[], query: string): IconMetadata[] => {
  const lowerQuery = query.toLowerCase();
  return icons.filter((icon) => icon.name.includes(lowerQuery));
};

/**
 * Parse a Heroicon GitHub raw URL to extract icon name, size, and style.
 * Expected format: https://raw.githubusercontent.com/tailwindlabs/heroicons/master/src/{size}/{style}/{name}.svg
 */
export const parseHeroiconURL = (
  url: string
): { iconName: string; size: HeroiconSize; style: HeroiconStyle } | null => {
  try {
    const match = url.match(
      /raw\.githubusercontent\.com\/tailwindlabs\/heroicons\/[^/]+\/src\/(\d+)\/(solid|outline)\/([^/]+)\.svg/
    );
    if (!match) return null;

    const size = parseInt(match[1], 10) as HeroiconSize;
    if (![16, 20, 24].includes(size)) return null;

    const style = match[2] as HeroiconStyle;
    if (style === "outline" && size !== 24) return null;

    return { iconName: match[3], size, style };
  } catch {
    return null;
  }
};

/**
 * Generate copyright header for Heroicons
 */
export const generateHeroiconsCopyright = (iconName: string): string => {
  return `/**
 * Icon: ${iconName}
 * From: ${HEROICONS_LIBRARY.displayName} (${HEROICONS_LIBRARY.website})
 *
 * ${HEROICONS_LIBRARY.copyright}
 * @license ${HEROICONS_LIBRARY.license}
 * ${HEROICONS_LIBRARY.licenseUrl}
 */`;
};
