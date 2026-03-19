import type { Config } from "@/config/schema";
import type { DirectionVariant, StyleVariant, VariantComponentData } from "@/types/variants";

import { applyFormatting, resolveFormatConfig } from "@/adapters/index";
import {
  generateReactVariantComponent,
  getReactFileExtension,
} from "@/templates/react-variant";
import {
  generateReactNativeVariantComponent,
  getReactNativeFileExtension,
} from "@/templates/react-native-variant";
import {
  generateSvelteVariantComponent,
  getSvelteFileExtension,
} from "@/templates/svelte-variant";
import { generateVueVariantComponent, getVueFileExtension } from "@/templates/vue-variant";
import { generateIconName } from "@/utils/naming";

export interface GenerateVariantComponentOptions {
  variantData: VariantComponentData;
  config: Config;
}

export interface GeneratedVariantComponent {
  content: string;
  filename: string;
  extension: string;
}

// Cache for resolved format config during the session
let formatConfigCache: Awaited<ReturnType<typeof resolveFormatConfig>> | null = null;

/**
 * Generate a multi-variant component
 */
export const generateVariantComponent = async (
  options: GenerateVariantComponentOptions
): Promise<GeneratedVariantComponent> => {
  const { variantData, config } = options;

  // Generate component name
  const componentName = generateIconName(
    variantData.config.baseName,
    config.naming.suffix,
    config.naming.componentCase
  );

  let content: string;
  let extension: string;

  switch (config.framework) {
    case "react":
      content = generateReactVariantComponent({
        componentName,
        variantData,
        typescript: config.typescript,
        props: config.props,
      });
      extension = getReactFileExtension(config.typescript);
      break;

    case "react-native":
      content = generateReactNativeVariantComponent({
        componentName,
        variantData,
        typescript: config.typescript,
        props: config.props,
      });
      extension = getReactNativeFileExtension(config.typescript);
      break;

    case "vue":
      content = generateVueVariantComponent({
        componentName,
        variantData,
        typescript: config.typescript,
        props: config.props,
      });
      extension = getVueFileExtension();
      break;

    case "svelte":
      content = generateSvelteVariantComponent({
        componentName,
        variantData,
        typescript: config.typescript,
        props: config.props,
      });
      extension = getSvelteFileExtension();
      break;

    default:
      throw new Error(`Unsupported framework: ${config.framework}`);
  }

  // Apply project formatting if enabled
  if (config.adaptToProject) {
    try {
      // Use cached config if available
      if (!formatConfigCache) {
        formatConfigCache = await resolveFormatConfig(process.cwd());
      }

      const activeConfig = formatConfigCache;
      content = applyFormatting(content, activeConfig, config.framework);
    } catch (error) {
      // Silent fallback - just use the generated content as-is
      if (process.env.DEBUG) {
        console.warn("[mkicon] Failed to apply project formatting:", error);
      }
    }
  }

  const filename = `${componentName}${extension}`;

  return {
    content,
    filename,
    extension,
  };
};

/**
 * Clear the format config cache (useful for testing or when changing projects)
 */
export const clearVariantFormatConfigCache = (): void => {
  formatConfigCache = null;
};

/**
 * Helper: Extract SVG inner content (without <svg> tag)
 */
export const extractSVGInnerContent = (svgContent: string): string => {
  const match = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return match ? match[1].trim() : svgContent;
};

/**
 * Helper: Generate a variant map for switch/case
 */
export const generateVariantMap = (
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): Record<string, string> => {
  const map: Record<string, string> = {};

  for (const v of variants) {
    map[v.variant] = extractSVGInnerContent(v.svgContent);
  }

  return map;
};
