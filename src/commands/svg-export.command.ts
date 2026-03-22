import { runSvgExport } from "@/cli/svg-export";
import { logger } from "@/utils/logger";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "svg",
  description: "Export a component back to its original SVG file",
  handler: async (ctx) => {
    const componentPath = ctx.args[0];
    if (!componentPath) {
      logger.error("Usage: mkicon svg <path>");
      logger.print("Example: mkicon svg src/components/icons/BananaIcon.tsx");
      process.exit(1);
    }
    await runSvgExport({
      projectRoot: ctx.projectRoot,
      componentPath,
      output: ctx.flag("--output", "-o"),
    });
  },
};
