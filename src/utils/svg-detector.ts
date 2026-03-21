/**
 * Try to detect an icon name from SVG content by inspecting known library attributes.
 * Works reliably with Lucide, Heroicons, Tabler, Feather, etc.
 * Returns a kebab-case name or null if nothing is found.
 */
export const detectIconNameFromSvg = (svgContent: string): string | null => {
  // Lucide: class="lucide lucide-arrow-right" or class="lucide-arrow-right ..."
  const lucideClass = svgContent.match(/\blucide-([a-z0-9][a-z0-9-]*[a-z0-9])\b/);
  if (lucideClass?.[1]) {return lucideClass[1];}

  // data-lucide="arrow-right" (Lucide JS embed)
  const dataLucide = svgContent.match(/data-lucide="([a-z0-9][a-z0-9-]*)"/);
  if (dataLucide?.[1]) {return dataLucide[1];}

  // aria-label="arrow-right" or aria-label="Arrow Right"
  const ariaLabel = svgContent.match(/aria-label="([^"]+)"/);
  if (ariaLabel?.[1]) {return toKebabCase(ariaLabel[1]);}

  // <title>Arrow Right</title> or <title>arrow-right</title>
  const titleEl = svgContent.match(/<title>([^<]+)<\/title>/i);
  if (titleEl?.[1]) {
    const t = titleEl[1].trim();
    // Ignore generic titles
    if (t && !/^(icon|svg|image|graphic)$/i.test(t)) {
      return toKebabCase(t);
    }
  }

  // id="arrow-right" on the <svg> tag itself
  const svgId = svgContent.match(/<svg[^>]+\bid="([a-z0-9][a-z0-9-]*)"/i);
  if (svgId?.[1]) {return svgId[1];}

  return null;
};

const toKebabCase = (str: string): string =>
  str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
