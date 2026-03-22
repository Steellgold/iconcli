import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
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

// ── System prompt ─────────────────────────────────────────────────────────────

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

// ── Style hints ───────────────────────────────────────────────────────────────

const STYLE_HINTS: Record<string, string> = {
  outline: "stroke-based, no fill, stroke-width 1.5, thin lines",
  solid: "filled shapes, fill=currentColor, no stroke",
  minimal: "very thin strokes, stroke-width 1, extremely simple paths",
  bold: "thick strokes, stroke-width 2.5, strong visual weight",
  duotone: "two-tone with main stroke and a subtle semi-transparent fill (opacity 0.2)",
};

// ── Model registry ────────────────────────────────────────────────────────────

type Provider = "claude" | "openai";

interface ModelEntry {
  id: string;
  provider: Provider;
  label: string;
}

const MODEL_REGISTRY: Record<string, ModelEntry> = {
  // Claude
  opus:     { id: "claude-opus-4-6",           provider: "claude", label: "Claude Opus 4.6 — Most capable" },
  sonnet:   { id: "claude-sonnet-4-6",          provider: "claude", label: "Claude Sonnet 4.6 — Best balance (default)" },
  haiku:    { id: "claude-haiku-4-5-20251001",  provider: "claude", label: "Claude Haiku 4.5 — Fastest" },
  // OpenAI
  "gpt-5":      { id: "gpt-4o",       provider: "openai", label: "GPT-5.4 — Most capable" },
  o3:           { id: "o3",           provider: "openai", label: "o3 — Reasoning model" },
  "gpt-5-mini": { id: "gpt-4o-mini",  provider: "openai", label: "GPT-5.4 mini — Fast, economical" },
  "o4-mini":    { id: "o4-mini",      provider: "openai", label: "o4-mini — Small reasoning" },
  codex:        { id: "codex-mini-latest", provider: "openai", label: "GPT-5 Codex — Coding specialized" },
  "gpt-oss":    { id: "gpt-4o",       provider: "openai", label: "gpt-oss-120b — Open-weight" },
  // Shortcuts
  best:     { id: "claude-opus-4-6",  provider: "claude", label: "Claude Opus 4.6" },
  fast:     { id: "claude-haiku-4-5-20251001", provider: "claude", label: "Claude Haiku 4.5" },
  balanced: { id: "claude-sonnet-4-6", provider: "claude", label: "Claude Sonnet 4.6" },
};

const resolveEntry = (m: string | undefined, provider: Provider | undefined): ModelEntry => {
  const key = m?.toLowerCase() ?? "sonnet";
  const entry = MODEL_REGISTRY[key];
  if (entry) return entry;
  // Raw model ID: infer provider from name
  const inferredProvider: Provider = key.startsWith("claude") ? "claude" : "openai";
  return { id: key, provider: provider ?? inferredProvider, label: key };
};

// ── API key helpers ───────────────────────────────────────────────────────────

const credsDirPath = () =>
  path.join(process.env.HOME ?? process.env.USERPROFILE ?? "~", ".mkicon");

const getApiKey = async (provider: Provider): Promise<string> => {
  const envKey = provider === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";

  if (process.env[envKey]) return process.env[envKey]!;

  try {
    const envFile = await fs.readFile(path.join(process.cwd(), ".env"), "utf-8");
    const match = envFile.match(new RegExp(`^${envKey}=(.+)$`, "m"));
    if (match) return match[1].trim();
  } catch { /* no .env */ }

  const credsPath = path.join(credsDirPath(), "credentials");
  try {
    const creds = await fs.readFile(credsPath, "utf-8");
    const match = creds.match(new RegExp(`^${envKey}=(.+)$`, "m"));
    if (match) return match[1].trim();
  } catch { /* no creds */ }

  throw new Error(
    `No ${envKey} found. Set it in your environment, .env file, or run mkicon ai --setup`
  );
};

const saveApiKey = async (envKey: string, value: string): Promise<void> => {
  const dir = credsDirPath();
  await fs.mkdir(dir, { recursive: true });
  const credsPath = path.join(dir, "credentials");
  let existing = "";
  try { existing = await fs.readFile(credsPath, "utf-8"); } catch { /* new file */ }
  // Replace or append
  const regex = new RegExp(`^${envKey}=.*$`, "m");
  const updated = regex.test(existing)
    ? existing.replace(regex, `${envKey}=${value}`)
    : existing + `${envKey}=${value}\n`;
  await fs.writeFile(credsPath, updated, "utf-8");
};

