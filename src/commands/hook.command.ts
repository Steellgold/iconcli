import { runHook } from "@/cli/hook";
import { logger } from "@/utils/logger";
import type { CommandDef } from "./types";

const VALID_SUBS = ["install", "uninstall", "status", "run"] as const;
type HookSub = (typeof VALID_SUBS)[number];

export const command: CommandDef = {
  name: "hook",
  description: "Manage the Git pre-commit hook for icon drift detection",
  handler: async (ctx) => {
    const sub = ctx.args[0] as HookSub | undefined;

    if (!sub || !VALID_SUBS.includes(sub as HookSub)) {
      logger.error(`Usage: mkicon hook <${VALID_SUBS.join("|")}>`);
      process.exit(1);
    }

    await runHook({
      projectRoot: ctx.projectRoot,
      config: ctx.config,
      subcommand: sub,
      husky: ctx.hasFlag("--husky"),
      warn: ctx.hasFlag("--warn"),
      fix: ctx.hasFlag("--fix"),
    });
  },
};
