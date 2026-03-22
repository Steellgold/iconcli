import type { Config } from "@/config/schema";

interface ReactTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  typescript: boolean;
  props: Config["props"];
  header?: string;
}

export const generateReactComponent = (options: ReactTemplateOptions): string => {
  const { componentName, svgContent, viewBox, typescript, props, header = "" } = options;

  // Extract the inner content of the SVG (everything between <svg> and </svg>)
  const svgInnerContent = svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

  const useForwardRef = props.forwardRef;
  const typeImport = typescript
    ? useForwardRef
      ? "import { forwardRef } from 'react';\nimport type { SVGProps } from 'react';\n\n"
      : "import type { SVGProps } from 'react';\n\n"
    : useForwardRef
      ? "import { forwardRef } from 'react';\n\n"
      : "";

  // Build props interface/type
  let propsInterface = "";
  let propsSignature = "";

  if (typescript) {
    const propsFields: string[] = [];
    const defaultProps: string[] = [];

    if (props.size) {
      propsFields.push("  size?: number | string;");
      defaultProps.push("  size = 24");
    }

    if (props.color) {
      propsFields.push("  color?: string;");
      defaultProps.push("  color = 'currentColor'");
    }

    if (props.strokeWidth) {
      propsFields.push("  strokeWidth?: number;");
      defaultProps.push("  strokeWidth = 2");
    }

    if (props.accessibility) {
      propsFields.push("  title?: string;");
    }

    propsInterface = `export interface ${componentName}Props extends SVGProps<SVGSVGElement> {\n${propsFields.join("\n")}\n}\n\n`;

    const tsxProps: string[] = [...defaultProps];
    if (props.accessibility) {tsxProps.push("title");}
    if (props.className) {tsxProps.push("className");}
    if (props.style) {tsxProps.push("style");}
    tsxProps.push("...props");

    propsSignature = `{ ${tsxProps.join(",\n")} }: ${componentName}Props`;
  } else {
    const defaultProps: string[] = [];

    if (props.size) {defaultProps.push("size = 24");}
    if (props.color) {defaultProps.push("color = 'currentColor'");}
    if (props.strokeWidth) {defaultProps.push("strokeWidth = 2");}

    const destructuredProps = [];
    if (props.size) {destructuredProps.push("size");}
    if (props.color) {destructuredProps.push("color");}
    if (props.strokeWidth) {destructuredProps.push("strokeWidth");}
    if (props.accessibility) {destructuredProps.push("title");}
    if (props.className) {destructuredProps.push("className");}
    if (props.style) {destructuredProps.push("style");}
    destructuredProps.push("...props");

    propsSignature = `{ ${destructuredProps.join(", ")} }`;
  }

  // Build SVG attributes
  const svgAttrs: string[] = ['xmlns="http://www.w3.org/2000/svg"'];

  if (props.size) {
    svgAttrs.push("{...(size && { width: size, height: size })}");
  }

  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push('fill="none"');

  if (props.color) {
    svgAttrs.push("{...(color && { stroke: color })}");
  }

  if (props.strokeWidth) {
    svgAttrs.push("{...(strokeWidth && { strokeWidth })}");
  }

  if (props.className) {
    svgAttrs.push("{...(className && { className })}");
  }

  if (props.style) {
    svgAttrs.push("{...(style && { style })}");
  }

  if (props.accessibility) {
    svgAttrs.push("{...(title ? { role: 'img' } : { 'aria-hidden': true })}");
  }

  if (useForwardRef) {
    svgAttrs.push("ref={ref}");
  }

  svgAttrs.push("{...props}");

  const titleElement = props.accessibility ? `\n      {title && <title>{title}</title>}` : "";

  if (useForwardRef) {
    const refType = typescript ? `<SVGSVGElement, ${componentName}Props>` : "";
    return `${header}${typeImport}${propsInterface}export const ${componentName} = forwardRef${refType}(
  (${propsSignature}, ref) => (
    <svg
      ${svgAttrs.join("\n      ")}
    >${titleElement}
      ${svgInnerContent}
    </svg>
  )
);
${componentName}.displayName = '${componentName}';
`;
  }

  return `${header}${typeImport}${propsInterface}export const ${componentName} = (${propsSignature}) => {
  return (
    <svg
      ${svgAttrs.join("\n      ")}
    >${titleElement}
      ${svgInnerContent}
    </svg>
  );
};
`;
};

export const getReactFileExtension = (typescript: boolean): string => {
  return typescript ? ".tsx" : ".jsx";
};
