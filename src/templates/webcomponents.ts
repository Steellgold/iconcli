import type { Config } from "@/config/schema";

interface WebComponentsTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  props: Config["props"];
  header?: string;
}

export const generateWebComponentsComponent = (options: WebComponentsTemplateOptions): string => {
  const { componentName, svgContent, viewBox, props, header = "" } = options;

  // Extract the inner content of the SVG
  const svgInnerContent = svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

  // Build custom element tag name from PascalCase
  const tagName = componentName
    .replace(/([A-Z])/g, (_m, l, offset) => (offset > 0 ? `-${l.toLowerCase()}` : l.toLowerCase()))
    .replace(/^icon-/, "icon-");

  // Build @property() declarations
  const properties: string[] = [];
  if (props.size) {
    properties.push("  @property({ type: Number }) size: number | string = 24;");
  }
  if (props.color) {
    properties.push("  @property({ type: String }) color: string = 'currentColor';");
  }
  if (props.strokeWidth) {
    properties.push("  @property({ type: Number }) strokeWidth: number = 2;");
  }
  if (props.accessibility) {
    properties.push("  @property({ type: String }) title: string | undefined = undefined;");
  }

  // Build SVG attributes using ${this.x} interpolation
  const svgAttrs: string[] = ['xmlns="http://www.w3.org/2000/svg"'];
  if (props.size) {
    svgAttrs.push('width="${this.size}" height="${this.size}"');
  }
  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push('fill="none"');
  if (props.color) {
    svgAttrs.push('stroke="${this.color}"');
  }
  if (props.strokeWidth) {
    svgAttrs.push('stroke-width="${this.strokeWidth}"');
  }
  if (props.accessibility) {
    svgAttrs.push('aria-hidden="${!this.title}"');
    svgAttrs.push('role="${this.title ? \'img\' : undefined}"');
  }

  const titleElement = props.accessibility
    ? `\n        \${this.title ? html\`<title>\${this.title}</title>\` : ''}`
    : "";

  const propertiesBlock = properties.length > 0 ? `\n${properties.join("\n")}\n` : "";

  return `${header}import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('${tagName}')
export class ${componentName} extends LitElement {${propertiesBlock}
  render() {
    return html\`
      <svg
        ${svgAttrs.join("\n        ")}
      >${titleElement}
        ${svgInnerContent}
      </svg>
    \`;
  }
}
`;
};

export const getWebComponentsFileExtension = (): string => {
  return ".ts";
};
