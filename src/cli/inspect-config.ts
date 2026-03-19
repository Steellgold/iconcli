import { formatConfigForDisplay, resolveFormatConfig } from "@/adapters/index";
import { logger } from "@/utils/logger";

const SOURCE_LABELS: Record<string, string> = {
  prettier: "Prettier",
  biome: "Biome",
  eslint: "ESLint",
  editorconfig: "EditorConfig",
};

/**
 * Run the inspect-config command to show detected project formatting rules
 */
export const runInspectConfig = async (projectRoot: string): Promise<void> => {
  logger.title("🔍 Inspecting Project Configuration");
  logger.newline();

  try {
    const formatConfig = await resolveFormatConfig(projectRoot);

    if (formatConfig.source && formatConfig.source !== "default") {
      const label = SOURCE_LABELS[formatConfig.source] ?? formatConfig.source;
      logger.success(`✓ Detected ${label} configuration`);
      logger.newline();
      console.log(formatConfigForDisplay(formatConfig));
      logger.newline();
      logger.info("These rules will be applied to generated icon components.");
      logger.newline();
      logger.info("To disable auto-adaptation, use:");
      console.log("  • CLI flag: mkicon -n Icon icon.svg --no-adapt");
      console.log('  • Config file: Set "adaptToProject": false in .mkicon.json');
    } else {
      logger.info("No formatter configuration detected in project");
      logger.newline();
      logger.info("Using mkicon default formatting:");
      logger.newline();
      console.log(formatConfigForDisplay(formatConfig));
      logger.newline();
      logger.info("To enable auto-adaptation, add one of the following to your project:");
      console.log("  • Prettier  — .prettierrc.json  or  pnpm add -D prettier");
      console.log("  • Biome     — biome.json         or  pnpm add -D @biomejs/biome");
      console.log("  • ESLint    — .eslintrc.json     (with formatting rules)");
      console.log("  • EditorConfig — .editorconfig");
    }
  } catch (error) {
    logger.error("Failed to inspect configuration");
    if (process.env.DEBUG && error instanceof Error) {
      console.error(error);
    }
    process.exit(1);
  }
};
