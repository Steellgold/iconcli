# mkicon

Transform SVG icons into beautiful React, React Native, Vue, or Svelte components with zero config.

[![npm version](https://img.shields.io/npm/v/@steellgold/mkicon)](https://www.npmjs.com/package/@steellgold/mkicon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[📖 Full documentation →](https://steellgold.github.io/mkicon/)**

---

## Features

- **Zero Config** — get started instantly with `mkicon init`
- **Multi-Framework** — React, React Native, Vue 3, Svelte
- **Icon Libraries** — browse and import from Lucide Icons (1700+ icons)
- **Batch Processing** — convert an entire folder of SVGs at once
- **Multi-Variant Icons** — directional and style variants in a single component
- **Spinner Generator** — animated loading spinners (CSS, Framer Motion, Reanimated…)
- **Tracking & Diff** — detect component drift, revert, preview, export back to SVG
- **Smart Formatting** — auto-adapts to Prettier, Biome, ESLint, or EditorConfig
- **Auto-Index** — maintains `index.ts` for clean imports
- **Studio** — visual icon manager (web UI)

## Installation

```bash
pnpm add -g @steellgold/mkicon
# or
npm install -g @steellgold/mkicon
```

## Quick Start

```bash
# Initialize with sensible defaults
mkicon init

# Then create an icon (interactive)
mkicon

# Or directly
mkicon -n UserPlus -p '<svg>...</svg>'
```

## Commands

| Command | Description |
|---|---|
| `mkicon` | Interactive mode |
| `mkicon init` | Initialize config with defaults |
| `mkicon paste` / `url` / `file` | Semi-interactive (skip source selection) |
| `mkicon batch <dir>` | Convert a folder of SVGs |
| `mkicon batch --refresh` | Rebuild lock file after a fresh clone |
| `mkicon diff` | Detect & revert component drift |
| `mkicon preview [name]` | Render an icon in the terminal |
| `mkicon svg <file>` | Export a component back to SVG |
| `mkicon library` / `browse` | Browse Lucide icon library |
| `mkicon spinner` / `spin` | Generate an animated spinner |
| `mkicon config` | Manage configuration |
| `mkicon inspect-config` | Show detected project formatting |

For detailed usage, flags, and examples see the **[documentation](https://steellgold.github.io/mkicon/)**.

## Configuration

mkicon stores its config in `.mkicon.json` at your project root (commit it!):

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
  "adaptToProject": true,
  "props": { "size": true, "color": true, "className": true },
  "naming": { "suffix": "Icon", "suffixEnabled": true, "componentCase": "PascalCase", "fileCase": "PascalCase" }
}
```

See the [configuration reference](https://steellgold.github.io/mkicon/configuration) for all options.

## Contributing

Contributions are welcome — open a PR or [report an issue](https://github.com/Steellgold/mkicon/issues).

## License

MIT © Gaëtan H
