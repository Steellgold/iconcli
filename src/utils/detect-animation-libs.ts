import fs from "fs";
import path from "path";

export interface DetectedAnimationLibs {
  tailwind: boolean;
  framerMotion: boolean;
  reactNativeReanimated: boolean;
  isReactNative: boolean;
}

export const detectAnimationLibs = (projectRoot: string): DetectedAnimationLibs => {
  const defaults: DetectedAnimationLibs = {
    tailwind: false,
    framerMotion: false,
    reactNativeReanimated: false,
    isReactNative: false,
  };

  try {
    const pkgPath = path.join(projectRoot, "package.json");
    const pkgContent = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    return {
      tailwind: "tailwindcss" in allDeps,
      framerMotion: "framer-motion" in allDeps,
      reactNativeReanimated: "react-native-reanimated" in allDeps,
      isReactNative: "react-native" in allDeps,
    };
  } catch {
    return defaults;
  }
};
