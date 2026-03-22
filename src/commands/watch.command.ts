import { runWatch } from "@/cli/watch";
import { logger } from "@/utils/logger";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "watch",
  description: "Watch a directory and auto-generate components when SVG files change",
  handler: async (ctx) => {
    const watchDir = ctx.args[0];
    if (!watchDir) {
      logger.error("Usage: mkicon watch <dir>");
      logger.print("Example: mkicon watch ./assets/icons");
      process.exit(1);
    }

    const debounceRaw = ctx.flag("--debounce");
    const debounce = debounceRaw ? parseInt(debounceRaw, 10) : undefined;

    await runWatch({
      projectRoot: ctx.projectRoot,
      config: ctx.requireConfig(),
      watchDir,
      debounce,
    });
  },
};
