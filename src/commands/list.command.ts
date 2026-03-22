import { runList } from "@/cli/list";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "list",
  aliases: ["ls"],
  description: "List all tracked icon components",
  handler: async (ctx) => {
    await runList({ projectRoot: ctx.projectRoot, config: ctx.requireConfig() });
  },
};
