import { describe, it, expect } from "vitest";
import { isValidSVG, extractViewBox, extractDimensions, isValidIconName } from "./validation";

describe("isValidSVG", () => {
  it("returns true for valid svg with content", () => {
    expect(isValidSVG('<svg><path d="M1 1"/></svg>')).toBe(true);
  });
  it("returns true when comments appear before svg", () => {
    expect(isValidSVG("<!-- comment --><svg></svg>")).toBe(true);
  });
  it("returns true for svg with attributes", () => {
    expect(isValidSVG('<svg viewBox="0 0 24 24"><path/></svg>')).toBe(true);
  });
  it("returns false when closing tag is missing", () => {
    expect(isValidSVG("<svg><path/></svg")).toBe(false);
  });
  it("returns false when no svg tag", () => {
    expect(isValidSVG("<div>foo</div>")).toBe(false);
  });
  it("returns false for whitespace only", () => {
    expect(isValidSVG("   \n  ")).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isValidSVG("")).toBe(false);
  });
  it("trims whitespace before checking", () => {
    expect(isValidSVG("  \n<svg></svg>\n  ")).toBe(true);
  });
});

describe("extractViewBox", () => {
  it("extracts viewBox with double quotes", () => {
    expect(extractViewBox('<svg viewBox="0 0 24 24"></svg>')).toBe("0 0 24 24");
  });
  it("extracts viewBox with single quotes", () => {
    expect(extractViewBox("<svg viewBox='0 0 24 24'></svg>")).toBe("0 0 24 24");
  });
  it("returns null when no viewBox", () => {
    expect(extractViewBox("<svg><path/></svg>")).toBe(null);
  });
  it("is case-insensitive", () => {
    expect(extractViewBox('<svg VIEWBOX="0 0 24 24"></svg>')).toBe("0 0 24 24");
  });
});

describe("extractDimensions", () => {
  it("extracts width and height", () => {
    expect(extractDimensions('<svg width="24" height="24"></svg>')).toEqual({
      width: "24",
      height: "24",
    });
  });
  it("extracts only width when height missing", () => {
    expect(extractDimensions('<svg width="24"></svg>')).toEqual({
      width: "24",
      height: undefined,
    });
  });
  it("extracts only height when width missing", () => {
    expect(extractDimensions('<svg height="24"></svg>')).toEqual({
      width: undefined,
      height: "24",
    });
  });
  it("returns undefined for both when absent", () => {
    expect(extractDimensions("<svg></svg>")).toEqual({
      width: undefined,
      height: undefined,
    });
  });
  it("handles single quotes", () => {
    expect(extractDimensions("<svg width='48' height='48'></svg>")).toEqual({
      width: "48",
      height: "48",
    });
  });
});

describe("isValidIconName", () => {
  it("returns true for valid names", () => {
    expect(isValidIconName("arrow-down")).toBe(true);
    expect(isValidIconName("ArrowDown")).toBe(true);
  });
  it("returns false for empty string", () => {
    expect(isValidIconName("")).toBe(false);
  });
  it("returns false for whitespace only", () => {
    expect(isValidIconName("   ")).toBe(false);
  });
  it("returns false when no letters", () => {
    expect(isValidIconName("123")).toBe(false);
  });
  it("returns true when at least one letter", () => {
    expect(isValidIconName("a")).toBe(true);
    expect(isValidIconName("icon1")).toBe(true);
  });
});
