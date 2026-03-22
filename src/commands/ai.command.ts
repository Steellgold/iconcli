import { runAi } from "@/cli/ai";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "ai",
  description: "Generate icons from natural language descriptions using AI",
  handler: async (ctx) => {
    await runAi({
      projectRoot: ctx.projectRoot,
      config: ctx.requireConfig(),
      description: ctx.args[0],
      model: ctx.flag("--model", "-m"),
      provider: ctx.flag("--provider", "-p"),
      style: ctx.flag("--style", "-s"),
    });
  },
};