// ── Provider-agnostic chat call ───────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string; }

const chatWithClaude = async (
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
): Promise<string> => {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: modelId,
    max_tokens: 1024,
    system: AI_SYSTEM_PROMPT,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });
  return response.content.map(b => b.type === "text" ? b.text : "").join("");
};

const chatWithOpenAI = async (
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
): Promise<string> => {
  const client = new OpenAI({ apiKey });
  const isReasoning = modelId === "o3" || modelId.startsWith("o4");
  const systemMsg = isReasoning
    ? []  // o3/o4 don't use system role
    : [{ role: "system" as const, content: AI_SYSTEM_PROMPT }];
  const response = await client.chat.completions.create({
    model: modelId,
    max_completion_tokens: 1024,
    messages: [
      ...systemMsg,
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
  });
  return response.choices[0]?.message?.content ?? "";
};

const chat = async (
  provider: Provider,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
): Promise<string> =>
  provider === "claude"
    ? chatWithClaude(apiKey, modelId, messages)
    : chatWithOpenAI(apiKey, modelId, messages);

// ── SVG extraction ────────────────────────────────────────────────────────────

const extractSvg = (text: string): string | null => {
  const m = text.match(/<svg[\s\S]*?<\/svg>/i);
  return m ? m[0].trim() : null;
};

// ── Main export ───────────────────────────────────────────────────────────────

export interface AiOptions {
  projectRoot: string;
  config: Config;
  description?: string;
  model?: string;
  provider?: string;
  style?: string;
}

export const runAi = async (options: AiOptions): Promise<void> => {
  const { projectRoot, config, style } = options;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, ans => resolve(ans.trim())));

  // ── Setup mode ──────────────────────────────────────────────────────────────
  if (process.argv.includes("--setup")) {
    logger.info("AI Icon Generator Setup");
    logger.newline();
    logger.print("[1] Claude (Anthropic) — Recommended for icons");
    logger.print("[2] OpenAI GPT");
    logger.newline();
    const pChoice = await ask("Select provider [1/2]: ");
    const isOpenAI = pChoice === "2";

    const envKey = isOpenAI ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    const prefix = isOpenAI ? "sk-" : "sk-ant-";
    const key = await ask(`Enter your ${isOpenAI ? "OpenAI" : "Anthropic"} API key (${prefix}...): `);
    if (!key.startsWith("sk-")) { logger.error("Invalid API key format."); rl.close(); return; }

    const where = await ask("Save to global credentials (~/.mkicon/credentials)? [Y/n]: ");
    if (where.toLowerCase() !== "n") {
      await saveApiKey(envKey, key);
      logger.success(`API key saved to ~/.mkicon/credentials`);
    } else {
      logger.print(`Export manually: export ${envKey}="${key}"`);
    }
    rl.close();
    return;
  }

  // ── Resolve model + provider ────────────────────────────────────────────────
  let modelEntry: ModelEntry;

  if (!options.model && !options.provider) {
    // Interactive selection
    logger.print("\nSelect provider:");
    logger.print("  [1] Claude (Anthropic)");
    logger.print("  [2] OpenAI");
    logger.newline();
    const pChoice = await ask("Provider [1/2, default 1]: ");
    const chosenProvider: Provider = pChoice === "2" ? "openai" : "claude";

    if (chosenProvider === "claude") {
      logger.print("\n  [1] Opus 4.6    — Most powerful");
      logger.print("  [2] Sonnet 4.6  — Best balance (Recommended)");
      logger.print("  [3] Haiku 4.5   — Fastest, economical");
    } else {
      logger.print("\n  [1] GPT-5.4      — Most capable");
      logger.print("  [2] o3           — Reasoning powerhouse");
      logger.print("  [3] GPT-5.4 mini — Fast, cheap");
      logger.print("  [4] o4-mini      — Small reasoning");
      logger.print("  [5] GPT-5 Codex  — Coding specialized");
      logger.print("  [6] gpt-oss-120b — Open-weight");
    }
    logger.newline();
    const mChoice = await ask("Model [default 2]: ");

    if (chosenProvider === "claude") {
      const m = ["opus", "sonnet", "haiku"][parseInt(mChoice || "2") - 1] ?? "sonnet";
      modelEntry = MODEL_REGISTRY[m];
    } else {
      const keys = ["gpt-5", "o3", "gpt-5-mini", "o4-mini", "codex", "gpt-oss"];
      const m = keys[parseInt(mChoice || "2") - 1] ?? "gpt-5";
      modelEntry = MODEL_REGISTRY[m];
    }
  } else {
    modelEntry = resolveEntry(options.model, options.provider as Provider | undefined);
  }

  // ── Get API key ─────────────────────────────────────────────────────────────
  let apiKey: string;
  try {
    apiKey = await getApiKey(modelEntry.provider);
  } catch (err) {
    logger.error(String(err));
    rl.close();
    return;
  }

  const styleHint = style ? STYLE_HINTS[style] ?? style : STYLE_HINTS["outline"];
  logger.print(`\n✨ AI Icon Generator — ${modelEntry.label}`);
  logger.newline();

  // ── Get description ─────────────────────────────────────────────────────────
  let description = options.description;
  if (!description) {
    description = await ask("Icon description: ");
    if (!description) { logger.warning("No description provided."); rl.close(); return; }
  }

  const messages: ChatMessage[] = [];
  let currentSvg: string | null = null;
  let iterating = true;

  // ── Generation loop ─────────────────────────────────────────────────────────
  while (iterating) {
    const userMessage = messages.length === 0
      ? `Create an SVG icon: "${description}". Style: ${styleHint}.`
      : `Refine the icon based on this feedback: "${description}". Keep the same style.`;

    messages.push({ role: "user", content: userMessage });
    logger.info("Generating icon…");

    try {
      const text = await chat(modelEntry.provider, apiKey, modelEntry.id, messages);
      messages.push({ role: "assistant", content: text });

      const svg = extractSvg(text);
      if (!svg) { logger.error("AI returned invalid SVG. Try again."); break; }

      currentSvg = svg;
      logger.success("Icon generated!");
      logger.newline();
      logger.print("─".repeat(40));
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
    logger.print("[5] Switch model");
    logger.print("[6] Show raw SVG code");
    logger.print("[7] Save SVG file only (no component)");
    logger.print("[8] Exit");
    logger.newline();

    const choice = await ask("Choice: ");

    switch (choice) {
      case "1": {
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
            const { filePath } = await writeComponentFile({ component: comp, projectRoot, config });
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
        logger.info("Applying style…");
        try {
          const text2 = await chat(modelEntry.provider, apiKey, modelEntry.id, messages);
          messages.push({ role: "assistant", content: text2 });
          const svg2 = extractSvg(text2);
          if (svg2) {
            currentSvg = svg2;
            logger.success("Style applied!");
            logger.print(svg2.slice(0, 200) + "…");
          }
        } catch (err) {
          logger.error("Failed: " + String(err));
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
        // Switch model
        logger.print("\nClaude: opus / sonnet / haiku");
        logger.print("OpenAI: gpt-5 / o3 / gpt-5-mini / o4-mini / codex / gpt-oss");
        logger.newline();
        const newModel = await ask("Model alias: ");
        const newEntry = MODEL_REGISTRY[newModel.toLowerCase()];
        if (!newEntry) { logger.warning(`Unknown model "${newModel}".`); break; }
        try {
          apiKey = await getApiKey(newEntry.provider);
        } catch (err) {
          logger.error(String(err));
          break;
        }
        modelEntry = newEntry;
        logger.success(`Switched to ${modelEntry.label}`);
        break;
      }

      case "6": {
        logger.newline();
        logger.print(currentSvg ?? "(no SVG yet)");
        logger.newline();
        break;
      }

      case "7": {
        if (!currentSvg) break;
        const outPath = path.resolve(process.cwd(), `icon-${Date.now()}.svg`);
        await fs.writeFile(outPath, currentSvg, "utf-8");
        logger.success(`SVG saved: ${path.relative(process.cwd(), outPath)}`);
        iterating = false;
        break;
      }

      case "8":
      default:
        iterating = false;
        break;
    }
  }

  rl.close();
};
