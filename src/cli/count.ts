import type { Config } from "@/config/schema";
import { readLockFile } from "@/core/diff-checker";
import { fetchLucideIcons } from "@/library/lucide";
import { fetchHeroiconList } from "@/library/heroicons";
import { logger, spinner } from "@/utils/logger";
import { getFilesWithExtension } from "@/utils/paths";
import { existsSync } from "fs";
import path from "path";

export interface CountOptions {
  projectRoot: string;
  config?: Config;
  mode: "project" | "available";
}

const COMPONENT_EXTENSIONS = [".tsx", ".ts", ".vue", ".svelte"];

/**
 * Count icons in the project or available across all supported libraries.
 */
export const runCount = async (options: CountOptions): Promise<void> => {
  const { projectRoot, config, mode } = options;

  if (mode === "available") {
    await countAvailable();
    return;
  }

  await countProject(projectRoot, config!);
};

const countAvailable = async (): Promise<void> => {
  logger.separator();
  logger.newline();
  logger.title("Available Icons");

  const lucideSpinner = spinner.start("Fetching Lucide icons...");

  const [lucideIcons, heroicons] = await Promise.all([
    fetchLucideIcons().then((icons) => {
      lucideSpinner.succeed(`Lucide Icons: ${icons.length}`);
      return icons;
    }),
    fetchHeroiconList(),
  ]);

  logger.success(`Heroicons:    ${heroicons.length}`);

  const total = lucideIcons.length + heroicons.length;

  logger.newline();
  logger.print(`  Total: ${total} icons across 2 libraries`);
  logger.newline();
  logger.separator();
  logger.newline();
};

const countProject = async (projectRoot: string, config: Config): Promise<void> => {
  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);

  if (!existsSync(iconsDir)) {
    logger.warning(`Icons folder not found: ${iconsDir}`);
    logger.info("Run `mkicon` to create your first icon.");
    return;
  }

  // Read lockfile for tracked icons
  const lock = await readLockFile(projectRoot);
  const trackedFilenames = new Set(Object.keys(lock));

  // Glob all component files
  const allFiles: string[] = [];
  for (const ext of COMPONENT_EXTENSIONS) {
    const files = await getFilesWithExtension(iconsDir, ext).catch(() => []);
    // Skip index files
    for (const f of files) {
      if (f !== `index${ext}` && f !== `index.d${ext}`) {
        allFiles.push(f);
      }
    }
  }

  const tracked = allFiles.filter((f) => trackedFilenames.has(f));
  const untracked = allFiles.filter((f) => !trackedFilenames.has(f));
  const total = allFiles.length;

  logger.separator();
  logger.newline();
  logger.title(`Project Icons (${total} total)`);

  if (tracked.length > 0) {
    logger.print("  Tracked:");
    for (const filename of tracked) {
      const entry = lock[filename];
      const filePath = path.join(iconsDir, filename);
      const relPath = path.relative(projectRoot, filePath);
      const meta: string[] = [];
      if (entry.library) {meta.push(entry.library);}
      if (entry.iconSize) {meta.push(`${entry.iconSize}px`);}
      const metaStr = meta.length > 0 ? ` (${meta.join(", ")})` : "";
      logger.print(`    ${relPath}${metaStr}`);
    }
    logger.newline();
  }

  if (untracked.length > 0) {
    logger.print("  Untracked:");
    for (const filename of untracked) {
      const filePath = path.join(iconsDir, filename);
      const relPath = path.relative(projectRoot, filePath);
      logger.print(`    ${relPath}`);
    }
    logger.newline();
  }

  if (total === 0) {
    logger.info("No icons found. Run `mkicon` to create your first icon.");
  }

  logger.separator();
  logger.newline();
};
