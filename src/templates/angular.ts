import type { Config } from "@/config/schema";

interface AngularTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  props: Config["props"];
  header?: string;
}

export const generateAngularComponent = (options: AngularTemplateOptions): string => {
  const { componentName, svgContent, viewBox, props, header = "" } = options;

  // Extract the inner content of the SVG
  const svgInnerContent = svgContent
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .trim();

  // Build component class name and selector
  const className = `${componentName}Component`;
  const selector = componentName
    .replace(/([A-Z])/g, (_m, l, offset) => (offset > 0 ? `-${l.toLowerCase()}` : l.toLowerCase()))
    .replace(/Icon$/, "-icon")
    .replace(/^icon-/, "icon-");

  // Build @Input() declarations
  const inputs: string[] = [];
  if (props.size) {
    inputs.push("  @Input() size: number | string = 24;");
  }
  if (props.color) {
    inputs.push("  @Input() color: string = 'currentColor';");
  }
  if (props.strokeWidth) {
    inputs.push("  @Input() strokeWidth: number = 2;");
  }
  if (props.accessibility) {
    inputs.push("  @Input() title: string | undefined = undefined;");
  }

  // Build SVG attributes
  const svgAttrs: string[] = ['xmlns="http://www.w3.org/2000/svg"'];
  if (props.size) {
    svgAttrs.push('[attr.width]="size"');
    svgAttrs.push('[attr.height]="size"');
  }
  svgAttrs.push(`viewBox="${viewBox}"`);
  svgAttrs.push('fill="none"');
  if (props.color) {
    svgAttrs.push('[attr.stroke]="color"');
  }
  if (props.strokeWidth) {
    svgAttrs.push('[attr.stroke-width]="strokeWidth"');
  }
  if (props.accessibility) {
    svgAttrs.push('[attr.aria-hidden]="!title"');
    svgAttrs.push('[attr.role]="title ? \'img\' : null"');
  }

  const titleElement = props.accessibility
    ? `\n      <title *ngIf="title">{{ title }}</title>`
    : "";

  const importsLine = props.accessibility ? `\n  imports: [NgIf],` : "";
  const commonImportLine = props.accessibility
    ? `\nimport { NgIf } from '@angular/common';`
    : "";

  const inputsBlock = inputs.length > 0 ? `\n${inputs.join("\n")}\n` : "";

  return `${header}import { Component, Input } from '@angular/core';${commonImportLine}

@Component({
  selector: 'app-${selector}',
  standalone: true,${importsLine}
  template: \`
    <svg
      ${svgAttrs.join("\n      ")}
    >${titleElement}
      ${svgInnerContent}
    </svg>
  \`
})
export class ${className} {${inputsBlock}}
`;
};

export const getAngularFileExtension = (): string => {
  return ".component.ts";
};
