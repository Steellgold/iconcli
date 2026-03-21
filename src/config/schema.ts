import { z } from "zod";

export const ConfigSchema = z.object({
  version: z.string().default("1.0.0"),
  baseDir: z.string(),
  iconsFolder: z.string().default("icons"),
  framework: z.enum(["react", "react-native", "vue", "svelte"]),
  typescript: z.boolean().default(true),
  optimize: z.boolean().default(true),
  maintainIndex: z.boolean().default(true),
  props: z
    .object({
      size: z.boolean().default(true),
      color: z.boolean().default(true),
      className: z.boolean().default(true),
      style: z.boolean().default(false),
      strokeWidth: z.boolean().default(false),
    })
    .default({
      size: true,
      color: true,
      className: true,
      style: false,
      strokeWidth: false,
    }),
  naming: z
    .object({
      suffix: z.string().default("Icon"),
      suffixEnabled: z.boolean().default(true),
      componentCase: z.enum(["PascalCase", "camelCase"]).default("PascalCase"),
      fileCase: z.enum(["PascalCase", "kebab-case", "camelCase"]).default("PascalCase"),
    })
    .default({
      suffix: "Icon",
      suffixEnabled: true,
      componentCase: "PascalCase",
      fileCase: "PascalCase",
    }),
  svgo: z
    .object({
      plugins: z.array(z.string()).optional(),
    })
    .optional(),
  adaptToProject: z.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;
export type PropsConfig = Config["props"];

export const PartialConfigSchema = ConfigSchema.partial();
export type PartialConfig = z.infer<typeof PartialConfigSchema>;
