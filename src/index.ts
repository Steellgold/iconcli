#!/usr/bin/env node

import {
  createProgram,
  processBatchFromArgs,
  processIconFromArgs,
  processVariantIconFromArgs,
} from "@/cli/args";
import { runInit } from "@/cli/init";
import { runInspectConfig } from "@/cli/inspect-config";
import { runInteractive } from "@/cli/interactive";
import { runLibraryBrowser } from "@/cli/library";
import { runSemiInteractive } from "@/cli/semi-interactive";
import { runSetup } from "@/cli/setup";
import { runSpinner } from "@/cli/spinner";
import { runDiff } from "@/cli/diff";
import { runSvgExport } from "@/cli/svg-export";
import { runPreview } from "@/cli/preview";
import { runConfigMenu, showConfig } from "@/config/commands";
import path from "path";
import { configExists, loadConfig } from "@/config/manager";
import type { Config } from "@/config/schema";
import { findProjectRoot } from "@/core/project";
import { logger } from "@/utils/logger";

const SEMI_INTERACTIVE_MODES: Record<string, "paste" | "url" | "file"> = {
  paste: "paste",
  p: "paste",
  url: "url",
  u: "url",
  file: "file",
  f: "file",
};

const requireConfig = (projectRoot: string): Config => {
  if (!configExists(projectRoot)) {
    logger.error("No configuration found. Please run `mkicon` first to set up the project.");
    process.exit(1);
  }

  const config = loadConfig(projectRoot);
  if (!config) {
    logger.error("Failed to load configuration");
    process.exit(1);
  }

  return config;
};

/**
 * Normalise flag syntax so that -flag and --flag both work.
 * - `-output`  → `--output`  (single dash + multiple chars → double dash)
 * - `--n`      → `-n`        (double dash + single char   → single dash)
 */
const normaliseArgv = (argv: string[]): string[] =>
  argv.map((arg) => {
    if (arg.startsWith("--") && !arg.startsWith("---")) {
      const rest = arg.slice(2);
      if (rest.length === 1) return `-${rest}`;
    } else if (arg.startsWith("-") && !arg.startsWith("--")) {
      const rest = arg.slice(1);
      if (rest.length > 1 && !rest.startsWith("-")) return `--${rest}`;
    }
    return arg;
  });

const main = async (): Promise<void> => {
  try {
    process.argv = [...process.argv.slice(0, 2), ...normaliseArgv(process.argv.slice(2))];

    const subcommand = process.argv[2];
    const hasAnyArgs = process.argv.length > 2;

    const program = createProgram();
    if (hasAnyArgs) {program.parse(process.argv);}
    const options = program.opts();

    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error("⚠️  No package.json found.");
      logger.print("   Please run mkicon from a Node.js project directory.");
      process.exit(1);
    }

    // Subcommands that don't need config
    if (subcommand === "init") {
      if (configExists(projectRoot)) {
        logger.warning("Configuration already exists (.mkicon.json)");
        logger.info("Use `mkicon config` to modify settings");
        process.exit(1);
      }
      await runInit(projectRoot);
      return;
    }

    if (subcommand === "config") {
      if (process.argv.includes("--show")) {
        showConfig(requireConfig(projectRoot));
      } else {
        await runConfigMenu(projectRoot);
      }
      return;
    }

    if (subcommand === "inspect-config") {
      await runInspectConfig(projectRoot);
      return;
    }

    // Subcommands that need config
    if (subcommand === "library" || subcommand === "browse") {
      await runLibraryBrowser({ projectRoot, config: requireConfig(projectRoot) });
      return;
    }

    if (subcommand === "spinner" || subcommand === "spin") {
      await runSpinner({ projectRoot, config: requireConfig(projectRoot) });
      return;
    }

    if (subcommand === "batch") {
      const config = requireConfig(projectRoot);
      const isRefresh = process.argv.includes("--refresh") || process.argv.includes("-r");

      if (isRefresh) {
        const { rebuildLockFile } = await import("@/core/diff-checker");
        const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
        logger.info("Rebuilding lock file from existing components...");
        await rebuildLockFile(projectRoot, iconsDir);
        logger.success("Lock file rebuilt successfully");
        return;
      }

      const batchDir = process.argv[3];
      if (!batchDir) {
        logger.error("Usage: mkicon batch <dir>");
        process.exit(1);
      }
      await processBatchFromArgs(batchDir, config, projectRoot);
      return;
    }

    if (subcommand === "svg") {
      const componentPath = process.argv[3];
      if (!componentPath) {
        logger.error("Usage: mkicon svg <path>");
        logger.print("Example: mkicon svg src/components/icons/BananaIcon.tsx");
        process.exit(1);
      }
      const outputArg = process.argv.indexOf("--output") !== -1
        ? process.argv[process.argv.indexOf("--output") + 1]
        : process.argv.indexOf("-o") !== -1
          ? process.argv[process.argv.indexOf("-o") + 1]
          : undefined;
      await runSvgExport({ projectRoot, componentPath, output: outputArg });
      return;
    }

    if (subcommand === "diff") {
      await runDiff({ projectRoot, config: requireConfig(projectRoot) });
      return;
    }

    if (subcommand === "preview") {
      const componentName = process.argv[3] as string | undefined;
      const previewConfig = configExists(projectRoot) ? loadConfig(projectRoot) ?? undefined : undefined;
      await runPreview({ projectRoot, componentName, config: previewConfig });
      return;
    }

    const semiMode = SEMI_INTERACTIVE_MODES[subcommand];
    if (semiMode) {
      await runSemiInteractive({ projectRoot, config: requireConfig(projectRoot), mode: semiMode });
      return;
    }

    // CLI / interactive mode
    const hasCliArgs =
      options.name ||
      typeof options.paste === "string" ||
      options.svg ||
      typeof options.url === "string" ||
      typeof options.file === "string" ||
      options.batch ||
      options.directive ||
      options.variant;

    if (!hasCliArgs) {
      logger.info(`✓ Project detected: ${projectRoot}`);
      logger.newline();
    }

    let config: Config;
    if (!configExists(projectRoot)) {
      if (hasCliArgs) {
        logger.error("No configuration found. Please run `mkicon` first to set up the project.");
        process.exit(1);
      }
      config = await runSetup(projectRoot);
    } else {
      config = requireConfig(projectRoot);
      if (!hasCliArgs) {
        logger.title("🎨 mkicon");
        logger.success("Configuration loaded: .mkicon.json");
        logger.success(`Folder: ${config.baseDir}/${config.iconsFolder}/`);
        logger.separator();
        logger.newline();
      }
    }

    if (hasCliArgs) {
      if (options.batch) {
        await processBatchFromArgs(options.batch, config, projectRoot);
      } else if (options.directive || options.variant) {
        await processVariantIconFromArgs(options, config, projectRoot);
      } else {
        await processIconFromArgs(options, config, projectRoot);
      }
    } else {
      await runInteractive({ projectRoot, config });
    }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : "An unexpected error occurred");
    process.exit(1);
  }
};

main();
