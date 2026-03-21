import type { Config } from "@/config/schema";

interface SvelteTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  typescript: boolean;
  props: Config["props"];
  header?: string;
}

export const generateSvelteComponent = (options: SvelteTemplateOptions): string => {
  const { svgContent, viewBox, typescript, props, header = "" } = options;

  // Extract the inner content of the SVG
  const svgInnerContent = svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

  const scriptLang = typescript ? ' lang="ts"' : "";

  // Build props exports
  const propsExports: string[] = [];

  if (props.size) {
    propsExports.push("  export let size: number | string = 24;");
  }

  if (props.color) {
    propsExports.push("  export let color: string = 'currentColor';");
  }

  if (props.strokeWidth) {
    propsExports.push("  export let strokeWidth: number = 2;");
  }

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

  if (props.strokeWidth) {
    svgAttrs.push("stroke-width={strokeWidth}");
  }

  svgAttrs.push("{...$$restProps}");

  const scriptSection =
    propsExports.length > 0
      ? `<script${scriptLang}>
${propsExports.join("\n")}
</script>

`
      : "";

  return `${header}${scriptSection}<svg
  ${svgAttrs.join("\n  ")}
>
  ${svgInnerContent}
</svg>
`;
};

export const getSvelteFileExtension = (): string => {
  return ".svelte";
};
