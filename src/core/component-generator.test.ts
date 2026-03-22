import { describe, it, expect } from "vitest";
import { generateComponent, generateComponents } from "./component-generator";
import type { Config } from "@/config/schema";

const baseConfig = (framework: Config["framework"]): Config =>
  ({
    version: "1.0.0",
    baseDir: ".",
    iconsFolder: "icons",
    framework,
    typescript: true,
    optimize: true,
    maintainIndex: true,
    adaptToProject: false,
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
  it("routes to React template and returns .tsx when framework is react and typescript", async () => {
    const config = baseConfig("react");
    const result = await generateComponent({
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

  it("routes to React Native template when framework is react-native", async () => {
    const config = baseConfig("react-native");
    const result = await generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.extension).toBe(".tsx");
    expect(result.filename).toBe("ArrowIcon.tsx");
    expect(result.content).toContain("import { Svg");
    expect(result.content).toContain("<Svg");
  });

  it("routes to Vue template and returns .vue when framework is vue", async () => {
    const config = baseConfig("vue");
    const result = await generateComponent({
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

  it("routes to Svelte template and returns .svelte when framework is svelte", async () => {
    const config = baseConfig("svelte");
    const result = await generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.extension).toBe(".svelte");
    expect(result.filename).toBe("ArrowIcon.svelte");
    expect(result.content).toContain('viewBox="0 0 24 24"');
  });

  it("passes cleaned SVG to template (no width/height)", async () => {
    const config = baseConfig("react");
    const svgWithDimensions = '<svg width="48" height="48" viewBox="0 0 24 24"><path/></svg>';
    const result = await generateComponent({
      componentName: "ArrowIcon",
      svgContent: svgWithDimensions,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.content).not.toContain('width="48"');
    expect(result.content).not.toContain('height="48"');
  });

  it("applies formatting when adaptToProject is true", async () => {
    const config = { ...baseConfig("react"), adaptToProject: true };
    const result = await generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.content).toContain("ArrowIcon");
    expect(result.extension).toBe(".tsx");
  });

  it("throws for unsupported framework", async () => {
    const config = { ...baseConfig("react"), framework: "ember" } as unknown as Config;
    await expect(
      generateComponent({
        componentName: "ArrowIcon",
        svgContent: minimalSvg,
        viewBox: "0 0 24 24",
        config,
      })
    ).rejects.toThrow(/Unsupported framework/);
  });

  it("routes to Angular template when framework is angular", async () => {
    const config = baseConfig("angular");
    const result = await generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.extension).toBe(".component.ts");
    expect(result.content).toContain("@Component");
    expect(result.content).toContain("export class ArrowIconComponent");
  });

  it("routes to Web Components template when framework is webcomponents", async () => {
    const config = baseConfig("webcomponents");
    const result = await generateComponent({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(result.extension).toBe(".ts");
    expect(result.content).toContain("LitElement");
    expect(result.content).toContain("export class ArrowIcon extends LitElement");
  });
});

describe("generateComponents", () => {
  it("generates one component per framework when frameworks array is set", async () => {
    const config: Config = {
      ...baseConfig("react"),
      frameworks: ["react", "vue"],
    };
    const results = await generateComponents({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(results).toHaveLength(2);
    const frameworks = results.map((r) => r.framework);
    expect(frameworks).toContain("react");
    expect(frameworks).toContain("vue");
    const reactResult = results.find((r) => r.framework === "react");
    const vueResult = results.find((r) => r.framework === "vue");
    expect(reactResult?.extension).toBe(".tsx");
    expect(vueResult?.extension).toBe(".vue");
  });

  it("falls back to single framework when frameworks is not set", async () => {
    const config = baseConfig("react");
    const results = await generateComponents({
      componentName: "ArrowIcon",
      svgContent: minimalSvg,
      viewBox: "0 0 24 24",
      config,
    });
    expect(results).toHaveLength(1);
    expect(results[0].framework).toBe("react");
  });
});
