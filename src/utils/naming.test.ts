import { describe, it, expect } from "vitest";
import {
  toPascalCase,
  toCamelCase,
  toKebabCase,
  generateComponentName,
  generateFileName,
  generateIconName,
  extractIconNameFromFilename,
  extractIconNameFromURL,
  extractLucideIconNameFromURL,
} from "./naming";

describe("toPascalCase", () => {
  it("converts kebab-case to PascalCase", () => {
    expect(toPascalCase("arrow-down")).toBe("ArrowDown");
  });
  it("converts snake_case to PascalCase", () => {
    expect(toPascalCase("arrow_down")).toBe("ArrowDown");
  });
  it("preserves existing PascalCase", () => {
    expect(toPascalCase("ArrowDown")).toBe("ArrowDown");
  });
  it("preserves camelCase by capitalizing first letter", () => {
    expect(toPascalCase("arrowDown")).toBe("ArrowDown");
  });
  it("handles empty string", () => {
    expect(toPascalCase("")).toBe("");
  });
  it("handles single word", () => {
    expect(toPascalCase("arrow")).toBe("Arrow");
  });
  it("handles numbers in string", () => {
    expect(toPascalCase("arrow-2-down")).toBe("Arrow2Down");
  });
});

describe("toCamelCase", () => {
  it("converts kebab-case to camelCase", () => {
    expect(toCamelCase("arrow-down")).toBe("arrowDown");
  });
  it("converts PascalCase to camelCase", () => {
    expect(toCamelCase("ArrowDown")).toBe("arrowDown");
  });
  it("handles single word", () => {
    expect(toCamelCase("arrow")).toBe("arrow");
  });
});

describe("toKebabCase", () => {
  it("converts PascalCase to kebab-case", () => {
    expect(toKebabCase("ArrowDown")).toBe("arrow-down");
  });
  it("converts camelCase to kebab-case", () => {
    expect(toKebabCase("arrowDown")).toBe("arrow-down");
  });
  it("normalizes multiple hyphens", () => {
    expect(toKebabCase("arrow---down")).toBe("arrow-down");
  });
  it("removes leading and trailing hyphens", () => {
    expect(toKebabCase("-arrow-down-")).toBe("arrow-down");
  });
  it("handles mixed separators", () => {
    expect(toKebabCase("arrow_down_wide")).toBe("arrow-down-wide");
  });
});

describe("generateComponentName", () => {
  it("adds suffix when enabled and not present", () => {
    expect(generateComponentName("arrow-down", "Icon", true)).toBe("ArrowDownIcon");
  });
  it("does not duplicate suffix when already present", () => {
    expect(generateComponentName("ArrowDownIcon", "Icon", true)).toBe("ArrowDownIcon");
  });
  it("omits suffix when suffixEnabled is false", () => {
    expect(generateComponentName("arrow-down", "Icon", false)).toBe("ArrowDown");
  });
  it("uses custom suffix", () => {
    expect(generateComponentName("arrow", "Svg", true)).toBe("ArrowSvg");
  });
  it("defaults to Icon suffix", () => {
    expect(generateComponentName("arrow")).toBe("ArrowIcon");
  });
});

describe("generateFileName", () => {
  it("returns component name as-is for PascalCase", () => {
    expect(generateFileName("ArrowDownIcon", "PascalCase")).toBe("ArrowDownIcon");
  });
  it("returns camelCase for fileCase camelCase", () => {
    expect(generateFileName("ArrowDownIcon", "camelCase")).toBe("arrowDownIcon");
  });
  it("returns kebab-case for fileCase kebab-case", () => {
    expect(generateFileName("ArrowDownIcon", "kebab-case")).toBe("arrow-down-icon");
  });
  it("defaults to PascalCase", () => {
    expect(generateFileName("ArrowDownIcon")).toBe("ArrowDownIcon");
  });
});

describe("generateIconName", () => {
  it("returns PascalCase with suffix by default", () => {
    expect(generateIconName("arrow-down")).toBe("ArrowDownIcon");
  });
  it("returns camelCase with suffix", () => {
    expect(generateIconName("arrow-down", "Icon", "camelCase")).toBe("arrowDownIcon");
  });
  it("returns kebab-case with kebab suffix", () => {
    expect(generateIconName("arrow-down", "Icon", "kebab-case")).toBe("arrow-down-icon");
  });
  it("does not duplicate suffix", () => {
    expect(generateIconName("ArrowDownIcon", "Icon", "PascalCase")).toBe("ArrowDownIcon");
  });
  it("uses custom suffix", () => {
    expect(generateIconName("arrow", "Svg", "PascalCase")).toBe("ArrowSvg");
  });
});

describe("extractIconNameFromFilename", () => {
  it("strips .svg extension", () => {
    expect(extractIconNameFromFilename("arrow-down.svg")).toBe("arrow down");
  });
  it("replaces hyphens and underscores with spaces", () => {
    expect(extractIconNameFromFilename("arrow_down.svg")).toBe("arrow down");
  });
  it("is case-insensitive for .svg", () => {
    expect(extractIconNameFromFilename("icon.SVG")).toBe("icon");
  });
  it("handles filename without extension", () => {
    expect(extractIconNameFromFilename("arrow-down")).toBe("arrow down");
  });
});

describe("extractIconNameFromURL", () => {
  it("extracts name from valid SVG URL", () => {
    expect(extractIconNameFromURL("https://example.com/icons/arrow-down.svg")).toBe("arrow down");
  });
  it("returns null when path does not end with .svg", () => {
    expect(extractIconNameFromURL("https://example.com/icons/arrow-down")).toBe(null);
  });
  it("returns null for invalid URL", () => {
    expect(extractIconNameFromURL("not-a-url")).toBe(null);
  });
  it("returns null when path has no filename", () => {
    expect(extractIconNameFromURL("https://example.com/")).toBe(null);
  });
});

describe("extractLucideIconNameFromURL", () => {
  it("extracts name from Lucide icons URL without .svg", () => {
    expect(extractLucideIconNameFromURL("https://lucide.dev/icons/arrow-down-wide-narrow")).toBe(
      "arrow-down-wide-narrow"
    );
  });
  it("extracts name from Lucide icons URL with .svg", () => {
    expect(
      extractLucideIconNameFromURL("https://lucide.dev/icons/arrow-down-wide-narrow.svg")
    ).toBe("arrow-down-wide-narrow");
  });
  it("returns null for non-Lucide host", () => {
    expect(extractLucideIconNameFromURL("https://example.com/icons/arrow-down.svg")).toBe(null);
  });
  it("returns null for invalid path format", () => {
    expect(extractLucideIconNameFromURL("https://lucide.dev/other/path")).toBe(null);
  });
  it("returns null for invalid URL", () => {
    expect(extractLucideIconNameFromURL("not-a-url")).toBe(null);
  });
  it("returns null when icon name has invalid format", () => {
    expect(extractLucideIconNameFromURL("https://lucide.dev/icons/invalid.name")).toBe(null);
  });
});
