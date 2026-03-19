import { processBatchIcons } from "@/batch/processor.js";
import { Config } from "@/config/schema.js";
import { generateComponent } from "@/core/component-generator.js";
import { writeComponentFile } from "@/core/file-writer.js";
import { updateIndexFile } from "@/core/index-maintainer.js";
import { optimizeSVG } from "@/core/svg-processor.js";
import { fetchSVGFromURL } from "@/core/url-fetcher.js";
import { logger, spinner } from "@/utils/logger.js";
import { generateIconName } from "@/utils/naming.js";
import { isValidSVG } from "@/utils/validation.js";
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import {
  promptDirectionVariants,
  promptStyleVariants,
  promptAddStyleVariants,
  promptVariantSVG,
} from "./variant-prompts.js";
import { VariantConfig, VariantSVGContent, VariantComponentData } from "@/types/variants.js";

export interface CLIOptions {
  name?: string;
  paste?: string;
  svg?: string;
  url?: string;
  file?: string;
  batch?: string;
  framework?: string;
  output?: string;
  directive?: boolean;
  variant?: boolean;
  adapt?: boolean;
}

/**
 * Create Commander program
 */
export const createProgram = (): Command => {
  const program = new Command();

  program
    .name("mkicon")
    .description("Transform SVG icons into beautiful React, Vue, or Svelte components")
    .version("0.4.1")
    .helpOption("-h, --help", "Display help");

  program
    .option("-n, --name <name>", "Icon name")
    .option("-p, --paste [svg]", "Paste SVG code (interactive if no value)")
    .option("-u, --url [url]", "Fetch SVG from URL (interactive if no value)")
    .option("-f, --file [path]", "Load SVG from file (interactive if no value)")
    .option("-b, --batch <dir>", "Batch process directory")
    .option("--svg <svg>", "SVG code (non-interactive)")
    .option("--framework <framework>", "Override framework (react, vue, svelte)")
    .option("--output <dir>", "Override output directory")
    .option("--directive", "Create directional icon variants (interactive selection)")
    .option("--variant", "Create style variants (interactive selection)")
    .option("--no-adapt", "Disable auto-detection of project formatting rules")
    .action(() => {
      // Default action - handled in main index.ts
      // This prevents Commander from displaying help when no command is provided
    });

  program
    .command("config")
    .description("Manage mkicon configuration")
    .option("--show", "Show current configuration")
    .action(() => {
      // Handled in main index.ts
    });

  program
    .command("library")
    .alias("browse")
    .description("Browse and import icons from Lucide Icons")
    .action(() => {
      // Handled in main index.ts
    });

  program
    .command("init")
    .description("Initialize mkicon with default configuration")
    .action(() => {
      // Handled in main index.ts
    });

  program
    .command("inspect-config")
    .description("Show detected project formatting configuration")
    .action(() => {
      // Handled in main index.ts
    });

  return program;
};

/**
 * Process single icon from CLI arguments
 */
