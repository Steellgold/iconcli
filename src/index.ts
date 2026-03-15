#!/usr/bin/env node

import { findProjectRoot } from './core/project.js';
import { loadConfig, configExists } from './config/manager.js';
import { runSetup } from './cli/setup.js';
import { runInteractive } from './cli/interactive.js';
import { logger } from './utils/logger.js';

const main = async () => {
  try {
    // Find project root
    const projectRoot = findProjectRoot();
    
    if (!projectRoot) {
      logger.error('⚠️  No package.json found.');
      console.log('   Please run mkicon from a Node.js project directory.');
      process.exit(1);
    }
    
    logger.info(`✓ Project detected: ${projectRoot}`);
    logger.newline();
    
    // Check if config exists
    let config;
    
    if (!configExists(projectRoot)) {
      // Run setup
      config = await runSetup(projectRoot);
    } else {
      // Load existing config
      config = loadConfig(projectRoot);
      
      if (!config) {
        logger.error('Failed to load configuration');
        process.exit(1);
      }
      
      logger.title('mkicon');
      logger.success(`Configuration loaded: .mkicon.json`);
      logger.success(`Folder: ${config.baseDir}/${config.iconsFolder}/`);
      logger.separator();
      logger.newline();
    }
    
    // Run interactive mode
    await runInteractive({ projectRoot, config });
    
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('An unexpected error occurred');
    }
    process.exit(1);
  }
};

main();
