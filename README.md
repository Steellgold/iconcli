# 🎨 mkicon

Transform SVG icons into beautiful React, Vue, or Svelte components with zero config.

[![npm version](https://badge.fury.io/js/mkicon.svg)](https://www.npmjs.com/package/mkicon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚀 **Zero Config** - Get started instantly with interactive setup
- 🎨 **Multi-Framework** - Support for React, Vue 3, and Svelte
- 📦 **Batch Processing** - Convert multiple SVG files at once
- 🔧 **Fully Customizable** - Control props, naming, and file formats
- ⚡ **Auto-Optimization** - Built-in SVGO integration
- 📝 **Auto-Index** - Maintains index.ts for easy imports
- 🌐 **URL Support** - Fetch icons directly from URLs
- 💾 **Persistent Config** - Set it once, use it forever

## 📦 Installation

```bash
# Using npx (recommended - no installation needed)
npx mkicon

# Or install globally
npm install -g mkicon
pnpm add -g mkicon
```

## 🚀 Quick Start

### First Time Setup

Run mkicon in your project directory:

```bash
cd my-project
npx mkicon
```

Follow the interactive prompts to configure:
- Where to create icons (e.g., `src/components`)
- Framework (React, Vue, or Svelte)
- Optimization preferences
- Props configuration
- Naming conventions

A `.mkicon.json` file will be created - commit it to your repo!

### Create Your First Icon

After setup, paste your SVG when prompted:

```bash
npx mkicon

# Paste SVG, enter icon name, done! ✨
```

## 📖 Usage

### Interactive Mode (Default)

```bash
npx mkicon
```

Prompts you through:
1. How to provide SVG (paste/URL/file)
2. Icon name
3. Creates component automatically

### Semi-Interactive Mode (Fast! ⚡)

Skip the source selection and jump straight to input:

```bash
# Paste mode - prompts for SVG and name
npx mkicon paste
# or shorthand:
npx mkicon p

# URL mode - prompts for URL and name
npx mkicon url
# or shorthand:
npx mkicon u

# File mode - prompts for file path and name
npx mkicon file
# or shorthand:
npx mkicon f
```

This is the **fastest way** to create icons - no source selection needed!

### CLI Mode (Non-Interactive)

Provide all arguments for fully automated icon creation:

```bash
# From SVG code
npx mkicon -n UserPlus -p '<svg>...</svg>'

# From URL
npx mkicon -n Arrow -u https://example.com/icon.svg

# From file
npx mkicon -n Home -f ./icons/home.svg

# Legacy syntax (still supported)
npx mkicon --name UserPlus --svg '<svg>...</svg>'
```

### Batch Mode

Convert multiple SVG files at once:

```bash
npx mkicon --batch ./svg-icons
# or shorthand:
npx mkicon -b ./svg-icons
```

This will:
- Scan the folder for all `.svg` files
- Show a preview of found files
- Ask for confirmation
- Generate all components
- Update index.ts

### Configuration Management

```bash
# Interactive config menu
npx mkicon config

# Show current config
npx mkicon config --show
```

## ⚙️ Configuration

The `.mkicon.json` file in your project root:

```json
{
  "$schema": "https://unpkg.com/mkicon/schema.json",
  "version": "1.0.0",
  "baseDir": "src/components",
  "iconsFolder": "icons",
  "framework": "react",
  "typescript": true,
  "optimize": true,
  "maintainIndex": true,
  "props": {
    "size": true,
    "color": true,
    "className": true,
    "style": false
  },
  "naming": {
    "suffix": "Icon",
    "suffixEnabled": true,
    "componentCase": "PascalCase",
    "fileCase": "PascalCase"
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseDir` | `string` | - | Base directory for icons |
| `iconsFolder` | `string` | `"icons"` | Subfolder name |
| `framework` | `"react" \| "vue" \| "svelte"` | `"react"` | Target framework |
| `typescript` | `boolean` | `true` | Generate TypeScript files |
| `optimize` | `boolean` | `true` | Optimize SVG with SVGO |
| `maintainIndex` | `boolean` | `true` | Auto-maintain index.ts |
| `props.size` | `boolean` | `true` | Enable size prop |
| `props.color` | `boolean` | `true` | Enable color prop |
| `props.className` | `boolean` | `true` | Enable className prop |
| `props.style` | `boolean` | `false` | Enable style prop |
| `naming.suffix` | `string` | `"Icon"` | Component name suffix |
| `naming.suffixEnabled` | `boolean` | `true` | Add suffix to names |
| `naming.componentCase` | `"PascalCase" \| "camelCase"` | `"PascalCase"` | Component name format |
| `naming.fileCase` | `"PascalCase" \| "kebab-case" \| "camelCase"` | `"PascalCase"` | File name format |

## 🎨 Generated Components

### React Example

```tsx
import type { SVGProps } from 'react';

export interface UserPlusIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const UserPlusIcon = ({ 
  size = 24, 
  color = 'currentColor',
  className,
  ...props 
}: UserPlusIconProps) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width={size} 
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      className={className}
      {...props}
    >
      {/* SVG paths */}
    </svg>
  );
};
```

### Vue Example

```vue
<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg"
    :width="size" 
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="color"
    v-bind="$attrs"
  >
    <!-- SVG paths -->
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number | string;
  color?: string;
}>(), {
  size: 24,
  color: 'currentColor'
})
</script>
```

### Svelte Example

```svelte
<script lang="ts">
  export let size: number | string = 24;
  export let color: string = 'currentColor';
</script>

<svg 
  xmlns="http://www.w3.org/2000/svg"
  width={size} 
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  {...$$restProps}
>
  <!-- SVG paths -->
</svg>
```

## 📚 Examples

### Using with Heroicons

```bash
npx mkicon \
  --name ChevronRight \
  --url https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/outline/chevron-right.svg
```

### Using with Lucide

```bash
npx mkicon \
  --name User \
  --url https://lucide.dev/api/icons/user
```

### Custom SVG

```bash
npx mkicon --name Logo --svg '
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>
'
```

### Batch from Figma Export

```bash
# Export icons from Figma to ./figma-icons/
npx mkicon --batch ./figma-icons
```

## 🔧 Auto-Generated Index

mkicon automatically maintains an `index.ts` file:

```typescript
// Auto-generated by mkicon
// Do not edit manually - this file is updated automatically

export { ArrowIcon } from './ArrowIcon';
export { HomeIcon } from './HomeIcon';
export { UserIcon } from './UserIcon';
export { UserPlusIcon } from './UserPlusIcon';
```

This allows clean imports:

```typescript
// Instead of:
import { UserPlusIcon } from '@/components/icons/UserPlusIcon';
import { ArrowIcon } from '@/components/icons/ArrowIcon';

// You can do:
import { UserPlusIcon, ArrowIcon } from '@/components/icons';
```

## 💡 Tips

### File Naming

Choose the file naming format that fits your project:

- **PascalCase** - `UserPlusIcon.tsx` (default)
- **kebab-case** - `user-plus-icon.tsx`
- **camelCase** - `userPlusIcon.tsx`

### Preserve Existing PascalCase

mkicon is smart about naming:

```bash
# Input: "ClosedCaption" → ClosedCaptionIcon (preserves casing)
# Input: "closed-caption" → ClosedCaptionIcon (converts to PascalCase)
# Input: "userPlus" → UserPlusIcon (converts to PascalCase)
```

### Disable Icon Suffix

Don't want the "Icon" suffix?

```bash
npx mkicon config
# → Select "Naming configuration"
# → Disable suffix
```

Now `UserPlus` becomes just `UserPlus.tsx` instead of `UserPlusIcon.tsx`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © Gaëtan H

## 🔗 Links

- [GitHub Repository](https://github.com/Steellgold/mkicon)
- [NPM Package](https://www.npmjs.com/package/mkicon)
- [Report Issues](https://github.com/Steellgold/mkicon/issues)

---

Made with ❤️ by [Gaëtan H](https://github.com/Steellgold)
