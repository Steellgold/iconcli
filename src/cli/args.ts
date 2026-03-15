import { Command } from 'commander';
import { Config } from '../config/schema.js';
import { generateIconName } from '../utils/naming.js';
import { isValidSVG } from '../utils/validation.js';
import { fetchSVGFromURL } from '../core/url-fetcher.js';
import { optimizeSVG } from '../core/svg-processor.js';
import { generateComponent } from '../core/component-generator.js';
import { writeComponentFile } from '../core/file-writer.js';
import { updateIndexFile } from '../core/index-maintainer.js';
import { processBatchIcons } from '../batch/processor.js';
import { logger, spinner } from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

export interface CLIOptions {
  name?: string;
  svg?: string;
  url?: string;
  file?: string;
  batch?: string;
  framework?: string;
  output?: string;
}

/**
 * Create Commander program
 */
export const createProgram = (): Command => {
  const program = new Command();
  
  program
    .name('mkicon')
    .description('Transform SVG icons into beautiful React, Vue, or Svelte components')
    .version('0.1.0');
  
  program
    .option('--name <name>', 'Icon name')
    .option('--svg <svg>', 'SVG code')
    .option('--url <url>', 'SVG URL')
    .option('--file <path>', 'SVG file path')
    .option('--batch <dir>', 'Batch process directory')
    .option('--framework <framework>', 'Override framework (react, vue, svelte)')
    .option('--output <dir>', 'Override output directory');
  
  program
    .command('config')
    .description('Manage mkicon configuration')
    .option('--show', 'Show current configuration')
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
    logger.error('--name is required');
    process.exit(1);
  }
  
  if (!options.svg && !options.url && !options.file) {
    logger.error('One of --svg, --url, or --file is required');
    process.exit(1);
  }
  
  try {
    // Get SVG content
    let svgContent: string;
    
    if (options.svg) {
      svgContent = options.svg;
    } else if (options.url) {
      const loadSpinner = spinner.start('Fetching SVG from URL...');
      try {
        svgContent = await fetchSVGFromURL(options.url);
        loadSpinner.succeed('SVG fetched successfully');
      } catch (error) {
        loadSpinner.fail('Failed to fetch SVG');
        throw error;
      }
    } else if (options.file) {
      svgContent = await fs.readFile(options.file, 'utf-8');
    } else {
      throw new Error('No SVG source provided');
    }
    
    // Validate SVG
    if (!isValidSVG(svgContent)) {
      logger.error('Invalid SVG content');
      process.exit(1);
    }
    
    // Generate component name
    const componentName = generateIconName(
      options.name,
      config.naming.suffix,
      config.naming.componentCase
    );
    
    // Process SVG
    const processSpinner = spinner.start('Processing SVG...');
    const processed = await optimizeSVG(svgContent, config.optimize);
    
    if (config.optimize && processed.optimizedSize < processed.originalSize) {
      processSpinner.succeed(
        `SVG optimized (${processed.originalSize} bytes → ${processed.optimizedSize} bytes)`
      );
    } else {
      processSpinner.succeed('SVG processed');
    }
    
    // Generate component
    const genSpinner = spinner.start('Generating component...');
    const component = generateComponent({
      componentName,
      svgContent: processed.content,
      viewBox: processed.viewBox,
      config,
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
      logger.success('index.ts updated');
    }
    
    logger.newline();
    logger.title('Icon created successfully! 🎉');
    logger.newline();
    console.log(`📁 ${path.relative(projectRoot, filePath)}`);
    
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('An error occurred');
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
