import { formatFunctionSignature, formatJsxOpenTag } from "@/adapters/code-helpers";
import type { SpinnerTemplateOptions } from "@/types/spinner";

const extractInnerContent = (svgContent: string): string =>
  svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

export const generateReactSpinnerComponent = (options: SpinnerTemplateOptions): string => {
  const {
    componentName,
    svgContent,
    viewBox,
    typescript,
    animationLib,
    defaultDuration,
    lineWidth = 100,
    jsxQuotes = "double",
    bracketSameLine = false,
  } = options;

  const q = jsxQuotes === "single" ? "'" : '"';
  const svgInner = extractInnerContent(svgContent);
  const typeImport = typescript ? `import type { SVGProps } from 'react';\n` : "";

  const propsType = typescript
    ? `export interface ${componentName}Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  duration?: number;
}

`
    : "";

  const baseSvgAttrs = [
    `xmlns=${q}http://www.w3.org/2000/svg${q}`,
    "{...(size && { width: size, height: size })}",
    `viewBox=${q}${viewBox}${q}`,
    `fill=${q}none${q}`,
    "{...(color && { stroke: color })}",
  ];

  if (animationLib === "css") {
    const keyframesStyle = `<style>{'@keyframes mkicon-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>`;
    const animStyle = `style={{ animationName: 'mkicon-spin', animationDuration: \`\${duration}ms\`, animationTimingFunction: 'linear', animationIterationCount: 'infinite', display: 'inline-block', ...style }}`;

    const cssAttrs = [...baseSvgAttrs, animStyle, "{...props}"];

    const cssParams = [
      "size = 24",
      "color = 'currentColor'",
      `duration = ${defaultDuration}`,
      "style",
      "...props",
    ];
    const cssPrefix = `export const ${componentName} = `;
    const sig = formatFunctionSignature(
      cssPrefix,
      cssParams,
      typescript ? `${componentName}Props` : undefined,
      lineWidth
    );
    const svgTag = formatJsxOpenTag("svg", cssAttrs, "      ", lineWidth, bracketSameLine);

    return `${typeImport}${propsType}export const ${componentName} = ${sig} => {
  return (
    <>
      ${keyframesStyle}
      ${svgTag}
        ${svgInner}
      </svg>
    </>
  );
};
`;
  }

  if (animationLib === "tailwind") {
    const twType = typescript
      ? `export interface ${componentName}Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

`
      : "";

    const twAttrs = [...baseSvgAttrs, `className=${q}animate-spin${q}`, "{...props}"];

    const twParams = ["size = 24", "color = 'currentColor'", "...props"];
    const twPrefix = `export const ${componentName} = `;
    const twSig = formatFunctionSignature(
      twPrefix,
      twParams,
      typescript ? `${componentName}Props` : undefined,
      lineWidth
    );
    const twSvgTag = formatJsxOpenTag("svg", twAttrs, "    ", lineWidth, bracketSameLine);

    return `${typeImport}${twType}export const ${componentName} = ${twSig} => {
  return (
    ${twSvgTag}
      ${svgInner}
    </svg>
  );
};
`;
  }

  // framer-motion
  const framerImport = "import { motion } from 'framer-motion';\n";

  const framerType = typescript
    ? `export interface ${componentName}Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  duration?: number;
}

`
    : "";

  const framerAttrs = [...baseSvgAttrs, "{...props}"];

  const framerParams = [
    "size = 24",
    "color = 'currentColor'",
    `duration = ${defaultDuration}`,
    "...props",
  ];
  const framerPrefix = `export const ${componentName} = `;
  const framerSig = formatFunctionSignature(
    framerPrefix,
    framerParams,
    typescript ? `${componentName}Props` : undefined,
    lineWidth
  );
  const framerSvgTag = formatJsxOpenTag("svg", framerAttrs, "      ", lineWidth, bracketSameLine);

  return `${typeImport}${framerImport}${framerType}export const ${componentName} = ${framerSig} => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: duration / 1000, repeat: Infinity, ease: 'linear' }}
      style={{ display: 'inline-flex' }}
    >
      ${framerSvgTag}
        ${svgInner}
      </svg>
    </motion.div>
  );
};
`;
};
