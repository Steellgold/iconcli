import type { DetectedFormatConfig } from "./types.js";

import { join } from "path";

import { DEFAULT_FORMAT_CONFIG } from "./types.js";
import { loadPrettier } from "./project-detector.js";

/**
 * Resolve Prettier configuration for the current project
 * Uses Prettier's resolveConfig API if available
 */
export const resolvePrettierConfig = async (
  cwd: string,
  filePath?: string
): Promise<DetectedFormatConfig> => {
  try {
    const prettier = await loadPrettier(cwd);

    if (!prettier || !prettier.resolveConfig) {
      return DEFAULT_FORMAT_CONFIG;
    }

    // Use Prettier's resolveConfig API to handle all config formats and extends
    // Pass a file path (not a directory) for resolveConfig to work properly
    const filePathToCheck = filePath || join(cwd, "dummy.js");
    const prettierConfig = await prettier.resolveConfig(filePathToCheck, {
      editorconfig: true, // Also respect .editorconfig
    });

    if (!prettierConfig) {
      return DEFAULT_FORMAT_CONFIG;
    }

    // Map Prettier config to our DetectedFormatConfig
    const config: DetectedFormatConfig = {
      quotes: prettierConfig.singleQuote ? "single" : "double",
      jsxQuotes: prettierConfig.jsxSingleQuote ? "single" : "double",
      indentStyle: prettierConfig.useTabs ? "tab" : "space",
      indentSize: prettierConfig.tabWidth ?? DEFAULT_FORMAT_CONFIG.indentSize,
      semi: prettierConfig.semi ?? DEFAULT_FORMAT_CONFIG.semi,
      lineWidth: prettierConfig.printWidth ?? DEFAULT_FORMAT_CONFIG.lineWidth,
      endOfLine: prettierConfig.endOfLine ?? DEFAULT_FORMAT_CONFIG.endOfLine,
      trailingComma: prettierConfig.trailingComma ?? DEFAULT_FORMAT_CONFIG.trailingComma,
      bracketSpacing: prettierConfig.bracketSpacing ?? DEFAULT_FORMAT_CONFIG.bracketSpacing,
      bracketSameLine: prettierConfig.bracketSameLine ?? DEFAULT_FORMAT_CONFIG.bracketSameLine,
      arrowParens: prettierConfig.arrowParens ?? DEFAULT_FORMAT_CONFIG.arrowParens,
      source: "prettier",
      configPath: await findConfigPath(prettier, cwd),
    };

    return config;
  } catch (error) {
    // Silent fallback to defaults
    if (process.env.DEBUG) {
      console.warn("[mkicon] Failed to resolve Prettier config:", error);
    }
    return DEFAULT_FORMAT_CONFIG;
  }
};

/**
 * Find the path to the Prettier config file
 */
const findConfigPath = async (prettier: any, cwd: string): Promise<string | undefined> => {
  try {
    if (prettier.resolveConfigFile) {
      const configFile = await prettier.resolveConfigFile(cwd);
      return configFile || undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

/**
 * Format a DetectedFormatConfig for display
 */
export const formatConfigForDisplay = (config: DetectedFormatConfig): string => {
  const lines: string[] = [];

  lines.push(`Source: ${config.source || "default"}`);
  if (config.configPath) {
    lines.push(`Config file: ${config.configPath}`);
  }
  lines.push("");
  lines.push("Formatting rules:");
  lines.push(`  • Quotes: ${config.quotes}`);
  if (config.jsxQuotes && config.jsxQuotes !== config.quotes) {
    lines.push(`  • JSX Quotes: ${config.jsxQuotes}`);
  }
  lines.push(`  • Semicolons: ${config.semi ? "yes" : "no"}`);
  lines.push(
    `  • Indent: ${config.indentSize} ${config.indentStyle}${config.indentSize > 1 ? "s" : ""}`
  );
  lines.push(`  • Line width: ${config.lineWidth}`);
  lines.push(`  • Trailing commas: ${config.trailingComma}`);
  lines.push(`  • Bracket spacing: ${config.bracketSpacing ? "yes" : "no"}`);
  lines.push(`  • Arrow parens: ${config.arrowParens}`);
  lines.push(`  • End of line: ${config.endOfLine}`);

  return lines.join("\n");
};
