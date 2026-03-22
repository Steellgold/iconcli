import { runSemiInteractive } from "@/cli/semi-interactive";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "file",
  aliases: ["f"],
  description: "Create icon from a local SVG file",
  handler: async (ctx) => {
    const value = ctx.args[0] && !ctx.args[0].startsWith("-") ? ctx.args[0] : undefined;
    await runSemiInteractive({ projectRoot: ctx.projectRoot, config: ctx.requireConfig(), mode: "file", value });
  },
};
