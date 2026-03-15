import { IconMetadata, IconLibrary, FetchIconResult } from './types.js';

const LUCIDE_LIBRARY: IconLibrary = {
  name: 'lucide',
  displayName: 'Lucide Icons',
  license: 'ISC',
  licenseUrl: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
  website: 'https://lucide.dev',
  copyright: 'Copyright (c) 2026 Lucide Contributors',
};

const TAGS_URL = 'https://unpkg.com/lucide-static@latest/tags.json';
const ICON_BASE_URL = 'https://unpkg.com/lucide-static@latest/icons';

/**
 * Fetch all available Lucide icons with their tags
 */
export const fetchLucideIcons = async (): Promise<IconMetadata[]> => {
  const response = await fetch(TAGS_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Lucide icons: ${response.status}`);
  }
  
  const tags = await response.json() as Record<string, string[]>;
  
  return Object.entries(tags).map(([name, iconTags]) => ({
    name,
    tags: iconTags,
  }));
};

/**
 * Fetch SVG content for a specific Lucide icon
 */
export const fetchLucideIcon = async (iconName: string): Promise<FetchIconResult> => {
  const url = `${ICON_BASE_URL}/${iconName}.svg`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch icon "${iconName}": ${response.status}`);
  }
  
  const svgContent = await response.text();
  
  return {
    svgContent,
    metadata: {
      library: LUCIDE_LIBRARY,
      iconName,
    },
  };
};

/**
 * Search Lucide icons by name or tags
 */
export const searchLucideIcons = (
  icons: IconMetadata[],
  query: string
): IconMetadata[] => {
  const lowerQuery = query.toLowerCase();
  
  return icons.filter(icon => {
    // Match by name
    if (icon.name.includes(lowerQuery)) {
      return true;
    }
    
    // Match by tags
    return icon.tags.some(tag => tag.includes(lowerQuery));
  });
};

/**
 * Generate copyright header for Lucide icons
 */
export const generateLucideCopyright = (iconName: string): string => {
  return `/**
 * Icon: ${iconName}
 * From: ${LUCIDE_LIBRARY.displayName} (${LUCIDE_LIBRARY.website})
 * 
 * ${LUCIDE_LIBRARY.copyright}
 * @license ${LUCIDE_LIBRARY.license}
 * ${LUCIDE_LIBRARY.licenseUrl}
 */`;
};
