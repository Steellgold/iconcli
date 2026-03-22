import type { Config } from "@/config/schema";
import { generateComponent } from "@/core/component-generator";
import { trackGeneratedComponent } from "@/core/diff-checker";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { optimizeSVG } from "@/core/svg-processor";
import { logger, spinner } from "@/utils/logger";
import { extractIconNameFromFilename, generateIconName } from "@/utils/naming";
import { getFilesWithExtension } from "@/utils/paths";
import { isValidSVG } from "@/utils/validation";
import enquirer from "enquirer";
import fs from "fs/promises";
import path from "path";
import type { DetectedVariantGroup } from "@/core/variant-detector";
import { detectVariantGroups } from "@/core/variant-detector";
import { generateVariantComponent } from "@/core/variant-generator";
import type {
  VariantConfig,
  VariantSVGContent,
  VariantComponentData,
  DirectionVariant,
  StyleVariant,
} from "@/types/variants";

const { prompt } = enquirer;

export interface BatchProcessOptions {
  batchDir: string;
  projectRoot: string;
  config: Config;
}

/**
 * Process multiple SVG files from a directory
 */
export const processBatchIcons = async (options: BatchProcessOptions): Promise<void> => {
  const { batchDir, projectRoot, config } = options;

  // Resolve batch directory
  const resolvedBatchDir = path.isAbsolute(batchDir)
    ? batchDir
    : path.resolve(process.cwd(), batchDir);

  // Check if directory exists
  try {
    await fs.access(resolvedBatchDir);
  } catch {
    logger.error(`Directory not found: ${batchDir}`);
    return;
  }

  // Find all SVG files
  const scanSpinner = spinner.start(`Scanning folder: ${batchDir}`);
  const svgFiles = await getFilesWithExtension(resolvedBatchDir, ".svg");
  scanSpinner.succeed(`Found ${svgFiles.length} SVG file(s)`);

  if (svgFiles.length === 0) {
    logger.warning("No SVG files found in the directory");
    return;
  }

  logger.newline();
  logger.print("SVG files found:");
  svgFiles.forEach((file) => {
    logger.print(`  • ${file}`);
  });
  logger.newline();

  // NEW: Detect variant groups
  const svgPaths = svgFiles.map((file) => path.join(resolvedBatchDir, file));
  const variantGroups = detectVariantGroups(svgPaths);

  let processAsVariants = false;
  let filesToProcess = svgFiles;

  if (variantGroups.length > 0) {
    logger.info("🎨 Detected potential variant groups:");
    logger.newline();

    for (const group of variantGroups) {
      const variantsList = group.variants.map((v) => v.variant).join(", ");
      logger.print(`  ${group.baseName} (${group.type}): ${variantsList}`);
    }

    logger.newline();
    const { useVariants } = await prompt<{ useVariants: boolean }>({
      type: "confirm",
      name: "useVariants",
      message: "Do you want to process these as multi-variant components?",
      initial: true,
    });

    processAsVariants = useVariants;

    if (processAsVariants) {
      // Remove grouped files from the normal file list
      const groupedFiles = new Set(
        variantGroups.flatMap((g) => g.variants.map((v) => path.basename(v.filePath)))
      );
      filesToProcess = svgFiles.filter((f) => !groupedFiles.has(f));
    }

    logger.newline();
  }

  // Ask for confirmation
  const { confirm } = await prompt<{ confirm: boolean }>({
    type: "confirm",
    name: "confirm",
    message: processAsVariants
      ? `Create ${variantGroups.length} variant component(s) and ${filesToProcess.length} regular icon(s)?`
      : `Create ${svgFiles.length} icon component(s)?`,
    initial: true,
  });

  if (!confirm) {
    logger.info("Batch processing cancelled");
    return;
  }

  logger.newline();
  const processSpinner = spinner.start("Processing icons...");

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ file: string; error: string }>,
  };

  // NEW: Process variant groups first if requested
  if (processAsVariants && variantGroups.length > 0) {
    for (const group of variantGroups) {
      try {
        await processBatchVariantGroup(group, config, projectRoot);
        processSpinner.text = `Processing variant: ${group.baseName} (${group.variants.length} variants)`;
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          file: group.baseName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  // Process each remaining SVG file
  for (const file of filesToProcess) {
    try {
      const svgPath = path.join(resolvedBatchDir, file);
      const svgContent = await fs.readFile(svgPath, "utf-8");

      // Validate SVG
      if (!isValidSVG(svgContent)) {
        results.failed++;
        results.errors.push({ file, error: "Invalid SVG content" });
        continue;
      }

      // Extract and generate icon name
      const baseName = extractIconNameFromFilename(file);
      const componentName = generateIconName(
        baseName,
        config.naming.suffix,
        config.naming.componentCase
      );

      // Process SVG
      const processed = await optimizeSVG(svgContent, config.optimize);

      // Generate component
      const component = await generateComponent({
        componentName,
        svgContent: processed.content,
        viewBox: processed.viewBox,
        config,
      });

      // Write file
      await writeComponentFile({
        projectRoot,
        baseDir: config.baseDir,
        iconsFolder: config.iconsFolder,
        filename: component.filename,
        content: component.content,
        force: true, // Don't prompt in batch mode
      });

      // Track for diff
      await trackGeneratedComponent(
        projectRoot,
        component.filename,
        componentName,
        path.relative(projectRoot, svgPath),
        svgContent
      );

      processSpinner.text = `Processing: ${file} → ${component.filename}`;
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        file,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const totalProcessed = processAsVariants
    ? variantGroups.length + filesToProcess.length
    : svgFiles.length;
  processSpinner.succeed(`Processed ${results.success}/${totalProcessed} icons`);

  // Update index
  if (config.maintainIndex && results.success > 0) {
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    const component = await generateComponent({
      componentName: "Temp",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      config,
    });
    await updateIndexFile(iconsDir, component.extension);
    logger.success("index.ts updated");
  }

  // Display results
  logger.newline();

  if (results.failed > 0) {
    logger.warning(`${results.failed} file(s) failed:`);
    results.errors.forEach(({ file, error }) => {
      logger.print(`  ✗ ${file}: ${error}`);
    });
    logger.newline();
  }

  logger.title(`${results.success} icon(s) created successfully! 🎉`);
};

/**
 * Process a single SVG file and write the resulting component.
 * Returns the generated component filename, or throws on failure.
 */
export const processSingleSvgFile = async (
  svgPath: string,
  projectRoot: string,
  config: Config
): Promise<string> => {
  const svgContent = await fs.readFile(svgPath, "utf-8");

  if (!isValidSVG(svgContent)) {
    throw new Error("Invalid SVG content");
  }

  const file = path.basename(svgPath);
  const baseName = extractIconNameFromFilename(file);
  const componentName = generateIconName(
    baseName,
    config.naming.suffix,
    config.naming.componentCase
  );

  const processed = await optimizeSVG(svgContent, config.optimize);

  const component = await generateComponent({
    componentName,
    svgContent: processed.content,
    viewBox: processed.viewBox,
    config,
  });

  await writeComponentFile({
    projectRoot,
    baseDir: config.baseDir,
    iconsFolder: config.iconsFolder,
    filename: component.filename,
    content: component.content,
    force: true,
  });

  await trackGeneratedComponent(
    projectRoot,
    component.filename,
    componentName,
    path.relative(projectRoot, svgPath),
    svgContent
  );

  if (config.maintainIndex) {
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    await updateIndexFile(iconsDir, component.extension);
  }

  return component.filename;
};

/**
 * Process a detected variant group
 */
const processBatchVariantGroup = async (
  group: DetectedVariantGroup,
  config: Config,
  projectRoot: string
): Promise<void> => {
  // Read and process each SVG
  const variants: VariantSVGContent[] = [];

  for (const v of group.variants) {
    const svgContent = await fs.readFile(v.filePath, "utf-8");

    if (!isValidSVG(svgContent)) {
      throw new Error(`Invalid SVG: ${v.fileName}`);
    }

    const processed = await optimizeSVG(svgContent, config.optimize);

    variants.push({
      variant: v.variant,
      svgContent: processed.content,
      viewBox: processed.viewBox,
    });
  }

  // Build variant config
  const variantConfig: VariantConfig = {
    type: group.type,
    baseName: group.baseName,
  };

  if (group.type === "direction") {
    variantConfig.directions = group.variants.map((v) => v.variant as DirectionVariant);
  } else {
    variantConfig.styles = group.variants.map((v) => v.variant as StyleVariant);
  }

  const variantData: VariantComponentData = {
    config: variantConfig,
    variants,
  };

  // Generate component
  const component = await generateVariantComponent({
    variantData,
    config,
  });

  // Write file
  await writeComponentFile({
    projectRoot,
    baseDir: config.baseDir,
    iconsFolder: config.iconsFolder,
    filename: component.filename,
    content: component.content,
    force: true,
  });
};
