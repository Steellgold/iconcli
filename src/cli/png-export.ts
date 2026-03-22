import { readLockFile } from "@/core/diff-checker";
import { extractSvgFromComponent } from "@/utils/component-parser";
import { logger } from "@/utils/logger";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { Config } from "@/config/schema";

export interface PngExportOptions {
  projectRoot: string;
  config?: Config;
  componentPath?: string;
  all?: boolean;
  sizes?: number[];
  scale?: number;
  background?: string;
  output?: string;
}

const SUPPORTED_EXTS = [".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte"];

const renderSvgToPng = async (
  svgContent: string,
  size: number,
  scale: number,
  background?: string
): Promise<Buffer> => {
  const { Resvg } = await import("@resvg/resvg-js");

  const pixelSize = Math.round(size * scale);

  // Inject explicit dimensions so resvg knows the viewport
  let svg = svgContent;
  if (!svg.includes('width="') || !svg.includes('height="')) {
    svg = svg.replace(/<svg/, `<svg width="${pixelSize}" height="${pixelSize}"`);
  } else {
    svg = svg
      .replace(/width="[^"]*"/, `width="${pixelSize}"`)
      .replace(/height="[^"]*"/, `height="${pixelSize}"`);
  }

  const opts: ConstructorParameters<typeof Resvg>[1] = {
    fitTo: { mode: "width", value: pixelSize },
  };

  if (background && background !== "transparent") {
    opts.background = background;
  }

  const resvg = new Resvg(svg, opts);
  return Buffer.from(resvg.render().asPng());
};

const getSvgForComponent = async (
  absPath: string,
  projectRoot: string
): Promise<string> => {
  const filename = path.basename(absPath);

  // Prefer lock file — original clean SVG
  const lock = await readLockFile(projectRoot);
  const entry = lock[filename];
  if (entry?.svgContent) return entry.svgContent;

  // Fallback: extract from component source
  const content = await fs.readFile(absPath, "utf-8");
  const svg = extractSvgFromComponent(content);
  if (!svg) throw new Error(`Could not extract SVG from ${filename}`);
  return svg;
};

const resolveComponentPath = async (
  input: string,
  config: Config | undefined,
  projectRoot: string
): Promise<string> => {
  // Absolute or relative path
  const abs = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
  if (existsSync(abs)) return abs;

  // Try as component name in the icons folder
  if (config) {
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    for (const ext of SUPPORTED_EXTS) {
      const candidate = path.join(iconsDir, `${input}${ext}`);
      if (existsSync(candidate)) return candidate;
    }
  }

  throw new Error(`File not found: ${input}`);
};

const exportComponent = async (
  absPath: string,
  projectRoot: string,
  sizes: number[],
  scale: number,
  background: string | undefined,
  outputDir: string
): Promise<void> => {
  const ext = path.extname(absPath);
  if (!SUPPORTED_EXTS.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  const baseName = path.basename(absPath, ext);
  const svg = await getSvgForComponent(absPath, projectRoot);

  await fs.mkdir(outputDir, { recursive: true });

  for (const size of sizes) {
    const png = await renderSvgToPng(svg, size, scale, background);
    const suffix = sizes.length > 1 ? `-${size}` : "";
    const scaleStr = scale !== 1 ? `@${scale}x` : "";
    const filename = `${baseName}${suffix}${scaleStr}.png`;
    const outPath = path.join(outputDir, filename);
    await fs.writeFile(outPath, png);
    logger.success(`${path.relative(projectRoot, outPath)} (${size * scale}px)`);
  }
};

export const runPngExport = async (options: PngExportOptions): Promise<void> => {
  const {
    projectRoot,
    config,
    componentPath,
    all = false,
    sizes = [24],
    scale = 1,
    background,
    output,
  } = options;

  const outputDir = output
    ? path.isAbsolute(output)
      ? output
      : path.resolve(process.cwd(), output)
    : path.resolve(process.cwd(), "exports");

  if (all) {
    if (!config) {
      logger.error("Config required for --all. Run from a project with a .mkicon.json.");
      process.exit(1);
    }

    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    if (!existsSync(iconsDir)) {
      logger.error(`Icons folder not found: ${iconsDir}`);
      process.exit(1);
    }

    const entries = await fs.readdir(iconsDir);
    const components = entries.filter((f) => SUPPORTED_EXTS.includes(path.extname(f)));

    if (components.length === 0) {
      logger.warning("No icon components found.");
      return;
    }

    logger.info(`Exporting ${components.length} icon(s) → ${path.relative(projectRoot, outputDir)}/`);
    logger.separator();

    let ok = 0;
    let fail = 0;
    for (const file of components) {
      try {
        await exportComponent(
          path.join(iconsDir, file),
          projectRoot,
          sizes,
          scale,
          background,
          outputDir
        );
        ok++;
      } catch (err) {
        logger.warning(`  Skipped ${file}: ${err instanceof Error ? err.message : String(err)}`);
        fail++;
      }
    }

    logger.separator();
    logger.success(`Done — ${ok} exported${fail > 0 ? `, ${fail} failed` : ""}`);
    return;
  }

  if (!componentPath) {
    logger.error("Usage: mkicon png <component> [options]");
    logger.print("       mkicon png --all [options]");
    process.exit(1);
  }

  const absPath = await resolveComponentPath(componentPath, config, projectRoot).catch((err) => {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });

  // Single file: output next to the source by default
  const singleOutputDir = output
    ? path.isAbsolute(output)
      ? output
      : path.resolve(process.cwd(), output)
    : path.dirname(absPath);

  await exportComponent(absPath, projectRoot, sizes, scale, background, singleOutputDir);
};
