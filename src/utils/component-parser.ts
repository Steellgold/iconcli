/**
 * Extract raw SVG content from a generated icon component file (TSX/Vue/Svelte).
 */

const JSX_TO_SVG_ATTRS: Record<string, string> = {
  strokeWidth: "stroke-width",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeOpacity: "stroke-opacity",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  clipRule: "clip-rule",
  clipPath: "clip-path",
  markerEnd: "marker-end",
  markerStart: "marker-start",
  markerMid: "marker-mid",
};

/**
 * Remove JSX expression blocks `{...}` with support for nested braces (3 passes).
 */
const removeJsxExpressions = (str: string): string => {
  let result = str;
  for (let i = 0; i < 4; i++) {
    result = result.replace(/\{[^{}]*\}/g, "");
  }
  return result;
};

export const extractSvgFromComponent = (content: string): string | null => {
  const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
  if (!svgMatch) {return null;}

  const svg = svgMatch[0];

  // --- Fix the opening <svg ...> tag ---
  const openTagEnd = svg.indexOf(">");
  if (openTagEnd === -1) {return null;}

  let openTag = svg.slice(0, openTagEnd + 1);

  // Remove all JSX expressions (multi-pass for nested braces)
  openTag = removeJsxExpressions(openTag);

  // Convert prop expression remainders and camelCase string attrs
  // e.g. strokeLinecap="round" → stroke-linecap="round"
  for (const [from, to] of Object.entries(JSX_TO_SVG_ATTRS)) {
    openTag = openTag.replaceAll(`${from}="`, `${to}="`);
  }

  // Add essential missing attributes with safe defaults
  if (!openTag.includes("width="))
    {openTag = openTag.replace("<svg", `<svg width="24"`);}
  if (!openTag.includes("height="))
    {openTag = openTag.replace("<svg", `<svg height="24"`);}
  if (!openTag.includes("stroke="))
    {openTag = openTag.replace("<svg", `<svg stroke="currentColor"`);}
  if (!openTag.includes("stroke-width="))
    {openTag = openTag.replace("<svg", `<svg stroke-width="2"`);}
  if (!openTag.includes("stroke-linecap="))
    {openTag = openTag.replace("<svg", `<svg stroke-linecap="round"`);}
  if (!openTag.includes("stroke-linejoin="))
    {openTag = openTag.replace("<svg", `<svg stroke-linejoin="round"`);}
  if (!openTag.includes("fill="))
    {openTag = openTag.replace("<svg", `<svg fill="none"`);}

  // Normalise whitespace in the opening tag
  openTag = openTag.replace(/\s+/g, " ").replace("< svg", "<svg");

  // --- Fix the inner SVG content ---
  let inner = svg.slice(openTagEnd + 1);

  // Convert camelCase attributes on inner elements
  for (const [from, to] of Object.entries(JSX_TO_SVG_ATTRS)) {
    inner = inner.replaceAll(`${from}="`, `${to}="`);
  }

  // Remove any leftover JSX expressions in inner content
  inner = removeJsxExpressions(inner);

  return openTag + inner;
};
