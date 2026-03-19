import { PropsConfig } from "@/config/schema.js";
import { extractSVGInnerContent } from "@/core/variant-generator.js";
import { VariantComponentData, DirectionVariant, StyleVariant } from "@/types/variants.js";

export interface GenerateReactNativeVariantOptions {
  componentName: string;
  variantData: VariantComponentData;
  typescript: boolean;
  props: PropsConfig;
}

const SVG_TAG_MAP: Record<string, string> = {
  circle: "Circle",
  clipPath: "ClipPath",
  defs: "Defs",
  ellipse: "Ellipse",
  g: "G",
  line: "Line",
  linearGradient: "LinearGradient",
  mask: "Mask",
  path: "Path",
  pattern: "Pattern",
  polygon: "Polygon",
  polyline: "Polyline",
  radialGradient: "RadialGradient",
  rect: "Rect",
  stop: "Stop",
  svg: "Svg",
  text: "Text",
  tspan: "TSpan",
  use: "Use",
};

const toCamelCaseAttr = (attr: string): string => {
  if (attr.includes(":")) {
    const [prefix, rest] = attr.split(":");
    const camelRest = rest ? rest[0].toUpperCase() + rest.slice(1) : "";
    return `${prefix}${camelRest}`;
  }

  return attr.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
};

const convertSvgInnerToReactNativeJsx = (svgInnerContent: string): string => {
  let out = svgInnerContent;

  for (const [from, to] of Object.entries(SVG_TAG_MAP)) {
    const openTag = new RegExp(`<${from}(\\s|>)`, "g");
    const closeTag = new RegExp(`</${from}>`, "g");
    out = out.replace(openTag, `<${to}$1`).replace(closeTag, `</${to}>`);
  }

  out = out.replace(/\s([a-zA-Z_:][a-zA-Z0-9_:\-]*)=/g, (_m, attr: string) => {
    return ` ${toCamelCaseAttr(attr)}=`;
  });

  out = out.replace(/\s+xmlns(:\w+)?=["'][^"']*["']/g, "");

  return out.trim();
};

const getUsedReactNativeSvgImports = (jsxContent: string): string[] => {
  const used = new Set<string>();
  const tagRegex = /<([A-Z][A-Za-z0-9]*)\b/g;
  let match: RegExpExecArray | null = null;

  while ((match = tagRegex.exec(jsxContent))) {
    used.add(match[1]);
  }

  used.delete("Svg");

  return Array.from(used).sort((a, b) => a.localeCompare(b));
};

