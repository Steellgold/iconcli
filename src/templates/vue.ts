import { Config } from '@/config/schema.js';

interface VueTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  typescript: boolean;
  props: Config['props'];
}

export const generateVueComponent = (options: VueTemplateOptions): string => {
  const { svgContent, viewBox, typescript, props } = options;
  
  // Extract the inner content of the SVG
  const svgInnerContent = svgContent
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .trim();
  
  const scriptLang = typescript ? ' lang="ts"' : '';
  
  // Build props definition
  const propsFields: string[] = [];
  const defaultValues: { [key: string]: string | number } = {};
  
  if (props.size) {
    propsFields.push('  size?: number | string;');
    defaultValues.size = 24;
  }
  
  if (props.color) {
    propsFields.push('  color?: string;');
    defaultValues.color = "'currentColor'";
  }
  
  const propsCode = typescript && (props.size || props.color)
    ? `withDefaults(defineProps<{\n${propsFields.join('\n')}\n}>(), {\n${Object.entries(defaultValues).map(([key, val]) => `  ${key}: ${val}`).join(',\n')}\n})`
    : typescript
    ? `defineProps<{\n${propsFields.join('\n')}\n}>()`
    : `defineProps(['size', 'color'])`;
  
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
    ${svgAttrs.join('\n    ')}
  >
    ${svgInnerContent}
  </svg>
</template>

<script setup${scriptLang}>
${propsCode}
</script>
`;
};

export const getVueFileExtension = (): string => {
  return '.vue';
};
