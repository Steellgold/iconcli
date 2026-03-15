import path from 'path';
import enquirer from 'enquirer';
import { Config } from '@/config/schema.js';
import { fetchLucideIcons, fetchLucideIcon, generateLucideCopyright } from '@/library/lucide.js';
import { IconMetadata } from '@/library/types.js';
import { optimizeSVG } from '@/core/svg-processor.js';
import { generateComponent } from '@/core/component-generator.js';
import { writeComponentFile } from '@/core/file-writer.js';
import { updateIndexFile } from '@/core/index-maintainer.js';
import { generateIconName } from '@/utils/naming.js';
import { logger, spinner } from '@/utils/logger.js';

const { prompt, AutoComplete } = enquirer as any;

export interface LibraryOptions {
  projectRoot: string;
  config: Config;
}

/**
 * Run library browser for importing icons from Lucide
 */
export const runLibraryBrowser = async (options: LibraryOptions): Promise<void> => {
  const { projectRoot, config } = options;
  
  try {
    // Fetch all icons
    const fetchSpinner = spinner.start('Loading Lucide Icons...');
    const icons = await fetchLucideIcons();
    fetchSpinner.succeed(`Loaded ${icons.length} icons from Lucide`);
    
    logger.newline();
    
    // Search/select icon
    const iconName = await promptIconSelection(icons);
    
    if (!iconName) {
      logger.info('No icon selected');
      return;
    }
    
    logger.newline();
    
    // Fetch selected icon
    const loadSpinner = spinner.start(`Fetching ${iconName}...`);
    const { svgContent, metadata } = await fetchLucideIcon(iconName);
    loadSpinner.succeed('Icon fetched successfully');
    
    // Ask for component name
    const nameAnswer = await prompt({
      type: 'confirm',
      name: 'useOriginalName',
      message: `Use '${iconName}' as component name?`,
      initial: true,
    }) as { useOriginalName: boolean };
    
    let componentBaseName: string;
    if (nameAnswer.useOriginalName) {
      componentBaseName = iconName;
    } else {
      const customAnswer = await prompt({
        type: 'input',
        name: 'customName',
        message: 'Enter custom component name:',
        initial: iconName,
      }) as { customName: string };
      componentBaseName = customAnswer.customName;
    }
    
    const componentName = generateIconName(
      componentBaseName,
      config.naming.suffix,
      config.naming.componentCase
    );
    
    logger.separator();
    logger.newline();
    
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
    
    logger.success(`ViewBox detected: ${processed.viewBox}`);
    
    // Generate component with copyright header
    logger.newline();
    const genSpinner = spinner.start('Generating component...');
    const component = generateComponent({
      componentName,
      svgContent: processed.content,
      viewBox: processed.viewBox,
      config,
    });
    
    // Add copyright header
    const copyright = generateLucideCopyright(metadata.iconName);
    const contentWithCopyright = `${copyright}\n\n${component.content}`;
    
    genSpinner.succeed(`${component.filename} generated`);
    
    // Write file
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    const filePath = await writeComponentFile({
      projectRoot,
      baseDir: config.baseDir,
      iconsFolder: config.iconsFolder,
      filename: component.filename,
      content: contentWithCopyright,
    });
    
    logger.success(`${component.filename} created`);
    
    // Update index
    if (config.maintainIndex) {
      await updateIndexFile(iconsDir, component.extension);
      logger.success('index.ts updated');
    }
    
    logger.separator();
    logger.newline();
    logger.title('Icon imported successfully! 🎉');
    logger.newline();
    console.log(`📁 ${path.relative(projectRoot, filePath)}`);
    console.log(`📚 From: Lucide Icons (${metadata.library.website})`);
    logger.newline();
    console.log('Import:');
    console.log(`  import { ${componentName} } from '@/components/icons';`);
    logger.newline();
    console.log('Usage:');
    console.log(`  <${componentName} size={24} color="blue" />`);
    logger.separator();
    logger.newline();
    
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
 * Prompt user to search and select an icon
 */
const promptIconSelection = async (icons: IconMetadata[]): Promise<string | null> => {
  const iconChoices = icons.map(icon => ({
    name: icon.name,
    message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(', ')})` : ''}`,
    value: icon.name,
  }));
  
  try {
    const autocomplete = new AutoComplete({
      name: 'icon',
      message: 'Search for an icon:',
      limit: 10,
      choices: iconChoices,
      suggest(input: string, choices: any[]) {
        if (!input) return choices;
        
        const lowerInput = input.toLowerCase();
        
        // Search in icons
        const matchingIcons = icons.filter(icon => {
          // Match by name
          if (icon.name.includes(lowerInput)) return true;
          
          // Match by tags
          return icon.tags.some(tag => tag.toLowerCase().includes(lowerInput));
        });
        
        return matchingIcons.slice(0, 10).map(icon => ({
          name: icon.name,
          message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(', ')})` : ''}`,
          value: icon.name,
        }));
      },
    });
    
    const selected = await autocomplete.run();
    return selected as string;
    
  } catch (error) {
    // User cancelled
    return null;
  }
};
