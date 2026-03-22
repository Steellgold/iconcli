import { runInit } from "@/cli/init";
import { logger } from "@/utils/logger";
import { configExists } from "@/config/manager";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "init",
  description: "Initialize mkicon with default configuration",
  handler: async (ctx) => {
    if (configExists(ctx.projectRoot)) {
      logger.warning("Configuration already exists (.mkicon.json)");
      logger.info("Use `mkicon config` to modify settings");
      process.exit(1);
    }
    await runInit(ctx.projectRoot, ctx.flag("--preset"));
  },
};
