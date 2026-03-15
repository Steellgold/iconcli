import path from 'path';
import fs from 'fs/promises';
import { Config } from '@/config/schema.js';
import { validateConfigPath } from '@/config/validator.js';
import { updateConfig } from '@/config/manager.js';
import { 
  promptSVGSource, 
  promptSVGContent, 
  promptSVGURL, 
  promptIconName, 
  promptConfirmIconName,
  promptCreateAnother 
} from './prompts.js';
import { fetchSVGFromURL } from '@/core/url-fetcher.js';
import { fetchLucideIcons, fetchLucideIcon, generateLucideCopyright } from '@/library/lucide.js';
import { optimizeSVG } from '@/core/svg-processor.js';
import { generateComponent } from '@/core/component-generator.js';
import { writeComponentFile } from '@/core/file-writer.js';
import { updateIndexFile } from '@/core/index-maintainer.js';
import { generateIconName, extractIconNameFromURL } from '@/utils/naming.js';
import { isValidSVG } from '@/utils/validation.js';
import { logger, spinner } from '@/utils/logger.js';
import enquirer from 'enquirer';

const { AutoComplete, MultiSelect, prompt } = enquirer as any;

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
      let suggestedName: string | null = null;
      let copyrightHeader: string | null = null;
      
      // Get SVG content based on source
      if (source === 'library') {
        // Select library
        const libraryAnswer = await prompt({
          type: 'select',
          name: 'library',
          message: 'Select an icon library:',
          choices: [
            { name: 'lucide', message: 'Lucide Icons (1700+ icons)', value: 'lucide' },
            { name: 'separator', role: 'separator' },
            { name: 'request', message: '💡 Request a new library', value: 'request' },
          ],
        }) as { library: string };
        
        if (libraryAnswer.library === 'request') {
          const issueUrl = 'https://github.com/Steellgold/mkicon/issues/new?template=library-request.yml';
          logger.info('Opening GitHub to request a new library...');
          logger.newline();
          console.log(`Please open this URL in your browser:`);
          console.log(issueUrl);
          logger.newline();
          logger.info('Thank you for your suggestion! 🙏');
          logger.newline();
          createAnother = await promptCreateAnother();
          continue;
        }
        
        // Load library icons (currently only Lucide)
        const fetchSpinner = spinner.start('Loading Lucide Icons...');
        const icons = await fetchLucideIcons();
        fetchSpinner.succeed(`Loaded ${icons.length} icons from Lucide`);
        logger.newline();
        
        // Ask single or multiple
        const selectionAnswer = await prompt({
          type: 'select',
          name: 'selectionType',
          message: 'How many icons do you want to import?',
          choices: [
            { name: 'single', message: 'Single icon', value: 'single' },
            { name: 'multiple', message: 'Multiple icons (Space to select, Enter to confirm)', value: 'multiple' },
          ],
        }) as { selectionType: 'single' | 'multiple' };
        
        const iconChoices = icons.map(icon => ({
          name: icon.name,
          message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(', ')})` : ''}`,
          value: icon.name,
        }));
        
        if (selectionAnswer.selectionType === 'multiple') {
          // Multi-select with search
          const multiselect = new MultiSelect({
            name: 'icons',
            message: 'Select icons (Space to select, Enter to confirm):',
            limit: 10,
            choices: iconChoices,
            result(names: string[]) {
              return names;
            },
          });
          
          const selectedIcons = await multiselect.run() as string[];
          
          if (!selectedIcons || selectedIcons.length === 0) {
            logger.info('No icons selected');
            logger.newline();
            createAnother = await promptCreateAnother();
            continue;
          }
          
          logger.newline();
          logger.info(`Processing ${selectedIcons.length} icons...`);
          logger.newline();
          
          // Process each icon
          for (const iconName of selectedIcons) {
            const loadSpinner = spinner.start(`Fetching ${iconName}...`);
            const { svgContent: libSvg, metadata } = await fetchLucideIcon(iconName);
            loadSpinner.succeed(`${iconName} fetched`);
            
            const copyrightHeader = generateLucideCopyright(metadata.iconName);
            
            // Process SVG
            const processed = await optimizeSVG(libSvg, config.optimize);
            
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
            const finalContent = `${copyrightHeader}\n\n${component.content}`;
            
            // Write file
            const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
            await writeComponentFile({
              projectRoot,
              baseDir: config.baseDir,
              iconsFolder: config.iconsFolder,
              filename: component.filename,
              content: finalContent,
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
          
          createAnother = await promptCreateAnother();
          continue;
          
        } else {
          // Single select with autocomplete
          const autocomplete = new AutoComplete({
            name: 'icon',
            message: 'Search for an icon:',
            limit: 10,
            choices: iconChoices,
            suggest(input: string, choices: any[]) {
              if (!input) return choices;
              
              const lowerInput = input.toLowerCase();
              const matchingIcons = icons.filter(icon => {
                if (icon.name.includes(lowerInput)) return true;
                return icon.tags.some(tag => tag.toLowerCase().includes(lowerInput));
              });
              
              return matchingIcons.slice(0, 10).map(icon => ({
                name: icon.name,
                message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(', ')})` : ''}`,
                value: icon.name,
              }));
            },
          });
          
          const selectedIcon = await autocomplete.run() as string;
          suggestedName = selectedIcon;
          
          logger.newline();
          const loadSpinner = spinner.start(`Fetching ${selectedIcon}...`);
          const { svgContent: libSvg, metadata } = await fetchLucideIcon(selectedIcon);
          svgContent = libSvg;
          copyrightHeader = generateLucideCopyright(metadata.iconName);
          loadSpinner.succeed('Icon fetched successfully');
        }
      } else if (source === 'paste') {
        svgContent = await promptSVGContent();
      } else if (source === 'url') {
        const url = await promptSVGURL();
        
        // Extract suggested name from URL
        suggestedName = extractIconNameFromURL(url);
        
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
      
      // Ask for icon name (with suggestion if available)
      let iconName: string;
      
      if (suggestedName) {
        const useSuggested = await promptConfirmIconName(suggestedName);
        if (useSuggested) {
          iconName = suggestedName;
        } else {
          iconName = await promptIconName();
        }
      } else {
        iconName = await promptIconName();
      }
      const componentName = generateIconName(
        iconName,
        config.naming.suffix,
        config.naming.componentCase
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
      
      // Add copyright header if from library
      const finalContent = copyrightHeader 
        ? `${copyrightHeader}\n\n${component.content}`
        : component.content;
      
      genSpinner.succeed(`${component.filename} generated`);
      
      // Write file
      const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
      const filePath = await writeComponentFile({
        projectRoot,
        baseDir: config.baseDir,
        iconsFolder: config.iconsFolder,
        filename: component.filename,
        content: finalContent,
      });
      
      logger.success(`${component.filename} created`);
      
      // Update index
      if (config.maintainIndex) {
        await updateIndexFile(iconsDir, component.extension);
        logger.success('index.ts updated');
      }
      
      logger.separator();
      logger.newline();
      logger.title('Icon created successfully! 🎉');
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
  
  logger.info('Goodbye! 👋');
};
