import { cosmiconfigSync } from "cosmiconfig";
import fs from "fs/promises";
import path from "path";
import type { Config, PartialConfig } from "./schema";
import { ConfigSchema } from "./schema";

const explorer = cosmiconfigSync("mkicon");
const CONFIG_FILENAME = ".mkicon.json";

/**
 * Load configuration from project root (or a custom path for monorepo support)
 */
export const loadConfig = (projectRoot: string, configPath?: string): Config | null => {
  try {
    const resolvedPath = configPath ?? path.join(projectRoot, CONFIG_FILENAME);
    const result = explorer.load(resolvedPath);

    if (!result || !result.config) {
      return null;
    }

    // Validate and parse config with defaults
    const parsed = ConfigSchema.parse(result.config);
    return parsed;
  } catch (error) {
    console.error("Error loading config:", error);
    return null;
  }
};

/**
 * Create a new configuration file
 */
export const createConfig = async (projectRoot: string, config: PartialConfig): Promise<void> => {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);

  // Parse and fill with defaults
  const fullConfig = ConfigSchema.parse(config);

  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        $schema: "https://unpkg.com/@steellgold/mkicon/schema.json",
        ...fullConfig,
      },
      null,
      2
    ),
    "utf-8"
  );
};

/**
 * Update existing configuration
 */
export const updateConfig = async (
  projectRoot: string,
  updates: Partial<Config>
): Promise<void> => {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);

  // Load existing config
  let existingConfig: Record<string, unknown> = {};
  try {
    const content = await fs.readFile(configPath, "utf-8");
    existingConfig = JSON.parse(content);
  } catch {
    // File doesn't exist, will create new one
  }

  // Merge with updates
  const mergedConfig = { ...existingConfig, ...updates };

  // Validate
  const validConfig = ConfigSchema.parse(mergedConfig);

  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        $schema: "https://unpkg.com/@steellgold/mkicon/schema.json",
        ...validConfig,
      },
      null,
      2
    ),
    "utf-8"
  );
};

/**
 * Check if config file exists (or a custom path for monorepo support)
 */
export const configExists = (projectRoot: string, configPath?: string): boolean => {
  try {
    const resolvedPath = configPath ?? path.join(projectRoot, CONFIG_FILENAME);
    const result = explorer.load(resolvedPath);
    return result !== null;
  } catch {
    return false;
  }
};
