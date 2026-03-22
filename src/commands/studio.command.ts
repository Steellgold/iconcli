import { runStudio } from "@/cli/studio";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "studio",
  description: "Launch a local web UI to browse your project icons",
  handler: async (ctx) => {
    await runStudio({ projectRoot: ctx.projectRoot, config: ctx.requireConfig() });
  },
};
