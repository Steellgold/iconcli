import { readLockFile } from "@/core/diff-checker";
import { extractSvgFromComponent } from "@/utils/component-parser";
import { logger } from "@/utils/logger";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface SvgExportOptions {
  projectRoot: string;
  componentPath: string;
  output?: string;
}

export const runSvgExport = async (options: SvgExportOptions): Promise<void> => {
  const { projectRoot, componentPath, output } = options;

  const absPath = path.isAbsolute(componentPath)
    ? componentPath
    : path.resolve(process.cwd(), componentPath);

  if (!existsSync(absPath)) {
    logger.error(`File not found: ${componentPath}`);
    process.exit(1);
  }

  const filename = path.basename(absPath);
  const ext = path.extname(absPath);
  const supported = [".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte"];

  if (!supported.includes(ext)) {
    logger.error(`Unsupported file type: ${ext}. Expected one of: ${supported.join(", ")}`);
    process.exit(1);
  }

  // Try lockfile first — gives the original clean SVG
  let svgContent: string | null = null;

  const lock = await readLockFile(projectRoot);
  const lockEntry = lock[filename];
  if (lockEntry?.svgContent) {
    svgContent = lockEntry.svgContent;
    logger.info("Using original SVG from lock file");
  }

  // Fallback: extract from the component file
  if (!svgContent) {
    const content = await fs.readFile(absPath, "utf-8");
    svgContent = extractSvgFromComponent(content);

    if (!svgContent) {
      logger.error("Could not extract SVG from component. Is this a valid mkicon component?");
      process.exit(1);
    }

    logger.info("Extracted SVG from component file");
  }

  // Determine output path
  const outPath = output
    ? path.isAbsolute(output)
      ? output
      : path.resolve(process.cwd(), output)
    : absPath.replace(/\.[^.]+$/, ".svg");

  await fs.writeFile(outPath, svgContent, "utf-8");

  logger.success(`SVG exported: ${path.relative(projectRoot, outPath)}`);
};
