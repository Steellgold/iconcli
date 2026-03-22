import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/utils/logger";
import { toPascalCase } from "@/utils/naming";
import { generateComponent } from "@/core/component-generator";
import { writeComponentFile, writeMultiFrameworkComponents } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { trackGeneratedComponent } from "@/core/diff-checker";
import { optimizeSVG } from "@/core/svg-processor";
import type { Config } from "@/config/schema";
import { createInterface } from "readline";
import fs from "fs/promises";
import path from "path";

const AI_SYSTEM_PROMPT = `You are an expert SVG icon designer. Create clean, minimal SVG icons following these rules:

1. viewBox="0 0 24 24" for all icons
2. Use stroke-based design with stroke-width="1.5"
3. stroke="currentColor" for color inheritance
4. fill="none" unless specifically filled style
5. Round stroke-linecap="round" and stroke-linejoin="round" for friendly feel
6. Keep paths simple and optimized
7. No unnecessary groups, transforms, or metadata
8. xmlns="http://www.w3.org/2000/svg" attribute on the root svg element

CRITICAL: Output ONLY the raw SVG code. No markdown, no explanation, no code blocks.
Start directly with <svg and end directly with </svg>.`;

const STYLE_HINTS: Record<string, string> = {
  outline: "stroke-based, no fill, stroke-width 1.5, thin lines",
  solid: "filled shapes, fill=currentColor, no stroke",
  minimal: "very thin strokes, stroke-width 1, extremely simple paths",
  bold: "thick strokes, stroke-width 2.5, strong visual weight",
  duotone: "two-tone with main stroke and a subtle semi-transparent fill (opacity 0.2)",
};

interface AiOptions {
  projectRoot: string;
  config: Config;
  description?: string;
  model?: string;
  style?: string;
}

const MODELS: Record<string, string> = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
  best: "claude-opus-4-6",
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-6",
};

const resolveModel = (m: string | undefined): string =>
  MODELS[m?.toLowerCase() ?? "sonnet"] ?? m ?? MODELS["sonnet"];

const extractSvg = (text: string): string | null => {
  const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
  return svgMatch ? svgMatch[0].trim() : null;
};

