import { runLibraryBrowser } from "@/cli/library";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "library",
  aliases: ["browse"],
  description: "Browse and import icons from Lucide, Heroicons, or Tabler",
  handler: async (ctx) => {
    await runLibraryBrowser({ projectRoot: ctx.projectRoot, config: ctx.requireConfig() });
  },
};
