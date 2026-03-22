import { runInspectConfig } from "@/cli/inspect-config";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "inspect-config",
  description: "Show detected project formatting configuration",
  handler: async (ctx) => {
    await runInspectConfig(ctx.projectRoot);
  },
};
