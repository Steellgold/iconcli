import { describe, it, expect } from "vitest";
import { generateReactComponent, getReactFileExtension } from "./react";
import type { Config } from "@/config/schema";

const defaultProps: Config["props"] = {
  size: true,
  color: true,
  className: true,
  style: false,
};

describe("generateReactComponent", () => {
  it("includes viewBox in output", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      typescript: true,
      props: defaultProps,
    });
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it("injects inner SVG content", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });
    expect(out).toContain('<path d="M1 1"/>');
  });

  it("includes TypeScript import and interface when typescript is true", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: defaultProps,
    });
    expect(out).toContain("import type { SVGProps } from 'react'");
    expect(out).toContain("export interface ArrowIconProps");
  });

  it("omits TypeScript import when typescript is false", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });
    expect(out).not.toContain("import type { SVGProps } from 'react'");
    expect(out).not.toContain("ArrowIconProps");
  });

  it("includes size and color props when enabled", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: { size: true, color: true, className: true, style: false },
    });
    expect(out).toContain("size");
    expect(out).toContain("color");
    expect(out).toContain("size = 24");
    expect(out).toContain("color = 'currentColor'");
  });

  it("includes className and style when enabled", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: { size: true, color: true, className: true, style: true },
    });
    expect(out).toContain("className");
    expect(out).toContain("style");
  });

  it("uses component name in export", () => {
    const out = generateReactComponent({
      componentName: "CustomIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });
    expect(out).toContain("export const CustomIcon =");
  });

  it("handles SVG with attributes in opening tag", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>',
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });
    expect(out).toContain('<circle cx="12" cy="12" r="10"/>');
  });
});

describe("getReactFileExtension", () => {
  it("returns .tsx when typescript is true", () => {
    expect(getReactFileExtension(true)).toBe(".tsx");
  });
  it("returns .jsx when typescript is false", () => {
    expect(getReactFileExtension(false)).toBe(".jsx");
  });
});

describe("forwardRef support", () => {
  it("wraps component with forwardRef when enabled", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: { ...defaultProps, forwardRef: true },
    });
    expect(out).toContain("forwardRef");
    expect(out).toContain("import { forwardRef }");
    expect(out).toContain("ArrowIcon.displayName = 'ArrowIcon'");
    expect(out).toContain("ref={ref}");
  });

  it("wraps component with forwardRef in JS mode", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: { ...defaultProps, forwardRef: true },
    });
    expect(out).toContain("forwardRef");
    expect(out).toContain("ArrowIcon.displayName");
    expect(out).not.toContain("import type { SVGProps }");
  });

  it("does not use forwardRef when disabled", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: { ...defaultProps, forwardRef: false },
    });
    expect(out).not.toContain("forwardRef");
    expect(out).not.toContain("displayName");
  });
});

describe("accessibility support", () => {
  it("adds aria-hidden and title prop when accessibility enabled (TS)", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: { ...defaultProps, accessibility: true },
    });
    expect(out).toContain("title?: string");
    expect(out).toContain("aria-hidden");
    expect(out).toContain("{title && <title>");
  });

  it("adds title prop in JS mode when accessibility enabled", () => {
    const out = generateReactComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: { ...defaultProps, accessibility: true },
    });
    expect(out).toContain("title");
    expect(out).toContain("aria-hidden");
  });
});
