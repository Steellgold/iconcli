import type { Config } from "@/config/schema";
import { generateComponent } from "@/core/component-generator";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { optimizeSVG } from "@/core/svg-processor";
import { fetchSVGFromURL } from "@/core/url-fetcher";
import { logger, spinner } from "@/utils/logger";
import { previewSVGSideBySide } from "@/utils/svg-preview";
import { extractIconNameFromURL, generateIconName } from "@/utils/naming";
import { isValidSVG } from "@/utils/validation";
import fs from "fs/promises";
import path from "path";
import {
  promptIconName,
  promptSVGContent,
  promptSVGURL,
} from "./prompts";
import { detectIconNameFromSvg } from "@/utils/svg-detector";

export interface SemiInteractiveOptions {
  projectRoot: string;
  config: Config;
  mode: "paste" | "url" | "file";
  value?: string;
}

/**
 * Run semi-interactive mode (flag specified, prompts for details)
 */
export const runSemiInteractive = async (options: SemiInteractiveOptions): Promise<void> => {
  const { projectRoot, config, mode, value } = options;

  try {
    // Get SVG content based on mode
    let svgContent: string;
    let suggestedName: string | null = null;

    if (mode === "paste") {
      if (value) {
        svgContent = value;
      } else {
        svgContent = await promptSVGContent();
      }
      suggestedName = detectIconNameFromSvg(svgContent);
    } else if (mode === "url") {
      const url = value || (await promptSVGURL());

      // Extract suggested name from URL
      suggestedName = extractIconNameFromURL(url);

      const loadSpinner = spinner.start("Fetching SVG from URL...");

      try {
        svgContent = await fetchSVGFromURL(url);
        loadSpinner.succeed("SVG fetched successfully");
      } catch (error) {
        loadSpinner.fail("Failed to fetch SVG");
        throw error;
      }
    } else {
      // file mode
      const filePath = value || (await promptSVGContent()); // TODO: Add file prompt
      svgContent = await fs.readFile(filePath, "utf-8");
    }

    // Validate SVG
    if (!isValidSVG(svgContent)) {
      logger.error("Invalid SVG content");
      process.exit(1);
    }

    // Ask for icon name — pre-filled if a name was detected/suggested
    const iconName = await promptIconName(suggestedName ?? undefined);
    const componentName = generateIconName(
      iconName,
      config.naming.suffix,
      config.naming.componentCase
    );

    logger.separator();
    logger.newline();

    // Process SVG
    const processSpinner = spinner.start("Processing SVG...");
    const processed = await optimizeSVG(svgContent, config.optimize);

    if (config.optimize && processed.optimizedSize < processed.originalSize) {
      processSpinner.succeed(
        `SVG optimized (${processed.originalSize} bytes → ${processed.optimizedSize} bytes)`
      );
    } else {
      processSpinner.succeed("SVG processed");
    }

    // Show SVG preview with info panel
    await previewSVGSideBySide(processed.content, [
      { label: "Component", value: componentName },
      { label: "Framework", value: config.framework },
      { label: "ViewBox", value: processed.viewBox },
      {
        label: "Size",
        value:
          config.optimize && processed.optimizedSize < processed.originalSize
            ? `${processed.originalSize}B → ${processed.optimizedSize}B`
            : `${processed.originalSize}B`,
      },
    ]);

    // Generate component
    logger.newline();
    const genSpinner = spinner.start("Generating component...");
    const component = await generateComponent({
      componentName,
      svgContent: processed.content,
      viewBox: processed.viewBox,
      config,
    });
    genSpinner.succeed(`${component.filename} generated`);

    // Write file
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    const filePath = await writeComponentFile({
      projectRoot,
      baseDir: config.baseDir,
      iconsFolder: config.iconsFolder,
      filename: component.filename,
      content: component.content,
    });

    logger.success(`${component.filename} created`);

    // Update index
    if (config.maintainIndex) {
      await updateIndexFile(iconsDir, component.extension);
      logger.success("index.ts updated");
    }

    logger.separator();
    logger.newline();
    logger.title("Icon created successfully! 🎉");
    logger.newline();
    logger.print(`📁 ${path.relative(projectRoot, filePath)}`);
    logger.newline();
    logger.print("Import:");
    logger.print(`  import { ${componentName} } from '@/components/icons';`);
    logger.newline();
    logger.print("Usage:");
    logger.print(`  <${componentName} size={24} color="blue" />`);
    logger.separator();
    logger.newline();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An error occurred");
    }
    process.exit(1);
  }
};
