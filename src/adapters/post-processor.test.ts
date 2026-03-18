import { describe, expect, it } from "vitest";

import { applyFormatting } from "./post-processor.js";
import { DEFAULT_FORMAT_CONFIG } from "./types.js";

describe("post-processor", () => {
  describe("applyFormatting", () => {
    const sampleCode = `export const Icon = ({ size = 24 }) => {
  return (
    <svg width={size} height={size}>
      <path d="M10 10" />
    </svg>
  );
};`;

    it("should preserve code when using default config", () => {
      const result = applyFormatting(sampleCode, DEFAULT_FORMAT_CONFIG, "react");
      expect(result).toContain("export const Icon");
      expect(result).toContain("size = 24");
    });

    it("should convert double quotes to single quotes", () => {
      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        quotes: "single" as const,
      };

      const result = applyFormatting(sampleCode, config, "react");
      expect(result).toContain("'M10 10'");
    });

    it("should convert spaces to tabs", () => {
      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        indentStyle: "tab" as const,
      };

      const result = applyFormatting(sampleCode, config, "react");
      expect(result).toContain("\treturn (");
    });

    it("should change indent size", () => {
      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        indentSize: 4,
      };

      const result = applyFormatting(sampleCode, config, "react");
      expect(result).toContain("    return ("); // 4 spaces
    });

    it("should remove semicolons when semi is false", () => {
      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        semi: false,
      };

      const result = applyFormatting(sampleCode, config, "react");
      expect(result).not.toMatch(/;\s*\n/);
      expect(result).not.toMatch(/;\s*\}/);
    });

    it("should remove trailing commas when trailingComma is none", () => {
      const codeWithComma = `const obj = {
  foo: "bar",
};`;

      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        trailingComma: "none" as const,
      };

      const result = applyFormatting(codeWithComma, config, "react");
      expect(result).not.toContain('"bar",');
      expect(result).toContain('"bar"');
    });

    it("should convert line endings to CRLF", () => {
      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        endOfLine: "crlf" as const,
      };

      const result = applyFormatting(sampleCode, config, "react");
      expect(result).toContain("\r\n");
    });

    it("should handle Vue framework", () => {
      const vueCode = `<template>
  <svg width="24">
    <path d="M10 10" />
  </svg>
</template>`;

      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        quotes: "single" as const,
      };

      const result = applyFormatting(vueCode, config, "vue");
      expect(result).toContain("'M10 10'");
    });

    it("should handle Svelte framework", () => {
      const svelteCode = `<script>
  export let size = 24;
</script>

<svg width={size}>
  <path d="M10 10" />
</svg>`;

      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        quotes: "single" as const,
      };

      const result = applyFormatting(svelteCode, config, "svelte");
      expect(result).toContain("'M10 10'");
    });

    it("should apply multiple formatting rules together", () => {
      const config = {
        ...DEFAULT_FORMAT_CONFIG,
        quotes: "single" as const,
        semi: false,
        indentSize: 4,
        trailingComma: "none" as const,
      };

      const result = applyFormatting(sampleCode, config, "react");
      expect(result).toContain("'M10 10'"); // single quotes
      expect(result).not.toMatch(/;\s*\n/); // no semicolons
      expect(result).toContain("    return ("); // 4 spaces
    });
  });
});
