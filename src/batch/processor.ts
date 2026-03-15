import fs from 'fs/promises';
import path from 'path';
import enquirer from 'enquirer';
import { Config } from '@/config/schema.js';
import { getFilesWithExtension } from '@/utils/paths.js';
import { extractIconNameFromFilename, generateIconName } from '@/utils/naming.js';
import { isValidSVG } from '@/utils/validation.js';
import { optimizeSVG } from '@/core/svg-processor.js';
import { generateComponent } from '@/core/component-generator.js';
import { writeComponentFile } from '@/core/file-writer.js';
import { updateIndexFile } from '@/core/index-maintainer.js';
import { logger, spinner } from '@/utils/logger.js';

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
  const svgFiles = await getFilesWithExtension(resolvedBatchDir, '.svg');
  scanSpinner.succeed(`Found ${svgFiles.length} SVG file(s)`);
  
  if (svgFiles.length === 0) {
    logger.warning('No SVG files found in the directory');
    return;
  }
  
  logger.newline();
  console.log('SVG files found:');
  svgFiles.forEach((file) => {
    console.log(`  • ${file}`);
  });
  logger.newline();
  
  // Ask for confirmation
  const { confirm } = await prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: `Create ${svgFiles.length} icon component(s)?`,
    initial: true,
  });
  
  if (!confirm) {
    logger.info('Batch processing cancelled');
    return;
  }
  
  logger.newline();
  const processSpinner = spinner.start('Processing icons...');
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ file: string; error: string }>,
  };
  
  // Process each SVG file
  for (const file of svgFiles) {
    try {
      const svgPath = path.join(resolvedBatchDir, file);
      const svgContent = await fs.readFile(svgPath, 'utf-8');
      
      // Validate SVG
      if (!isValidSVG(svgContent)) {
        results.failed++;
        results.errors.push({ file, error: 'Invalid SVG content' });
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
      const component = generateComponent({
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
      
      processSpinner.text = `Processing: ${file} → ${component.filename}`;
      results.success++;
      
    } catch (error) {
      results.failed++;
      results.errors.push({ 
        file, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  processSpinner.succeed(`Processed ${results.success}/${svgFiles.length} icons`);
  
  // Update index
  if (config.maintainIndex && results.success > 0) {
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    const component = generateComponent({
      componentName: 'Temp',
      svgContent: '<svg></svg>',
      viewBox: '0 0 24 24',
      config,
    });
    await updateIndexFile(iconsDir, component.extension);
    logger.success('index.ts updated');
  }
  
  // Display results
  logger.newline();
  
  if (results.failed > 0) {
    logger.warning(`${results.failed} file(s) failed:`);
    results.errors.forEach(({ file, error }) => {
      console.log(`  ✗ ${file}: ${error}`);
    });
    logger.newline();
  }
  
  logger.title(`${results.success} icon(s) created successfully! 🎉`);
};
