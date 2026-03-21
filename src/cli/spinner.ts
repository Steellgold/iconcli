import { updateConfig } from "@/config/manager";
import type { Config } from "@/config/schema";
import { validateConfigPath } from "@/config/validator";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { generateSpinnerComponent } from "@/core/spinner-generator";
import { optimizeSVG } from "@/core/svg-processor";
import { fetchLucideIcon, generateLucideCopyright } from "@/library/lucide";
import type { SpinnerAnimationLib } from "@/types/spinner";
import { detectAnimationLibs } from "@/utils/detect-animation-libs";
import { logger, spinner as spinnerIndicator } from "@/utils/logger";
import { insertHeaderComment } from "@/utils/header";
import { generateIconName } from "@/utils/naming";
import { isValidSVG } from "@/utils/validation";
import enquirer from "enquirer";
import path from "path";
import { promptSVGContent } from "./prompts";

const { prompt } = enquirer;

const SPINNER_ICONS = [
  { name: "loader", displayName: "Loader", tags: "loading, spinner, rotate" },
  { name: "loader-2", displayName: "Loader2", tags: "loading, spinner, circle" },
  { name: "refresh-cw", displayName: "RefreshCw", tags: "refresh, reload, sync" },
  { name: "rotate-cw", displayName: "RotateCw", tags: "rotate, clockwise" },
] as const;

export interface SpinnerFlowOptions {
  projectRoot: string;
  config: Config;
}

export const runSpinner = async (options: SpinnerFlowOptions): Promise<void> => {
  const { projectRoot, config: initialConfig } = options;
  let config = initialConfig;

  const validation = await validateConfigPath(projectRoot, config);
  if (!validation.valid) {
    logger.error("Setup cancelled");
    return;
  }

  if (validation.updatedConfig) {
    config = validation.updatedConfig;
    await updateConfig(projectRoot, config);
  }

  const detected = detectAnimationLibs(projectRoot);

  // Build animation lib choices based on framework
  const isReactNative = config.framework === "react-native";

  let animLibChoices: Array<{ name: SpinnerAnimationLib; message: string }>;

  if (isReactNative) {
    animLibChoices = [
      {
        name: "react-native-animated",
        message: `react-native-animated (Animated API, built-in)${detected.isReactNative ? " [detected]" : ""}`,
      },
      {
        name: "react-native-reanimated",
        message: `react-native-reanimated${detected.reactNativeReanimated ? " [detected]" : ""}`,
      },
    ];
  } else {
    animLibChoices = [
      { name: "css", message: "css (inline @keyframes, zero deps)" },
      {
        name: "tailwind",
        message: `tailwind (animate-spin class)${detected.tailwind ? " [detected]" : ""}`,
      },
    ];

    if (config.framework === "react") {
      animLibChoices.push({
        name: "framer-motion",
        message: `framer-motion${detected.framerMotion ? " [detected]" : ""}`,
      });
    }
  }

  // Prompt: icon source
  type SpinnerIconName = (typeof SPINNER_ICONS)[number]["name"];
  type SpinnerIconSource = SpinnerIconName | "custom";

  const SEPARATOR_ROLE: "separator" = "separator";

  const iconSourceChoices = [
    ...SPINNER_ICONS.map((icon) => ({
      name: icon.name,
      message: `${icon.displayName} (${icon.tags})`,
      value: icon.name,
    })),
    { name: "separator", role: SEPARATOR_ROLE },
    { name: "custom", message: "Custom SVG (paste your own)", value: "custom" },
  ];

  const iconSourceAnswer = await prompt<{ icon: SpinnerIconSource }>({
    type: "select",
    name: "icon",
    message: "Select spinner icon:",
    choices: iconSourceChoices,
  });

  let svgContent: string;
  let copyrightHeader: string | null = null;

  if (iconSourceAnswer.icon === "custom") {
    svgContent = await promptSVGContent();
  } else {
    const fetchSpin = spinnerIndicator.start(`Fetching ${iconSourceAnswer.icon} from Lucide...`);
    try {
      const { svgContent: libSvg, metadata } = await fetchLucideIcon(iconSourceAnswer.icon);
      svgContent = libSvg;
      copyrightHeader = generateLucideCopyright(metadata.iconName);
      fetchSpin.succeed(`Fetched ${iconSourceAnswer.icon}`);
    } catch (error) {
      fetchSpin.fail("Failed to fetch icon");
      throw error;
    }
  }

  if (!isValidSVG(svgContent)) {
    logger.error("Invalid SVG content");
    return;
  }

  // Prompt: animation library
  const animLibAnswer = await prompt<{ animLib: SpinnerAnimationLib }>({
    type: "select",
    name: "animLib",
    message: "Animation library:",
    choices: animLibChoices,
  });

  const animationLib = animLibAnswer.animLib;

  // Prompt: duration (skip for tailwind since it's hardcoded)
  let defaultDuration = 1000;
  if (animationLib !== "tailwind") {
    const durationAnswer = await prompt<{ duration: number }>({
      type: "numeral",
      name: "duration",
      message: "Default animation duration (ms):",
      initial: 1000,
      validate: (val: string) => {
        const duration = Number(val);
        return duration > 0 ? true : "Duration must be greater than 0";
      },
    });
    defaultDuration = durationAnswer.duration;
  }

  // Prompt: component name
  const nameAnswer = await prompt<{ name: string }>({
    type: "input",
    name: "name",
    message: "Component name:",
    initial: "loading",
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {return "Name cannot be empty";}
      if (!/[a-zA-Z]/.test(input)) {return "Name must contain at least one letter";}
      return true;
    },
  });

  const componentName = generateIconName(
    nameAnswer.name,
    config.naming.suffix,
    config.naming.componentCase
  );

  logger.separator();
  logger.newline();

  // Process SVG
  const processSpin = spinnerIndicator.start("Processing SVG...");
  const processed = await optimizeSVG(svgContent, config.optimize);
  processSpin.succeed("SVG processed");

  // Generate component
  const genSpin = spinnerIndicator.start("Generating spinner component...");
  const component = await generateSpinnerComponent({
    componentName,
    svgContent: processed.content,
    viewBox: processed.viewBox,
    config,
    animationLib,
    defaultDuration,
  });

  const finalContent = copyrightHeader
    ? insertHeaderComment(component.content, copyrightHeader)
    : component.content;

  genSpin.succeed(`${component.filename} generated`);

  // Write file
  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
  const filePath = await writeComponentFile({
    projectRoot,
    baseDir: config.baseDir,
    iconsFolder: config.iconsFolder,
    filename: component.filename,
    content: finalContent,
  });

  logger.success(`${component.filename} created`);

  // Update index
  if (config.maintainIndex) {
    await updateIndexFile(iconsDir, component.extension);
    logger.success("index.ts updated");
  }

  logger.separator();
  logger.newline();
  logger.title("Spinner created successfully!");
  logger.newline();
  logger.print(`📁 ${path.relative(projectRoot, filePath)}`);
  logger.newline();
  logger.print("Import:");
  logger.print(`  import { ${componentName} } from '@/components/icons';`);
  logger.newline();
  logger.print("Usage:");
  if (animationLib === "tailwind") {
    logger.print(`  <${componentName} size={24} color="blue" />`);
  } else {
    logger.print(`  <${componentName} size={24} color="blue" duration={${defaultDuration}} />`);
    logger.print(`  <${componentName} size={24} color="blue" duration={500} />  // faster`);
  }
  logger.separator();
  logger.newline();
};