const getApiKey = async (): Promise<string> => {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  // Check .env file
  try {
    const envFile = await fs.readFile(path.join(process.cwd(), ".env"), "utf-8");
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch { /* no .env */ }

  // Check global credentials
  const credsPath = path.join(process.env.HOME ?? process.env.USERPROFILE ?? "~", ".mkicon", "credentials");
  try {
    const creds = await fs.readFile(credsPath, "utf-8");
    const match = creds.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch { /* no creds */ }

  throw new Error("No ANTHROPIC_API_KEY found. Set it in your environment, .env file, or run mkicon ai --setup");
};

const saveApiKey = async (key: string): Promise<void> => {
  const dir = path.join(process.env.HOME ?? process.env.USERPROFILE ?? "~", ".mkicon");
  await fs.mkdir(dir, { recursive: true });
  const credsPath = path.join(dir, "credentials");
  await fs.writeFile(credsPath, `ANTHROPIC_API_KEY=${key}\n`, "utf-8");
};

export const runAi = async (options: AiOptions): Promise<void> => {
  const { projectRoot, config, style } = options;

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, ans => resolve(ans.trim())));

  // Setup mode
  if (process.argv.includes("--setup")) {
    logger.info("AI Icon Generator Setup");
    logger.newline();
    const key = await ask("Enter your Anthropic API key (sk-ant-...): ");
    if (!key.startsWith("sk-")) {
      logger.error("Invalid API key format.");
      rl.close();
      return;
    }
    const where = await ask("Save to global credentials? [Y/n]: ");
    if (where.toLowerCase() !== "n") {
      await saveApiKey(key);
      logger.success("API key saved to ~/.mkicon/credentials");
    } else {
      logger.print(`Export it manually: export ANTHROPIC_API_KEY="${key}"`);
    }
    rl.close();
    return;
  }

  // Get API key
  let apiKey: string;
  try {
    apiKey = await getApiKey();
  } catch (err) {
    logger.error(String(err));
    rl.close();
    return;
  }

  const client = new Anthropic({ apiKey });
  const modelId = resolveModel(options.model);
  const styleHint = style ? STYLE_HINTS[style] ?? style : STYLE_HINTS["outline"];

  logger.print(`\n✨ AI Icon Generator — ${modelId}`);
  logger.newline();

  // Get description
  let description = options.description;
  if (!description) {
    description = await ask("Icon description: ");
    if (!description) {
      logger.warning("No description provided.");
      rl.close();
      return;
    }
  }

  const messages: Anthropic.MessageParam[] = [];
  let currentSvg: string | null = null;
  let iterating = true;

  while (iterating) {
    const userMessage = messages.length === 0
      ? `Create an SVG icon: "${description}". Style: ${styleHint}.`
      : `Refine the icon based on this feedback: "${description}". Keep the same style.`;

    messages.push({ role: "user", content: userMessage });

    logger.info("Generating icon…");

    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: AI_SYSTEM_PROMPT,
        messages,
      });

      const text = response.content.map(b => b.type === "text" ? b.text : "").join("");
      messages.push({ role: "assistant", content: text });

      const svg = extractSvg(text);
      if (!svg) {
        logger.error("AI returned invalid SVG. Try again.");
        break;
      }

      currentSvg = svg;

      logger.success("Icon generated!");
      logger.newline();
      logger.print("─".repeat(40));
      logger.print("SVG preview:");
      logger.print(svg.slice(0, 300) + (svg.length > 300 ? "…" : ""));
      logger.print("─".repeat(40));
      logger.newline();

    } catch (err) {
      logger.error("Generation failed: " + String(err));
      break;
    }

    logger.print("[1] Looks good! Generate component");
    logger.print("[2] Modify the icon (describe changes)");
    logger.print("[3] Change style (outline/solid/minimal/bold/duotone)");
    logger.print("[4] Start over with new description");
    logger.print("[5] Show raw SVG code");
    logger.print("[6] Save SVG file only (no component)");
    logger.print("[7] Exit");
    logger.newline();

    const choice = await ask("Choice: ");

    switch (choice) {
      case "1": {
        // Generate component
        if (!currentSvg) break;
        let iconName = await ask("Component name (e.g. BellNotification): ");
        if (!iconName) iconName = toPascalCase(description.split(" ").slice(0, 3).join("-"));
        if (!iconName.endsWith("Icon")) iconName += "Icon";

        logger.info(`Generating component ${iconName}…`);
        try {
          const processed = await optimizeSVG(currentSvg, config.optimize);
          const components = await generateComponent({
            componentName: iconName,
            svgContent: processed.content,
            config,
            svgSourcePath: "ai-generated",
          });
          if (config.activeFrameworks.length === 1) {
            const comp = components[0];
            const { filePath } = await writeComponentFile({
              component: comp,
              projectRoot,
              config,
            });
            await updateIndexFile({ filePath, componentName: comp.componentName, projectRoot, config });
            await trackGeneratedComponent({ projectRoot, componentName: comp.componentName, filePath, svgContent: processed.content });
          } else {
            const paths = await writeMultiFrameworkComponents({ components, projectRoot, config });
            for (const p of paths) {
              await updateIndexFile({ filePath: p, componentName: components[0].componentName, projectRoot, config });
            }
            await trackGeneratedComponent({ projectRoot, componentName: iconName, filePath: paths[0], svgContent: processed.content });
          }
          logger.success(`${iconName} created!`);
        } catch (err) {
          logger.error("Component generation failed: " + String(err));
        }
        iterating = false;
        break;
      }

      case "2": {
        description = await ask("Describe the changes: ");
        break;
      }

      case "3": {
        const s = await ask("Style (outline/solid/minimal/bold/duotone): ");
        const hint = STYLE_HINTS[s] ?? s;
        messages.push({ role: "user", content: `Change the style to: ${hint}. Keep the same icon concept.` });
        const res2 = await client.messages.create({
          model: modelId,
          max_tokens: 1024,
          system: AI_SYSTEM_PROMPT,
          messages,
        });
        const text2 = res2.content.map(b => b.type === "text" ? b.text : "").join("");
        messages.push({ role: "assistant", content: text2 });
        const svg2 = extractSvg(text2);
        if (svg2) {
          currentSvg = svg2;
          logger.success("Style applied!");
          logger.print(svg2.slice(0, 200) + "…");
        }
        break;
      }

      case "4": {
        description = await ask("New icon description: ");
        messages.length = 0;
        currentSvg = null;
        break;
      }

      case "5": {
        logger.newline();
        logger.print(currentSvg ?? "(no SVG yet)");
        logger.newline();
        break;
      }

      case "6": {
        if (!currentSvg) break;
        const outPath = path.resolve(process.cwd(), `icon-${Date.now()}.svg`);
        await fs.writeFile(outPath, currentSvg, "utf-8");
        logger.success(`SVG saved: ${path.relative(process.cwd(), outPath)}`);
        iterating = false;
        break;
      }

      case "7":
      default:
        iterating = false;
        break;
    }
  }

  rl.close();
};
