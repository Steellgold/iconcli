import { createConfig } from "@/config/manager";
import { PRESETS, PRESET_NAMES } from "@/config/presets";
import type { Config } from "@/config/schema";
import { logger } from "@/utils/logger";
import { ensureDir } from "@/utils/paths";
import path from "path";

/**
 * Default configuration with best practices
 */
const DEFAULT_CONFIG: Omit<Config, "version"> = {
  baseDir: "src/components",
  iconsFolder: "icons",
  framework: "react",
  typescript: true,
  optimize: true,
  maintainIndex: true,
  adaptToProject: true,
  props: {
    size: true,
    color: true,
    className: true,
    style: false,
    strokeWidth: false,
    accessibility: false,
    forwardRef: false,
  },
  naming: {
    suffix: "Icon",
    suffixEnabled: true,
    componentCase: "PascalCase",
    fileCase: "PascalCase",
  },
};

/**
 * Initialize mkicon with default configuration (or a named preset)
 */
export const runInit = async (projectRoot: string, preset?: string): Promise<Config> => {
  logger.title("🎨 Initializing mkicon...");
  logger.newline();

  if (preset) {
    if (!PRESET_NAMES.includes(preset as (typeof PRESET_NAMES)[number])) {
      logger.error(`Unknown preset "${preset}". Available: ${PRESET_NAMES.join(", ")}`);
      process.exit(1);
    }
    logger.info(`Using preset: ${preset}`);
    logger.newline();
  }

  const baseConfig = preset ? { ...DEFAULT_CONFIG, ...PRESETS[preset] } : DEFAULT_CONFIG;
  const initConfig = baseConfig;

  // Create config file
  try {
    await createConfig(projectRoot, initConfig);
    logger.success("Configuration created: .mkicon.json");
    logger.success(`Icons folder: ${initConfig.baseDir}/${initConfig.iconsFolder}/`);
  } catch (error) {
    logger.error("Failed to create configuration file");
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }

  // Create icons directory
  const iconsDir = path.join(projectRoot, initConfig.baseDir as string, initConfig.iconsFolder as string);
  await ensureDir(iconsDir);
  logger.success(`Folder created: ${initConfig.baseDir}/${initConfig.iconsFolder}/`);

  logger.newline();
  logger.info(preset ? `Preset "${preset}" configuration:` : "Default configuration:");
  logger.print(`  Framework:    ${initConfig.framework} (TypeScript)`);
  logger.print(`  Optimization: ${initConfig.optimize ? "Enabled" : "Disabled"}`);
  logger.print(`  Suffix:       ${initConfig.naming?.suffix ?? "Icon"}`);
  logger.newline();
  logger.info("💡 You can customize settings later with:");
  logger.print("   mkicon config");
  logger.newline();
  logger.success("✨ Ready to go! Start creating icons with:");
  logger.print("   mkicon           # Interactive mode");
  logger.print("   mkicon library   # Browse Lucide Icons");
  logger.newline();

  return {
    version: "1.0.0",
    ...DEFAULT_CONFIG,
    ...initConfig,
  } as Config;
};
