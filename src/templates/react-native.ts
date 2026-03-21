import type { Config } from "@/config/schema";

interface ReactNativeTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  typescript: boolean;
  props: Config["props"];
  header?: string;
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
    // e.g. xlink:href -> xlinkHref (common in raw SVGs)
    const [prefix, rest] = attr.split(":");
    const camelRest = rest ? rest[0].toUpperCase() + rest.slice(1) : "";
    return `${prefix}${camelRest}`;
  }

  return attr.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
};

export const convertSvgToReactNativeJsx = (svgInnerContent: string): string => {
  let out = svgInnerContent;

  // Convert tag names to react-native-svg component names
  for (const [from, to] of Object.entries(SVG_TAG_MAP)) {
    const openTag = new RegExp(`<${from}(\\s|>)`, "g");
    const closeTag = new RegExp(`</${from}>`, "g");
    out = out.replace(openTag, `<${to}$1`).replace(closeTag, `</${to}>`);
  }

  // Convert dashed and namespaced attributes to camelCase (stroke-width -> strokeWidth, etc.)
  out = out.replace(/\s([a-zA-Z_:][a-zA-Z0-9_:\-]*)=/g, (_m, attr: string) => {
    return ` ${toCamelCaseAttr(attr)}=`;
  });

  // Remove attributes that don't make sense in RN output
  out = out.replace(/\s+xmlns(:\w+)?=["'][^"']*["']/g, "");

  return out.trim();
};

export const extractInnerSvg = (svgContent: string): string => {
  return svgContent.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").trim();
};

export const getUsedReactNativeSvgImports = (jsxContent: string): string[] => {
  const used = new Set<string>();
  const tagRegex = /<([A-Z][A-Za-z0-9]*)\b/g;
  let match: RegExpExecArray | null = null;

  while ((match = tagRegex.exec(jsxContent))) {
    used.add(match[1]);
  }

  used.delete("Svg");

  return Array.from(used).sort((a, b) => a.localeCompare(b));
};

export const generateReactNativeComponent = (options: ReactNativeTemplateOptions): string => {
  const { componentName, svgContent, viewBox, typescript, props, header = "" } = options;

  const svgInner = extractInnerSvg(svgContent);
  const rnJsxInner = convertSvgToReactNativeJsx(svgInner);
  const extraImports = getUsedReactNativeSvgImports(rnJsxInner);

  const svgImports = ["Svg", ...extraImports];
  const typeImport = typescript ? `import type { SvgProps } from "react-native-svg";\n` : "";
  const valueImport = `import { ${svgImports.join(", ")} } from "react-native-svg";\n\n`;

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
      defaultProps.push("  color = \"currentColor\"");
    }

    if (props.strokeWidth) {
      propsFields.push("  strokeWidth?: number;");
      defaultProps.push("  strokeWidth = 2");
    }

    if (props.style) {
      propsFields.push("  style?: SvgProps[\"style\"];");
    }

    propsInterface = `export interface ${componentName}Props extends SvgProps {\n${propsFields.join(
      "\n"
    )}\n}\n\n`;

    const tsxProps: string[] = [...defaultProps];
    if (props.style) {tsxProps.push("style");}
    tsxProps.push("...props");

    propsSignature = `{ ${tsxProps.join(",\n")} }: ${componentName}Props`;
  } else {
    const destructuredProps: string[] = [];
    if (props.size) {destructuredProps.push("size = 24");}
    if (props.color) {destructuredProps.push("color = \"currentColor\"");}
    if (props.strokeWidth) {destructuredProps.push("strokeWidth = 2");}
    if (props.style) {destructuredProps.push("style");}
    destructuredProps.push("...props");

    propsSignature = `{ ${destructuredProps.join(", ")} }`;
  }

  const svgAttrs: string[] = [];

  if (props.size) {
    svgAttrs.push("{...(size && { width: size, height: size })}");
  }

  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push("fill=\"none\"");

  if (props.color) {
    svgAttrs.push("{...(color && { stroke: color })}");
  }

  if (props.strokeWidth) {
    svgAttrs.push("{...(strokeWidth && { strokeWidth })}");
  }

  if (props.style) {
    svgAttrs.push("{...(style && { style })}");
  }

  svgAttrs.push("{...props}");

  return `${header}${typeImport}${valueImport}${propsInterface}export const ${componentName} = (${propsSignature}) => {
  return (
    <Svg
      ${svgAttrs.join("\n      ")}
    >
      ${rnJsxInner}
    </Svg>
  );
};
`;
};

export const getReactNativeFileExtension = (typescript: boolean): string => {
  return typescript ? ".tsx" : ".jsx";
};
