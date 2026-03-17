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
├── cli/           # CLI commands and argument parsing
├── core/          # Core business logic (generators, processors)
├── templates/     # Component templates (React, Vue, Svelte)
├── types/         # TypeScript type definitions
├── utils/         # Utility functions (validation, naming, etc.)
├── config/        # Configuration management
├── batch/         # Batch processing
└── library/       # Icon library browser
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
import { Config } from "@/config/schema.js";
import { generateComponent } from "@/core/component-generator.js";
import { logger } from "@/utils/logger.js";
```

- **Use ESM imports** (not `require`)
- **Prefer named exports** over default exports
- **Sort imports alphabetically**
- **Include `.js` extension** in import paths

### TypeScript Best Practices
```typescript
// ✅ Good
export const processIcon = async (
  svgContent: string,
  config: Config,
): Promise<string> => {
  const result = optimize(svgContent);
  return result.data;
};

// ❌ Bad
export const processIcon = async (svgContent, config) => {
  let result = optimize(svgContent);
  return result.data;
};
```

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

### Test Structure
- Test files: `*.test.ts` colocated with source
- Use descriptive test names in English
- Test both success and error cases
- Current coverage threshold: 80%

### Running Tests
```bash
# All tests
pnpm test

# Single file
vitest run src/utils/naming.test.ts

# With coverage
pnpm test:ci
```

## 🔧 Configuration Files

### TypeScript (`tsconfig.json`)
- Target: ES2022
- Strict mode enabled
- Path alias: `@/*` → `src/*`
- Module: ESNext

### ESLint (`.eslintrc.json`)
- TypeScript ESLint parser
- Enforces explicit return types
- No unused variables/imports
- Sorted imports required

### Prettier (`.prettierrc.json`)
- Double quotes
- Semicolons required
- Trailing commas (ES5)
- 100 char line width
- 2 space indentation

## 🚫 Git & Commit Rules

- **NEVER commit code automatically** - Wait for explicit user confirmation
- **NEVER use git commands** without user consent
- **NEVER add co-authors** to commits

## 🏗️ Architecture Patterns

### Component Generation
1. Parse/validate SVG input
2. Optimize with SVGO (if enabled)
3. Generate component based on framework
4. Write file to configured location
5. Update index.ts (if maintainIndex enabled)

### Multi-Variant Icons (New Feature)
- Directional variants: `<Arrow direction="up" />`
- Style variants: `<User variant="filled" />` or `<User filled />`
- Auto-detection in batch mode

### Key Files
- `src/core/component-generator.ts` - Main component generation logic
- `src/core/variant-generator.ts` - Multi-variant component generation
- `src/templates/*.ts` - Framework-specific templates
- `src/cli/args.ts` - CLI argument handling

## 📝 Comments & Documentation

### Use JSDoc for exported functions
```typescript
/**
 * Generate a component from SVG content
 * @param options - Component generation options
 * @returns Generated component with content and filename
 */
export const generateComponent = (options: Options): GeneratedComponent => {
  // ...
};
```

### Inline Comments
- Use sparingly - code should be self-documenting
- Explain "why" not "what"
- Always in English

## 🔍 Common Tasks

### Adding a new CLI option
1. Update `CLIOptions` interface in `src/cli/args.ts`
2. Add option to Commander program
3. Handle option in appropriate processor function
4. Update README.md with usage example

### Adding a new template
1. Create `src/templates/{framework}-variant.ts`
2. Export generation function and file extension getter
3. Import in `src/core/variant-generator.ts`
4. Add case in framework switch

### Adding a new utility
1. Create file in `src/utils/`
2. Export named functions with explicit return types
3. Add corresponding `*.test.ts` file
4. Update `vitest.config.ts` coverage if needed

---

**Remember**: Follow these guidelines consistently. Code quality and consistency are critical for maintainability.
