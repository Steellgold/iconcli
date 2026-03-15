import path from 'path';
import { dirExists, ensureDir } from '@/utils/paths.js';
import { Config } from './schema.js';
import enquirer from 'enquirer';
import { logger } from '@/utils/logger.js';

const { prompt } = enquirer;

/**
 * Validate that the configured path exists, prompt for action if not
 */
export const validateConfigPath = async (
  projectRoot: string,
  config: Config
): Promise<{ valid: boolean; updatedConfig?: Config }> => {
  const fullPath = path.join(projectRoot, config.baseDir, config.iconsFolder);
  
  if (dirExists(fullPath)) {
    return { valid: true };
  }
  
  // Path doesn't exist, ask user what to do
  logger.warning(`Configured folder doesn't exist:`);
  console.log(`   ${fullPath}`);
  logger.newline();
  
  const response = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'What do you want to do?',
    choices: [
      { name: 'create', message: 'Create the folder automatically' },
      { name: 'modify', message: 'Change the location in the configuration' },
      { name: 'cancel', message: 'Cancel' },
    ],
  });
  
  if (response.action === 'create') {
    await ensureDir(fullPath);
    logger.success(`Folders created: ${config.baseDir}/${config.iconsFolder}/`);
    return { valid: true };
  }
  
  if (response.action === 'modify') {
    const newPath = await prompt<{ baseDir: string }>({
      type: 'input',
      name: 'baseDir',
      message: 'New base folder for your icons:',
      initial: config.baseDir,
    });
    
    const updatedConfig = { ...config, baseDir: newPath.baseDir };
    const newFullPath = path.join(projectRoot, newPath.baseDir, config.iconsFolder);
    
    await ensureDir(newFullPath);
    logger.success('Configuration updated');
    logger.success(`Folders created: ${newPath.baseDir}/${config.iconsFolder}/`);
    
    return { valid: true, updatedConfig };
  }
  
  return { valid: false };
};
