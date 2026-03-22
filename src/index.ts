#!/usr/bin/env node

import { createProgram, processIconFromArgs, processVariantIconFromArgs, processBatchFromArgs } from "@/cli/args";
import { runInteractive } from "@/cli/interactive";
import { runSetup } from "@/cli/setup";
import { findCommand } from "@/commands/registry";
import type { CommandContext } from "@/commands/types";
import { configExists, loadConfig } from "@/config/manager";
import { findProjectRoot } from "@/core/project";
import { logger } from "@/utils/logger";
import path from "path";

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

const buildContext = (projectRoot: string): CommandContext => {
  const configFlagIdx = process.argv.indexOf("--config");
  const customConfigPath =
    configFlagIdx !== -1 && process.argv[configFlagIdx + 1]
      ? path.resolve(process.argv[configFlagIdx + 1])
      : undefined;

  const config =
    configExists(projectRoot, customConfigPath)
      ? (loadConfig(projectRoot, customConfigPath) ?? undefined)
      : undefined;

  const requireConfig = () => {
    if (!config) {
      logger.error("No configuration found. Please run `mkicon` first to set up the project.");
      process.exit(1);
    }
    return config;
  };

  const flag = (...names: string[]): string | undefined => {
    for (const name of names) {
      const idx = process.argv.indexOf(name);
      if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("-")) {
        return process.argv[idx + 1];
      }
    }
    return undefined;
  };

  return {
    projectRoot,
    config,
    requireConfig,
    args: process.argv.slice(3),
    flag,
    hasFlag: (...names) => names.some((n) => process.argv.includes(n)),
  };
};

const main = async (): Promise<void> => {
  try {
    process.argv = [...process.argv.slice(0, 2), ...normaliseArgv(process.argv.slice(2))];

    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error("⚠️  No package.json found.");
      logger.print("   Please run mkicon from a Node.js project directory.");
      process.exit(1);
    }

    const subcommand = process.argv[2];

    // ── Subcommand routing (registry) ──────────────────────────────────────
    const cmd = findCommand(subcommand);
    if (cmd) {
      await cmd.handler(buildContext(projectRoot));
      return;
    }

    // ── CLI flags / interactive mode (Commander) ────────────────────────────
    const program = createProgram();
    if (process.argv.length > 2) program.parse(process.argv);
    const options = program.opts();

    const ctx = buildContext(projectRoot);

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

    let config = ctx.config;
    if (!configExists(projectRoot)) {
      if (hasCliArgs) {
        logger.error("No configuration found. Please run `mkicon` first to set up the project.");
        process.exit(1);
      }
      config = await runSetup(projectRoot);
    } else {
      config = ctx.requireConfig();
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
