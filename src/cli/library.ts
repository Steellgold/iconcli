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
    
    // Search and select icon
    const iconName = await promptIconSearchAndSelect(icons);
    
    if (!iconName) {
      logger.info('No icon selected');
      return;
    }
    
    logger.newline();
    
    // Fetch selected icon
    const { svgContent, metadata } = await fetchLucideIcon(iconName);
    
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
 * Prompt user to search and select a single icon
 */
const promptIconSearchAndSelect = async (icons: IconMetadata[]): Promise<string | null> => {
  const iconChoices = icons.map(icon => ({
    name: icon.name,
    message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(', ')})` : ''}`,
    value: icon.name,
  }));
  
  try {
    const autocomplete = new AutoComplete({
      name: 'icon',
      message: 'Search for an icon:',
      limit: 15,
      choices: iconChoices,
      suggest(input: string, choices: any[]) {
        if (!input) return choices.slice(0, 15);
        
        const lowerInput = input.toLowerCase();
        
        const matchingIcons = icons.filter(icon => {
          if (icon.name.toLowerCase().includes(lowerInput)) return true;
          return icon.tags.some((tag: string) => tag.toLowerCase().includes(lowerInput));
        });
        
        return matchingIcons.slice(0, 15).map(icon => ({
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
