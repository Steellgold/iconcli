import type { PartialConfig } from "./schema";

export const PRESETS: Record<string, PartialConfig> = {
  shadcn: {
    framework: "react",
    typescript: true,
    naming: {
      suffix: "Icon",
      suffixEnabled: true,
      componentCase: "PascalCase",
      fileCase: "kebab-case",
    },
    props: {
      size: true,
      color: true,
      className: true,
      style: false,
      strokeWidth: false,
      accessibility: false,
      forwardRef: true,
    },
  },
  nuxt: {
    framework: "vue",
    typescript: true,
    naming: {
      suffix: "Icon",
      suffixEnabled: true,
      componentCase: "PascalCase",
      fileCase: "kebab-case",
    },
    props: {
      size: true,
      color: true,
      className: false,
      style: false,
      strokeWidth: false,
      accessibility: false,
      forwardRef: false,
    },
  },
  expo: {
    framework: "react-native",
    typescript: true,
    naming: {
      suffix: "Icon",
      suffixEnabled: true,
      componentCase: "PascalCase",
      fileCase: "PascalCase",
    },
    props: {
      size: true,
      color: true,
      className: false,
      style: false,
      strokeWidth: false,
      accessibility: false,
      forwardRef: false,
    },
  },
  minimal: {
    framework: "react",
    typescript: true,
    naming: {
      suffix: "Icon",
      suffixEnabled: true,
      componentCase: "PascalCase",
      fileCase: "PascalCase",
    },
    props: {
      size: false,
      color: false,
      className: false,
      style: false,
      strokeWidth: false,
      accessibility: false,
      forwardRef: false,
    },
  },
};

export const PRESET_NAMES = Object.keys(PRESETS) as Array<keyof typeof PRESETS>;
