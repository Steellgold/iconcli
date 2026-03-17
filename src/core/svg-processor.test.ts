import { describe, it, expect } from "vitest";
import { optimizeSVG, cleanSVGAttributes } from "./svg-processor.js";

describe("cleanSVGAttributes", () => {
  it("removes width attribute", () => {
    const svg = '<svg width="24" viewBox="0 0 24 24"><path/></svg>';
    expect(cleanSVGAttributes(svg)).not.toContain('width="24"');
    expect(cleanSVGAttributes(svg)).toContain('viewBox="0 0 24 24"');
  });

  it("removes height attribute", () => {
    const svg = '<svg height="24" viewBox="0 0 24 24"><path/></svg>';
    expect(cleanSVGAttributes(svg)).not.toContain('height="24"');
    expect(cleanSVGAttributes(svg)).toContain('viewBox="0 0 24 24"');
  });

  it("removes both width and height", () => {
    const svg = '<svg width="24" height="24" viewBox="0 0 24 24"><path/></svg>';
    const out = cleanSVGAttributes(svg);
    expect(out).not.toMatch(/width=["'][^"']*["']/i);
    expect(out).not.toMatch(/height=["'][^"']*["']/i);
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it("preserves other attributes", () => {
    const svg =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="icon"><path/></svg>';
    const out = cleanSVGAttributes(svg);
    expect(out).toContain('viewBox="0 0 24 24"');
    expect(out).toContain('fill="none"');
    expect(out).toContain('class="icon"');
  });

  it("is case-insensitive for width/height", () => {
    const svg = '<svg WIDTH="24" HEIGHT="24"><path/></svg>';
    const out = cleanSVGAttributes(svg);
    expect(out).not.toMatch(/width/i);
    expect(out).not.toMatch(/height/i);
  });
});

describe("optimizeSVG", () => {
  const minimalSvg = '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>';

  it("returns content and viewBox when shouldOptimize is false", async () => {
    const result = await optimizeSVG(minimalSvg, false);
    expect(result.content).toBe(minimalSvg);
    expect(result.viewBox).toBe("0 0 24 24");
    expect(result.originalSize).toBe(result.optimizedSize);
  });

  it("uses default viewBox when missing and shouldOptimize is false", async () => {
    const noViewBox = "<svg><path/></svg>";
    const result = await optimizeSVG(noViewBox, false);
    expect(result.viewBox).toBe("0 0 24 24");
  });

  it("returns optimized content when shouldOptimize is true", async () => {
    const result = await optimizeSVG(minimalSvg, true);
    expect(result.content).toBeDefined();
    expect(result.viewBox).toBe("0 0 24 24");
    expect(result.originalSize).toBeGreaterThanOrEqual(0);
    expect(result.optimizedSize).toBeGreaterThanOrEqual(0);
  });

  it("defaults shouldOptimize to true", async () => {
    const result = await optimizeSVG(minimalSvg);
    expect(result.content).toBeDefined();
    expect(result.viewBox).toBeDefined();
  });
});
