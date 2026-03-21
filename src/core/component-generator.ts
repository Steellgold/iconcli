import type { Config } from "@/config/schema";

import { applyFormatting, resolveFormatConfig } from "@/adapters/index";
import { generateMkiconHeader } from "@/utils/header";
import { logger } from "@/utils/logger";
import { generateReactComponent, getReactFileExtension } from "@/templates/react";
import {
  generateReactNativeComponent,
  getReactNativeFileExtension,
} from "@/templates/react-native";
import { generateSvelteComponent, getSvelteFileExtension } from "@/templates/svelte";
import { generateVueComponent, getVueFileExtension } from "@/templates/vue";

import { cleanSVGAttributes } from "./svg-processor";

export interface GenerateComponentOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  config: Config;
}

export interface GeneratedComponent {
  content: string;
  filename: string;
  extension: string;
}

// Cache for resolved format config during the session
let formatConfigCache: Awaited<ReturnType<typeof resolveFormatConfig>> | null = null;

/**
 * Generate component code based on framework
 */
export const generateComponent = async (
  options: GenerateComponentOptions
): Promise<GeneratedComponent> => {
  const { componentName, svgContent, viewBox, config } = options;

  const cleanedSVG = cleanSVGAttributes(svgContent);
  const header = generateMkiconHeader(config.framework);

  let content: string;
  let extension: string;

  switch (config.framework) {
    case "react":
      content = generateReactComponent({
        componentName,
        svgContent: cleanedSVG,
        viewBox,
        typescript: config.typescript,
        props: config.props,
        header,
      });
      extension = getReactFileExtension(config.typescript);
      break;

    case "react-native":
      content = generateReactNativeComponent({
        componentName,
        svgContent: cleanedSVG,
        viewBox,
        typescript: config.typescript,
        props: config.props,
        header,
      });
      extension = getReactNativeFileExtension(config.typescript);
      break;

    case "vue":
      content = generateVueComponent({
        componentName,
        svgContent: cleanedSVG,
        viewBox,
        typescript: config.typescript,
        props: config.props,
        header,
      });
      extension = getVueFileExtension();
      break;

    case "svelte":
      content = generateSvelteComponent({
        componentName,
        svgContent: cleanedSVG,
        viewBox,
        typescript: config.typescript,
        props: config.props,
        header,
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

      // Log detected config in debug mode
      if (process.env.DEBUG && activeConfig.source !== "default") {
        logger.print(
          `[mkicon] Detected ${activeConfig.source} config: ${activeConfig.configPath || "inline"}`
        );
      }

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
export const clearFormatConfigCache = (): void => {
  formatConfigCache = null;
};
