import type { Config } from "@/config/schema";
import { readLockFile, writeLockFile } from "@/core/diff-checker";
import { updateIndexFile } from "@/core/index-maintainer";
import { logger } from "@/utils/logger";
import enquirer from "enquirer";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

const { prompt } = enquirer;

export interface DeleteOptions {
  projectRoot: string;
  config: Config;
  componentName?: string;
}

export const runDelete = async ({ projectRoot, config, componentName }: DeleteOptions): Promise<void> => {
  const lock = await readLockFile(projectRoot);
  const entries = Object.entries(lock);

  if (entries.length === 0) {
    logger.error("No tracked icons found. Run mkicon to add some icons first.");
    process.exit(1);
  }

  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);

  // ── Direct delete (arg provided) ──────────────────────────────────────────
  if (componentName) {
    const match = entries.find(
      ([filename, entry]) =>
        entry.componentName.toLowerCase() === componentName.toLowerCase() ||
        filename.replace(/\.[^.]+$/, "").toLowerCase() === componentName.toLowerCase()
    );

    if (!match) {
      logger.error(`Icon "${componentName}" not found in the lock file.`);
      logger.print("  Run `mkicon delete` without arguments to pick from the list.");
      process.exit(1);
    }

    const [targetFilename, targetEntry] = match;

    const { confirmed } = await prompt<{ confirmed: boolean }>({
      type: "confirm",
      name: "confirmed",
      message: `Delete ${targetEntry.componentName} (${targetFilename})?`,
      initial: false,
    });

    if (!confirmed) {
      logger.info("Cancelled.");
      return;
    }

    await deleteOne(projectRoot, iconsDir, lock, targetFilename);

    await writeLockFile(projectRoot, lock);
    if (config.maintainIndex) {
      await updateIndexFile(iconsDir, path.extname(targetFilename));
      logger.success("index.ts updated");
    }

    logger.newline();
    logger.title(`${targetEntry.componentName} deleted`);
    logger.newline();
    return;
  }

  // ── Interactive multi-select ───────────────────────────────────────────────
  const choices = entries.map(([filename, entry]) => ({
    name: filename,
    message: `${entry.componentName}${entry.library ? `  (${entry.library})` : ""}`,
    value: filename,
  }));

  const answer = await prompt<{ filenames: string[] }>({
    type: "multiselect",
    name: "filenames",
    message: "Select icons to delete (space to select, enter to confirm):",
    choices,
  } as Parameters<typeof prompt>[0]);

  if (!answer.filenames || answer.filenames.length === 0) {
    logger.info("Nothing selected.");
    return;
  }

  const { confirmed } = await prompt<{ confirmed: boolean }>({
    type: "confirm",
    name: "confirmed",
    message: `Delete ${answer.filenames.length} icon${answer.filenames.length !== 1 ? "s" : ""}?`,
    initial: false,
  });

  if (!confirmed) {
    logger.info("Cancelled.");
    return;
  }

  logger.newline();

  let ext = "";
  for (const filename of answer.filenames) {
    const entry = lock[filename];
    await deleteOne(projectRoot, iconsDir, lock, filename);
    if (entry) {logger.success(`Deleted ${entry.componentName}`);}
    ext = path.extname(filename);
  }

  await writeLockFile(projectRoot, lock);
  logger.success("Lock file updated");

  if (config.maintainIndex && ext) {
    await updateIndexFile(iconsDir, ext);
    logger.success("index.ts updated");
  }

  logger.newline();
  logger.title(`${answer.filenames.length} icon${answer.filenames.length !== 1 ? "s" : ""} deleted`);
  logger.newline();
};

const deleteOne = async (
  projectRoot: string,
  iconsDir: string,
  lock: Record<string, unknown>,
  filename: string
): Promise<void> => {
  const filePath = path.join(iconsDir, filename);
  if (existsSync(filePath)) {
    await fs.unlink(filePath);
  } else {
    logger.warning(`File not on disk: ${path.relative(projectRoot, filePath)}`);
  }
  delete lock[filename];
};
