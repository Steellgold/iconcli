import { runCount } from "@/cli/count";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "count",
  description: "Count icons in your project or available in libraries",
  handler: async (ctx) => {
    if (ctx.hasFlag("--available", "-a")) {
      await runCount({ projectRoot: ctx.projectRoot, mode: "available" });
    } else {
      await runCount({ projectRoot: ctx.projectRoot, config: ctx.requireConfig(), mode: "project" });
    }
  },
};
