import type { Config } from "@/config/schema";

export interface CommandContext {
  projectRoot: string;
  /** Config loaded from .mkicon.json, undefined if none found */
  config: Config | undefined;
  /** Throws and exits if no config found */
  requireConfig: () => Config;
  /** process.argv slice after the subcommand name */
  args: string[];
  /** Returns the value of the first matching flag, or undefined */
  flag: (...names: string[]) => string | undefined;
  /** Returns true if any of the flags are present */
  hasFlag: (...names: string[]) => boolean;
}

export interface CommandDef {
  name: string;
  aliases?: string[];
  description: string;
  handler: (ctx: CommandContext) => Promise<void>;
}
