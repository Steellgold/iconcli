import { runDelete } from "@/cli/delete";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "delete",
  aliases: ["remove", "rm"],
  description: "Delete a tracked icon component",
  handler: async (ctx) => {
    const nameArg = ctx.args[0] && !ctx.args[0].startsWith("-") ? ctx.args[0] : undefined;
    await runDelete({ projectRoot: ctx.projectRoot, config: ctx.requireConfig(), componentName: nameArg });
  },
};
