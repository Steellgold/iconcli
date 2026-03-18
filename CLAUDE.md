# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mkicon is a CLI tool that transforms SVG icons into beautiful React, Vue, or Svelte components. It's built with TypeScript and supports zero-config usage with intelligent defaults.

## Architecture

- **Core**: `src/core/` - Component generation, SVG processing, file writing, and index maintenance
- **CLI**: `src/cli/` - Interactive/non-interactive modes, argument parsing, setup flows
- **Config**: `src/config/` - Zod schema validation, configuration management
- **Templates**: `src/templates/` - Framework-specific code generation (React/Vue/Svelte)
- **Utils**: `src/utils/` - Naming conventions, validation, logging, path utilities
- **Library**: `src/library/` - Icon library integrations (currently Lucide)

The main entry point is `src/index.ts` which handles subcommands, detects CLI vs interactive modes, and orchestrates the appropriate flows.

## Common Commands

### Development
- `pnpm dev` - Watch mode with tsup
- `pnpm build` - Build distribution files with tsup and tsc-alias
- `pnpm typecheck` - TypeScript type checking without emit
- `pnpm lint` - ESLint on src/ directory 
- `pnpm lint:fix` - ESLint with auto-fix
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting without changes

### Testing
- `pnpm test` - Run Vitest in watch mode
- `pnpm test:ci` - Run tests once with coverage report

### Publishing
- `pnpm prepublishOnly` - Automatically runs build before publishing

## Key Patterns

### Configuration System
- Uses Zod schema validation (`src/config/schema.ts`)
- Configuration persists in `.mkicon.json` in project root
- Validation includes path checking and directory creation prompts

### Multi-Mode CLI
- **Interactive**: Full prompts for source selection and configuration
- **Semi-interactive**: Subcommands (`paste`, `url`, `file`) skip source selection
- **CLI**: Non-interactive with all arguments provided
- **Batch**: Process multiple SVG files from a directory

### Component Generation
- Framework-agnostic core with framework-specific templates
- Supports multi-variant icons (directional and style variants)
- Automatic index.ts maintenance for clean imports
- Built-in SVG optimization with SVGO

### Library Integration
- Pluggable library system (currently supports Lucide Icons)
- Supports both search/selection and URL-based import
- Automatic copyright header generation

## Testing

Tests use Vitest with coverage requirements (80% threshold). Coverage includes:
- Core utilities and processors
- Template generators
- Configuration schema
- Component generation logic

Test files are co-located with source files using `.test.ts` suffix.