import { Config } from '../config/schema.js';

interface ReactTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  typescript: boolean;
  props: Config['props'];
}

export const generateReactComponent = (options: ReactTemplateOptions): string => {
  const { componentName, svgContent, viewBox, typescript, props } = options;
  
  // Extract the inner content of the SVG (everything between <svg> and </svg>)
  const svgInnerContent = svgContent
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .trim();
  
  const typeImport = typescript ? "import type { SVGProps } from 'react';\n\n" : '';
  
  // Build props interface/type
  let propsInterface = '';
  let propsSignature = '';
  
  if (typescript) {
    const propsFields: string[] = [];
    const defaultProps: string[] = [];
    const spreadProps: string[] = [];
    
    if (props.size) {
      propsFields.push('  size?: number | string;');
      defaultProps.push('  size = 24');
      spreadProps.push('size');
    }
    
    if (props.color) {
      propsFields.push('  color?: string;');
      defaultProps.push("  color = 'currentColor'");
      spreadProps.push('color');
    }
    
    if (props.className) {
      spreadProps.push('className');
    }
    
    if (props.style) {
      spreadProps.push('style');
    }
    
    propsInterface = `export interface ${componentName}Props extends SVGProps<SVGSVGElement> {\n${propsFields.join('\n')}\n}\n\n`;
    
    propsSignature = `{ \n${defaultProps.join(',\n')},${props.className || props.style ? '\n  className,\n  style,' : ''}\n  ...props \n}: ${componentName}Props`;
  } else {
    const defaultProps: string[] = [];
    
    if (props.size) defaultProps.push('size = 24');
    if (props.color) defaultProps.push("color = 'currentColor'");
    
    const destructuredProps = [];
    if (props.size) destructuredProps.push('size');
    if (props.color) destructuredProps.push('color');
    if (props.className) destructuredProps.push('className');
    if (props.style) destructuredProps.push('style');
    destructuredProps.push('...props');
    
    propsSignature = `{ ${destructuredProps.join(', ')} }`;
  }
  
  // Build SVG attributes
  const svgAttrs: string[] = ['xmlns="http://www.w3.org/2000/svg"'];
  
  if (props.size) {
    svgAttrs.push('{...(size && { width: size, height: size })}');
  }
  
  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push('fill="none"');
  
  if (props.color) {
    svgAttrs.push('{...(color && { stroke: color })}');
  }
  
  if (props.className) {
    svgAttrs.push('{...(className && { className })}');
  }
  
  if (props.style) {
    svgAttrs.push('{...(style && { style })}');
  }
  
  svgAttrs.push('{...props}');
  
  return `${typeImport}${propsInterface}export const ${componentName} = (${propsSignature}) => {
  return (
    <svg 
      ${svgAttrs.join('\n      ')}
    >
      ${svgInnerContent}
    </svg>
  );
};
`;
};

export const getReactFileExtension = (typescript: boolean): string => {
  return typescript ? '.tsx' : '.jsx';
};
