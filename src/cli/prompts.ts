import enquirer from 'enquirer';
import { Config } from '@/config/schema.js';

const { prompt } = enquirer;

/**
 * Prompt for initial setup configuration
 */
export const promptSetupConfig = async (): Promise<Partial<Config>> => {
  const answers = await prompt<{
    baseDir: string;
    framework: 'react' | 'vue' | 'svelte';
    typescript: boolean;
    optimize: boolean;
    props: string[];
    suffixEnabled: boolean;
    fileCase: 'PascalCase' | 'kebab-case' | 'camelCase';
  }>([
    {
      type: 'input',
      name: 'baseDir',
      message: 'Where do you want to create your icons?\n  (An "icons" subfolder will be created automatically)\n  \n  Examples:\n  • src/components  → src/components/icons/\n  • app/ui          → app/ui/icons/\n  • lib             → lib/icons/\n  \n  Path:',
      initial: 'src/components',
    },
    {
      type: 'select',
      name: 'framework',
      message: 'Which framework are you using?',
      choices: [
        { name: 'react', message: 'React (TypeScript)' },
        { name: 'vue', message: 'Vue 3' },
        { name: 'svelte', message: 'Svelte' },
      ],
    },
    {
      type: 'confirm',
      name: 'optimize',
      message: 'Automatically optimize SVG with SVGO?',
      initial: true,
    },
    {
      type: 'multiselect',
      name: 'props',
      message: 'Enable customizable props by default?',
      choices: [
        { name: 'size', message: 'size (control size)', enabled: true },
        { name: 'color', message: 'color (control color)', enabled: true },
        { name: 'className', message: 'className (add CSS classes)', enabled: true },
        { name: 'style', message: 'style (inline style props)', enabled: false },
      ],
    },
    {
      type: 'confirm',
      name: 'suffixEnabled',
      message: 'Add "Icon" suffix to component names? (e.g., UserPlus → UserPlusIcon)',
      initial: true,
    },
    {
      type: 'select',
      name: 'fileCase',
      message: 'File naming format?',
      choices: [
        { name: 'PascalCase', message: 'PascalCase (UserPlusIcon.tsx)' },
        { name: 'kebab-case', message: 'kebab-case (user-plus-icon.tsx)' },
        { name: 'camelCase', message: 'camelCase (userPlusIcon.tsx)' },
      ],
    },
  ]);
  
  // Determine typescript based on framework choice (for now, default to true for React)
  const typescript = answers.framework === 'react';
  
  return {
    baseDir: answers.baseDir,
    iconsFolder: 'icons',
    framework: answers.framework,
    typescript,
    optimize: answers.optimize,
    maintainIndex: true,
    props: {
      size: answers.props.includes('size'),
      color: answers.props.includes('color'),
      className: answers.props.includes('className'),
      style: answers.props.includes('style'),
    },
    naming: {
      suffix: 'Icon',
      suffixEnabled: answers.suffixEnabled,
      componentCase: 'PascalCase',
      fileCase: answers.fileCase,
    },
  };
};

/**
 * Prompt for SVG source
 */
export const promptSVGSource = async (): Promise<{
  source: 'paste' | 'url' | 'file';
}> => {
  const answer = await prompt<{ source: 'paste' | 'url' | 'file' }>({
    type: 'select',
    name: 'source',
    message: 'How do you want to provide the SVG?',
    choices: [
      { name: 'paste', message: 'Paste SVG code' },
      { name: 'url', message: 'From URL' },
      { name: 'file', message: 'From local file' },
    ],
  });
  
  return answer;
};

/**
 * Prompt for SVG content (paste)
 */
export const promptSVGContent = async (): Promise<string> => {
  const answer = await prompt<{ svg: string }>({
    type: 'input',
    name: 'svg',
    message: 'Paste your SVG:',
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return 'SVG content cannot be empty';
      }
      if (!input.includes('<svg')) {
        return 'Invalid SVG - must contain <svg> tag';
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
    type: 'input',
    name: 'url',
    message: 'Enter the SVG URL:',
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return 'URL cannot be empty';
      }
      try {
        new URL(input);
        return true;
      } catch {
        return 'Invalid URL format';
      }
    },
  });
  
  return answer.url;
};

/**
 * Prompt for icon name
 */
export const promptIconName = async (defaultName?: string): Promise<string> => {
  const answer = await prompt<{ name: string }>({
    type: 'input',
    name: 'name',
    message: 'Icon name (will be converted to PascalCase + Icon):',
    initial: defaultName,
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return 'Icon name cannot be empty';
      }
      if (!/[a-zA-Z]/.test(input)) {
        return 'Icon name must contain at least one letter';
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
    type: 'confirm',
    name: 'another',
    message: 'Create another icon?',
    initial: false,
  });
  
  return answer.another;
};
