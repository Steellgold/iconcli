import type { Config } from "@/config/schema";
import type { HeroiconSize, HeroiconStyle } from "@/library/heroicons";
import enquirer from "enquirer";

const { prompt } = enquirer;

/**
 * Prompt for initial setup configuration
 */
export const promptSetupConfig = async (): Promise<Partial<Config>> => {
  const answers = await prompt<{
    baseDir: string;
    framework: "react" | "react-native" | "vue" | "svelte";
    typescript: boolean;
    optimize: boolean;
    props: string[];
    suffixEnabled: boolean;
    fileCase: "PascalCase" | "kebab-case" | "camelCase";
  }>([
    {
      type: "input",
      name: "baseDir",
      message:
        'Where do you want to create your icons?\n  (An "icons" subfolder will be created automatically)\n  \n  Examples:\n  • src/components  → src/components/icons/\n  • app/ui          → app/ui/icons/\n  • lib             → lib/icons/\n  \n  Path:',
      initial: "src/components",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hint: "[TAB to complete]",
    } as any,
    {
      type: "select",
      name: "framework",
      message: "Which framework are you using?",
      choices: [
        { name: "react", message: "React (TypeScript)" },
        { name: "react-native", message: "React Native" },
        { name: "vue", message: "Vue 3" },
        { name: "svelte", message: "Svelte" },
      ],
    },
    {
      type: "confirm",
      name: "optimize",
      message: "Automatically optimize SVG with SVGO?",
      initial: true,
    },
    {
      type: "multiselect",
      name: "props",
      message: "Enable customizable props by default?",
      choices: [
        { name: "size", message: "size (control size)", enabled: true },
        { name: "color", message: "color (control color)", enabled: true },
        { name: "strokeWidth", message: "strokeWidth (control stroke width)", enabled: false },
        { name: "className", message: "className (add CSS classes)", enabled: true },
        { name: "style", message: "style (inline style props)", enabled: false },
      ],
    },
    {
      type: "confirm",
      name: "suffixEnabled",
      message: 'Add "Icon" suffix to component names? (e.g., UserPlus → UserPlusIcon)',
      initial: true,
    },
    {
      type: "select",
      name: "fileCase",
      message: "File naming format?",
      choices: [
        { name: "PascalCase", message: "PascalCase (UserPlusIcon.tsx)" },
        { name: "kebab-case", message: "kebab-case (user-plus-icon.tsx)" },
        { name: "camelCase", message: "camelCase (userPlusIcon.tsx)" },
      ],
    },
  ]);

  // Determine typescript based on framework choice (for now, default to true for React)
  const typescript = answers.framework === "react" || answers.framework === "react-native";

  return {
    baseDir: answers.baseDir,
    iconsFolder: "icons",
    framework: answers.framework,
    typescript,
    optimize: answers.optimize,
    maintainIndex: true,
    props: {
      size: answers.props.includes("size"),
      color: answers.props.includes("color"),
      className: answers.props.includes("className"),
      style: answers.props.includes("style"),
      strokeWidth: answers.props.includes("strokeWidth"),
    },
    naming: {
      suffix: "Icon",
      suffixEnabled: answers.suffixEnabled,
      componentCase: "PascalCase",
      fileCase: answers.fileCase,
    },
  };
};

/**
 * Prompt for SVG source
 */
export const promptSVGSource = async (): Promise<{
  source: "paste" | "url" | "file" | "library";
}> => {
  const answer = await prompt<{ source: "paste" | "url" | "file" | "library" }>({
    type: "select",
    name: "source",
    message: "How do you want to provide the SVG?",
    choices: [
      { name: "paste", message: "Paste SVG code" },
      { name: "url", message: "From URL" },
      { name: "library", message: "From a library" },
      { name: "file", message: "From local file" },
    ],
  });

  return answer;
};

/**
 * Prompt for SVG content (paste)
 */
export const promptSVGContent = async (): Promise<string> => {
  const answer = await prompt<{ svg: string }>({
    type: "input",
    name: "svg",
    message: "Paste your SVG:",
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return "SVG content cannot be empty";
      }
      if (!input.includes("<svg")) {
        return "Invalid SVG - must contain <svg> tag";
      }
      return true;
    },
  });

  return answer.svg;
};

