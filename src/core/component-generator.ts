import { Config } from '@/config/schema.js';
import { generateReactComponent, getReactFileExtension } from '@/templates/react.js';
import { generateSvelteComponent, getSvelteFileExtension } from '@/templates/svelte.js';
import { generateVueComponent, getVueFileExtension } from '@/templates/vue.js';
import { cleanSVGAttributes } from './svg-processor.js';

export interface GenerateComponentOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  config: Config;
}

export interface GeneratedComponent {
  content: string;
  filename: string;
  extension: string;
}

/**
 * Generate component code based on framework
 */
export const generateComponent = (options: GenerateComponentOptions): GeneratedComponent => {
  const { componentName, svgContent, viewBox, config } = options;
  
  const cleanedSVG = cleanSVGAttributes(svgContent);
  
  let content: string;
  let extension: string;
  
  switch (config.framework) {
    case 'react':
      content = generateReactComponent({
        componentName,
        svgContent: cleanedSVG,
        viewBox,
        typescript: config.typescript,
        props: config.props,
      });
      extension = getReactFileExtension(config.typescript);
      break;
      
    case 'vue':
      content = generateVueComponent({
        componentName,
        svgContent: cleanedSVG,
        viewBox,
        typescript: config.typescript,
        props: config.props,
      });
      extension = getVueFileExtension();
      break;
      
    case 'svelte':
      content = generateSvelteComponent({
        componentName,
        svgContent: cleanedSVG,
        viewBox,
        typescript: config.typescript,
        props: config.props,
      });
      extension = getSvelteFileExtension();
      break;
      
    default:
      throw new Error(`Unsupported framework: ${config.framework}`);
  }
  
  const filename = `${componentName}${extension}`;
  
  return {
    content,
    filename,
    extension,
  };
};
