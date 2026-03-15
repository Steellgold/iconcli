import { Config } from '../config/schema.js';
import { generateReactComponent, getReactFileExtension } from '../templates/react.js';
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
      // TODO: Implement Vue template
      throw new Error('Vue template not implemented yet');
      
    case 'svelte':
      // TODO: Implement Svelte template
      throw new Error('Svelte template not implemented yet');
      
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