export const generateReactNativeVariantComponent = (options: GenerateReactNativeVariantOptions): string => {
  const { componentName, variantData, typescript, props } = options;
  const { config, variants } = variantData;

  const hasDirections = !!(config.directions && config.directions.length > 0);
  const hasStyles = !!(config.styles && config.styles.length > 0);

  const viewBox = variants[0]?.viewBox || "0 0 24 24";

  const defaultSize = props.size ? "24" : "undefined";
  const defaultColor = props.color ? "\"currentColor\"" : "undefined";

  const propsList: string[] = [];
  if (props.size) propsList.push(`size = ${defaultSize}`);
  if (props.color) propsList.push(`color = ${defaultColor}`);
  if (props.style) propsList.push("style");
  if (hasDirections) propsList.push("direction");
  if (hasStyles) {
    propsList.push("variant");
    for (const style of config.styles!) {
      propsList.push(style);
    }
  }
  propsList.push("...props");

  let propsInterface = "";
  const imports: string[] = [];
  const importTypes: string[] = [];

  if (typescript) {
    importTypes.push("SvgProps");

    const customProps: string[] = [];
    if (props.size) customProps.push("  size?: number | string;");
    if (props.color) customProps.push("  color?: string;");
    if (props.style) customProps.push("  style?: SvgProps[\"style\"];");

    if (hasDirections) {
      const directionType = config.directions!.map((d) => `"${d}"`).join(" | ");
      customProps.push(`  direction?: ${directionType};`);
    }

    if (hasStyles) {
      const styleType = config.styles!.map((s) => `"${s}"`).join(" | ");
      customProps.push(`  variant?: ${styleType};`);
      for (const style of config.styles!) {
        customProps.push(`  ${style}?: boolean;`);
      }
    }

    propsInterface = `export interface ${componentName}Props extends SvgProps {\n${customProps.join(
      "\n"
    )}\n}\n\n`;
  }

  const propsDestructure = typescript
    ? `{ ${propsList.join(", ")} }: ${componentName}Props`
    : `{ ${propsList.join(", ")} }`;

  const defaultInner = convertSvgInnerToReactNativeJsx(extractSVGInnerContent(variants[0].svgContent));

  const variantSwitch = hasDirections && !hasStyles
    ? generateDirectionSwitch(config.directions!, variants)
    : !hasDirections && hasStyles
      ? generateStyleSwitch(config.styles!, variants)
      : hasDirections && hasStyles
        ? generateDirectionSwitch(config.directions!, variants)
        : `return (\n      <>\n        ${defaultInner}\n      </>\n    );`;

  const styleResolver = hasStyles ? generateStyleResolver(config.styles!) : "";

  const svgAttrs: string[] = [];
  if (props.size) {
    svgAttrs.push("{...(size && { width: size, height: size })}");
  }
  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push("fill=\"none\"");
  if (props.color) {
    svgAttrs.push("{...(color && { stroke: color })}");
  }
  if (props.style) {
    svgAttrs.push("{...(style && { style })}");
  }
  svgAttrs.push("{...props}");

  const allInnerJsx = variants
    .map((v) => convertSvgInnerToReactNativeJsx(extractSVGInnerContent(v.svgContent)))
    .join("\n");
  const used = getUsedReactNativeSvgImports(allInnerJsx);
  imports.push("Svg", ...used);

  const header =
    (typescript ? `import type { ${importTypes.join(", ")} } from "react-native-svg";\n` : "") +
    `import { ${Array.from(new Set(imports)).sort((a, b) => a.localeCompare(b)).join(", ")} } from "react-native-svg";\n\n`;

  return `${header}${propsInterface}export const ${componentName} = (${propsDestructure}) => {
  ${styleResolver}
  const renderContent = () => {
    ${variantSwitch}
  };

  return (
    <Svg
      ${svgAttrs.join("\n      ")}
    >
      {renderContent()}
    </Svg>
  );
};
`;
};

const generateDirectionSwitch = (
  directions: DirectionVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = directions
    .map((dir) => {
      const v = variants.find((v) => v.variant === dir);
      if (!v) return "";

      const content = convertSvgInnerToReactNativeJsx(extractSVGInnerContent(v.svgContent));
      return `case "${dir}":
        return (
          <>
            ${content}
          </>
        );`;
    })
    .filter(Boolean)
    .join("\n      ");

  const defaultContent = convertSvgInnerToReactNativeJsx(extractSVGInnerContent(variants[0].svgContent));

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

const generateStyleSwitch = (
  styles: StyleVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = styles
    .map((style) => {
      const v = variants.find((v) => v.variant === style);
      if (!v) return "";

      const content = convertSvgInnerToReactNativeJsx(extractSVGInnerContent(v.svgContent));
      return `case "${style}":
        return (
          <>
            ${content}
          </>
        );`;
    })
    .filter(Boolean)
    .join("\n      ");

  const defaultContent = convertSvgInnerToReactNativeJsx(extractSVGInnerContent(variants[0].svgContent));

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

const generateStyleResolver = (styles: StyleVariant[]): string => {
  const checks = styles.map((style) => `if (${style}) resolvedVariant = "${style}";`).join("\n    ");

  return `let resolvedVariant = variant;
  if (!resolvedVariant) {
    ${checks}
  }
  if (!resolvedVariant) resolvedVariant = "${styles[0]}";`;
};

export { getReactNativeFileExtension } from "./react-native.js";

