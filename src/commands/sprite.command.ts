import { runSprite } from "@/cli/sprite";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "sprite",
  description: "Generate an SVG sprite file from all tracked icon components",
  handler: async (ctx) => {
    await runSprite({
      projectRoot: ctx.projectRoot,
      config: ctx.requireConfig(),
      output: ctx.flag("--output", "-o"),
      prefix: ctx.flag("--prefix") ?? "",
      optimize: !ctx.hasFlag("--no-optimize"),
      types: ctx.hasFlag("--types", "-t"),
    });
  },
};