/**
 * Prompt for SVG URL
 */
export const promptSVGURL = async (): Promise<string> => {
  const answer = await prompt<{ url: string }>({
    type: "input",
    name: "url",
    message: "Enter the SVG URL:",
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return "URL cannot be empty";
      }
      try {
        new URL(input);
        return true;
      } catch {
        return "Invalid URL format";
      }
    },
  });

  return answer.url;
};

/**
 * Prompt for icon name.
 * If a suggested name is provided it appears as the initial value — press TAB to accept.
 */
export const promptIconName = async (suggestedName?: string): Promise<string> => {
  const answer = await prompt<{ name: string }>({
    type: "input",
    name: "name",
    message: "Icon name:",
    initial: suggestedName,
    ...(suggestedName && { hint: "[TAB to complete]" }),
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return "Icon name cannot be empty";
      }
      if (!/[a-zA-Z]/.test(input)) {
        return "Icon name must contain at least one letter";
      }
      return true;
    },
  });

  return answer.name;
};

/**
 * Prompt to create another icon
 */
export const promptCreateAnother = async (): Promise<boolean> => {
  const answer = await prompt<{ another: boolean }>({
    type: "confirm",
    name: "another",
    message: "Create another icon?",
    initial: false,
  });

  return answer.another;
};

/**
 * Prompt for Heroicon size selection
 */
export const promptHeroiconSize = async (): Promise<HeroiconSize> => {
  const answer = await prompt<{ size: string }>({
    type: "select",
    name: "size",
    message: "Select icon size:",
    choices: [
      { name: "16", message: "16px (micro)" },
      { name: "20", message: "20px (mini)" },
      { name: "24", message: "24px (standard)" },
    ],
  });

  return parseInt(answer.size, 10) as HeroiconSize;
};

/**
 * Prompt for Heroicon style selection.
 * If size is 16 or 20, only "solid" is available and returned immediately.
 */
export const promptHeroiconStyle = async (size: HeroiconSize): Promise<HeroiconStyle> => {
  if (size !== 24) return "solid";

  const answer = await prompt<{ style: HeroiconStyle }>({
    type: "select",
    name: "style",
    message: "Select icon style:",
    choices: [
      { name: "solid", message: "Solid" },
      { name: "outline", message: "Outline" },
    ],
  });

  return answer.style;
};

/**
 * Prompt for optional icon size metadata (for paste/url/file sources)
 */
export const promptIconSize = async (): Promise<number | null> => {
  const answer = await prompt<{ size: string }>({
    type: "select",
    name: "size",
    message: "What size is this icon? (optional, for metadata only)",
    choices: [
      { name: "skip", message: "Skip" },
      { name: "16", message: "16px" },
      { name: "20", message: "20px" },
      { name: "24", message: "24px" },
      { name: "custom", message: "Custom..." },
    ],
  });

  if (answer.size === "skip") return null;
  if (answer.size === "custom") {
    const customAnswer = await prompt<{ customSize: string }>({
      type: "input",
      name: "customSize",
      message: "Enter icon size (px):",
      validate: (input: string) => {
        const n = parseInt(input, 10);
        if (isNaN(n) || n <= 0) return "Please enter a valid positive number";
        return true;
      },
    });
    return parseInt(customAnswer.customSize, 10);
  }

  return parseInt(answer.size, 10);
};

/**
 * Prompt for multiple URLs (finish with empty input)
 */
export const promptMultipleURLs = async (): Promise<string[]> => {
  const urls: string[] = [];
  let index = 1;

  while (true) {
    const answer = await prompt<{ url: string }>({
      type: "input",
      name: "url",
      message:
        index === 1
          ? "Enter icon URL (press Enter without URL when done):"
          : `Enter icon URL ${index} (press Enter without URL when done):`,
      validate: (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) {
          return true;
        }
        try {
          new URL(trimmed);
          return true;
        } catch {
          return "Invalid URL format";
        }
      },
    });

    const value = answer.url.trim();
    if (!value) {
      break;
    }

    urls.push(value);
    index += 1;
  }

  return urls;
};
