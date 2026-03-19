import enquirer from "enquirer";
import {
  DIRECTION_VARIANTS,
  STYLE_VARIANTS,
  DirectionVariant,
  StyleVariant,
} from "@/types/variants.js";
import { logger } from "@/utils/logger.js";

const { prompt } = enquirer;

/**
 * Helper to convert kebab-case to PascalCase
 */
export const toPascalCase = (str: string): string => {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

/**
 * Prompt to select directional variants
 * Pre-fills choices with pattern like "ArrowX"
 */
export const promptDirectionVariants = async (baseName: string): Promise<DirectionVariant[]> => {
  logger.info(`Creating directional icon: ${baseName}`);
  logger.newline();

  const choices = DIRECTION_VARIANTS.map((dir) => ({
    name: dir,
    message: `${baseName}${toPascalCase(dir)} (${dir})`,
    value: dir,
  }));

  const answer = await prompt<{ directions: DirectionVariant[] }>({
    type: "multiselect",
    name: "directions",
    message: `Select the directions for ${baseName}:`,
    choices,
  });

  if (answer.directions.length === 0) {
    throw new Error("At least one direction must be selected");
  }

  return answer.directions;
};

/**
 * Prompt to select style variants
 */
export const promptStyleVariants = async (baseName: string): Promise<StyleVariant[]> => {
  logger.info(`Creating styled icon: ${baseName}`);
  logger.newline();

  const choices = STYLE_VARIANTS.map((style) => ({
    name: style,
    message: `${baseName} (${style})`,
    value: style,
  }));

  const answer = await prompt<{ styles: StyleVariant[] }>({
    type: "multiselect",
    name: "styles",
    message: `Select the style variants for ${baseName}:`,
    choices,
  });

  if (answer.styles.length === 0) {
    throw new Error("At least one style must be selected");
  }

  return answer.styles;
};

/**
 * Prompt to get the SVG for a specific variant
 */
export const promptVariantSVG = async (
  baseName: string,
  variant: DirectionVariant | StyleVariant,
  index: number,
  total: number
): Promise<string> => {
  logger.newline();
  logger.info(`[${index}/${total}] ${baseName}${toPascalCase(variant)}`);

  const answer = await prompt<{ svg: string }>({
    type: "input",
    name: "svg",
    message: `Paste SVG for "${variant}" variant:`,
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return "SVG content cannot be empty";
      }
      if (!input.includes("<svg")) {
        return "Invalid SVG - must contain <svg> tag";
      }
      return true;
    },
  });

  return answer.svg;
};

/**
 * Prompt to ask if user also wants style variants
 * (after selecting directions)
 */
export const promptAddStyleVariants = async (): Promise<boolean> => {
  const answer = await prompt<{ addStyles: boolean }>({
    type: "confirm",
    name: "addStyles",
    message: "Do you also want to add style variants (outline, solid, etc.)?",
    initial: false,
  });

  return answer.addStyles;
};
