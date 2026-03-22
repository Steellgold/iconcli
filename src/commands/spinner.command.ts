import { runSpinner } from "@/cli/spinner";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "spinner",
  aliases: ["spin"],
  description: "Generate an animated loading spinner component",
  handler: async (ctx) => {
    await runSpinner({ projectRoot: ctx.projectRoot, config: ctx.requireConfig() });
  },
};
