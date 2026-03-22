import { processBatchFromArgs } from "@/cli/args";
import { logger } from "@/utils/logger";
import path from "path";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "batch",
  description: "Batch process SVG files from a directory",
  handler: async (ctx) => {
    const config = ctx.requireConfig();

    if (ctx.hasFlag("--refresh", "-r")) {
      const { rebuildLockFile } = await import("@/core/diff-checker");
      const iconsDir = path.join(ctx.projectRoot, config.baseDir, config.iconsFolder);
      logger.info("Rebuilding lock file from existing components...");
      await rebuildLockFile(ctx.projectRoot, iconsDir);
      logger.success("Lock file rebuilt successfully");
      return;
    }

    const batchDir = ctx.args[0];
    if (!batchDir) {
      logger.error("Usage: mkicon batch <dir>");
      process.exit(1);
    }

    await processBatchFromArgs(batchDir, config, ctx.projectRoot);
  },
};
