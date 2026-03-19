import { describe, it, expect } from "vitest";
import { ConfigSchema, PartialConfigSchema } from "./schema";

describe("ConfigSchema", () => {
  it("parses valid minimal config", () => {
    const result = ConfigSchema.parse({
      baseDir: "/project",
      framework: "react",
    });
    expect(result.baseDir).toBe("/project");
    expect(result.framework).toBe("react");
    expect(result.version).toBe("1.0.0");
    expect(result.iconsFolder).toBe("icons");
    expect(result.typescript).toBe(true);
    expect(result.optimize).toBe(true);
    expect(result.maintainIndex).toBe(true);
  });

  it("applies default props", () => {
    const result = ConfigSchema.parse({ baseDir: ".", framework: "vue" });
    expect(result.props).toEqual({
      size: true,
      color: true,
      className: true,
      style: false,
    });
  });

  it("applies default naming", () => {
    const result = ConfigSchema.parse({ baseDir: ".", framework: "svelte" });
    expect(result.naming).toEqual({
      suffix: "Icon",
      suffixEnabled: true,
      componentCase: "PascalCase",
      fileCase: "PascalCase",
    });
  });

  it("accepts all framework values", () => {
    expect(ConfigSchema.parse({ baseDir: ".", framework: "react" }).framework).toBe("react");
    expect(ConfigSchema.parse({ baseDir: ".", framework: "vue" }).framework).toBe("vue");
    expect(ConfigSchema.parse({ baseDir: ".", framework: "svelte" }).framework).toBe("svelte");
  });

  it("rejects invalid framework", () => {
    expect(() => ConfigSchema.parse({ baseDir: ".", framework: "angular" })).toThrow();
  });

  it("accepts valid naming.fileCase", () => {
    const result = ConfigSchema.parse({
      baseDir: ".",
      framework: "react",
      naming: { fileCase: "kebab-case" },
    });
    expect(result.naming?.fileCase).toBe("kebab-case");
  });

  it("accepts optional svgo", () => {
    const result = ConfigSchema.parse({
      baseDir: ".",
      framework: "react",
      svgo: { plugins: ["somePlugin"] },
    });
    expect(result.svgo?.plugins).toEqual(["somePlugin"]);
  });
});

describe("PartialConfigSchema", () => {
  it("allows partial config", () => {
    const result = PartialConfigSchema.parse({ framework: "react" });
    expect(result.framework).toBe("react");
    expect(result.baseDir).toBeUndefined();
  });
});
