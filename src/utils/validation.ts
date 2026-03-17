/**
 * Check if a string contains valid SVG content
 */
export const isValidSVG = (content: string): boolean => {
  const trimmed = content.trim();

  // Check for svg tag with proper structure (allow comments before)
  const svgTagPattern = /<svg[^>]*>[\s\S]*<\/svg>/i;
  if (!svgTagPattern.test(trimmed)) {
    return false;
  }

  // Must contain <svg and </svg>
  if (!trimmed.includes("<svg") || !trimmed.includes("</svg>")) {
    return false;
  }

  return true;
};

/**
 * Extract viewBox from SVG content
 */
export const extractViewBox = (svgContent: string): string | null => {
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']*)["']/i);
  return viewBoxMatch ? viewBoxMatch[1] : null;
};

/**
 * Extract dimensions from SVG content
 */
export const extractDimensions = (svgContent: string): { width?: string; height?: string } => {
  const widthMatch = svgContent.match(/width=["']([^"']*)["']/i);
  const heightMatch = svgContent.match(/height=["']([^"']*)["']/i);

  return {
    width: widthMatch ? widthMatch[1] : undefined,
    height: heightMatch ? heightMatch[1] : undefined,
  };
};

/**
 * Validate icon name
 */
export const isValidIconName = (name: string): boolean => {
  // Must not be empty
  if (!name || name.trim().length === 0) {
    return false;
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(name)) {
    return false;
  }

  return true;
};
