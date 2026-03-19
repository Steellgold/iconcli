import type { PropsConfig } from "@/config/schema";
import type { VariantComponentData, DirectionVariant, StyleVariant } from "@/types/variants";
import { extractSVGInnerContent } from "@/core/variant-generator";

export interface GenerateSvelteVariantOptions {
  componentName: string;
  variantData: VariantComponentData;
  typescript: boolean;
  props: PropsConfig;
}

export const generateSvelteVariantComponent = (options: GenerateSvelteVariantOptions): string => {
  const { variantData, typescript, props } = options;
  const { config, variants } = variantData;

  const hasDirections = config.directions && config.directions.length > 0;
  const hasStyles = config.styles && config.styles.length > 0;

  // Props export
  const exportProps: string[] = [];

  if (props.size) {exportProps.push("  export let size: number | string = 24;");}
  if (props.color) {exportProps.push("  export let color: string = 'currentColor';");}

  if (hasDirections) {
    const directionType = typescript
      ? `: ${config.directions!.map((d) => `'${d}'`).join(" | ")}`
      : "";
    exportProps.push(`  export let direction${directionType} = '${config.directions![0]}';`);
  }

  if (hasStyles) {
    const styleType = typescript ? `: ${config.styles!.map((s) => `'${s}'`).join(" | ")}` : "";
    exportProps.push(`  export let variant${styleType} = '${config.styles![0]}';`);
    for (const style of config.styles!) {
      exportProps.push(`  export let ${style}: boolean = false;`);
    }
  }

  // Générer le reactive statement pour le style
  let styleResolver = "";
  if (hasStyles) {
    styleResolver = generateSvelteStyleResolver(config.styles!);
  }

  // Générer la fonction de rendu
  let renderFunction = "";
  if (hasDirections && !hasStyles) {
    renderFunction = generateSvelteDirectionRender(config.directions!, variants);
  } else if (!hasDirections && hasStyles) {
    renderFunction = generateSvelteStyleRender(config.styles!, variants);
  } else if (hasDirections && hasStyles) {
    // Simplified for MVP
    renderFunction = generateSvelteDirectionRender(config.directions!, variants);
  }

  const viewBox = variants[0]?.viewBox || "0 0 24 24";
  const scriptLang = typescript ? ' lang="ts"' : "";

  // Build SVG attributes
  const svgAttrs: string[] = ['xmlns="http://www.w3.org/2000/svg"'];

  if (props.size) {
    svgAttrs.push("width={size}");
    svgAttrs.push("height={size}");
  }

  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push('fill="none"');

  if (props.color) {
    svgAttrs.push("stroke={color}");
  }

  svgAttrs.push("{...$$restProps}");

  return `<script${scriptLang}>
${exportProps.join("\n")}

${styleResolver}${renderFunction}
</script>

<svg 
  ${svgAttrs.join("\n  ")}
>
  {@html renderContent()}
</svg>
`;
};

const generateSvelteDirectionRender = (
  directions: DirectionVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = directions
    .map((dir) => {
      const v = variants.find((v) => v.variant === dir);
      if (!v) {return "";}

      const content = extractSVGInnerContent(v.svgContent);
      // Escape backticks and ${} in content for template literals
      const escapedContent = content.replace(/`/g, "\\`").replace(/\$/g, "\\$");
      return `      case '${dir}':
        return \`${escapedContent}\`;`;
    })
    .filter(Boolean)
    .join("\n");

  const defaultContent = extractSVGInnerContent(variants[0].svgContent);
  const escapedDefaultContent = defaultContent.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `  function renderContent() {
    switch (direction) {
${cases}
      default:
        return \`${escapedDefaultContent}\`;
    }
  }`;
};

const generateSvelteStyleRender = (
  styles: StyleVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = styles
    .map((style) => {
      const v = variants.find((v) => v.variant === style);
      if (!v) {return "";}

      const content = extractSVGInnerContent(v.svgContent);
      const escapedContent = content.replace(/`/g, "\\`").replace(/\$/g, "\\$");
      return `      case '${style}':
        return \`${escapedContent}\`;`;
    })
    .filter(Boolean)
    .join("\n");

  const defaultContent = extractSVGInnerContent(variants[0].svgContent);
  const escapedDefaultContent = defaultContent.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `  function renderContent() {
    switch (resolvedVariant) {
${cases}
      default:
        return \`${escapedDefaultContent}\`;
    }
  }`;
};

const generateSvelteStyleResolver = (styles: StyleVariant[]): string => {
  const checks = styles
    .map((style) => `    if (${style}) resolvedVariant = '${style}';`)
    .join("\n");

  return `  let resolvedVariant = variant;
  $: {
    resolvedVariant = variant;
${checks}
  }

`;
};

export { getSvelteFileExtension } from "./svelte";
