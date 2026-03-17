import { describe, it, expect } from "vitest";
import { generateVueComponent, getVueFileExtension } from "./vue.js";
import type { Config } from "@/config/schema.js";

const defaultProps: Config["props"] = {
  size: true,
  color: true,
  className: true,
  style: false,
};

describe("generateVueComponent", () => {
  it("includes viewBox in template", () => {
    const out = generateVueComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      typescript: true,
      props: defaultProps,
    });
    expect(out).toContain('viewBox="0 0 24 24"');
  });

  it("injects inner SVG content", () => {
    const out = generateVueComponent({
      componentName: "ArrowIcon",
      svgContent: '<svg><path d="M1 1"/></svg>',
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });
    expect(out).toContain('<path d="M1 1"/>');
  });

  it('includes script setup with lang="ts" when typescript is true', () => {
    const out = generateVueComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: defaultProps,
    });
    expect(out).toContain('<script setup lang="ts">');
  });

  it('omits lang="ts" when typescript is false', () => {
    const out = generateVueComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });
    expect(out).toContain("<script setup>");
    expect(out).not.toContain('lang="ts"');
  });

  it("includes withDefaults when size or color enabled in TS", () => {
    const out = generateVueComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: true,
      props: { size: true, color: true, className: true, style: false },
    });
    expect(out).toContain("withDefaults");
    expect(out).toContain("size: 24");
    expect(out).toContain("color: 'currentColor'");
  });

  it("wraps template in <template> and script in <script setup>", () => {
    const out = generateVueComponent({
      componentName: "ArrowIcon",
      svgContent: "<svg></svg>",
      viewBox: "0 0 24 24",
      typescript: false,
      props: defaultProps,
    });
    expect(out).toMatch(/<template>/);
    expect(out).toMatch(/<script setup>/);
  });
});

describe("getVueFileExtension", () => {
  it("returns .vue", () => {
    expect(getVueFileExtension()).toBe(".vue");
  });
});
