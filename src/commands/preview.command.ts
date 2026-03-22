import { runPreview } from "@/cli/preview";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "preview",
  description: "Preview a tracked icon component in the terminal",
  handler: async (ctx) => {
    const componentName = ctx.args[0] && !ctx.args[0].startsWith("-") ? ctx.args[0] : undefined;
    await runPreview({ projectRoot: ctx.projectRoot, componentName, config: ctx.config });
  },
};
