import type { Config } from "@/config/schema";
import { computeLineDiff, hashSvg, readLockFile, rebuildLockFile } from "@/core/diff-checker";
import { generateComponent } from "@/core/component-generator";
import { optimizeSVG } from "@/core/svg-processor";
import { logger } from "@/utils/logger";
import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const { prompt } = enquirer as unknown as {
  prompt: <T>(options: Record<string, unknown>) => Promise<T>;
};

const CONTEXT_LINES = 3;

export interface DiffOptions {
  projectRoot: string;
  config: Config;
}

interface ComponentDiffResult {
  filename: string;
  sourcePath: string;
  status: "unchanged" | "changed" | "missing-component";
  sourceChanged?: boolean;
  currentContent?: string;
  regeneratedContent?: string;
}

export const runDiff = async (options: DiffOptions): Promise<void> => {
  const { projectRoot, config } = options;

  let lock = await readLockFile(projectRoot);

  if (Object.keys(lock).length === 0) {
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    logger.info("No lock file found — rebuilding from existing components...");
    await rebuildLockFile(projectRoot, iconsDir);
    lock = await readLockFile(projectRoot);
  }

  const tracked = Object.keys(lock);

  if (tracked.length === 0) {
    logger.info("No tracked components found.");
    logger.print("Use `mkicon batch <dir>` to generate trackable components.");
    return;
  }

  logger.print(chalk.bold(`Checking ${tracked.length} tracked component(s)...\n`));

  const results: ComponentDiffResult[] = [];

  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);

  for (const [filename, entry] of Object.entries(lock)) {
    const componentPath = path.join(iconsDir, filename);

    // Component file missing on disk
    if (!existsSync(componentPath)) {
      results.push({ filename, sourcePath: entry.sourcePath, status: "missing-component" });
      continue;
    }

    // Always regenerate from the stored SVG + current config, then diff against current file
    const processed = await optimizeSVG(entry.svgContent, config.optimize);
    const regenerated = await generateComponent({
      componentName: entry.componentName,
      svgContent: processed.content,
      viewBox: processed.viewBox,
      config,
    });

    const currentContent = await fs.readFile(componentPath, "utf-8");

    if (currentContent.trimEnd() === regenerated.content.trimEnd()) {
      results.push({ filename, sourcePath: entry.sourcePath, status: "unchanged" });
    } else {
      results.push({
        filename,
        sourcePath: entry.sourcePath,
        status: "changed",
        currentContent,
        regeneratedContent: regenerated.content,
      });
    }

    // Also flag if SVG source file has changed since last generation
    const absSource = path.isAbsolute(entry.sourcePath)
      ? entry.sourcePath
      : path.join(projectRoot, entry.sourcePath);

    if (!existsSync(absSource)) {
      const existing = results[results.length - 1];
      existing.sourcePath = `${entry.sourcePath} (source missing)`;
    } else {
      const currentSvg = await fs.readFile(absSource, "utf-8");
      if (hashSvg(currentSvg) !== entry.svgHash) {
        // Mark that the source has also changed (append to status label)
        const existing = results[results.length - 1];
        existing.sourceChanged = true;
      }
    }
  }

  // --- Summary ---
  const unchanged = results.filter((r) => r.status === "unchanged");
  const changed = results.filter((r) => r.status === "changed");
  const missingComponent = results.filter((r) => r.status === "missing-component");

  for (const r of unchanged) {
    const sourceNote = r.sourceChanged ? chalk.yellow(" (SVG source also changed)") : "";
    logger.print(`  ${chalk.green("✓")} ${chalk.dim(r.filename)} ${chalk.dim("— up to date")}${sourceNote}`);
  }
  for (const r of missingComponent) {
    logger.print(`  ${chalk.blue("+")} ${chalk.bold(r.filename)} ${chalk.blue("— component file missing")}`);
  }
  for (const r of changed) {
    const reason = r.sourceChanged ? "SVG source + component changed" : "component modified";
    logger.print(`  ${chalk.red("✗")} ${chalk.bold(r.filename)} ${chalk.red(`— ${reason}`)}`);
  }

  logger.newline();

  if (changed.length === 0 && missingComponent.length === 0) {
    logger.title("All components are up to date!");
    return;
  }

  logger.print(chalk.bold(`${changed.length + missingComponent.length} component(s) need updating.`));
  logger.newline();

  // --- Interactive diff per changed component ---
  for (const r of changed) {
    if (!r.currentContent || !r.regeneratedContent) { continue; }

    logger.separator();
    logger.print(chalk.bold.cyan(`\n  ${r.filename}`));
    logger.print(chalk.dim(`  Source: ${r.sourcePath}\n`));

    const diffLines = computeLineDiff(r.currentContent, r.regeneratedContent);
    process.stdout.write(renderDiff(diffLines) + "\n");

    const { action } = await prompt<{ action: string }>({
      type: "select",
      name: "action",
      message: `What to do with ${r.filename}?`,
      choices: [
        { name: "skip", message: "Skip for now" },
        { name: "show-full", message: "Show full diff" },
        { name: "revert", message: chalk.yellow("Revert — restore to mkicon-generated version") },
      ],
    });

    if (action === "show-full") {
      process.stdout.write(renderDiff(diffLines, true) + "\n");

      const { after } = await prompt<{ after: string }>({
        type: "select",
        name: "after",
        message: `What to do with ${r.filename}?`,
        choices: [
          { name: "skip", message: "Skip for now" },
          { name: "revert", message: chalk.yellow("Revert — restore to mkicon-generated version") },
        ],
      });

      if (after === "revert") {
        await revertComponent(iconsDir, r.filename, r.regeneratedContent);
        logger.success(`${r.filename} reverted`);
      }
    } else if (action === "revert") {
      await revertComponent(iconsDir, r.filename, r.regeneratedContent);
      logger.success(`${r.filename} reverted`);
    }
  }

  logger.separator();
  logger.newline();
  logger.info("Run `mkicon batch <dir>` to regenerate updated components.");
};

const revertComponent = async (iconsDir: string, filename: string, content: string): Promise<void> => {
  await fs.writeFile(path.join(iconsDir, filename), content, "utf-8");
};

const renderDiff = (lines: ReturnType<typeof computeLineDiff>, full = false): string => {
  const output: string[] = [];

  if (full) {
    for (const [type, line] of lines) {
      output.push(formatDiffLine(type, line));
    }
    return output.join("\n");
  }

  const changedIdx = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i][0] !== "ctx") { changedIdx.add(i); }
  }

  const shown = new Set<number>();
  for (const idx of changedIdx) {
    for (let c = Math.max(0, idx - CONTEXT_LINES); c <= Math.min(lines.length - 1, idx + CONTEXT_LINES); c++) {
      shown.add(c);
    }
  }

  let lastShown = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!shown.has(i)) { continue; }
    if (lastShown >= 0 && i > lastShown + 1) {
      output.push(chalk.dim("  ..."));
    }
    output.push(formatDiffLine(lines[i][0], lines[i][1]));
    lastShown = i;
  }

  return output.join("\n");
};

const formatDiffLine = (type: "add" | "del" | "ctx", line: string): string => {
  if (type === "add") { return chalk.green(`+ ${line}`); }
  if (type === "del") { return chalk.red(`- ${line}`); }
  return chalk.dim(`  ${line}`);
};
