import { describe, it, expect } from "vitest";
import { generateWebComponentsComponent, getWebComponentsFileExtension } from "./webcomponents";
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

describe("generateWebComponentsComponent", () => {
  it("includes viewBox in template", () => {
    const out = generateWebComponentsComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it("injects inner SVG content", () => {
    const out = generateWebComponentsComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain('<path d="M1 1"/>');
  });

  it("generates LitElement class with @customElement", () => {
    const out = generateWebComponentsComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain("LitElement");
    expect(out).toContain("@customElement");
    expect(out).toContain("export class ArrowIcon extends LitElement");
  });

  it("generates correct kebab-case tag name", () => {
    const out = generateWebComponentsComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain("'arrow-icon'");
  });

  it("includes @property declarations for size and color", () => {
    const out = generateWebComponentsComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: defaultProps,
    });
    expect(out).toContain("@property");
    expect(out).toContain("size");
    expect(out).toContain("color");
  });

  it("includes title property when accessibility enabled", () => {
    const out = generateWebComponentsComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      props: { ...defaultProps, accessibility: true },
    });
    expect(out).toContain("title");
    expect(out).toContain("aria-hidden");
  });
});

describe("getWebComponentsFileExtension", () => {
  it("returns .ts", () => {
    expect(getWebComponentsFileExtension()).toBe(".ts");
  });
});
