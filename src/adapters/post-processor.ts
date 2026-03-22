import type { DetectedFormatConfig } from "./types";

/**
 * Apply formatting rules to generated component code
 * Uses string manipulation for performance
 */
export const applyFormatting = (
  code: string,
  formatConfig: DetectedFormatConfig,
  framework: string
): string => {
  let formatted = code;

  // Apply formatting transformations in order
  formatted = applyQuotes(formatted, formatConfig.quotes, framework);
  formatted = applyIndentation(formatted, formatConfig.indentStyle, formatConfig.indentSize);
  formatted = applySemicolons(formatted, formatConfig.semi);
  formatted = applyTrailingCommas(formatted, formatConfig.trailingComma);
  formatted = applyBracketSpacing(formatted, formatConfig.bracketSpacing);
  formatted = applyArrowParens(formatted, formatConfig.arrowParens);
  formatted = applyLineEndings(formatted, formatConfig.endOfLine);

  return formatted;
};

/**
 * Replace quotes in code
 * Converts all double-quoted string literals to single quotes.
 * Skips lines that are purely multi-line JSX/Vue opening tags (no closing >).
 */
const applyQuotes = (code: string, quoteStyle: "single" | "double", _framework: string): string => {
  if (quoteStyle === "single") {
    const lines = code.split("\n");
    const result: string[] = [];

    for (const line of lines) {
      // Skip lines that are part of a multi-line JSX/HTML opening tag
      // e.g. a line like `  className="foo"` inside a multi-line element
      const isMultiLineTagAttribute =
        /^\s*[a-zA-Z:@[\]_-][\w:@[\]_.-]*="[^"]*"/.test(line) && !line.includes("<");

      if (isMultiLineTagAttribute) {
        result.push(line);
      } else {
        result.push(line.replace(/"([^"]*)"/g, (_match, content) => `'${content}'`));
      }
    }

    return result.join("\n");
  }

  return code;
};

/**
 * Adjust indentation style and size
 */
const applyIndentation = (code: string, style: "space" | "tab", size: number): string => {
  const lines = code.split("\n");
  const currentIndentSize = 2; // mkicon default

  return lines
    .map((line) => {
      const leadingSpaces = line.match(/^( +)/)?.[1] || "";
      if (!leadingSpaces) {
        return line;
      }

      const currentLevel = leadingSpaces.length / currentIndentSize;
      const content = line.trimStart();

      if (style === "tab") {
        return "\t".repeat(currentLevel) + content;
      } else if (size !== currentIndentSize) {
        return " ".repeat(currentLevel * size) + content;
      }

      return line;
    })
    .join("\n");
};

/**
 * Add or remove semicolons
 */
const applySemicolons = (code: string, useSemi: boolean): string => {
  if (!useSemi) {
    // Remove semicolons at end of statements (not in for loops)
    // Simple heuristic: remove ; followed by newline or }
    return code.replace(/;(\s*\n)/g, "$1").replace(/;(\s*\})/g, "$1");
  }
  return code;
};

/**
 * Adjust trailing commas in objects and arrays
 */
const applyTrailingCommas = (code: string, trailingComma: "none" | "es5" | "all"): string => {
  if (trailingComma === "none") {
    // Remove trailing commas
    return code.replace(/,(\s*[\]}])/g, "$1");
  } else if (trailingComma === "all") {
    // Add trailing commas where missing (simplified)
    // This is complex to do perfectly with regex, so we do basic cases
    // Skip TypeScript interface/type properties (they end with ; not ,)
    return code.replace(/([^\s,;])(\s*\n\s*[\]}])/g, "$1,$2");
  }
  // "es5" is the default in our templates, no change needed
  return code;
};

/**
 * Adjust bracket spacing in object literals
 */
const applyBracketSpacing = (code: string, bracketSpacing: boolean): string => {
  if (!bracketSpacing) {
    // Remove spaces inside object braces: { foo } -> {foo}
    return code.replace(/\{\s+/g, "{").replace(/\s+\}/g, "}");
  } else {
    // Add spaces inside object braces: {foo} -> { foo }
    // But not for empty objects: {} stays {}
    return code.replace(/\{([^\s}])/g, "{ $1").replace(/([^\s{])\}/g, "$1 }");
  }
};

/**
 * Adjust arrow function parentheses
 */
const applyArrowParens = (code: string, arrowParens: "always" | "avoid"): string => {
  if (arrowParens === "avoid") {
    // Remove parens around single params: (x) => x becomes x => x
    return code.replace(/\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)\s*=>/g, "$1 =>");
  } else {
    // Add parens around single params: x => x becomes (x) => x
    // This is tricky to do reliably with regex, skip for now as mkicon already uses "always"
  }
  return code;
};

/**
 * Normalize line endings
 */
const applyLineEndings = (code: string, endOfLine: "lf" | "crlf" | "auto"): string => {
  if (endOfLine === "crlf") {
    return code.replace(/\n/g, "\r\n");
  } else if (endOfLine === "lf") {
    return code.replace(/\r\n/g, "\n");
  }
  // "auto" leaves as-is
  return code;
};
