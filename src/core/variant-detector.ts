import {
  DIRECTION_VARIANTS,
  STYLE_VARIANTS,
  DirectionVariant,
  StyleVariant,
} from "@/types/variants.js";
import path from "path";

export interface DetectedVariantGroup {
  baseName: string;
  type: "direction" | "style";
  variants: Array<{
    variant: DirectionVariant | StyleVariant;
    fileName: string;
    filePath: string;
  }>;
}

/**
 * Helper: Convert kebab-case to PascalCase
 */
export const toPascalCase = (str: string): string => {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

/**
 * Detect variant groups in a list of SVG files
 * Strict approach: looks for exact patterns like ArrowUp, ArrowDown
 */
export const detectVariantGroups = (svgFiles: string[]): DetectedVariantGroup[] => {
  const groups = new Map<string, DetectedVariantGroup>();

  for (const filePath of svgFiles) {
    const fileName = path.basename(filePath, ".svg");

    // Try to detect a directional variant
    const directionMatch = detectDirectionVariant(fileName);
    if (directionMatch) {
      const key = `${directionMatch.baseName}-direction`;

      if (!groups.has(key)) {
        groups.set(key, {
          baseName: directionMatch.baseName,
          type: "direction",
          variants: [],
        });
      }

      groups.get(key)!.variants.push({
        variant: directionMatch.direction,
        fileName,
        filePath,
      });
      continue;
    }

    // Try to detect a style variant
    const styleMatch = detectStyleVariant(fileName);
    if (styleMatch) {
      const key = `${styleMatch.baseName}-style`;

      if (!groups.has(key)) {
        groups.set(key, {
          baseName: styleMatch.baseName,
          type: "style",
          variants: [],
        });
      }

      groups.get(key)!.variants.push({
        variant: styleMatch.style,
        fileName,
        filePath,
      });
    }
  }

  // Filter groups with at least 2 variants
  const result: DetectedVariantGroup[] = [];
  for (const group of groups.values()) {
    if (group.variants.length >= 2) {
      result.push(group);
    }
  }

  return result;
};

/**
 * Detect if a filename contains a directional variant
 * Strict approach: must match the pattern exactly
 */
export const detectDirectionVariant = (
  fileName: string
): { baseName: string; direction: DirectionVariant } | null => {
  // Convert directions to PascalCase patterns
  const directionPatterns = DIRECTION_VARIANTS.map((dir) => ({
    variant: dir,
    pattern: toPascalCase(dir),
  }));

  for (const { variant, pattern } of directionPatterns) {
    // Strict pattern: ArrowUp, IconArrowUp, etc.
    // Must end with the pattern
    const regex = new RegExp(`^(.+?)(${pattern})$`, "i");
    const match = fileName.match(regex);

    if (match) {
      return {
        baseName: match[1],
        direction: variant,
      };
    }
  }

  return null;
};

/**
 * Detect if a filename contains a style variant
 */
export const detectStyleVariant = (
  fileName: string
): { baseName: string; style: StyleVariant } | null => {
  const stylePatterns = STYLE_VARIANTS.map((style) => ({
    variant: style,
    pattern: toPascalCase(style),
  }));

  for (const { variant, pattern } of stylePatterns) {
    const regex = new RegExp(`^(.+?)(${pattern})$`, "i");
    const match = fileName.match(regex);

    if (match) {
      return {
        baseName: match[1],
        style: variant,
      };
    }
  }

  return null;
};
