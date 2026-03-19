import { PropsConfig } from "@/config/schema.js";
import { VariantComponentData, DirectionVariant, StyleVariant } from "@/types/variants.js";
import { extractSVGInnerContent } from "@/core/variant-generator.js";

export interface GenerateVueVariantOptions {
  componentName: string;
  variantData: VariantComponentData;
  typescript: boolean;
  props: PropsConfig;
}

export const generateVueVariantComponent = (options: GenerateVueVariantOptions): string => {
  const { variantData, typescript, props } = options;
  const { config, variants } = variantData;

  const hasDirections = config.directions && config.directions.length > 0;
  const hasStyles = config.styles && config.styles.length > 0;

  // Build props
  const propDefs: string[] = [];

  if (props.size) propDefs.push("  size?: number | string;");
  if (props.color) propDefs.push("  color?: string;");

  if (hasDirections) {
    const directionType = config.directions!.map((d) => `'${d}'`).join(" | ");
    propDefs.push(`  direction?: ${directionType};`);
  }

  if (hasStyles) {
    const styleType = config.styles!.map((s) => `'${s}'`).join(" | ");
    propDefs.push(`  variant?: ${styleType};`);
    for (const style of config.styles!) {
      propDefs.push(`  ${style}?: boolean;`);
    }
  }

  // Defaults
  const defaultValues: Record<string, string | number> = {};
  if (props.size) defaultValues.size = 24;
  if (props.color) defaultValues.color = "'currentColor'";
  if (hasDirections) defaultValues.direction = `'${config.directions![0]}'`;
  if (hasStyles) defaultValues.variant = `'${config.styles![0]}'`;

  const propsCode =
    typescript && propDefs.length > 0
      ? `withDefaults(defineProps<{\n${propDefs.join("\n")}\n}>(), {\n${Object.entries(
          defaultValues
        )
          .map(([key, val]) => `  ${key}: ${val}`)
          .join(",\n")}\n})`
      : typescript
        ? `defineProps<{\n${propDefs.join("\n")}\n}>()`
        : `defineProps(['size', 'color', ${hasDirections ? "'direction'" : ""}, ${hasStyles ? "'variant'" : ""}])`;

  // Générer le computed pour le contenu
  let computedContent = "";

  if (hasDirections && !hasStyles) {
    computedContent = generateVueDirectionComputed(config.directions!, variants);
  } else if (!hasDirections && hasStyles) {
    computedContent = generateVueStyleComputed(config.styles!, variants);
  } else if (hasDirections && hasStyles) {
    // Simplified for MVP
    computedContent = generateVueDirectionComputed(config.directions!, variants);
  }

  const viewBox = variants[0]?.viewBox || "0 0 24 24";

  const scriptLang = typescript ? ' lang="ts"' : "";

  // Build SVG attributes
  const svgAttrs: string[] = ['xmlns="http://www.w3.org/2000/svg"'];

  if (props.size) {
    svgAttrs.push(':width="size"');
    svgAttrs.push(':height="size"');
  }

  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push('fill="none"');

  if (props.color) {
    svgAttrs.push(':stroke="color"');
  }

  svgAttrs.push('v-bind="$attrs"');

  return `<template>
  <svg 
    ${svgAttrs.join("\n    ")}
  >
    <component :is="renderContent" />
  </svg>
</template>

<script setup${scriptLang}>
import { computed, h } from 'vue';

const props = ${propsCode};

${hasStyles ? generateVueStyleResolver(config.styles!) : ""}
const renderContent = computed(() => {
  ${computedContent}
});
</script>
`;
};

const generateVueDirectionComputed = (
  directions: DirectionVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = directions
    .map((dir) => {
      const v = variants.find((v) => v.variant === dir);
      if (!v) return "";

      const content = extractSVGInnerContent(v.svgContent);
      // Escape backticks and ${} in content for template literals
      const escapedContent = content.replace(/`/g, "\\`").replace(/\$/g, "\\$");
      return `    case '${dir}':
      return () => h('g', { innerHTML: \`${escapedContent}\` });`;
    })
    .filter(Boolean)
    .join("\n");

  const defaultContent = extractSVGInnerContent(variants[0].svgContent);
  const escapedDefaultContent = defaultContent.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `switch (props.direction) {
${cases}
    default:
      return () => h('g', { innerHTML: \`${escapedDefaultContent}\` });
  }`;
};

const generateVueStyleComputed = (
  styles: StyleVariant[],
  variants: Array<{ variant: DirectionVariant | StyleVariant; svgContent: string }>
): string => {
  const cases = styles
    .map((style) => {
      const v = variants.find((v) => v.variant === style);
      if (!v) return "";

      const content = extractSVGInnerContent(v.svgContent);
      const escapedContent = content.replace(/`/g, "\\`").replace(/\$/g, "\\$");
      return `    case '${style}':
      return () => h('g', { innerHTML: \`${escapedContent}\` });`;
    })
    .filter(Boolean)
    .join("\n");

  const defaultContent = extractSVGInnerContent(variants[0].svgContent);
  const escapedDefaultContent = defaultContent.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `switch (resolvedVariant.value) {
${cases}
    default:
      return () => h('g', { innerHTML: \`${escapedDefaultContent}\` });
  }`;
};

const generateVueStyleResolver = (styles: StyleVariant[]): string => {
  const checks = styles.map((style) => `  if (props.${style}) return '${style}';`).join("\n");

  return `const resolvedVariant = computed(() => {
  if (props.variant) return props.variant;
${checks}
  return '${styles[0]}';
});

`;
};

export { getVueFileExtension } from "./vue.js";
