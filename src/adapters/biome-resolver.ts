import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { DetectedFormatConfig } from "./types";

import { DEFAULT_FORMAT_CONFIG } from "./types";

interface BiomeFormatterConfig {
  enabled?: boolean;
  indentStyle?: "tab" | "space";
  indentWidth?: number;
  lineWidth?: number;
}

interface BiomeJSFormatterConfig {
  quoteStyle?: "double" | "single";
  jsxQuoteStyle?: "double" | "single";
  trailingCommas?: "none" | "es5" | "all";
  semicolons?: "always" | "asNeeded";
  arrowParentheses?: "always" | "asNeeded";
  bracketSpacing?: boolean;
  bracketSameLine?: boolean;
}

interface BiomeConfig {
  formatter?: BiomeFormatterConfig;
  javascript?: { formatter?: BiomeJSFormatterConfig };
}

/**
 * Resolve Biome formatting configuration from biome.json or biome.jsonc
 * Returns null if Biome config is not found or not applicable
 */
export const resolveBiomeConfig = async (cwd: string): Promise<DetectedFormatConfig | null> => {
  try {
    const biomePath = join(cwd, "biome.json");
    const biomeJsoncPath = join(cwd, "biome.jsonc");

    let configPath: string | null = null;
    if (existsSync(biomePath)) {configPath = biomePath;}
    else if (existsSync(biomeJsoncPath)) {configPath = biomeJsoncPath;}
    else {return null;}

    const raw = readFileSync(configPath, "utf-8");
    // Strip JSONC comments for biome.jsonc
    const cleaned = raw.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const biomeConfig: BiomeConfig = JSON.parse(cleaned);

    const fmt = biomeConfig.formatter;
    const jsFmt = biomeConfig.javascript?.formatter;

    // If no formatter config at all, return null
    if (!fmt && !jsFmt) {return null;}

    // If formatter is explicitly disabled, skip
    if (fmt?.enabled === false) {return null;}

    return {
      quotes: jsFmt?.quoteStyle === "single" ? "single" : "double",
      jsxQuotes: jsFmt?.jsxQuoteStyle === "single" ? "single" : "double",
      indentStyle: fmt?.indentStyle === "tab" ? "tab" : "space",
      indentSize: fmt?.indentWidth ?? DEFAULT_FORMAT_CONFIG.indentSize,
      semi: jsFmt?.semicolons !== "asNeeded",
      lineWidth: fmt?.lineWidth ?? DEFAULT_FORMAT_CONFIG.lineWidth,
      endOfLine: DEFAULT_FORMAT_CONFIG.endOfLine,
      trailingComma: jsFmt?.trailingCommas ?? DEFAULT_FORMAT_CONFIG.trailingComma,
      bracketSpacing: jsFmt?.bracketSpacing ?? DEFAULT_FORMAT_CONFIG.bracketSpacing,
      bracketSameLine: jsFmt?.bracketSameLine ?? DEFAULT_FORMAT_CONFIG.bracketSameLine,
      arrowParens: jsFmt?.arrowParentheses === "asNeeded" ? "avoid" : "always",
      source: "biome",
      configPath,
    };
  } catch {
    return null;
  }
};
