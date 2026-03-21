import type { PropsConfig } from "@/config/schema";
import type { VariantComponentData, DirectionVariant, StyleVariant } from "@/types/variants";
import { extractSVGInnerContent } from "@/core/variant-generator";

export interface GenerateReactVariantOptions {
  componentName: string;
  variantData: VariantComponentData;
  typescript: boolean;
  props: PropsConfig;
  header?: string;
}

export const generateReactVariantComponent = (options: GenerateReactVariantOptions): string => {
  const { componentName, variantData, typescript, props, header = "" } = options;
  const { config, variants } = variantData;

  // Déterminer les types de props
  const hasDirections = config.directions && config.directions.length > 0;
  const hasStyles = config.styles && config.styles.length > 0;

  // Construire l'interface de props
  let propsInterface = "";

  if (typescript) {
    const baseProps = ["SVGProps<SVGSVGElement>"];

    const customProps: string[] = [];

    if (props.size) {customProps.push("  size?: number | string;");}
    if (props.color) {customProps.push("  color?: string;");}
    if (props.strokeWidth) {customProps.push("  strokeWidth?: number;");}
    if (props.className) {customProps.push("  className?: string;");}
    if (props.style) {customProps.push("  style?: React.CSSProperties;");}

    if (hasDirections) {
      const directionType = config.directions!.map((d) => `'${d}'`).join(" | ");
      customProps.push(`  direction?: ${directionType};`);
    }

    if (hasStyles) {
      // Support des deux syntaxes : boolean props ET variant prop
      const styleType = config.styles!.map((s) => `'${s}'`).join(" | ");
      customProps.push(`  variant?: ${styleType};`);

      // Boolean props pour chaque style
      for (const style of config.styles!) {
        customProps.push(`  ${style}?: boolean;`);
      }
    }

    propsInterface = `export interface ${componentName}Props extends ${baseProps.join(", ")} {
${customProps.join("\n")}
}

`;
  }

  // Générer le corps du composant
  const defaultSize = props.size ? "24" : "undefined";
  const defaultColor = props.color ? "'currentColor'" : "undefined";

  // Props destructuring
  const propsList: string[] = [];
  if (props.size) {propsList.push(`size = ${defaultSize}`);}
  if (props.color) {propsList.push(`color = ${defaultColor}`);}
  if (props.strokeWidth) {propsList.push("strokeWidth = 2");}
  if (props.className) {propsList.push("className");}
  if (props.style) {propsList.push("style");}
  if (hasDirections) {propsList.push("direction");}
  if (hasStyles) {
    propsList.push("variant");
    for (const style of config.styles!) {
      propsList.push(style);
    }
  }
  propsList.push("...props");

  const propsDestructure = typescript
    ? `{ ${propsList.join(", ")} }: ${componentName}Props`
    : `{ ${propsList.join(", ")} }`;

  // Générer le switch pour les variantes
  let variantSwitch = "";

  if (hasDirections && !hasStyles) {
    // Directions seulement
    variantSwitch = generateDirectionSwitch(config.directions!, variants);
  } else if (!hasDirections && hasStyles) {
    // Styles seulement
    variantSwitch = generateStyleSwitch(config.styles!, variants);
  } else if (hasDirections && hasStyles) {
    // Combiné : direction + style (simplified for MVP)
    variantSwitch = generateDirectionSwitch(config.directions!, variants);
  }

  // Générer le viewBox (prendre le premier variant)
  const viewBox = variants[0]?.viewBox || "0 0 24 24";

  // Template final
  const imports = typescript ? "import type { SVGProps } from 'react';" : "";

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

  svgAttrs.push("{...props}");

  return `${header}${imports}

${propsInterface}export const ${componentName} = (${propsDestructure}) => {
  ${hasStyles ? generateStyleResolver(config.styles!) : ""}
  const renderContent = () => {
    ${variantSwitch}
  };

  return (
    <svg 
      ${svgAttrs.join("\n      ")}
    >
      {renderContent()}
    </svg>
  );
};
`;
};

/**
 * Generate the switch statement for directions
 */
const generateDirectionSwitch = (
  directions: DirectionVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = directions
    .map((dir) => {
      const v = variants.find((v) => v.variant === dir);
      if (!v) {return "";}

      const content = extractSVGInnerContent(v.svgContent);
      return `      case '${dir}':
        return (
          <>
            ${content}
          </>
        );`;
    })
    .filter(Boolean)
    .join("\n");

  const defaultContent = extractSVGInnerContent(variants[0].svgContent);

  return `switch (direction) {
${cases}
      default:
        return (
          <>
            ${defaultContent}
          </>
        );
    }`;
};

/**
 * Generate the switch statement for styles
 */
const generateStyleSwitch = (
  styles: StyleVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = styles
    .map((style) => {
      const v = variants.find((v) => v.variant === style);
      if (!v) {return "";}

      const content = extractSVGInnerContent(v.svgContent);
      return `      case '${style}':
        return (
          <>
            ${content}
          </>
        );`;
    })
    .filter(Boolean)
    .join("\n");

  const defaultContent = extractSVGInnerContent(variants[0].svgContent);

  return `switch (resolvedVariant) {
${cases}
      default:
        return (
          <>
            ${defaultContent}
          </>
        );
    }`;
};

/**
 * Generate the style resolver (boolean props -> variant string)
 */
const generateStyleResolver = (styles: StyleVariant[]): string => {
  const checks = styles
    .map((style) => `if (${style}) resolvedVariant = '${style}';`)
    .join("\n    ");

  return `let resolvedVariant = variant;
  if (!resolvedVariant) {
    ${checks}
  }
  if (!resolvedVariant) resolvedVariant = '${styles[0]}';`;
};

export { getReactFileExtension } from "./react";
