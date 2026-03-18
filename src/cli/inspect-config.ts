import { formatConfigForDisplay, resolvePrettierConfig } from "@/adapters/index.js";
import { logger } from "@/utils/logger.js";

/**
 * Run the inspect-config command to show detected project formatting rules
 */
export const runInspectConfig = async (projectRoot: string): Promise<void> => {
  logger.title("🔍 Inspecting Project Configuration");
  logger.newline();

  try {
    const formatConfig = await resolvePrettierConfig(projectRoot);

    if (formatConfig.source === "prettier") {
      logger.success("✓ Detected Prettier configuration");
      logger.newline();
      console.log(formatConfigForDisplay(formatConfig));
      logger.newline();
      logger.info("These rules will be applied to generated icon components.");
      logger.newline();
      logger.info("To disable auto-adaptation, use:");
      console.log("  • CLI flag: mkicon -n Icon icon.svg --no-adapt");
      console.log('  • Config file: Set "adaptToProject": false in .mkicon.json');
    } else {
      logger.info("No Prettier configuration detected in project");
      logger.newline();
      logger.info("Using mkicon default formatting:");
      logger.newline();
      console.log(formatConfigForDisplay(formatConfig));
      logger.newline();
      logger.info("To enable auto-adaptation:");
      console.log("  1. Add a .prettierrc.json file to your project");
      console.log("  2. Or install Prettier: pnpm add -D prettier");
      console.log("  3. mkicon will automatically detect and apply your rules");
    }
  } catch (error) {
    logger.error("Failed to inspect configuration");
    if (process.env.DEBUG && error instanceof Error) {
      console.error(error);
    }
    process.exit(1);
  }
};
