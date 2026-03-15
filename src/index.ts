#!/usr/bin/env node

import { findProjectRoot } from '@/core/project.js';
import { loadConfig, configExists } from '@/config/manager.js';
import { runSetup } from '@/cli/setup.js';
import { runInit } from '@/cli/init.js';
import { runInteractive } from '@/cli/interactive.js';
import { runSemiInteractive } from '@/cli/semi-interactive.js';
import { createProgram, processIconFromArgs, processBatchFromArgs } from '@/cli/args.js';
import { runConfigMenu, showConfig } from '@/config/commands.js';
import { runLibraryBrowser } from '@/cli/library.js';
import { logger } from '@/utils/logger.js';

const main = async () => {
  try {
    // Check for subcommands
    const subcommand = process.argv[2];
    const isConfigCommand = subcommand === 'config';
    const isInitCommand = subcommand === 'init';
    const isLibraryCommand = subcommand === 'library' || subcommand === 'browse';
    const isSemiInteractiveCommand = ['paste', 'p', 'url', 'u', 'file', 'f'].includes(subcommand);
    const showConfigFlag = process.argv.includes('--show');
    const hasAnyArgs = process.argv.length > 2;
    
    // Parse CLI arguments
    const program = createProgram();
    
    // Only parse if we have arguments, otherwise skip to avoid help display
    if (hasAnyArgs) {
      program.parse(process.argv);
    }
    
    const options = program.opts();
    
    // Find project root
    const projectRoot = findProjectRoot();
    
    if (!projectRoot) {
      logger.error('⚠️  No package.json found.');
      console.log('   Please run mkicon from a Node.js project directory.');
      process.exit(1);
    }
    
    // Use subcommand detection instead
    const isSemiInteractive = isSemiInteractiveCommand;
    
    // Check if in CLI mode (has arguments with values)
    const hasCliArgs = (
      options.name || 
      (typeof options.paste === 'string') || 
      options.svg || 
      (typeof options.url === 'string') || 
      (typeof options.file === 'string') || 
      options.batch
    );
    
    if (!hasCliArgs && !isSemiInteractive) {
      logger.info(`✓ Project detected: ${projectRoot}`);
      logger.newline();
    }
    
    // Handle init command
    if (isInitCommand) {
      if (configExists(projectRoot)) {
        logger.warning('Configuration already exists (.mkicon.json)');
        logger.info('Use `mkicon config` to modify settings');
        process.exit(1);
      }
      
      await runInit(projectRoot);
      return;
    }
    
    // Handle config command
    if (isConfigCommand) {
      if (showConfigFlag) {
        const config = loadConfig(projectRoot);
        if (!config) {
          logger.error('No configuration found. Please run `mkicon` first to set up the project.');
          process.exit(1);
        }
        showConfig(config);
        return;
      } else {
        await runConfigMenu(projectRoot);
        return;
      }
    }
    
    // Handle library command
    if (isLibraryCommand) {
      // Check if config exists
      if (!configExists(projectRoot)) {
        logger.error('No configuration found. Please run `mkicon` first to set up the project.');
        process.exit(1);
      }
      
      const config = loadConfig(projectRoot);
      if (!config) {
        logger.error('Failed to load configuration');
        process.exit(1);
      }
      
      await runLibraryBrowser({ projectRoot, config });
      return;
    }
    
    // Check if config exists
    let config;
    
    if (!configExists(projectRoot)) {
      if (hasCliArgs || isSemiInteractive) {
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
      
      if (!hasCliArgs && !isSemiInteractive) {
        logger.title('🎨 mkicon');
        logger.success(`Configuration loaded: .mkicon.json`);
        logger.success(`Folder: ${config.baseDir}/${config.iconsFolder}/`);
        logger.separator();
        logger.newline();
      }
    }
    
    // Run appropriate mode
    if (isSemiInteractive) {
      // Semi-interactive mode (subcommand)
      let mode: 'paste' | 'url' | 'file';
      
      if (subcommand === 'paste' || subcommand === 'p') {
        mode = 'paste';
      } else if (subcommand === 'url' || subcommand === 'u') {
        mode = 'url';
      } else if (subcommand === 'file' || subcommand === 'f') {
        mode = 'file';
      } else {
        mode = 'paste'; // fallback
      }
      
      await runSemiInteractive({ projectRoot, config, mode });
    } else if (hasCliArgs) {
      // Full CLI mode (all arguments provided)
      if (options.batch) {
        await processBatchFromArgs(options.batch, config, projectRoot);
      } else {
        await processIconFromArgs(options, config, projectRoot);
      }
    } else {
      // Full interactive mode
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
