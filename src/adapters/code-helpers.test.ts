import { describe, expect, it } from "vitest";

import { formatFunctionSignature, formatImportStatement, formatJsxOpenTag } from "./code-helpers";

describe("formatFunctionSignature", () => {
  const prefix = "export const LoadingIcon = ";
  const params = ["size = 24", 'color = "currentColor"', "...props"];

  it("returns single-line when it fits within lineWidth", () => {
    const result = formatFunctionSignature(prefix, params, undefined, 200);
    expect(result).toBe('({ size = 24, color = "currentColor", ...props })');
  });

  it("returns multi-line when it exceeds lineWidth", () => {
    const result = formatFunctionSignature(prefix, params, undefined, 60);
    expect(result).toBe('({\n  size = 24,\n  color = "currentColor",\n  ...props,\n})');
  });

  it("includes type annotation in single-line", () => {
    const result = formatFunctionSignature(prefix, ["size = 24"], "LoadingIconProps", 200);
    expect(result).toBe("({ size = 24 }: LoadingIconProps)");
  });

  it("includes type annotation in multi-line", () => {
    const result = formatFunctionSignature(prefix, params, "LoadingIconProps", 60);
    expect(result).toBe(
      '({\n  size = 24,\n  color = "currentColor",\n  ...props,\n}: LoadingIconProps)'
    );
  });

  it("single-line boundary: fits exactly at lineWidth", () => {
    // prefix = "export const LoadingIcon = " (27 chars)
    // single-line check: `${prefix}(${params}) => {`
    const singleParams = ["a = 1"];
    const result = formatFunctionSignature("export const X = ", singleParams, undefined, 200);
    expect(result).not.toContain("\n");
  });
});

describe("formatJsxOpenTag", () => {
  const attrs = ['xmlns="http://www.w3.org/2000/svg"', "width={size}", "height={size}"];
  const baseIndent = "    ";

  it("returns single-line when it fits within lineWidth", () => {
    const result = formatJsxOpenTag("svg", attrs, baseIndent, 200, false);
    expect(result).toBe('<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}>');
  });

  it("returns multi-line when it exceeds lineWidth", () => {
    const result = formatJsxOpenTag("svg", attrs, baseIndent, 60, false);
    expect(result).toContain("<svg\n");
    expect(result).toContain(`${baseIndent}  xmlns="http://www.w3.org/2000/svg"`);
    expect(result).toContain(`\n${baseIndent}>`);
  });

  it("bracket-same-line: closing > on last attr line", () => {
    const result = formatJsxOpenTag("svg", attrs, baseIndent, 60, true);
    expect(result).toContain(`${baseIndent}  height={size}>`);
    expect(result).not.toMatch(/\n\s+>$/);
  });

  it("single-line does not include baseIndent in returned string", () => {
    const result = formatJsxOpenTag("svg", ["a=1"], baseIndent, 200, false);
    expect(result).toBe("<svg a=1>");
  });
});

describe("formatImportStatement", () => {
  it("returns single-line when it fits within lineWidth", () => {
    const result = formatImportStatement(["Svg", "Circle"], "react-native-svg", 200, '"');
    expect(result).toBe('import { Svg, Circle } from "react-native-svg";');
  });

  it("returns multi-line when it exceeds lineWidth", () => {
    const names = ["Svg", "Circle", "Path", "Rect", "Line", "Ellipse", "Polygon"];
    const result = formatImportStatement(names, "react-native-svg", 60, '"');
    expect(result).toContain("import {\n");
    expect(result).toContain('} from "react-native-svg";');
    expect(result).toContain("  Svg,");
    expect(result).toContain("  Ellipse,");
  });

  it("uses provided quote character", () => {
    const result = formatImportStatement(["Svg"], "react-native-svg", 200, "'");
    expect(result).toBe("import { Svg } from 'react-native-svg';");
  });
});
