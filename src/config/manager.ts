import { cosmiconfigSync } from 'cosmiconfig';
import fs from 'fs/promises';
import path from 'path';
import { Config, ConfigSchema, PartialConfig } from './schema.js';

const explorer = cosmiconfigSync('mkicon');
const CONFIG_FILENAME = '.mkicon.json';

/**
 * Load configuration from project root
 */
export const loadConfig = (projectRoot: string): Config | null => {
  try {
    const configPath = path.join(projectRoot, CONFIG_FILENAME);
    const result = explorer.load(configPath);
    
    if (!result || !result.config) {
      return null;
    }
    
    // Validate and parse config with defaults
    const parsed = ConfigSchema.parse(result.config);
    return parsed;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
};

/**
 * Create a new configuration file
 */
export const createConfig = async (
  projectRoot: string,
  config: PartialConfig
): Promise<void> => {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  
  // Parse and fill with defaults
  const fullConfig = ConfigSchema.parse(config);
  
  await fs.writeFile(
    configPath,
    JSON.stringify({
      $schema: 'https://unpkg.com/@steellgold/mkicon/schema.json',
      ...fullConfig,
    }, null, 2),
    'utf-8'
  );
};

/**
 * Update existing configuration
 */
export const updateConfig = async (
  projectRoot: string,
  updates: Partial<Config>
): Promise<void> => {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  
  // Load existing config
  let existingConfig: any = {};
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    existingConfig = JSON.parse(content);
  } catch {
    // File doesn't exist, will create new one
  }
  
  // Merge with updates
  const mergedConfig = { ...existingConfig, ...updates };
  
  // Validate
  const validConfig = ConfigSchema.parse(mergedConfig);
  
  await fs.writeFile(
    configPath,
    JSON.stringify({
      $schema: 'https://unpkg.com/@steellgold/mkicon/schema.json',
      ...validConfig,
    }, null, 2),
    'utf-8'
  );
};

/**
 * Check if config file exists
 */
export const configExists = (projectRoot: string): boolean => {
  try {
    const configPath = path.join(projectRoot, CONFIG_FILENAME);
    const result = explorer.load(configPath);
    return result !== null;
  } catch {
    return false;
  }
};
