/**
 * Detected formatting configuration from project config files
 */
export interface DetectedFormatConfig {
  // Quotes
  quotes: "single" | "double";
  jsxQuotes?: "single" | "double";

  // Indentation
  indentStyle: "space" | "tab";
  indentSize: number;

  // Semicolons
  semi: boolean;

  // Line breaks
  lineWidth: number;
  endOfLine: "lf" | "crlf" | "auto";

  // Trailing commas
  trailingComma: "none" | "es5" | "all";

  // Brackets & spacing
  bracketSpacing: boolean;
  bracketSameLine: boolean;
  arrowParens: "always" | "avoid";

  // Source info (for debugging/logging)
  source?: "prettier" | "default";
  configPath?: string;
}

/**
 * Default formatting configuration (mkicon defaults)
 */
export const DEFAULT_FORMAT_CONFIG: DetectedFormatConfig = {
  quotes: "double",
  jsxQuotes: "double",
  indentStyle: "space",
  indentSize: 2,
  semi: true,
  lineWidth: 100,
  endOfLine: "lf",
  trailingComma: "es5",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  source: "default",
};
