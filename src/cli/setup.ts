import path from 'path';
import { promptSetupConfig } from './prompts.js';
import { createConfig } from '../config/manager.js';
import { ensureDir } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { Config } from '../config/schema.js';

/**
 * Run initial setup for the project
 */
export const runSetup = async (projectRoot: string): Promise<Config> => {
  logger.title('Welcome to mkicon!');
  logger.newline();
  console.log('No configuration found in this project.');
  console.log('Let\'s set up mkicon together.');
  logger.separator();
  logger.newline();
  
  // Prompt for configuration
  const config = await promptSetupConfig();
  
  logger.separator();
  logger.newline();
  logger.success(`Icons will be created in: ${config.baseDir}/${config.iconsFolder}/`);
  logger.newline();
  
  // Create config file
  await createConfig(projectRoot, config);
  logger.success('Configuration created: .mkicon.json');
  
  // Create icons directory
  const iconsDir = path.join(projectRoot, config.baseDir!, config.iconsFolder!);
  await ensureDir(iconsDir);
  logger.success(`Folder created: ${config.baseDir}/${config.iconsFolder}/`);
  
  logger.newline();
  console.log('📦 An index.ts file will be automatically maintained.');
  logger.newline();
  logger.info('🚀 All set! Let\'s create your first icon.');
  logger.separator();
  logger.newline();
  
  // Return the full config with defaults
  return {
    version: '1.0.0',
    baseDir: config.baseDir!,
    iconsFolder: config.iconsFolder!,
    framework: config.framework!,
    typescript: config.typescript!,
    optimize: config.optimize!,
    maintainIndex: config.maintainIndex!,
    props: config.props!,
    naming: config.naming!,
  };
};
