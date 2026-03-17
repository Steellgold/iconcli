import { describe, it, expect } from "vitest";
import { generateComponent } from "./component-generator.js";
import type { Config } from "@/config/schema.js";

const baseConfig = (framework: Config["framework"]): Config =>
  ({
    version: "1.0.0",
    baseDir: ".",
    iconsFolder: "icons",
    framework,
    typescript: true,
    optimize: true,
    maintainIndex: true,
    props: { size: true, color: true, className: true, style: false },
    naming: {
      suffix: "Icon",
      suffixEnabled: true,
      componentCase: "PascalCase",
      fileCase: "PascalCase",
    },
  }) as Config;

const minimalSvg = '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>';

describe("generateComponent", () => {
  it("routes to React template and returns .tsx when framework is react and typescript", () => {
    const config = baseConfig("react");
    const result = generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.extension).toBe(".tsx");
    expect(result.filename).toBe("ArrowIcon.tsx");
    expect(result.content).toContain("export const ArrowIcon =");
    expect(result.content).toContain('viewBox="0 0 24 24"');
  });

  it("routes to Vue template and returns .vue when framework is vue", () => {
    const config = baseConfig("vue");
    const result = generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.extension).toBe(".vue");
    expect(result.filename).toBe("ArrowIcon.vue");
    expect(result.content).toContain("<template>");
    expect(result.content).toContain('viewBox="0 0 24 24"');
  });

  it("routes to Svelte template and returns .svelte when framework is svelte", () => {
    const config = baseConfig("svelte");
    const result = generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.extension).toBe(".svelte");
    expect(result.filename).toBe("ArrowIcon.svelte");
    expect(result.content).toContain('viewBox="0 0 24 24"');
  });

  it("passes cleaned SVG to template (no width/height)", () => {
    const config = baseConfig("react");
    const svgWithDimensions = '<svg width="48" height="48" viewBox="0 0 24 24"><path/></svg>';
    const result = generateComponent({
      componentName: "ArrowIcon",
      svgContent: svgWithDimensions,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.content).not.toContain('width="48"');
    expect(result.content).not.toContain('height="48"');
  });

  it("throws for unsupported framework", () => {
    const config = { ...baseConfig("react"), framework: "angular" } as unknown as Config;
    expect(() =>
      generateComponent({
        componentName: "ArrowIcon",
        svgContent: minimalSvg,
        viewBox: "0 0 24 24",
        config,
      })
    ).toThrow(/Unsupported framework/);
  });
});
