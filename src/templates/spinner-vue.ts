import type { SpinnerTemplateOptions } from "@/types/spinner";

const extractInnerContent = (svgContent: string): string =>
  svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

export const generateVueSpinnerComponent = (options: SpinnerTemplateOptions): string => {
  const { svgContent, viewBox, typescript, animationLib, defaultDuration } = options;

  const svgInner = extractInnerContent(svgContent);
  const scriptLang = typescript ? ' lang="ts"' : "";

  if (animationLib === "tailwind") {
    const propsCode = typescript
      ? `withDefaults(defineProps<{
  size?: number | string;
  color?: string;
}>(), {
  size: 24,
  color: 'currentColor'
})`
      : `defineProps(['size', 'color'])`;

    return `<template>
  <svg
    class="animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="${viewBox}"
    fill="none"
    :stroke="color"
    v-bind="$attrs"
  >
    ${svgInner}
  </svg>
</template>

<script setup${scriptLang}>
${propsCode}
</script>
`;
  }

  // css
  const propsCode = typescript
    ? `withDefaults(defineProps<{
  size?: number | string;
  color?: string;
  duration?: number;
}>(), {
  size: 24,
  color: 'currentColor',
  duration: ${defaultDuration}
})`
    : `defineProps(['size', 'color', 'duration'])`;

  return `<template>
  <svg
    class="mkicon-spin"
    :style="{ animationDuration: duration + 'ms' }"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="${viewBox}"
    fill="none"
    :stroke="color"
    v-bind="$attrs"
  >
    ${svgInner}
  </svg>
</template>

<script setup${scriptLang}>
${propsCode}
</script>

<style scoped>
@keyframes mkicon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.mkicon-spin {
  animation: mkicon-spin 1s linear infinite;
  display: inline-block;
}
</style>
`;
};
