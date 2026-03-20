import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { DetectedFormatConfig } from "./types";

import { DEFAULT_FORMAT_CONFIG } from "./types";

type ESLintRuleEntry = string | number | [string | number, ...unknown[]];

interface ESLintRulesObject {
  [key: string]: ESLintRuleEntry | undefined;
}

interface ESLintConfig {
  rules?: ESLintRulesObject;
}

/**
 * Extract the value portion of an ESLint rule entry
 * ["error", "single"] -> "single"
 * ["warn", 2] -> 2
 * "single" -> "single"
 */
const getRuleValue = (rule: ESLintRuleEntry | undefined): unknown => {
  if (rule === undefined) {return undefined;}
  if (Array.isArray(rule)) {return rule[1];}
  return rule;
};

/**
 * Try to load an ESLint config from static config files (JSON only)
 * Skips .eslintrc.js / eslint.config.js (dynamic, cannot be safely parsed)
 */
const loadESLintConfigFile = (cwd: string): ESLintConfig | null => {
  // Try .eslintrc.json
  const jsonPath = join(cwd, ".eslintrc.json");
  if (existsSync(jsonPath)) {
    try {
      return JSON.parse(readFileSync(jsonPath, "utf-8")) as ESLintConfig;
    } catch {
      /* ignore parse errors */
    }
  }

  // Try .eslintrc (may be JSON or YAML — only attempt JSON)
  const rcPath = join(cwd, ".eslintrc");
  if (existsSync(rcPath)) {
    try {
      return JSON.parse(readFileSync(rcPath, "utf-8")) as ESLintConfig;
    } catch {
      /* ignore — could be YAML */
    }
  }

  // Try package.json eslintConfig field
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
      if (pkg.eslintConfig && typeof pkg.eslintConfig === "object") {
        return pkg.eslintConfig as ESLintConfig;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
};

const FORMATTING_RULES = [
  "quotes",
  "@typescript-eslint/quotes",
  "semi",
  "@typescript-eslint/semi",
  "indent",
  "@typescript-eslint/indent",
  "comma-dangle",
  "@typescript-eslint/comma-dangle",
  "eol-last",
  "max-len",
];

/**
 * Resolve ESLint formatting rules from static config files
 * Returns null if no ESLint config is found or has no formatting rules
 */
export const resolveESLintConfig = async (cwd: string): Promise<DetectedFormatConfig | null> => {
  try {
    const eslintConfig = loadESLintConfigFile(cwd);
    if (!eslintConfig?.rules) {return null;}

    const rules = eslintConfig.rules;

    // Only proceed if at least one formatting rule is defined
    const hasFormattingRules = FORMATTING_RULES.some((key) => rules[key] !== undefined);
    if (!hasFormattingRules) {return null;}

    // Quotes: prefer @typescript-eslint/quotes over quotes
    const quotesValue = getRuleValue(rules["@typescript-eslint/quotes"] ?? rules["quotes"]);
    const quotes: "single" | "double" = quotesValue === "single" ? "single" : "double";

    // Semicolons: "never" -> no semi, everything else -> semi
    const semiValue = getRuleValue(rules["@typescript-eslint/semi"] ?? rules["semi"]);
    const semi: boolean = semiValue !== "never";

    // Indentation: number -> space with that size, "tab" -> tabs
    const indentValue = getRuleValue(rules["@typescript-eslint/indent"] ?? rules["indent"]);
    const indentStyle: "space" | "tab" = indentValue === "tab" ? "tab" : "space";
    const indentSize: number =
      typeof indentValue === "number" ? indentValue : DEFAULT_FORMAT_CONFIG.indentSize;

    // Trailing commas via comma-dangle
    const commaValue = getRuleValue(
      rules["@typescript-eslint/comma-dangle"] ?? rules["comma-dangle"]
    );
    let trailingComma: "none" | "es5" | "all" = DEFAULT_FORMAT_CONFIG.trailingComma;
    if (commaValue === "never" || commaValue === "ignore") {trailingComma = "none";}
    else if (commaValue === "always-multiline") {trailingComma = "es5";}
    else if (commaValue === "always") {trailingComma = "all";}

    // Line width from max-len rule
    const maxLenValue = getRuleValue(rules["max-len"]);
    let lineWidth: number = DEFAULT_FORMAT_CONFIG.lineWidth;
    if (typeof maxLenValue === "number") {
      lineWidth = maxLenValue;
    } else if (
      maxLenValue !== null &&
      typeof maxLenValue === "object" &&
      "code" in (maxLenValue as object) &&
      typeof (maxLenValue as Record<string, unknown>).code === "number"
    ) {
      lineWidth = (maxLenValue as Record<string, unknown>).code as number;
    }

    return {
      ...DEFAULT_FORMAT_CONFIG,
      quotes,
      semi,
      indentStyle,
      indentSize,
      trailingComma,
      lineWidth,
      source: "eslint",
    };
  } catch {
    return null;
  }
};
