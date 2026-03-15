#!/usr/bin/env node

import { findProjectRoot } from './core/project.js';
import { loadConfig, configExists } from './config/manager.js';
import { runSetup } from './cli/setup.js';
import { runInteractive } from './cli/interactive.js';
import { createProgram, processIconFromArgs, processBatchFromArgs } from './cli/args.js';
import { logger } from './utils/logger.js';

const main = async () => {
  try {
    // Parse CLI arguments
    const program = createProgram();
    program.parse(process.argv);
    const options = program.opts();
    
    // Find project root
    const projectRoot = findProjectRoot();
    
    if (!projectRoot) {
      logger.error('⚠️  No package.json found.');
      console.log('   Please run mkicon from a Node.js project directory.');
      process.exit(1);
    }
    
    // Check if in CLI mode (has arguments)
    const hasCliArgs = options.name || options.svg || options.url || options.file || options.batch;
    
    if (!hasCliArgs) {
      logger.info(`✓ Project detected: ${projectRoot}`);
      logger.newline();
    }
    
    // Check if config exists
    let config;
    
    if (!configExists(projectRoot)) {
      if (hasCliArgs) {
        logger.error('No configuration found. Please run `mkicon` first to set up the project.');
        process.exit(1);
      }
      
      // Run setup
      config = await runSetup(projectRoot);
    } else {
      // Load existing config
      config = loadConfig(projectRoot);
      
      if (!config) {
        logger.error('Failed to load configuration');
        process.exit(1);
      }
      
      if (!hasCliArgs) {
        logger.title('mkicon');
        logger.success(`Configuration loaded: .mkicon.json`);
        logger.success(`Folder: ${config.baseDir}/${config.iconsFolder}/`);
        logger.separator();
        logger.newline();
      }
    }
    
    // Run CLI mode or interactive mode
    if (hasCliArgs) {
      if (options.batch) {
        await processBatchFromArgs(options.batch, config, projectRoot);
      } else {
        await processIconFromArgs(options, config, projectRoot);
      }
    } else {
      await runInteractive({ projectRoot, config });
    }
    
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
