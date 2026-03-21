import { applyFormatting, resolveFormatConfig } from "@/adapters/index";
import { generateMkiconHeader } from "@/utils/header";
import type { Config } from "@/config/schema";
import { generateReactSpinnerComponent } from "@/templates/spinner-react";
import { generateReactNativeSpinnerComponent } from "@/templates/spinner-react-native";
import { generateSvelteSpinnerComponent } from "@/templates/spinner-svelte";
import { generateVueSpinnerComponent } from "@/templates/spinner-vue";
import type { SpinnerAnimationLib } from "@/types/spinner";

import { cleanSVGAttributes } from "./svg-processor";

export interface GenerateSpinnerOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  config: Config;
  animationLib: SpinnerAnimationLib;
  defaultDuration: number;
}

export interface GeneratedSpinner {
  content: string;
  filename: string;
  extension: string;
}

let formatConfigCache: Awaited<ReturnType<typeof resolveFormatConfig>> | null = null;

export const generateSpinnerComponent = async (
  options: GenerateSpinnerOptions
): Promise<GeneratedSpinner> => {
  const { componentName, svgContent, viewBox, config, animationLib, defaultDuration } = options;

  const cleanedSVG = cleanSVGAttributes(svgContent);
  const header = generateMkiconHeader(config.framework);

  let content: string;
  let extension: string;

  // Resolve format config before template call so layout options (lineWidth, etc.) are available
  let resolvedFormatConfig: Awaited<ReturnType<typeof resolveFormatConfig>> | null = null;
  if (config.adaptToProject) {
    try {
      if (!formatConfigCache) {
        formatConfigCache = await resolveFormatConfig(process.cwd());
      }
      resolvedFormatConfig = formatConfigCache;
    } catch {
      // Silent fallback
    }
  }

  const templateOptions = {
    componentName,
    svgContent: cleanedSVG,
    viewBox,
    typescript: config.typescript,
    animationLib,
    defaultDuration,
    header,
    ...(config.adaptToProject && resolvedFormatConfig && {
      lineWidth: resolvedFormatConfig.lineWidth,
      jsxQuotes: resolvedFormatConfig.jsxQuotes,
      bracketSameLine: resolvedFormatConfig.bracketSameLine,
    }),
  };

  switch (config.framework) {
    case "react":
      content = generateReactSpinnerComponent(templateOptions);
      extension = config.typescript ? ".tsx" : ".jsx";
      break;

    case "react-native":
      content = generateReactNativeSpinnerComponent(templateOptions);
      extension = config.typescript ? ".tsx" : ".jsx";
      break;

    case "vue":
      content = generateVueSpinnerComponent(templateOptions);
      extension = ".vue";
      break;

    case "svelte":
      content = generateSvelteSpinnerComponent(templateOptions);
      extension = ".svelte";
      break;

    default:
      throw new Error(`Unsupported framework: ${config.framework}`);
  }

  if (config.adaptToProject && resolvedFormatConfig) {
    try {
      content = applyFormatting(content, resolvedFormatConfig, config.framework);
    } catch {
      // Silent fallback
    }
  }

  return {
    content,
    filename: `${componentName}${extension}`,
    extension,
  };
};

export const clearSpinnerFormatConfigCache = (): void => {
  formatConfigCache = null;
};
