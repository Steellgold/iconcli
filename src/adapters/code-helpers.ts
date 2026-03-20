/**
 * Width-aware code generation helpers.
 * Pure functions — no side effects, easy to test.
 *
 * These decide single vs multi-line LAYOUT at generation time,
 * complementing the post-processor which handles character-level style (quotes, semi, etc.).
 */

/**
 * Formats a function parameter list, choosing single vs multi-line based on lineWidth.
 *
 * @param prefix - Everything before the opening `(`, e.g. `"export const Icon = "` — used only for length calculation
 * @param params - Individual param strings, e.g. `["size = 24", "color = \"currentColor\""]`
 * @param typeAnnotation - TS destructure type after `}: `, e.g. `"IconProps"`, or undefined for JS
 * @param lineWidth - Max line length
 * @returns The full parameter portion including outer parens: `({ a, b })` or `({\n  a,\n  b,\n}: Type)`
 */
export const formatFunctionSignature = (
  prefix: string,
  params: string[],
  typeAnnotation: string | undefined,
  lineWidth: number
): string => {
  const type = typeAnnotation ? `: ${typeAnnotation}` : "";
  const singleLineParams = `{ ${params.join(", ")} }${type}`;
  const fullSingleLine = `${prefix}(${singleLineParams}) => {`;

  if (fullSingleLine.length <= lineWidth) {
    return `(${singleLineParams})`;
  }

  // Multi-line: each param on its own indented line
  const lines = params.map((p) => `  ${p},`).join("\n");
  if (typeAnnotation) {
    return `({\n${lines}\n}: ${typeAnnotation})`;
  }
  return `({\n${lines}\n})`;
};

/**
 * Formats a JSX opening tag, choosing single vs multi-line based on lineWidth.
 *
 * @param tagName - JSX tag name, e.g. `"svg"` or `"Svg"`
 * @param attrs - Attribute strings, e.g. `['xmlns="http://www.w3.org/2000/svg"', "width={size}"]`
 * @param baseIndent - Indentation of the tag in the output (used for length calc and multi-line positioning)
 * @param lineWidth - Max line length
 * @param bracketSameLine - Whether the closing `>` is on the last attr line (Prettier bracketSameLine)
 * @returns The tag string without children or close tag. First line has no indent — caller provides it.
 */
export const formatJsxOpenTag = (
  tagName: string,
  attrs: string[],
  baseIndent: string,
  lineWidth: number,
  bracketSameLine: boolean
): string => {
  const attrStr = attrs.join(" ");
  const singleLine = `${baseIndent}<${tagName} ${attrStr}>`;

  if (singleLine.length <= lineWidth) {
    return `<${tagName} ${attrStr}>`;
  }

  // Multi-line: each attr on its own indented line
  const attrIndent = `${baseIndent}  `;
  const attrLines = attrs.map((a) => `${attrIndent}${a}`).join("\n");

  if (bracketSameLine) {
    return `<${tagName}\n${attrLines}>`;
  }
  return `<${tagName}\n${attrLines}\n${baseIndent}>`;
};

/**
 * Formats an import statement, choosing single vs multi-line based on lineWidth.
 *
 * @param names - Named imports, e.g. `["Svg", "Circle", "Path"]`
 * @param source - Module specifier, e.g. `"react-native-svg"`
 * @param lineWidth - Max line length
 * @param quoteChar - Quote character to use (`'"'` or `"'"`)
 * @returns The full import string (no trailing newline)
 */
export const formatImportStatement = (
  names: string[],
  source: string,
  lineWidth: number,
  quoteChar: string
): string => {
  const q = quoteChar;
  const singleLine = `import { ${names.join(", ")} } from ${q}${source}${q};`;

  if (singleLine.length <= lineWidth) {
    return singleLine;
  }

  // Multi-line: each name on its own indented line
  const nameLines = names.map((n) => `  ${n},`).join("\n");
  return `import {\n${nameLines}\n} from ${q}${source}${q};`;
};
