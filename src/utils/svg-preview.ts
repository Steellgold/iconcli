import chalk from "chalk";

/**
 * Render an SVG to a terminal image string (no output — caller decides placement).
 * Returns null if rendering fails or the terminal doesn't support images.
 */
export const renderSVGToString = async (
  svgContent: string,
  widthCols = 24
): Promise<string | null> => {
  try {
    const [{ Resvg }, terminalImage] = await Promise.all([
      import("@resvg/resvg-js"),
      import("terminal-image"),
    ]);

    const svgWithSize = ensureSvgDimensions(svgContent, 512);

    const resvg = new Resvg(svgWithSize, {
      fitTo: { mode: "width", value: 512 },
      background: "white",
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    const rendered = await terminalImage.default.buffer(pngBuffer, {
      width: widthCols,
      preserveAspectRatio: true,
    });

    return rendered && rendered.trim() ? rendered : null;
  } catch {
    return null;
  }
};

/**
 * Render an SVG in the terminal using @resvg/resvg-js + terminal-image.
 * Silently skips if the terminal doesn't support image rendering or if packages fail to load.
 */
export const previewSVGInTerminal = async (svgContent: string): Promise<void> => {
  const rendered = await renderSVGToString(svgContent, 24);

  if (rendered) {
    process.stdout.write("\n");
    process.stdout.write(rendered);
    process.stdout.write("\n");
  } else {
    printAsciiPreview(svgContent);
  }
};

/**
 * Strip ANSI escape codes from a string to get the visible character count.
 */
export const stripAnsi = (str: string): string =>
  // eslint-disable-next-line no-control-regex
  str.replace(/\x1B\[[0-9;]*m/g, "");

/**
 * Pad a string (with ANSI codes) to a given visible width.
 */
export const padVisible = (str: string, width: number): string => {
  const visible = stripAnsi(str).length;
  return str + " ".repeat(Math.max(0, width - visible));
};

/**
 * Truncate a string to a max visible length, adding "…" if needed.
 */
const truncate = (str: string, max: number): string => {
  if (str.length <= max) return str;
  // For paths, keep the end (filename) rather than the beginning
  return "…" + str.slice(-(max - 1));
};

/**
 * Render SVG info + image side-by-side in the terminal.
 * Info panel on the left, image on the right.
 */
export const previewSVGSideBySide = async (
  svgContent: string,
  info: { label: string; value: string }[]
): Promise<void> => {
  const IMAGE_COLS = 28;
  const LABEL_WIDTH = 12;
  const VALUE_MAX = 22;
  // indent(2) + label(LABEL_WIDTH) + space(1) + value(VALUE_MAX) + gap(2)
  const INFO_WIDTH = 2 + LABEL_WIDTH + 1 + VALUE_MAX + 2;
  const rendered = await renderSVGToString(svgContent, IMAGE_COLS);

  if (!rendered) {
    printAsciiPreview(svgContent);
    return;
  }

  const imageLines = rendered.split("\n").filter((l) => l.length > 0);

  // Build info lines — truncate values so they never overflow INFO_WIDTH
  const infoLines: string[] = [
    chalk.bold("  Preview"),
    chalk.dim("  " + "─".repeat(INFO_WIDTH - 2)),
    ...info.map(({ label, value }) => {
      const truncatedValue = truncate(value, VALUE_MAX);
      return `  ${chalk.dim(label.padEnd(LABEL_WIDTH))} ${chalk.white(truncatedValue)}`;
    }),
  ];

  // Pad info lines to INFO_WIDTH, then append image lines
  const totalRows = Math.max(infoLines.length, imageLines.length);
  const output: string[] = [];

  for (let i = 0; i < totalRows; i++) {
    const left = padVisible(infoLines[i] ?? "", INFO_WIDTH);
    const right = imageLines[i] ?? "";
    output.push(left + right);
  }

  process.stdout.write("\n");
  process.stdout.write(output.join("\n"));
  process.stdout.write("\n\n");
};

/**
 * Fallback: print a minimal text summary of the SVG structure.
 */
const printAsciiPreview = (svgContent: string): void => {
  const viewBox = svgContent.match(/viewBox="([^"]+)"/)?.[1] ?? "unknown";
  const pathCount = (svgContent.match(/<path/g) ?? []).length;
  const circleCount = (svgContent.match(/<circle/g) ?? []).length;
  const rectCount = (svgContent.match(/<rect/g) ?? []).length;
  const polylineCount = (svgContent.match(/<polyline/g) ?? []).length;

  const elements = [
    pathCount > 0 && `${pathCount} path${pathCount > 1 ? "s" : ""}`,
    circleCount > 0 && `${circleCount} circle${circleCount > 1 ? "s" : ""}`,
    rectCount > 0 && `${rectCount} rect${rectCount > 1 ? "s" : ""}`,
    polylineCount > 0 && `${polylineCount} polyline${polylineCount > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(", ");

  process.stdout.write(
    chalk.dim(`  SVG preview: viewBox=${viewBox}${elements ? `, ${elements}` : ""}\n`)
  );
};

/**
 * Ensure the SVG has explicit width/height for rendering.
 */
const ensureSvgDimensions = (svg: string, size: number): string => {
  if (svg.includes('width="') && svg.includes('height="')) {return svg;}
  return svg.replace(/<svg/, `<svg width="${size}" height="${size}"`);
};
