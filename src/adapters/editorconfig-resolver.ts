import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { DetectedFormatConfig } from "./types.js";

import { DEFAULT_FORMAT_CONFIG } from "./types.js";

type SectionSettings = Record<string, string>;

/**
 * Parse an .editorconfig file into a map of section -> settings
 */
const parseEditorConfigFile = (content: string): Record<string, SectionSettings> => {
  const sections: Record<string, SectionSettings> = {};
  let currentSection = "";

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    // Skip comments and blank lines
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).trim();
      sections[currentSection] = {};
      continue;
    }

    if (currentSection && line.includes("=")) {
      const eqIdx = line.indexOf("=");
      const key = line.slice(0, eqIdx).trim().toLowerCase();
      const value = line.slice(eqIdx + 1).trim().toLowerCase();
      sections[currentSection][key] = value;
    }
  }

  return sections;
};

/**
 * Check whether a section glob pattern applies to JS/TS files
 */
const sectionMatchesJSTS = (section: string): boolean => {
  if (section === "*") return true;
  const jstsExts = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs", ".mts", ".cts"];
  return jstsExts.some((ext) => section.includes(ext));
};

/**
 * Resolve EditorConfig formatting settings for JS/TS files
 * Returns null if .editorconfig is not found or has no relevant settings
 */
export const resolveEditorConfig = async (cwd: string): Promise<DetectedFormatConfig | null> => {
  try {
    const editorConfigPath = join(cwd, ".editorconfig");
    if (!existsSync(editorConfigPath)) return null;

    const content = readFileSync(editorConfigPath, "utf-8");
    const sections = parseEditorConfigFile(content);

    // Merge: [*] provides the base, then JS/TS-specific sections override
    const merged: SectionSettings = {};

    if (sections["*"]) Object.assign(merged, sections["*"]);

    for (const [section, values] of Object.entries(sections)) {
      if (section !== "*" && sectionMatchesJSTS(section)) {
        Object.assign(merged, values);
      }
    }

    // Require at least one useful formatting key
    const hasSettings = ["indent_style", "indent_size", "end_of_line"].some((k) => k in merged);
    if (!hasSettings) return null;

    const indentStyle: "space" | "tab" = merged["indent_style"] === "tab" ? "tab" : "space";

    const indentSizeRaw = parseInt(merged["indent_size"] ?? merged["tab_width"] ?? "2", 10);
    const indentSize = isNaN(indentSizeRaw) ? DEFAULT_FORMAT_CONFIG.indentSize : indentSizeRaw;

    const eol = merged["end_of_line"];
    const endOfLine: "lf" | "crlf" | "auto" =
      eol === "crlf" ? "crlf" : eol === "lf" ? "lf" : DEFAULT_FORMAT_CONFIG.endOfLine;

    return {
      ...DEFAULT_FORMAT_CONFIG,
      indentStyle,
      indentSize,
      endOfLine,
      source: "editorconfig",
      configPath: editorConfigPath,
    };
  } catch {
    return null;
  }
};
