import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import enquirer from "enquirer";
import { logger } from "@/utils/logger";
import { toPascalCase } from "@/utils/naming";
import { generateComponent } from "@/core/component-generator";
import { writeComponentFile, writeMultiFrameworkComponents } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { trackGeneratedComponent } from "@/core/diff-checker";
import { optimizeSVG } from "@/core/svg-processor";
import type { Config } from "@/config/schema";
import fs from "fs/promises";
import path from "path";

const { prompt } = enquirer;

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
  outline:  "stroke-based, no fill, stroke-width 1.5, thin lines",
  solid:    "filled shapes, fill=currentColor, no stroke",
  minimal:  "very thin strokes, stroke-width 1, extremely simple paths",
  bold:     "thick strokes, stroke-width 2.5, strong visual weight",
  duotone:  "two-tone with main stroke and subtle semi-transparent fill (opacity 0.2)",
};

// ── Model registry ────────────────────────────────────────────────────────────

type Provider = "claude" | "openai";

interface ModelEntry {
  id: string;
  provider: Provider;
  label: string;
  alias: string;
}

const CLAUDE_MODELS: ModelEntry[] = [
  { alias: "opus",    id: "claude-opus-4-6",          provider: "claude", label: "Opus 4.6    — Most powerful" },
  { alias: "sonnet",  id: "claude-sonnet-4-6",         provider: "claude", label: "Sonnet 4.6  — Best balance (Recommended)" },
  { alias: "haiku",   id: "claude-haiku-4-5-20251001", provider: "claude", label: "Haiku 4.5   — Fastest, economical" },
];

const OPENAI_MODELS: ModelEntry[] = [
  { alias: "gpt-5",      id: "gpt-4o",            provider: "openai", label: "GPT-5.4      — Most capable" },
  { alias: "o3",         id: "o3",                 provider: "openai", label: "o3           — Reasoning powerhouse" },
  { alias: "gpt-5-mini", id: "gpt-4o-mini",        provider: "openai", label: "GPT-5.4 mini — Fast, cheap" },
  { alias: "o4-mini",    id: "o4-mini",             provider: "openai", label: "o4-mini      — Small reasoning" },
  { alias: "codex",      id: "codex-mini-latest",   provider: "openai", label: "GPT-5 Codex  — Coding specialized" },
  { alias: "gpt-oss",    id: "gpt-4o",              provider: "openai", label: "gpt-oss-120b — Open-weight" },
];

const ALL_MODELS = [...CLAUDE_MODELS, ...OPENAI_MODELS];

const findModel = (alias: string): ModelEntry | undefined =>
  ALL_MODELS.find(m => m.alias === alias.toLowerCase());

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

  throw new Error(`No ${envKey} found. Run: mkicon ai --setup`);
};

const saveApiKey = async (envKey: string, value: string): Promise<void> => {
  const dir = credsDirPath();
  await fs.mkdir(dir, { recursive: true });
  const credsPath = path.join(dir, "credentials");
  let existing = "";
  try { existing = await fs.readFile(credsPath, "utf-8"); } catch { /* new */ }
  const regex = new RegExp(`^${envKey}=.*$`, "m");
  const updated = regex.test(existing)
    ? existing.replace(regex, `${envKey}=${value}`)
    : existing + `${envKey}=${value}\n`;
  await fs.writeFile(credsPath, updated, "utf-8");
};

// ── Provider-agnostic chat ────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string; }

const chatWithClaude = async (apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> => {
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: modelId, max_tokens: 1024, system: AI_SYSTEM_PROMPT,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });
  return res.content.map(b => b.type === "text" ? b.text : "").join("");
};

