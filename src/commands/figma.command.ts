import { runFigmaImport } from "@/cli/figma";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "figma",
  description: "Import icons from a Figma file",
  handler: async (ctx) => {
    const urlArg = ctx.args[0] && !ctx.args[0].startsWith("-") ? ctx.args[0] : undefined;
    await runFigmaImport({ projectRoot: ctx.projectRoot, config: ctx.requireConfig(), url: urlArg });
  },
};
