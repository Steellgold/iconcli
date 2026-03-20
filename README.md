# 🎨 mkicon

Transform SVG icons into beautiful React, React Native, Vue, or Svelte components with zero config.

[![npm version](https://img.shields.io/npm/v/@steellgold/mkicon)](https://www.npmjs.com/package/@steellgold/mkicon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚀 **Zero Config** - Get started instantly with `mkicon init`
- 📚 **Icon Libraries** - Browse and import from Lucide Icons (1700+ icons)
- 🎨 **Multi-Framework** - Support for React, React Native, Vue 3, and Svelte
- 📦 **Batch Processing** - Convert multiple SVG files at once
- 🔧 **Fully Customizable** - Control props, naming, and file formats
- ⚡ **Auto-Optimization** - Built-in SVGO integration
- 🎯 **Smart Formatting** - Auto-adapts to Prettier, Biome, ESLint, or EditorConfig
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
- Framework (React, React Native, Vue, or Svelte)
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

### Multi-Variant Icons

Create icons with multiple variations controlled by props:

#### Directional Icons

Create a single component with direction variants:

```bash
mkicon --name Arrow --directive
```

This will:

1. Prompt you to select directions (up, down, left, right, etc.)
2. Ask for SVG content for each direction
3. Generate a single component with a `direction` prop

Usage:

```tsx
<ArrowIcon direction="up" />
<ArrowIcon direction="down" />
<ArrowIcon direction="left" />
<ArrowIcon direction="right" />
```

**Supported directions:**

- Basic: `up`, `down`, `left`, `right`
- Diagonal: `up-right`, `up-left`, `down-right`, `down-left`
- Circle: `up-circle`, `down-circle`, `left-circle`, `right-circle`
- Special: `up-tray`, `down-tray`, `up-on-square`, `down-on-square`
- Combined: `up-down`, `left-right`

#### Style Variants

Create a single component with style variants:

```bash
mkicon --name User --variant
```

This will:

1. Prompt you to select styles (outline, solid, filled, etc.)
2. Ask for SVG content for each style
3. Generate a single component with variant props

Usage:

```tsx
<UserIcon filled />
<UserIcon variant="outline" />
<UserIcon variant="solid" />
```

**Supported styles:**

- Basic: `outline`, `solid`, `filled`
- Sizes: `mini`, `micro`
- Weights: `thin`, `light`, `regular`, `bold`
- Special: `duotone`, `sharp`

#### Combined Variants

Combine both directional and style variants:

```bash
mkicon --name Arrow --directive --variant
```

Usage:

```tsx
<ArrowIcon direction="up" variant="solid" />
<ArrowIcon direction="down" filled />
```

#### Automatic Detection in Batch Mode

When using batch mode, mkicon will automatically detect variant groups:

```bash
mkicon --batch ./icons
# Detects: ArrowUp.svg, ArrowDown.svg, ArrowLeft.svg
# → Suggests creating a multi-variant <Arrow direction="..." /> component
```

The detector looks for consistent naming patterns:

- `ArrowUp.svg`, `ArrowDown.svg` → Directional variants
- `UserOutline.svg`, `UserSolid.svg` → Style variants

You'll be prompted to confirm if you want to process them as multi-variant components.

### Spinner Generator

Create animated loading spinner components:

```bash
mkicon spinner
# or shorthand:
mkicon spin
```

This will:

1. Ask for spinner name
2. Select framework (React, Vue, Svelte, React Native)
3. Select animation type (CSS, Framer Motion, Motion One, Vue Transitions, Svelte Transitions, Reanimated)
4. Generate spinner component with animation

#### React Example

```tsx
import { motion } from "framer-motion";

export const SpinnerIcon = ({ size = 24, color = "currentColor" }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </motion.div>
  );
};
```

#### Vue Example

```html
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="color"
    :class="['spinner', { 'animate-spin': animate }]"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
</template>

<script setup lang="ts">
  withDefaults(
    defineProps<{
      size?: number | string;
      color?: string;
      animate?: boolean;
    }>(),
    {
      size: 24,
      color: "currentColor",
      animate: true,
    }
  );
</script>
```

#### Svelte Example

```html
<script lang="ts">
  import { fade } from "svelte/transition";

  export let size: number | string = 24;
  export let color: string = "currentColor";
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="{size}"
  height="{size}"
  viewBox="0 0 24 24"
  fill="none"
  stroke="{color}"
  class="animate-spin"
>
  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
</svg>
```

#### React Native Example

```tsx
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export const SpinnerIcon = ({ size = 24, color = "currentColor" }) => {
  const rotation = useSharedValue(0);

  rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21 12a9 9 0 1 1-6.219-8.56" stroke={color} />
      </Svg>
    </Animated.View>
  );
};
```

> Requires [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/) installed for Reanimated animations.

### Configuration Management

```bash
# Interactive config menu
mkicon config

# Show current config
mkicon config --show

# Inspect detected project formatting
mkicon inspect-config
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

| Option                 | Type                                             | Default        | Description                    |
| ---------------------- | ------------------------------------------------ | -------------- | ------------------------------ |
| `baseDir`              | `string`                                         | -              | Base directory for icons       |
| `iconsFolder`          | `string`                                         | `"icons"`      | Subfolder name                 |
| `framework`            | `"react" \| "react-native" \| "vue" \| "svelte"` | `"react"`      | Target framework               |
| `typescript`           | `boolean`                                        | `true`         | Generate TypeScript files      |
| `optimize`             | `boolean`                                        | `true`         | Optimize SVG with SVGO         |
| `maintainIndex`        | `boolean`                                        | `true`         | Auto-maintain index.ts         |
| `props.size`           | `boolean`                                        | `true`         | Enable size prop               |
| `props.color`          | `boolean`                                        | `true`         | Enable color prop              |
| `props.className`      | `boolean`                                        | `true`         | Enable className prop          |
| `props.style`          | `boolean`                                        | `false`        | Enable style prop              |
| `naming.suffix`        | `string`                                         | `"Icon"`       | Component name suffix          |
| `naming.suffixEnabled` | `boolean`                                        | `true`         | Add suffix to names            |
| `naming.componentCase` | `"PascalCase" \| "camelCase"`                    | `"PascalCase"` | Component name format          |
| `naming.fileCase`      | `"PascalCase" \| "kebab-case" \| "camelCase"`    | `"PascalCase"` | File name format               |
| `adaptToProject`       | `boolean`                                        | `true`         | Auto-detect project formatting |

### Automatic Project Formatting Adaptation

mkicon automatically adapts to your project's formatting rules by detecting and applying configurations from:

**Priority order:**

1. **Prettier** - Most explicit formatter configuration
2. **Biome** - Modern formatter + linter combo
3. **ESLint** - Formatting rules extraction
4. **EditorConfig** - Basic indentation and line endings
5. **mkicon defaults** - Fallback if no config found

**Detected settings:**

- Quote style (single/double)
- Indentation (spaces/tabs, size)
- Semicolons (required/optional)
- Trailing commas (none/es5/all)
- Bracket spacing
- Arrow function parentheses
- Line endings (LF/CRLF)

**Example:**

If your project uses Prettier with:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all"
}
```

mkicon will automatically generate components matching this style:

```tsx
// Generated with your project's style
export const UserIcon = ({ size = 24, color = "currentColor" }) => {
  return <svg>...</svg>;
};
```

**Disable adaptation:**

```bash
# One-time disable
mkicon --no-adapt

# Permanent disable in .mkicon.json
{
  "adaptToProject": false
}
```

**Inspect detected configuration:**

```bash
mkicon inspect-config
```

This shows exactly what formatting rules mkicon detected from your project.

## 🎨 Generated Components

### React Example

```tsx
import type { SVGProps } from "react";

export interface UserPlusIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const UserPlusIcon = ({
  size = 24,
  color = "currentColor",
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

### React Native Example

```tsx
import type { SvgProps } from "react-native-svg";
import { Svg, Path } from "react-native-svg";

export interface UserPlusIconProps extends SvgProps {
  size?: number | string;
  color?: string;
}

export const UserPlusIcon = ({
  size = 24,
  color = "currentColor",
  ...props
}: UserPlusIconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} {...props}>
      {/* SVG paths */}
    </Svg>
  );
};
```

> Requires [`react-native-svg`](https://github.com/software-mansion/react-native-svg) installed in your project.

### Vue Example

```html
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
  withDefaults(
    defineProps<{
      size?: number | string;
      color?: string;
    }>(),
    {
      size: 24,
      color: "currentColor",
    }
  );
