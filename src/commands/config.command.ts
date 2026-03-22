import { runConfigMenu, showConfig } from "@/config/commands";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "config",
  description: "Manage mkicon configuration",
  handler: async (ctx) => {
    if (ctx.hasFlag("--show")) {
      showConfig(ctx.requireConfig());
    } else {
      await runConfigMenu(ctx.projectRoot);
    }
  },
};
