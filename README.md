# 🎨 mkicon

Transform SVG icons into beautiful React, Vue, or Svelte components with zero config.

[![npm version](https://badge.fury.io/js/%40steellgold%2Fmkicon.svg)](https://www.npmjs.com/package/@steellgold/mkicon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚀 **Zero Config** - Get started instantly with `mkicon init`
- 📚 **Icon Libraries** - Browse and import from Lucide Icons (1700+ icons)
- 🎨 **Multi-Framework** - Support for React, Vue 3, and Svelte
- 📦 **Batch Processing** - Convert multiple SVG files at once
- 🔧 **Fully Customizable** - Control props, naming, and file formats
- ⚡ **Auto-Optimization** - Built-in SVGO integration
- 📝 **Auto-Index** - Maintains index.ts for easy imports
- 🌐 **URL Support** - Fetch icons directly from URLs
- 🔍 **Smart Suggestions** - Auto-detect icon names from URLs
- 💾 **Persistent Config** - Set it once, use it forever

## 📦 Installation

```bash
# Install globally (recommended)
npm install -g @steellgold/mkicon
pnpm add -g @steellgold/mkicon

# Then use the short command
mkicon
```

## 🚀 Quick Start

### Option 1: Instant Setup (Recommended)

Initialize with best practice defaults:

```bash
cd my-project
mkicon init
```

This creates `.mkicon.json` with:
- Framework: React (TypeScript)
- Folder: `src/components/icons/`
- Optimization: Enabled
- Props: size, color, className
- Auto-index: Enabled

Customize later with `mkicon config` if needed.

### Option 2: Interactive Setup

Run mkicon and follow the prompts:

```bash
mkicon
```

Configure:
- Where to create icons
- Framework (React, Vue, or Svelte)
- Optimization preferences
- Props configuration
- Naming conventions

A `.mkicon.json` file will be created - commit it to your repo!

### Create Your First Icon

After setup, paste your SVG when prompted:

```bash
mkicon

# Paste SVG, enter icon name, done! ✨
```

## 📖 Usage

### Interactive Mode (Default)

```bash
mkicon
```

Prompts you through:
1. How to provide SVG (paste/URL/file)
2. Icon name
3. Creates component automatically

### Semi-Interactive Mode (Fast! ⚡)

Skip the source selection and jump straight to input:

```bash
# Paste mode - prompts for SVG and name
mkicon paste

# URL mode - prompts for URL and name
mkicon url

# File mode - prompts for file path and name
mkicon file
```

This is the **fastest way** to create icons - no source selection needed!

### CLI Mode (Non-Interactive)

Provide all arguments for fully automated icon creation:

```bash
# From SVG code
mkicon -n UserPlus -p '<svg>...</svg>'

# From URL
mkicon -n Arrow -u https://example.com/icon.svg

# From file
mkicon -n Home -f ./icons/home.svg

# Legacy syntax (still supported)
mkicon --name UserPlus --svg '<svg>...</svg>'
```

### Batch Mode

Convert multiple SVG files at once:

```bash
mkicon --batch ./svg-icons
# or shorthand:
mkicon -b ./svg-icons
```

This will:
- Scan the folder for all `.svg` files
- Show a preview of found files
- Ask for confirmation
- Generate all components
- Update index.ts

### Icon Library Browser

Browse and import icons from Lucide Icons (1700+ icons):

```bash
mkicon library
# or shorthand:
mkicon browse
```

This will:
- Open an interactive browser
- Search through 1700+ Lucide icons
- Preview icon details
- Import selected icons directly into your project

### Configuration Management

```bash
# Interactive config menu
mkicon config

# Show current config
mkicon config --show
```

## ⚙️ Configuration

The `.mkicon.json` file in your project root:

```json
{
  "$schema": "https://unpkg.com/@steellgold/mkicon/schema.json",
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
mkicon \
  --name ChevronRight \
  --url https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/outline/chevron-right.svg
```

### Using with Lucide

```bash
mkicon \
  --name User \
  --url https://lucide.dev/api/icons/user
```

### Custom SVG

```bash
mkicon --name Logo --svg '
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>
'
```

### Batch from Figma Export

```bash
# Export icons from Figma to ./figma-icons/
mkicon --batch ./figma-icons
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
mkicon config
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
- [NPM Package](https://www.npmjs.com/package/@steellgold/mkicon)
- [Report Issues](https://github.com/Steellgold/mkicon/issues)

---

Made with ❤️ by [Gaëtan H](https://github.com/Steellgold)
