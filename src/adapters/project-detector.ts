import { createRequire } from "module";
import { existsSync } from "fs";
import { join } from "path";

export interface PrettierConfig {
  singleQuote?: boolean;
  jsxSingleQuote?: boolean;
  useTabs?: boolean;
  tabWidth?: number;
  semi?: boolean;
  printWidth?: number;
  endOfLine?: "lf" | "crlf" | "auto";
  trailingComma?: "none" | "es5" | "all";
  bracketSpacing?: boolean;
  bracketSameLine?: boolean;
  arrowParens?: "always" | "avoid";
}

export interface PrettierModule {
  resolveConfig?: (
    filePath: string,
    options?: Record<string, unknown>
  ) => Promise<PrettierConfig | null>;
  resolveConfigFile?: (cwd: string) => Promise<string | null>;
}

/**
 * Check if Prettier is installed in the project
 */
export const isPrettierAvailable = async (cwd: string): Promise<boolean> => {
  try {
    // Try to resolve prettier from the project's node_modules
    const prettierPath = join(cwd, "node_modules", "prettier");
    return existsSync(prettierPath);
  } catch {
    return false;
  }
};

/**
 * Try to dynamically import prettier from the project's dependencies
 * @returns Prettier module or null if not available
 */
export const loadPrettier = async (cwd: string): Promise<PrettierModule | null> => {
  try {
    // First check if prettier exists in node_modules
    const prettierPackagePath = join(cwd, "node_modules", "prettier", "package.json");
    if (!existsSync(prettierPackagePath)) {
      return null;
    }

    // Use createRequire to resolve from the project's context
    const require = createRequire(join(cwd, "package.json"));
    const prettier = require("prettier");
    return prettier as PrettierModule;
  } catch {
    return null;
  }
};