const chatWithOpenAI = async (apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> => {
  const client = new OpenAI({ apiKey });
  const isReasoning = modelId === "o3" || modelId.startsWith("o4");
  const systemMsgs = isReasoning ? [] : [{ role: "system" as const, content: AI_SYSTEM_PROMPT }];
  const res = await client.chat.completions.create({
    model: modelId, max_completion_tokens: 1024,
    messages: [...systemMsgs, ...messages.map(m => ({ role: m.role, content: m.content }))],
  });
  return res.choices[0]?.message?.content ?? "";
};

const chat = (provider: Provider, apiKey: string, modelId: string, messages: ChatMessage[]) =>
  provider === "claude"
    ? chatWithClaude(apiKey, modelId, messages)
    : chatWithOpenAI(apiKey, modelId, messages);

const extractSvg = (text: string): string | null => {
  const m = text.match(/<svg[\s\S]*?<\/svg>/i);
  return m ? m[0].trim() : null;
};

// ── Generate + save component ─────────────────────────────────────────────────

const saveComponent = async (svg: string, componentName: string, projectRoot: string, config: Config) => {
  const processed = await optimizeSVG(svg, config.optimize);
  const components = await generateComponent({
    componentName, svgContent: processed.content, config, svgSourcePath: "ai-generated",
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
    await trackGeneratedComponent({ projectRoot, componentName, filePath: paths[0], svgContent: processed.content });
  }
};

// ── Setup flow ────────────────────────────────────────────────────────────────

const runSetup = async () => {
  logger.info("AI Icon Generator — Setup");
  logger.newline();

  const { provider } = await prompt<{ provider: Provider }>({
    type: "select",
    name: "provider",
    message: "Select your AI provider:",
    choices: [
      { name: "claude", message: "Claude (Anthropic) — Recommended for icons" },
      { name: "openai", message: "OpenAI GPT" },
    ],
  });

  const envKey = provider === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  const hint   = provider === "claude" ? "sk-ant-..." : "sk-...";

  const { apiKey } = await prompt<{ apiKey: string }>({
    type: "input",
    name: "apiKey",
    message: `Enter your ${provider === "claude" ? "Anthropic" : "OpenAI"} API key:`,
    hint,
    validate: (v: string) => v.trim().startsWith("sk-") ? true : "Key must start with sk-",
  } as never);

  const { saveGlobal } = await prompt<{ saveGlobal: boolean }>({
    type: "confirm",
    name: "saveGlobal",
    message: "Save to global credentials (~/.mkicon/credentials)?",
    initial: true,
  });

  if (saveGlobal) {
    await saveApiKey(envKey, apiKey.trim());
    logger.success(`API key saved to ~/.mkicon/credentials`);
  } else {
    logger.print(`Export manually: export ${envKey}="${apiKey.trim()}"`);
  }
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
  if (process.argv.includes("--setup")) {
    await runSetup();
    return;
  }

  // ── Resolve model entry ─────────────────────────────────────────────────────
  let modelEntry: ModelEntry;

  if (options.model) {
    const found = findModel(options.model);
    if (!found) {
      logger.error(`Unknown model "${options.model}". Valid: ${ALL_MODELS.map(m => m.alias).join(", ")}`);
      return;
    }
    modelEntry = found;
  } else {
    // Interactive: pick provider then model
    const { provider } = await prompt<{ provider: Provider }>({
      type: "select",
      name: "provider",
      message: "Select AI provider:",
      choices: [
        { name: "claude", message: "Claude (Anthropic)" },
        { name: "openai", message: "OpenAI" },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const models = provider === "claude" ? CLAUDE_MODELS : OPENAI_MODELS;
    const { modelAlias } = await prompt<{ modelAlias: string }>({
      type: "select",
      name: "modelAlias",
      message: "Select model:",
      choices: models.map(m => ({ name: m.alias, message: m.label })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    modelEntry = models.find(m => m.alias === modelAlias)!;
  }

  // ── Get API key ─────────────────────────────────────────────────────────────
  let apiKey: string;
  try {
    apiKey = await getApiKey(modelEntry.provider);
  } catch (err) {
    logger.error(String(err));
    return;
  }

  // ── Style ───────────────────────────────────────────────────────────────────
  let styleHint = options.style ? STYLE_HINTS[options.style] ?? options.style : STYLE_HINTS["outline"];

  logger.print(`\n✨ AI Icon Generator — ${modelEntry.label.trim()}`);
  logger.newline();

  // ── Description ─────────────────────────────────────────────────────────────
  let { description } = options.description
    ? { description: options.description }
    : await prompt<{ description: string }>({
        type: "input",
        name: "description",
        message: "Describe the icon:",
        hint: "e.g. a bell with a notification dot",
        validate: (v: string) => v.trim() ? true : "Description cannot be empty",
      } as never);

  const messages: ChatMessage[] = [];
  let currentSvg: string | null = null;
  let iterating = true;

  // ── Generation loop ─────────────────────────────────────────────────────────
  while (iterating) {
    const userMsg = messages.length === 0
      ? `Create an SVG icon: "${description}". Style: ${styleHint}.`
      : `Refine the icon: "${description}". Keep same style.`;

    messages.push({ role: "user", content: userMsg });
    logger.info("Generating…");

    try {
      const text = await chat(modelEntry.provider, apiKey, modelEntry.id, messages);
      messages.push({ role: "assistant", content: text });
      const svg = extractSvg(text);
      if (!svg) { logger.error("AI returned no valid SVG."); break; }
      currentSvg = svg;

      logger.success("Done!");
      logger.newline();
      logger.print("─".repeat(48));
      logger.print(svg.slice(0, 320) + (svg.length > 320 ? "…" : ""));
      logger.print("─".repeat(48));
      logger.newline();
    } catch (err) {
      logger.error("Generation failed: " + String(err));
      break;
    }

    const { action } = await prompt<{ action: string }>({
      type: "select",
      name: "action",
      message: "What do you want to do?",
      choices: [
        { name: "accept",   message: "✓  Looks good — generate component" },
        { name: "modify",   message: "✏  Modify (describe changes)" },
        { name: "style",    message: "🎨  Change style" },
        { name: "model",    message: "🔄  Switch model" },
        { name: "restart",  message: "↩  Start over with new description" },
        { name: "show",     message: "👁  Show full SVG code" },
        { name: "save-svg", message: "💾  Save as .svg file (no component)" },
        { name: "exit",     message: "✕  Exit" },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    switch (action) {
      case "accept": {
        if (!currentSvg) break;
        const suggested = toPascalCase(description.split(" ").slice(0, 3).join("-"));
        const { name } = await prompt<{ name: string }>({
          type: "input",
          name: "name",
          message: "Component name:",
          initial: suggested.endsWith("Icon") ? suggested : suggested + "Icon",
          hint: "[TAB to accept]",
        } as never);
        const componentName = name.trim().endsWith("Icon") ? name.trim() : name.trim() + "Icon";
        logger.info(`Generating ${componentName}…`);
        try {
          await saveComponent(currentSvg, componentName, options.projectRoot, options.config);
          logger.success(`${componentName} created!`);
        } catch (err) {
          logger.error("Failed: " + String(err));
        }
        iterating = false;
        break;
      }

      case "modify": {
        const { feedback } = await prompt<{ feedback: string }>({
          type: "input",
          name: "feedback",
          message: "Describe the changes:",
          validate: (v: string) => v.trim() ? true : "Cannot be empty",
        } as never);
        description = feedback;
        break;
      }

      case "style": {
        const { s } = await prompt<{ s: string }>({
          type: "select",
          name: "s",
          message: "Select style:",
          choices: Object.entries(STYLE_HINTS).map(([k, v]) => ({ name: k, message: `${k} — ${v}` })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        styleHint = STYLE_HINTS[s];
        messages.push({ role: "user", content: `Change style to: ${styleHint}. Keep same concept.` });
        logger.info("Applying style…");
        try {
          const text2 = await chat(modelEntry.provider, apiKey, modelEntry.id, messages);
          messages.push({ role: "assistant", content: text2 });
          const svg2 = extractSvg(text2);
          if (svg2) { currentSvg = svg2; logger.success("Style applied!"); logger.print(svg2.slice(0, 200) + "…"); }
        } catch (err) { logger.error("Failed: " + String(err)); }
        break;
      }

      case "model": {
        const providerChoice = modelEntry.provider === "claude" ? CLAUDE_MODELS : OPENAI_MODELS;
        const otherProvider  = modelEntry.provider === "claude" ? OPENAI_MODELS : CLAUDE_MODELS;
        const { newAlias } = await prompt<{ newAlias: string }>({
          type: "select",
          name: "newAlias",
          message: "Switch to:",
          choices: [
            ...providerChoice.map(m => ({ name: m.alias, message: `[claude] ${m.label}` })),
            ...otherProvider.map(m =>  ({ name: m.alias, message: `[openai] ${m.label}` })),
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        const newEntry = findModel(newAlias)!;
        try {
          apiKey = await getApiKey(newEntry.provider);
          modelEntry = newEntry;
          logger.success(`Switched to ${modelEntry.label.trim()}`);
        } catch (err) { logger.error(String(err)); }
        break;
      }

      case "restart": {
        const { newDesc } = await prompt<{ newDesc: string }>({
          type: "input",
          name: "newDesc",
          message: "New icon description:",
          validate: (v: string) => v.trim() ? true : "Cannot be empty",
        } as never);
        description = newDesc;
        messages.length = 0;
        currentSvg = null;
        break;
      }

      case "show":
        logger.newline();
        logger.print(currentSvg ?? "(no SVG yet)");
        logger.newline();
        break;

      case "save-svg": {
        if (!currentSvg) break;
        const outPath = path.resolve(process.cwd(), `icon-${Date.now()}.svg`);
        await fs.writeFile(outPath, currentSvg, "utf-8");
        logger.success(`Saved: ${path.relative(process.cwd(), outPath)}`);
        iterating = false;
        break;
      }

      default:
        iterating = false;
        break;
    }
  }
};
