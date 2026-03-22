import { describe, it, expect } from "vitest";
import { generateAngularComponent, getAngularFileExtension } from "./angular";
import type { Config } from "@/config/schema";

const defaultProps: Config["props"] = {
  size: true,
  color: true,
  className: false,
  style: false,
  strokeWidth: false,
  accessibility: false,
  forwardRef: false,
};

describe("generateAngularComponent", () => {
  it("includes viewBox in template", () => {
    const out = generateAngularComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it("injects inner SVG content", () => {
    const out = generateAngularComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain('<path d="M1 1"/>');
  });

  it("generates standalone @Component decorator", () => {
    const out = generateAngularComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain("@Component");
    expect(out).toContain("standalone: true");
    expect(out).toContain("export class ArrowIconComponent");
  });

  it("generates correct kebab-case selector", () => {
    const out = generateAngularComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain("selector: 'app-arrow-icon'");
  });

  it("includes @Input() size and color", () => {
    const out = generateAngularComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain("@Input() size");
    expect(out).toContain("@Input() color");
  });

  it("includes title @Input when accessibility enabled", () => {
    const out = generateAngularComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: { ...defaultProps, accessibility: true },
    });
    expect(out).toContain("@Input() title");
    expect(out).toContain("NgIf");
    expect(out).toContain("<title *ngIf");
  });
});

describe("getAngularFileExtension", () => {
  it("returns .component.ts", () => {
    expect(getAngularFileExtension()).toBe(".component.ts");
  });
});
