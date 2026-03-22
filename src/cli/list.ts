import type { Config } from "@/config/schema";
import { readLockFile } from "@/core/diff-checker";
import { logger } from "@/utils/logger";
import chalk from "chalk";
import path from "path";

export interface ListOptions {
  projectRoot: string;
  config: Config;
}

export const runList = async ({ projectRoot, config }: ListOptions): Promise<void> => {
  const lock = await readLockFile(projectRoot);
  const entries = Object.entries(lock);

  logger.separator();
  logger.newline();

  if (entries.length === 0) {
    logger.info("No tracked icons found. Run `mkicon` to add your first icon.");
    logger.newline();
    logger.separator();
    logger.newline();
    return;
  }

  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);

  // Column widths
  const nameWidth = Math.max(9, ...entries.map(([, e]) => e.componentName.length));
  const fileWidth = Math.max(4, ...entries.map(([f]) => f.length));

  const pad = (s: string, n: number) => s.padEnd(n);

  // Header
  logger.print(
    chalk.bold(pad("Component", nameWidth)) +
    "  " +
    chalk.bold(pad("File", fileWidth)) +
    "  " +
    chalk.bold(pad("Library", 12)) +
    "  " +
    chalk.bold(pad("Size", 6)) +
    "  " +
    chalk.bold("Added")
  );
  logger.print(chalk.gray("─".repeat(nameWidth + fileWidth + 40)));

  for (const [filename, entry] of entries) {
    const name = chalk.cyan(pad(entry.componentName, nameWidth));
    const file = chalk.gray(pad(filename, fileWidth));
    const library = pad(entry.library ?? "—", 12);
    const size = pad(entry.iconSize ? `${entry.iconSize}px` : "—", 6);
    const date = chalk.gray(new Date(entry.generatedAt).toLocaleDateString());

    logger.print(`${name}  ${file}  ${library}  ${size}  ${date}`);
  }

  logger.newline();
  logger.print(
    chalk.gray(`  ${entries.length} icon${entries.length !== 1 ? "s" : ""} tracked`) +
    chalk.gray(`  ·  ${iconsDir}`)
  );
  logger.newline();
  logger.separator();
  logger.newline();
};
