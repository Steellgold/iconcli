import type { SpinnerTemplateOptions } from "@/types/spinner";

const extractInnerContent = (svgContent: string): string =>
  svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

export const generateSvelteSpinnerComponent = (options: SpinnerTemplateOptions): string => {
  const { svgContent, viewBox, typescript, animationLib, defaultDuration, header = "" } = options;

  const svgInner = extractInnerContent(svgContent);
  const scriptLang = typescript ? ' lang="ts"' : "";

  if (animationLib === "tailwind") {
    const propsExports = typescript
      ? `  export let size: number | string = 24;
  export let color: string = 'currentColor';`
      : `  export let size = 24;
  export let color = 'currentColor';`;

    return `${header}<script${scriptLang}>
${propsExports}
</script>

<svg
  class="animate-spin"
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="${viewBox}"
  fill="none"
  stroke={color}
  {...$$restProps}
>
  ${svgInner}
</svg>
`;
  }

  // css
  const propsExports = typescript
    ? `  export let size: number | string = 24;
  export let color: string = 'currentColor';
  export let duration: number = ${defaultDuration};`
    : `  export let size = 24;
  export let color = 'currentColor';
  export let duration = ${defaultDuration};`;

  return `${header}<script${scriptLang}>
${propsExports}
</script>

<svg
  class="mkicon-spin"
  style="--spin-duration: {duration}ms"
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="${viewBox}"
  fill="none"
  stroke={color}
  {...$$restProps}
>
  ${svgInner}
</svg>

<style>
  @keyframes mkicon-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .mkicon-spin {
    animation: mkicon-spin var(--spin-duration, ${defaultDuration}ms) linear infinite;
    display: inline-block;
  }
</style>
`;
};
