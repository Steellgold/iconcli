import { describe, it, expect } from "vitest";
import { generateReactNativeComponent, getReactNativeFileExtension } from "./react-native";
import type { Config } from "@/config/schema";

const defaultProps: Config["props"] = {
  size: true,
  color: true,
  className: true,
  style: false,
};

describe("generateReactNativeComponent", () => {
  it("uses Svg root and includes viewBox", () => {
    const out = generateReactNativeComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      typescript: true,
      props: defaultProps,
    });

    expect(out).toContain("<Svg");
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it("converts common tags to react-native-svg components", () => {
    const out = generateReactNativeComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg><path d=\"M1 1\" /><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });

    expect(out).toContain("<Path");
    expect(out).toContain("<Circle");
    expect(out).not.toContain("<path");
    expect(out).not.toContain("<circle");
  });

  it("camelCases dashed attributes", () => {
    const out = generateReactNativeComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg><path stroke-width=\"2\" stroke-linecap=\"round\" d=\"M1 1\"/></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });

    expect(out).toContain("strokeWidth=");
    expect(out).toContain("strokeLinecap=");
    expect(out).not.toContain("stroke-width=");
    expect(out).not.toContain("stroke-linecap=");
  });

  it("includes TypeScript SvgProps types when enabled", () => {
    const out = generateReactNativeComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: defaultProps,
    });

    expect(out).toContain("import type { SvgProps } from \"react-native-svg\"");
    expect(out).toContain("export interface ArrowIconProps extends SvgProps");
  });
});

describe("getReactNativeFileExtension", () => {
  it("returns .tsx when typescript is true", () => {
    expect(getReactNativeFileExtension(true)).toBe(".tsx");
  });

  it("returns .jsx when typescript is false", () => {
    expect(getReactNativeFileExtension(false)).toBe(".jsx");
  });
});

