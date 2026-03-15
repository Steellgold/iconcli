import enquirer from 'enquirer';
import { Config } from './schema.js';
import { loadConfig, updateConfig } from './manager.js';
import { logger } from '../utils/logger.js';

const { prompt } = enquirer;

/**
 * Show current configuration
 */
export const showConfig = (config: Config): void => {
  logger.title('Current Configuration');
  logger.newline();
  console.log(`  Base directory:     ${config.baseDir}`);
  console.log(`  Icons folder:       ${config.iconsFolder}`);
  console.log(`  Framework:          ${config.framework}${config.typescript ? ' (TypeScript)' : ''}`);
  console.log(`  SVG optimization:   ${config.optimize ? 'Enabled' : 'Disabled'}`);
  console.log(`  Maintain index.ts:  ${config.maintainIndex ? 'Yes' : 'No'}`);
  console.log(`  Props enabled:      ${Object.entries(config.props).filter(([_, v]) => v).map(([k]) => k).join(', ')}`);
  console.log(`  Component suffix:   ${config.naming.suffixEnabled ? config.naming.suffix : 'None'}`);
  console.log(`  File naming:        ${config.naming.fileCase}`);
  logger.newline();
};

/**
 * Interactive config modification menu
 */
export const runConfigMenu = async (projectRoot: string): Promise<void> => {
  const config = loadConfig(projectRoot);
  
  if (!config) {
    logger.error('No configuration found. Please run `mkicon` first to set up the project.');
    return;
  }
  
  // Show current config
  showConfig(config);
  logger.separator();
  logger.newline();
  
  const { action } = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'What do you want to modify?',
    choices: [
      { name: 'baseDir', message: 'Base directory' },
      { name: 'framework', message: 'Framework' },
      { name: 'optimize', message: 'SVG optimization' },
      { name: 'props', message: 'Default props' },
      { name: 'naming', message: 'Naming configuration (suffix, file format)' },
      { name: 'reset', message: 'Reset to defaults' },
      { name: 'cancel', message: 'Cancel' },
    ],
  });
  
  if (action === 'cancel') {
    logger.info('Configuration unchanged');
    return;
  }
  
  if (action === 'reset') {
    const { confirm } = await prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to reset all settings?',
      initial: false,
    });
    
    if (confirm) {
      logger.warning('Reset functionality not implemented yet. Please delete .mkicon.json and run mkicon again.');
    }
    return;
  }
  
  // Handle different modification types
  switch (action) {
    case 'baseDir':
      await modifyBaseDir(projectRoot, config);
      break;
    case 'framework':
      await modifyFramework(projectRoot, config);
      break;
    case 'optimize':
      await modifyOptimization(projectRoot, config);
      break;
    case 'props':
      await modifyProps(projectRoot, config);
      break;
    case 'naming':
      await modifyNaming(projectRoot, config);
      break;
  }
};

/**
 * Modify base directory
 */
const modifyBaseDir = async (projectRoot: string, config: Config): Promise<void> => {
  const { baseDir } = await prompt<{ baseDir: string }>({
    type: 'input',
    name: 'baseDir',
    message: 'New base directory:',
    initial: config.baseDir,
  });
  
  await updateConfig(projectRoot, { baseDir });
  logger.success('Base directory updated!');
};

/**
 * Modify framework
 */
const modifyFramework = async (projectRoot: string, config: Config): Promise<void> => {
  const answers = await prompt<{
    framework: 'react' | 'vue' | 'svelte';
    typescript: boolean;
  }>([
    {
      type: 'select',
      name: 'framework',
      message: 'Select framework:',
      initial: config.framework === 'react' ? 0 : config.framework === 'vue' ? 1 : 2,
      choices: [
        { name: 'react', message: 'React' },
        { name: 'vue', message: 'Vue 3' },
        { name: 'svelte', message: 'Svelte' },
      ],
    },
    {
      type: 'confirm',
      name: 'typescript',
      message: 'Use TypeScript?',
      initial: config.typescript,
    },
  ]);
  
  await updateConfig(projectRoot, {
    framework: answers.framework,
    typescript: answers.typescript,
  });
  logger.success('Framework updated!');
};

/**
 * Modify optimization settings
 */
const modifyOptimization = async (projectRoot: string, config: Config): Promise<void> => {
  const { optimize } = await prompt<{ optimize: boolean }>({
    type: 'confirm',
    name: 'optimize',
    message: 'Automatically optimize SVG with SVGO?',
    initial: config.optimize,
  });
  
  await updateConfig(projectRoot, { optimize });
  logger.success('Optimization settings updated!');
};

/**
 * Modify props
 */
const modifyProps = async (projectRoot: string, config: Config): Promise<void> => {
  const { props } = await prompt<{ props: string[] }>({
    type: 'multiselect',
    name: 'props',
    message: 'Enable props by default:',
    choices: [
      { name: 'size', message: 'size (control size)', enabled: config.props.size },
      { name: 'color', message: 'color (control color)', enabled: config.props.color },
      { name: 'className', message: 'className (add CSS classes)', enabled: config.props.className },
      { name: 'style', message: 'style (inline style props)', enabled: config.props.style },
    ],
  });
  
  await updateConfig(projectRoot, {
    props: {
      size: props.includes('size'),
      color: props.includes('color'),
      className: props.includes('className'),
      style: props.includes('style'),
    },
  });
  logger.success('Props updated!');
};

/**
 * Modify naming configuration
 */
const modifyNaming = async (projectRoot: string, config: Config): Promise<void> => {
  const answers = await prompt<{
    suffixEnabled: boolean;
    suffix?: string;
    fileCase: 'PascalCase' | 'kebab-case' | 'camelCase';
  }>([
    {
      type: 'confirm',
      name: 'suffixEnabled',
      message: 'Add suffix to component names?',
      initial: config.naming.suffixEnabled,
    },
    {
      type: 'input',
      name: 'suffix',
      message: 'Suffix to use:',
      initial: config.naming.suffix,
      skip: function(this: any) {
        return !this.state.answers.suffixEnabled;
      },
    },
    {
      type: 'select',
      name: 'fileCase',
      message: 'File naming format:',
      choices: [
        { name: 'PascalCase', message: 'PascalCase (UserPlusIcon.tsx)' },
        { name: 'kebab-case', message: 'kebab-case (user-plus-icon.tsx)' },
        { name: 'camelCase', message: 'camelCase (userPlusIcon.tsx)' },
      ],
    },
  ]);
  
  await updateConfig(projectRoot, {
    naming: {
      suffix: answers.suffix || config.naming.suffix,
      suffixEnabled: answers.suffixEnabled,
      componentCase: config.naming.componentCase,
      fileCase: answers.fileCase,
    },
  });
  logger.success('Naming configuration updated!');
};
