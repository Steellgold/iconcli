import { runDiff } from "@/cli/diff";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "diff",
  description: "Check tracked components for SVG source changes",
  handler: async (ctx) => {
    await runDiff({ projectRoot: ctx.projectRoot, config: ctx.requireConfig() });
  },
};
