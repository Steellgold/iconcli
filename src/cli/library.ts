import { Config } from '@/config/schema.js';
import { generateComponent } from '@/core/component-generator.js';
import { writeComponentFile } from '@/core/file-writer.js';
import { updateIndexFile } from '@/core/index-maintainer.js';
import { optimizeSVG } from '@/core/svg-processor.js';
import { fetchLucideIcon, fetchLucideIcons, generateLucideCopyright } from '@/library/lucide.js';
import { IconMetadata } from '@/library/types.js';
import { logger, spinner } from '@/utils/logger.js';
import { generateIconName } from '@/utils/naming.js';
import enquirer from 'enquirer';
import path from 'path';

const { prompt, MultiSelect } = enquirer as any;

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
    // Select library
    const library = await promptLibrarySelection();
    
    if (library === 'request') {
      // Open GitHub issue for library request
      const issueUrl = 'https://github.com/Steellgold/mkicon/issues/new?template=library-request.yml';
      logger.info('Opening GitHub to request a new library...');
      logger.newline();
      console.log(`Please open this URL in your browser:`);
      console.log(issueUrl);
      logger.newline();
      logger.info('Thank you for your suggestion! 🙏');
      return;
    }
    
    if (!library) {
      logger.info('No library selected');
      return;
    }
    
    // Fetch all icons
    const fetchSpinner = spinner.start('Loading Lucide Icons...');
    const icons = await fetchLucideIcons();
    fetchSpinner.succeed(`Loaded ${icons.length} icons from Lucide`);
    
    logger.newline();
    
    // Multi-select with search
    const selectedIcons = await promptMultiIconSelection(icons);
    
    if (!selectedIcons || selectedIcons.length === 0) {
      logger.info('No icons selected');
      return;
    }
    
    logger.newline();
    logger.info(`Processing ${selectedIcons.length} icons...`);
    logger.newline();
    
    // Process each icon
    for (const iconName of selectedIcons) {
      const { svgContent, metadata } = await fetchLucideIcon(iconName);
      
      // Process SVG
      const processed = await optimizeSVG(svgContent, config.optimize);
      
      // Generate component name
      const componentName = generateIconName(
        iconName,
        config.naming.suffix,
        config.naming.componentCase
      );
      
      // Generate component
      const component = generateComponent({
        componentName,
        svgContent: processed.content,
        viewBox: processed.viewBox,
        config,
      });
      
      // Add copyright header
      const copyright = generateLucideCopyright(metadata.iconName);
      const contentWithCopyright = `${copyright}\n\n${component.content}`;
      
      // Write file
      await writeComponentFile({
        projectRoot,
        baseDir: config.baseDir,
        iconsFolder: config.iconsFolder,
        filename: component.filename,
        content: contentWithCopyright,
      });
      
      logger.success(`${component.filename} created`);
    }
    
    // Update index once for all icons
    if (config.maintainIndex) {
      const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
      const tempComponent = generateComponent({
        componentName: 'temp',
        svgContent: '',
        viewBox: '0 0 24 24',
        config,
      });
      await updateIndexFile(iconsDir, tempComponent.extension);
      logger.success('index.ts updated');
    }
    
    logger.separator();
    logger.newline();
    logger.title(`${selectedIcons.length} icons imported successfully! 🎉`);
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
 * Prompt user to select a library
 */
const promptLibrarySelection = async (): Promise<string | null> => {
  try {
    const answer = await prompt({
      type: 'select',
      name: 'library',
      message: 'Select an icon library:',
      choices: [
        { name: 'lucide', message: 'Lucide Icons (1700+ icons)', value: 'lucide' },
        { name: '', role: 'separator' },
        { name: 'request', message: '💡 Request a new library', value: 'request' },
      ],
    }) as { library: string };
    
    return answer.library;
  } catch (error) {
    // User cancelled
    return null;
  }
};

/**
 * Prompt user to select multiple icons
 */
const promptMultiIconSelection = async (icons: IconMetadata[]): Promise<string[] | null> => {
  const iconChoices = icons.map(icon => ({
    name: icon.name,
    message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(', ')})` : ''}`,
    value: icon.name,
  }));
  
  try {
    const multiselect = new MultiSelect({
      name: 'icons',
      message: 'Select icons (Space to select, Enter to confirm):',
      limit: 10,
      choices: iconChoices,
      result(names: string[]) {
        return names;
      },
    });
    
    const selected = await multiselect.run();
    return selected as string[];
    
  } catch (error) {
    // User cancelled
    return null;
  }
};
