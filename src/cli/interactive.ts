import path from 'path';
import fs from 'fs/promises';
import { Config } from '../config/schema.js';
import { validateConfigPath } from '../config/validator.js';
import { updateConfig } from '../config/manager.js';
import { 
  promptSVGSource, 
  promptSVGContent, 
  promptSVGURL, 
  promptIconName, 
  promptCreateAnother 
} from './prompts.js';
import { fetchSVGFromURL } from '../core/url-fetcher.js';
import { optimizeSVG } from '../core/svg-processor.js';
import { generateComponent } from '../core/component-generator.js';
import { writeComponentFile } from '../core/file-writer.js';
import { updateIndexFile } from '../core/index-maintainer.js';
import { generateIconName } from '../utils/naming.js';
import { isValidSVG } from '../utils/validation.js';
import { logger, spinner } from '../utils/logger.js';

export interface InteractiveOptions {
  projectRoot: string;
  config: Config;
}

/**
 * Run interactive icon creation flow
 */
export const runInteractive = async (options: InteractiveOptions): Promise<void> => {
  const { projectRoot, config: initialConfig } = options;
  let config = initialConfig;
  
  // Validate config path
  const validation = await validateConfigPath(projectRoot, config);
  if (!validation.valid) {
    logger.error('Setup cancelled');
    return;
  }
  
  if (validation.updatedConfig) {
    config = validation.updatedConfig;
    await updateConfig(projectRoot, config);
  }
  
  let createAnother = true;
  
  while (createAnother) {
    try {
      // Ask for SVG source
      const { source } = await promptSVGSource();
      
      let svgContent: string;
      
      // Get SVG content based on source
      if (source === 'paste') {
        svgContent = await promptSVGContent();
      } else if (source === 'url') {
        const url = await promptSVGURL();
        const loadSpinner = spinner.start('Fetching SVG from URL...');
        
        try {
          svgContent = await fetchSVGFromURL(url);
          loadSpinner.succeed('SVG fetched successfully');
        } catch (error) {
          loadSpinner.fail('Failed to fetch SVG');
          throw error;
        }
      } else {
        // file source
        const filePath = await promptSVGContent(); // TODO: Use file prompt
        svgContent = await fs.readFile(filePath, 'utf-8');
      }
      
      // Validate SVG
      if (!isValidSVG(svgContent)) {
        logger.error('Invalid SVG content');
        continue;
      }
      
      // Ask for icon name
      const iconName = await promptIconName();
      const componentName = generateIconName(
        iconName,
        config.naming.suffix,
        config.naming.case
      );
      
      logger.separator();
      logger.newline();
      
      // Process SVG
      const processSpinner = spinner.start('Processing SVG...');
      const processed = await optimizeSVG(
        svgContent,
        config.optimize
      );
      
      if (config.optimize && processed.optimizedSize < processed.originalSize) {
        processSpinner.succeed(
          `SVG optimized (${processed.originalSize} bytes → ${processed.optimizedSize} bytes)`
        );
      } else {
        processSpinner.succeed('SVG processed');
      }
      
      logger.success(`ViewBox detected: ${processed.viewBox}`);
      
      // Generate component
      logger.newline();
      const genSpinner = spinner.start('Generating component...');
      const component = generateComponent({
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
        logger.success('index.ts updated');
      }
      
      logger.separator();
      logger.newline();
      logger.title('🎉 Icon created successfully!');
      logger.newline();
      console.log(`📁 ${path.relative(projectRoot, filePath)}`);
      logger.newline();
      console.log('Import:');
      console.log(`  import { ${componentName} } from '@/components/icons';`);
      logger.newline();
      console.log('Usage:');
      console.log(`  <${componentName} size={24} color="blue" />`);
      logger.separator();
      logger.newline();
      
      // Ask if user wants to create another
      createAnother = await promptCreateAnother();
      
      if (createAnother) {
        logger.newline();
      }
      
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error('An error occurred');
      }
      
      createAnother = await promptCreateAnother();
    }
  }
  
  logger.info('👋 Goodbye!');
};
