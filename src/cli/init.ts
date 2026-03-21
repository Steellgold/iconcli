import { createConfig } from "@/config/manager";
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
  },
  naming: {
    suffix: "Icon",
    suffixEnabled: true,
    componentCase: "PascalCase",
    fileCase: "PascalCase",
  },
};

/**
 * Initialize mkicon with default configuration
 */
export const runInit = async (projectRoot: string): Promise<Config> => {
  logger.title("🎨 Initializing mkicon...");
  logger.newline();

  // Create config file
  try {
    await createConfig(projectRoot, DEFAULT_CONFIG);
    logger.success("Configuration created: .mkicon.json");
    logger.success(`Icons folder: ${DEFAULT_CONFIG.baseDir}/${DEFAULT_CONFIG.iconsFolder}/`);
  } catch (error) {
    logger.error("Failed to create configuration file");
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }

  // Create icons directory
  const iconsDir = path.join(projectRoot, DEFAULT_CONFIG.baseDir, DEFAULT_CONFIG.iconsFolder);
  await ensureDir(iconsDir);
  logger.success(`Folder created: ${DEFAULT_CONFIG.baseDir}/${DEFAULT_CONFIG.iconsFolder}/`);

  logger.newline();
  logger.info("Default configuration:");
  logger.print(`  Framework:    ${DEFAULT_CONFIG.framework} (TypeScript)`);
  logger.print(`  Optimization: ${DEFAULT_CONFIG.optimize ? "Enabled" : "Disabled"}`);
  logger.print(`  Props:        size, color, className`);
  logger.print(`  Suffix:       ${DEFAULT_CONFIG.naming.suffix}`);
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
  };
};