export const processIconFromArgs = async (
  options: CLIOptions,
  config: Config,
  projectRoot: string
): Promise<void> => {
  // Validate required options
  if (!options.name) {
    logger.error("-n or --name is required");
    process.exit(1);
  }

  // Support both --paste/-p and --svg
  const pasteContent = options.paste || options.svg;

  if (!pasteContent && !options.url && !options.file) {
    logger.error("One of -p/--paste, -u/--url, or -f/--file is required");
    process.exit(1);
  }

  try {
    // Get SVG content
    let svgContent: string;

    if (pasteContent) {
      svgContent = pasteContent;
    } else if (options.url) {
      const loadSpinner = spinner.start("Fetching SVG from URL...");
      try {
        svgContent = await fetchSVGFromURL(options.url);
        loadSpinner.succeed("SVG fetched successfully");
      } catch (error) {
        loadSpinner.fail("Failed to fetch SVG");
        throw error;
      }
    } else if (options.file) {
      svgContent = await fs.readFile(options.file, "utf-8");
    } else {
      throw new Error("No SVG source provided");
    }

    // Validate SVG
    if (!isValidSVG(svgContent)) {
      logger.error("Invalid SVG content");
      process.exit(1);
    }

    // Generate component name
    const componentName = generateIconName(
      options.name,
      config.naming.suffix,
      config.naming.componentCase
    );

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

    // Override config with CLI options
    const effectiveConfig = {
      ...config,
      ...(options.framework && { framework: options.framework as "react" | "vue" | "svelte" }),
      ...(options.adapt !== undefined && { adaptToProject: options.adapt }),
    };

    // Generate component
    const genSpinner = spinner.start("Generating component...");
    const component = await generateComponent({
      componentName,
      svgContent: processed.content,
      viewBox: processed.viewBox,
      config: effectiveConfig,
    });
    genSpinner.succeed(`${component.filename} generated`);

    // Determine output directory
    const baseDir = options.output || config.baseDir;
    const iconsFolder = config.iconsFolder;

    // Write file
    const filePath = await writeComponentFile({
      projectRoot,
      baseDir,
      iconsFolder,
      filename: component.filename,
      content: component.content,
      force: true, // Don't prompt in CLI mode
    });

    logger.success(`${component.filename} created`);

    // Update index
    if (config.maintainIndex) {
      const iconsDir = path.join(projectRoot, baseDir, iconsFolder);
      await updateIndexFile(iconsDir, component.extension);
      logger.success("index.ts updated");
    }

    logger.newline();
    logger.title("Icon created successfully! 🎉");
    logger.newline();
    console.log(`📁 ${path.relative(projectRoot, filePath)}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An error occurred");
    }
    process.exit(1);
  }
};

/**
 * Process batch directory from CLI arguments
 */
export const processBatchFromArgs = async (
  batchDir: string,
  config: Config,
  projectRoot: string
): Promise<void> => {
  await processBatchIcons({
    batchDir,
    projectRoot,
    config,
  });
};

/**
 * Process multi-variant icon from CLI arguments
 */
export const processVariantIconFromArgs = async (
  options: CLIOptions,
  config: Config,
  projectRoot: string
): Promise<void> => {
  // Validate required options
  if (!options.name) {
    logger.error("-n or --name is required");
    process.exit(1);
  }

  if (!options.directive && !options.variant) {
    logger.error("Either --directive or --variant must be specified");
    process.exit(1);
  }

  try {
    const baseName = options.name;
    const variantConfig: VariantConfig = {
      type:
        options.directive && options.variant
          ? "combined"
          : options.directive
            ? "direction"
            : "style",
      baseName,
    };

    // Prompt to select variants
    if (options.directive) {
      variantConfig.directions = await promptDirectionVariants(baseName);

      // Ask if user also wants styles
      if (!options.variant) {
        const addStyles = await promptAddStyleVariants();
        if (addStyles) {
          variantConfig.type = "combined";
          variantConfig.styles = await promptStyleVariants(baseName);
        }
      }
    }

    if (options.variant) {
      variantConfig.styles = await promptStyleVariants(baseName);
    }

    // Collect SVG for each variant
    const variants: VariantSVGContent[] = [];
    const allVariants = [...(variantConfig.directions || []), ...(variantConfig.styles || [])];

    for (let i = 0; i < allVariants.length; i++) {
      const variant = allVariants[i];
      const svgContent = await promptVariantSVG(baseName, variant, i + 1, allVariants.length);

      // Validate SVG
      if (!isValidSVG(svgContent)) {
        logger.error(`Invalid SVG content for variant "${variant}"`);
        process.exit(1);
      }

      // Process SVG
      const processed = await optimizeSVG(svgContent, config.optimize);

      variants.push({
        variant,
        svgContent: processed.content,
        viewBox: processed.viewBox,
      });
    }

    // Generate multi-variant component
    const variantData: VariantComponentData = {
      config: variantConfig,
      variants,
    };

    // Override config with CLI options
    const effectiveConfig = {
      ...config,
      ...(options.framework && { framework: options.framework as "react" | "vue" | "svelte" }),
      ...(options.adapt !== undefined && { adaptToProject: options.adapt }),
    };

    const genSpinner = spinner.start("Generating variant component...");
    const component = await import("@/core/variant-generator.js").then((m) =>
      m.generateVariantComponent({
        variantData,
        config: effectiveConfig,
      })
    );
    genSpinner.succeed(`${component.filename} generated with ${variants.length} variants`);

    // Determine output directory
    const baseDir = options.output || config.baseDir;
    const iconsFolder = config.iconsFolder;

    // Write file
    const filePath = await writeComponentFile({
      projectRoot,
      baseDir,
      iconsFolder,
      filename: component.filename,
      content: component.content,
      force: true,
    });

    logger.success(`${component.filename} created`);

    // Update index
    if (config.maintainIndex) {
      const iconsDir = path.join(projectRoot, baseDir, iconsFolder);
      await updateIndexFile(iconsDir, component.extension);
      logger.success("index.ts updated");
    }

    logger.newline();
    logger.title("Multi-variant icon created successfully! 🎉");
    logger.newline();
    console.log(`📁 ${path.relative(projectRoot, filePath)}`);
    logger.newline();
    console.log("Usage examples:");
    if (variantConfig.directions) {
      console.log(`  <${baseName} direction="${variantConfig.directions[0]}" />`);
    }
    if (variantConfig.styles) {
      console.log(`  <${baseName} variant="${variantConfig.styles[0]}" />`);
      console.log(`  <${baseName} ${variantConfig.styles[0]} />`);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An error occurred");
    }
    process.exit(1);
  }
};
