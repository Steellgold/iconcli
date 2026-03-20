# AGENTS.md - Development Guide for AI Coding Agents

This file contains essential information for AI coding agents working on the mkicon project.

## 🚀 Quick Commands

### Build & Development

```bash
pnpm dev              # Watch mode (rebuilds on changes)
pnpm build            # Production build
pnpm typecheck        # TypeScript type checking
```

### Testing

```bash
pnpm test             # Run tests in watch mode
pnpm test:ci          # Run tests once with coverage
vitest run src/utils/naming.test.ts  # Run single test file
```

### Linting & Formatting

```bash
pnpm lint             # Check for linting errors
pnpm lint:fix         # Auto-fix linting errors
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting without modifying
```

### Local Testing

```bash
pnpm build && node bin/cli.js  # Test CLI locally
```

## 📂 Project Structure

```
src/
├── adapters/        # Project config detection (ESLint, Prettier, Biome, etc.)
├── batch/           # Batch processing for multiple SVGs
├── cli/             # CLI commands and argument parsing
├── config/          # Configuration management
├── core/            # Core business logic (generators, processors)
├── templates/       # Component templates (React, Vue, Svelte, React Native)
├── types/           # TypeScript type definitions
└── utils/           # Utility functions (validation, naming, logger, etc.)
```

## 🎨 Code Style Rules (MANDATORY)

### Language

- **ALL code, comments, and user-facing text MUST be in English**
- No French or other languages allowed

### TypeScript & Formatting

- **Use double quotes (`"`)** not single quotes (`'`)
- **Require semicolons (`;`)** at end of all statements
- **Use `const`** instead of `let` when possible
- **Prefer arrow functions** over `function` declarations
- **Use template literals** for string concatenation: `` `Hello ${name}` ``
- **Explicit return types** required for all exported functions
- **Trailing commas** in multiline objects/arrays
- **Max line length: 100 characters**
- **2 spaces** for indentation

### Imports

```typescript
// 1. External dependencies (sorted alphabetically)
import { optimize } from "svgo";
import enquirer from "enquirer";
import fs from "fs/promises";

// 2. Internal modules (sorted alphabetically, use @ alias)
import { Config } from "@/config/schema";
import { generateComponent } from "@/core/component-generator";
import { logger } from "@/utils/logger";
```

- **Use ESM imports** (not `require`)
- **Prefer named exports** over default exports
- **Sort imports alphabetically**
- **DO NOT include file extensions** in import paths (no `.js`, no `.ts`)

### Error Handling

- Use descriptive error messages with context
- Provide actionable guidance to users

```typescript
if (!options.name) {
  logger.error("Icon name is required. Use -n or --name to specify.");
  process.exit(1);
}
```

## 🧪 Testing Guidelines

- Test files: `*.test.ts` colocated with source
- Use descriptive test names in English
- Test both success and error cases
- Current coverage threshold: 80%

## 🔧 Key Files

| File                                 | Purpose                               |
| ------------------------------------ | ------------------------------------- |
| `src/core/component-generator.ts`    | Main icon component generation        |
| `src/core/spinner-generator.ts`      | Animated spinner component generation |
| `src/core/variant-generator.ts`      | Multi-variant icon generation         |
| `src/templates/*.ts`                 | Framework-specific templates          |
| `src/cli/args.ts`                    | CLI argument handling                 |
| `src/cli/spinner.ts`                 | Spinner CLI command                   |
| `src/adapters/*.ts`                  | Project config detection              |
| `src/utils/detect-animation-libs.ts` | Animation library detection           |

## 🏗️ Architecture Patterns

### Icon Generation

1. Parse/validate SVG input
2. Optimize with SVGO (if enabled)
3. Generate component based on framework
4. Write file to configured location
5. Update index.ts (if maintainIndex enabled)

### Spinner Generation

1. Detect available animation libraries
2. Generate spinner component based on framework and animation type
3. Write file to configured location

### Multi-Variant Icons

- Directional variants: `<Arrow direction="up" />`
- Style variants: `<User variant="filled" />` or `<User filled />`
- Auto-detection in batch mode

## 📝 Comments & Documentation

- Use JSDoc for exported functions
- Inline comments: explain "why" not "what"
- Always in English

## 🚫 Git Rules

- **NEVER commit code automatically** - Wait for explicit user confirmation
- **NEVER use git commands** without user consent
- **NEVER add co-authors** to commits

## 🔍 Adding New Features

### New CLI command

1. Create command file in `src/cli/`
2. Add command to `src/cli/args.ts`
3. Import and wire in `src/index.ts`
4. Add tests

### New template

1. Create `src/templates/{framework}-{type}.ts`
2. Export generation function and file extension getter
3. Import in appropriate generator
4. Add case in framework switch

### New adapter

1. Create file in `src/adapters/`
2. Export detection function with return type
3. Add test file
4. Import in `src/adapters/index.ts`

---

**Remember**: Follow these guidelines consistently. Code quality and consistency are critical for maintainability.
