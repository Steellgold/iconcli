import { readLockFile, rebuildLockFile } from "@/core/diff-checker";
import type { Config } from "@/config/schema";
import { logger } from "@/utils/logger";
import { previewSVGSideBySide } from "@/utils/svg-preview";
import { extractSvgFromComponent } from "@/utils/component-parser";
import enquirer from "enquirer";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

type EnquirerExt = {
  AutoComplete: new (options: Record<string, unknown>) => { run: () => Promise<string> };
};
const { AutoComplete } = enquirer as unknown as EnquirerExt;

export interface PreviewOptions {
  projectRoot: string;
  componentName?: string;
  config?: Config;
}

export const runPreview = async (options: PreviewOptions): Promise<void> => {
  const { projectRoot, componentName, config } = options;

  let lock = await readLockFile(projectRoot);

  // Auto-rebuild lockfile if missing (e.g. fresh clone)
  if (Object.keys(lock).length === 0 && config) {
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    await rebuildLockFile(projectRoot, iconsDir);
    lock = await readLockFile(projectRoot);
  }

  // Build a full list of available components from lockfile + icons dir
  const allComponents: { name: string; svgContent: string; sourcePath: string; generatedAt: string | null }[] = [];

  for (const [key, entry] of Object.entries(lock)) {
    allComponents.push({ name: key, svgContent: entry.svgContent, sourcePath: entry.sourcePath, generatedAt: entry.generatedAt });
  }

  if (config) {
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    if (existsSync(iconsDir)) {
      const files = await fs.readdir(iconsDir);
      for (const file of files) {
        if (allComponents.some((c) => c.name.toLowerCase() === file.toLowerCase())) continue;
        const ext = path.extname(file);
        if (![".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte"].includes(ext)) continue;
        const filePath = path.join(iconsDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const svgContent = extractSvgFromComponent(content);
        if (svgContent) {
          allComponents.push({
            name: file,
            svgContent,
            sourcePath: path.relative(projectRoot, filePath),
            generatedAt: null,
          });
        }
      }
    }
  }

  if (allComponents.length === 0) {
    logger.error("No components found.");
    logger.print("Use `mkicon batch <dir>` to generate trackable components.");
    return;
  }

  // Try exact/fuzzy match on provided name
  if (componentName) {
    const match = allComponents.find(
      (c) =>
        c.name.toLowerCase() === componentName.toLowerCase() ||
        c.name.replace(/\.[^.]+$/, "").toLowerCase() === componentName.toLowerCase()
    );

    if (match) {
      await showPreview(match.name, match.svgContent, match.sourcePath, match.generatedAt);
      return;
    }
  }

  // No exact match — launch interactive autocomplete pre-filtered with typed name
  const choices = allComponents.map((c) => c.name);

  const autocomplete = new AutoComplete({
    name: "component",
    message: "Select a component to preview:",
    limit: 10,
    initial: componentName ?? "",
    choices,
    suggest(input: string, choiceList: Record<string, unknown>[]) {
      if (!input) return choiceList;
      const lower = input.toLowerCase();
      return choiceList.filter((c) => String(c.name ?? "").toLowerCase().includes(lower));
    },
  });

  let selected: string;
  try {
    selected = await autocomplete.run();
  } catch {
    return; // user cancelled
  }

  const match = allComponents.find((c) => c.name === selected);
  if (match) {
    await showPreview(match.name, match.svgContent, match.sourcePath, match.generatedAt);
  }
};

const showPreview = async (
  key: string,
  svgContent: string,
  sourcePath: string,
  generatedAt: string | null
): Promise<void> => {
  const viewBox = svgContent.match(/viewBox="([^"]+)"/)?.[1] ?? "unknown";
  const pathCount = (svgContent.match(/<path/g) ?? []).length;
  const circleCount = (svgContent.match(/<circle/g) ?? []).length;
  const rectCount = (svgContent.match(/<rect/g) ?? []).length;
  const elements = [
    pathCount > 0 && `${pathCount} path${pathCount !== 1 ? "s" : ""}`,
    circleCount > 0 && `${circleCount} circle${circleCount !== 1 ? "s" : ""}`,
    rectCount > 0 && `${rectCount} rect${rectCount !== 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(", ");

  const info = [
    { label: "Component", value: key },
    { label: "Source", value: sourcePath },
    { label: "ViewBox", value: viewBox },
    ...(elements ? [{ label: "Elements", value: elements }] : []),
    ...(generatedAt
      ? [
          {
            label: "Generated",
            value: new Date(generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          },
        ]
      : []),
  ];

  await previewSVGSideBySide(svgContent, info);
};
