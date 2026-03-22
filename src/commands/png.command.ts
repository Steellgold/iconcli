import { runPngExport } from "@/cli/png-export";
import type { CommandDef } from "./types";

export const command: CommandDef = {
  name: "png",
  description: "Export icon components to PNG",
  handler: async (ctx) => {
    const isAll = ctx.hasFlag("--all");
    const componentArg = !isAll && ctx.args[0] && !ctx.args[0].startsWith("-")
      ? ctx.args[0]
      : undefined;

    const sizesRaw = ctx.flag("--sizes");
    const sizeRaw = ctx.flag("--size", "-s");
    const sizes = sizesRaw
      ? sizesRaw.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
      : sizeRaw
        ? [Number(sizeRaw)].filter((n) => !isNaN(n) && n > 0)
        : [24];

    const scaleRaw = ctx.flag("--scale", "-r");
    const scale = scaleRaw ? parseFloat(scaleRaw.replace("x", "")) || 1 : 1;

    await runPngExport({
      projectRoot: ctx.projectRoot,
      config: ctx.config,
      componentPath: componentArg,
      all: isAll,
      sizes,
      scale,
      background: ctx.flag("--background"),
      color: ctx.flag("--color", "-c"),
      output: ctx.flag("--output", "-o"),
    });
  },
};