</script>
```

### Svelte Example

```html
<script lang="ts">
  export let size: number | string = 24;
  export let color: string = "currentColor";
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="{size}"
  height="{size}"
  viewBox="0 0 24 24"
  fill="none"
  stroke="{color}"
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

export { ArrowIcon } from "./ArrowIcon";
export { HomeIcon } from "./HomeIcon";
export { UserIcon } from "./UserIcon";
export { UserPlusIcon } from "./UserPlusIcon";
```

This allows clean imports:

```typescript
// Instead of:
import { UserPlusIcon } from "@/components/icons/UserPlusIcon";
import { ArrowIcon } from "@/components/icons/ArrowIcon";

// You can do:
import { UserPlusIcon, ArrowIcon } from "@/components/icons";
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

## 🚀 Roadmap & TODO

### 📚 Additional Icon Libraries

Expand beyond Lucide Icons:

- Font Awesome
- Material Design Icons
- Feather Icons
- Bootstrap Icons
- Tabler Icons
- Iconoir
- Phosphor Icons

### 🔧 Framework Support

Additional framework targets:

- Angular (standalone components)
- Solid.js
- Qwik
- Preact

### ♿ Accessibility

Automatic accessibility improvements:

- **Auto aria-label** - Generate from icon name
- **role="img"** - Automatic role attribute
- **title & desc** - Support for `<title>` and `<desc>` SVG elements
- **Accessible by default** - Best practices built-in

  ```tsx
  <UserIcon aria-label="User profile" role="img">
    <title>User profile icon</title>
    <desc>An icon representing a user profile</desc>
  </UserIcon>
  ```

---

Want to contribute? Check out these TODOs or suggest new features in [Issues](https://github.com/Steellgold/mkicon/issues)!

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
