/**
 * Types and constants for the variant system
 */

export const DIRECTION_VARIANTS = [
  "up",
  "down",
  "left",
  "right",
  "up-right",
  "up-left",
  "down-right",
  "down-left",
  "up-circle",
  "down-circle",
  "left-circle",
  "right-circle",
  "up-tray",
  "down-tray",
  "up-on-square",
  "down-on-square",
  "up-down",
  "left-right",
] as const;

export const STYLE_VARIANTS = [
  "outline",
  "solid",
  "filled",
  "mini",
  "micro",
  "thin",
  "light",
  "regular",
  "bold",
  "duotone",
  "sharp",
] as const;

export type DirectionVariant = (typeof DIRECTION_VARIANTS)[number];
export type StyleVariant = (typeof STYLE_VARIANTS)[number];

export interface VariantConfig {
  type: "direction" | "style" | "combined";
  baseName: string;
  directions?: DirectionVariant[];
  styles?: StyleVariant[];
}

export interface VariantSVGContent {
  variant: DirectionVariant | StyleVariant;
  svgContent: string;
  viewBox: string;
}

export interface VariantComponentData {
  config: VariantConfig;
  variants: VariantSVGContent[];
}
