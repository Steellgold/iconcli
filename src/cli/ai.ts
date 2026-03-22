import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import enquirer from "enquirer";
import { logger } from "@/utils/logger";
import { generateComponent, generateComponents } from "@/core/component-generator";
import { writeComponentFile, writeMultiFrameworkComponents } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { trackGeneratedComponent } from "@/core/diff-checker";
import { optimizeSVG } from "@/core/svg-processor";
import { previewSVGSideBySide } from "@/utils/svg-preview";
import type { Config } from "@/config/schema";
import fs from "fs/promises";
import path from "path";

const { prompt } = enquirer;

// ── System prompts ────────────────────────────────────────────────────────────

const EXPANDER_PROMPT = `You are an icon design consultant. Your job is to take a user's icon idea and expand it into a detailed, precise visual specification for an SVG icon designer.

Describe exactly:
- What shapes/elements to draw (be specific: lines, curves, angles)
- The visual metaphor and composition
- Which elements are primary vs secondary
- The overall feeling/weight of the icon

Keep it concise (3–5 sentences). Do NOT generate SVG. Only output the visual specification text.`;

const GENERATOR_PROMPT = `You are an expert SVG icon designer.

Rules:
- viewBox="0 0 24 24"
- stroke="currentColor", fill="none" (unless filled style)
- stroke-width="1.5", stroke-linecap="round", stroke-linejoin="round"
- xmlns="http://www.w3.org/2000/svg"
- Simple, optimized paths only — no groups, no transforms, no metadata

Output format — exactly two lines, nothing else:
NAME: <PascalCaseName>Icon
<svg ...>...</svg>`;

const STYLE_HINTS: Record<string, string> = {
  outline:  "stroke-based, no fill, stroke-width 1.5",
  solid:    "filled shapes, fill=currentColor, no stroke",
  minimal:  "stroke-width 1, extremely simple paths",
  bold:     "stroke-width 2.5, strong visual weight",
  duotone:  "stroke + subtle semi-transparent fill (opacity 0.2)",
};

// ── Model registry ────────────────────────────────────────────────────────────

type Provider = "claude" | "openai";
interface ModelEntry { id: string; provider: Provider; label: string; alias: string; }

const CLAUDE_MODELS: ModelEntry[] = [
  { alias: "opus",    id: "claude-opus-4-6",          provider: "claude", label: "Opus 4.6    — Most powerful" },
  { alias: "sonnet",  id: "claude-sonnet-4-6",         provider: "claude", label: "Sonnet 4.6  — Best balance (Recommended)" },
  { alias: "haiku",   id: "claude-haiku-4-5-20251001", provider: "claude", label: "Haiku 4.5   — Fastest, economical" },
];
const OPENAI_MODELS: ModelEntry[] = [
  { alias: "gpt-5",      id: "gpt-4o",          provider: "openai", label: "GPT-5.4      — Most capable" },
  { alias: "o3",         id: "o3",               provider: "openai", label: "o3           — Reasoning powerhouse" },
  { alias: "gpt-5-mini", id: "gpt-4o-mini",      provider: "openai", label: "GPT-5.4 mini — Fast, cheap" },
  { alias: "o4-mini",    id: "o4-mini",           provider: "openai", label: "o4-mini      — Small reasoning" },
  { alias: "codex",      id: "codex-mini-latest", provider: "openai", label: "GPT-5 Codex  — Coding specialized" },
  { alias: "gpt-oss",    id: "gpt-4o",            provider: "openai", label: "gpt-oss-120b — Open-weight" },
];
const ALL_MODELS = [...CLAUDE_MODELS, ...OPENAI_MODELS];
const findModel = (alias: string) => ALL_MODELS.find(m => m.alias === alias.toLowerCase());

// ── API key helpers ───────────────────────────────────────────────────────────

const credsDirPath = () => path.join(process.env.HOME ?? process.env.USERPROFILE ?? "~", ".mkicon");

const getApiKey = async (provider: Provider): Promise<string> => {
  const envKey = provider === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  if (process.env[envKey]) return process.env[envKey]!;
  try {
    const envFile = await fs.readFile(path.join(process.cwd(), ".env"), "utf-8");
    const m = envFile.match(new RegExp(`^${envKey}=(.+)$`, "m"));
    if (m) return m[1].trim();
  } catch { /* */ }
  const credsPath = path.join(credsDirPath(), "credentials");
  try {
    const creds = await fs.readFile(credsPath, "utf-8");
    const m = creds.match(new RegExp(`^${envKey}=(.+)$`, "m"));
    if (m) return m[1].trim();
  } catch { /* */ }
  throw new Error(`No ${envKey} found. Run: mkicon ai --setup`);
};

const saveApiKey = async (envKey: string, value: string) => {
  const dir = credsDirPath();
  await fs.mkdir(dir, { recursive: true });
  const credsPath = path.join(dir, "credentials");
  let existing = "";
  try { existing = await fs.readFile(credsPath, "utf-8"); } catch { /* */ }
  const regex = new RegExp(`^${envKey}=.*$`, "m");
  const updated = regex.test(existing)
    ? existing.replace(regex, `${envKey}=${value}`)
    : existing + `${envKey}=${value}\n`;
  await fs.writeFile(credsPath, updated, "utf-8");
};

// ── Provider-agnostic chat ────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string; }

const callClaude = async (apiKey: string, modelId: string, system: string, messages: ChatMessage[]): Promise<string> => {
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: modelId, max_tokens: 1500, system,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });
  return res.content.map(b => b.type === "text" ? b.text : "").join("");
};

const callOpenAI = async (apiKey: string, modelId: string, system: string, messages: ChatMessage[]): Promise<string> => {
  const client = new OpenAI({ apiKey });
  const isReasoning = modelId === "o3" || modelId.startsWith("o4");
  const systemMsgs = isReasoning ? [] : [{ role: "system" as const, content: system }];
  const res = await client.chat.completions.create({
    model: modelId, max_completion_tokens: 1500,
    messages: [...systemMsgs, ...messages.map(m => ({ role: m.role, content: m.content }))],
  });
  return res.choices[0]?.message?.content ?? "";
};

const call = (provider: Provider, apiKey: string, modelId: string, system: string, messages: ChatMessage[]) =>
  provider === "claude"
    ? callClaude(apiKey, modelId, system, messages)
    : callOpenAI(apiKey, modelId, system, messages);

// ── Parse AI output (NAME: ... + SVG) ────────────────────────────────────────

interface ParsedGeneration { name: string; svg: string; }

const parseGeneration = (text: string): ParsedGeneration | null => {
  const nameMatch = text.match(/^NAME:\s*([A-Za-z][A-Za-z0-9]*)Icon?\b/m);
  const svgMatch  = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (!svgMatch) return null;
  const rawName = nameMatch?.[1] ?? "Custom";
  const name = rawName.endsWith("Icon") ? rawName : rawName + "Icon";
  return { name, svg: svgMatch[0].trim() };
};

// ── Save component (correct signatures from semi-interactive) ─────────────────

const saveComponent = async (
  svg: string, viewBox: string, componentName: string,
  projectRoot: string, config: Config,
) => {
  const isMulti = config.frameworks && config.frameworks.length > 1;
  const svgSourcePath = "ai-generated";

  if (isMulti) {
    const components = await generateComponents({ componentName, svgContent: svg, viewBox, config });
    const results = await writeMultiFrameworkComponents(components, {
      projectRoot, baseDir: config.baseDir, iconsFolder: config.iconsFolder,
    });
    for (const comp of components) {
      await trackGeneratedComponent(projectRoot, comp.filename, componentName, svgSourcePath, svg);
    }
    if (config.maintainIndex) {
      for (const comp of components) {
        const fwDir = path.join(projectRoot, config.baseDir, config.iconsFolder, comp.framework);
        await updateIndexFile(fwDir, comp.extension);
      }
    }
    return results.map(r => r.filePath);
  } else {
    const component = await generateComponent({ componentName, svgContent: svg, viewBox, config });
    const filePath = await writeComponentFile({
      projectRoot, baseDir: config.baseDir, iconsFolder: config.iconsFolder,
      filename: component.filename, content: component.content,
    });
    await trackGeneratedComponent(projectRoot, component.filename, componentName, svgSourcePath, svg);
    if (config.maintainIndex) {
      const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
      await updateIndexFile(iconsDir, component.extension);
    }
    return [filePath];
  }
};

// ── Setup flow ────────────────────────────────────────────────────────────────

const runSetup = async () => {
  logger.info("AI Icon Generator — Setup");
  logger.newline();

  const { provider } = await prompt<{ provider: Provider }>({
    type: "select", name: "provider", message: "Select provider:",
    choices: [
      { name: "claude", message: "Claude (Anthropic) — Recommended" },
      { name: "openai", message: "OpenAI" },
    ],
  } as never);

  const envKey = provider === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  const { apiKey } = await prompt<{ apiKey: string }>({
    type: "input", name: "apiKey",
    message: `${provider === "claude" ? "Anthropic" : "OpenAI"} API key:`,
    hint: provider === "claude" ? "sk-ant-..." : "sk-...",
    validate: (v: string) => v.trim().startsWith("sk-") ? true : "Must start with sk-",
  } as never);

  const { saveGlobal } = await prompt<{ saveGlobal: boolean }>({
    type: "confirm", name: "saveGlobal",
    message: "Save to ~/.mkicon/credentials?", initial: true,
  } as never);

  if (saveGlobal) {
    await saveApiKey(envKey, apiKey.trim());
    logger.success(`Saved to ~/.mkicon/credentials`);
  } else {
    logger.print(`export ${envKey}="${apiKey.trim()}"`);
  }
};

// ── Main ──────────────────────────────────────────────────────────────────────

export interface AiOptions {
  projectRoot: string;
  config: Config;
  description?: string;
  model?: string;
  provider?: string;
  style?: string;
}

export const runAi = async (options: AiOptions): Promise<void> => {
  if (process.argv.includes("--setup")) { await runSetup(); return; }

  // ── Pick model ──────────────────────────────────────────────────────────────
  let modelEntry: ModelEntry;

  if (options.model) {
    const found = findModel(options.model);
    if (!found) {
      logger.error(`Unknown model "${options.model}". Valid: ${ALL_MODELS.map(m => m.alias).join(", ")}`);
      return;
    }
    modelEntry = found;
  } else {
    const { provider } = await prompt<{ provider: Provider }>({
      type: "select", name: "provider", message: "Provider:",
      choices: [
        { name: "claude", message: "Claude (Anthropic)" },
        { name: "openai", message: "OpenAI" },
      ],
    } as never);
    const models = provider === "claude" ? CLAUDE_MODELS : OPENAI_MODELS;
    const { modelAlias } = await prompt<{ modelAlias: string }>({
      type: "select", name: "modelAlias", message: "Model:",
      choices: models.map(m => ({ name: m.alias, message: m.label })),
    } as never);
    modelEntry = models.find(m => m.alias === modelAlias)!;
  }

  let apiKey: string;
  try { apiKey = await getApiKey(modelEntry.provider); }
  catch (err) { logger.error(String(err)); return; }

  const styleHint = options.style ? STYLE_HINTS[options.style] ?? options.style : STYLE_HINTS["outline"];

  logger.print(`\n✨ AI Icon Generator — ${modelEntry.label.trim()}`);
  logger.newline();

  // ── Main generation loop ────────────────────────────────────────────────────
  let keepGoing = true;
  let currentSvg: string | null = null;
  let currentViewBox = "0 0 24 24";
  let suggestedName = "CustomIcon";
  let expandedConcept: string | null = null;
  let messages: ChatMessage[] = [];

  // Get initial description
  const { description: initialDesc } = options.description
    ? { description: options.description }
    : await prompt<{ description: string }>({
        type: "input", name: "description",
        message: "Describe the icon:",
        hint: "e.g. a hammer breaking a rock",
        validate: (v: string) => v.trim() ? true : "Cannot be empty",
      } as never);

  let userInput = initialDesc;

  while (keepGoing) {
    // ── Step 1: Expand description ────────────────────────────────────────────
    logger.info("Developing concept…");
    try {
      expandedConcept = await call(
        modelEntry.provider, apiKey, modelEntry.id,
        EXPANDER_PROMPT,
        [{ role: "user", content: `Icon idea: "${userInput}". Style hint: ${styleHint}.` }],
      );
      logger.newline();
      logger.print("  " + expandedConcept.split("\n").join("\n  "));
      logger.newline();
    } catch (err) {
      logger.error("Concept expansion failed: " + String(err));
      return;
    }

    // ── Step 2: Generate SVG + name ───────────────────────────────────────────
    logger.info("Generating SVG…");
    try {
      messages = [
        { role: "user", content: `Create an SVG icon based on this specification:\n\n${expandedConcept}\n\nStyle: ${styleHint}.` },
      ];
      const raw = await call(modelEntry.provider, apiKey, modelEntry.id, GENERATOR_PROMPT, messages);
      messages.push({ role: "assistant", content: raw });

      const parsed = parseGeneration(raw);
      if (!parsed) { logger.error("AI returned no valid SVG — try again."); continue; }

      currentSvg  = parsed.svg;
      suggestedName = parsed.name;
      const vbMatch = parsed.svg.match(/viewBox="([^"]+)"/);
      currentViewBox = vbMatch?.[1] ?? "0 0 24 24";

    } catch (err) {
      logger.error("Generation failed: " + String(err));
      return;
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    await previewSVGSideBySide(currentSvg, [
      { label: "Suggested name", value: suggestedName },
      { label: "Model",          value: modelEntry.alias },
      { label: "Style",          value: options.style ?? "outline" },
    ]);

    // ── Choices ───────────────────────────────────────────────────────────────
    const { action } = await prompt<{ action: string }>({
      type: "select", name: "action", message: "What next?",
      choices: [
        { name: "accept",  message: "✓  Save as component" },
        { name: "refine",  message: "✏  Refine (give feedback)" },
        { name: "restart", message: "↩  New description" },
        { name: "exit",    message: "✕  Exit" },
      ],
    } as never);

    switch (action) {
      case "accept": {
        const { name } = await prompt<{ name: string }>({
          type: "input", name: "name", message: "Component name:",
          initial: suggestedName,
          hint: "[TAB to accept suggestion]",
          validate: (v: string) => v.trim() ? true : "Cannot be empty",
        } as never);
        const componentName = name.trim().endsWith("Icon") ? name.trim() : name.trim() + "Icon";
        logger.info(`Creating ${componentName}…`);
        try {
          const filePaths = await saveComponent(
            currentSvg!, currentViewBox, componentName, options.projectRoot, options.config,
          );
          logger.success(`${componentName} created!`);
          logger.newline();
          for (const fp of filePaths) {
            logger.print(`  📁 ${path.relative(options.projectRoot, fp)}`);
          }
          logger.newline();
          logger.print(`  import { ${componentName} } from '@/components/icons';`);
          logger.print(`  <${componentName} size={24} />`);
        } catch (err) {
          logger.error("Failed: " + String(err));
        }
        keepGoing = false;
        break;
      }

      case "refine": {
        const { feedback } = await prompt<{ feedback: string }>({
          type: "input", name: "feedback", message: "Describe the changes:",
          validate: (v: string) => v.trim() ? true : "Cannot be empty",
        } as never);
        // Push feedback into messages so the model has context, then re-generate
        messages.push({ role: "user", content: `Refine the icon: ${feedback}. Output the same NAME: + SVG format.` });
        logger.info("Refining…");
        try {
          const raw2 = await call(modelEntry.provider, apiKey, modelEntry.id, GENERATOR_PROMPT, messages);
          messages.push({ role: "assistant", content: raw2 });
          const parsed2 = parseGeneration(raw2);
          if (!parsed2) { logger.warning("Could not parse refined SVG — keeping previous."); break; }
          currentSvg = parsed2.svg;
          suggestedName = parsed2.name;
          const vbMatch2 = parsed2.svg.match(/viewBox="([^"]+)"/);
          currentViewBox = vbMatch2?.[1] ?? "0 0 24 24";
          await previewSVGSideBySide(currentSvg, [
            { label: "Suggested name", value: suggestedName },
            { label: "Model",          value: modelEntry.alias },
          ]);
          // Re-show choices by continuing the loop without resetting userInput
          const { action: action2 } = await prompt<{ action: string }>({
            type: "select", name: "action", message: "What next?",
            choices: [
              { name: "accept",  message: "✓  Save as component" },
              { name: "refine",  message: "✏  Refine again" },
              { name: "restart", message: "↩  New description" },
              { name: "exit",    message: "✕  Exit" },
            ],
          } as never);
          if (action2 === "accept") {
            const { name } = await prompt<{ name: string }>({
              type: "input", name: "name", message: "Component name:",
              initial: suggestedName, hint: "[TAB to accept]",
              validate: (v: string) => v.trim() ? true : "Cannot be empty",
            } as never);
            const componentName = name.trim().endsWith("Icon") ? name.trim() : name.trim() + "Icon";
            logger.info(`Creating ${componentName}…`);
            try {
              const filePaths = await saveComponent(currentSvg!, currentViewBox, componentName, options.projectRoot, options.config);
              logger.success(`${componentName} created!`);
              for (const fp of filePaths) logger.print(`  📁 ${path.relative(options.projectRoot, fp)}`);
            } catch (err) { logger.error("Failed: " + String(err)); }
            keepGoing = false;
          } else if (action2 === "restart") {
            const { newDesc } = await prompt<{ newDesc: string }>({
              type: "input", name: "newDesc", message: "New description:",
              validate: (v: string) => v.trim() ? true : "Cannot be empty",
            } as never);
            userInput = newDesc; messages = [];
          } else if (action2 === "exit") {
            keepGoing = false;
          }
          // if "refine" again — fall through to top of while loop (messages carry context)
        } catch (err) {
          logger.error("Refinement failed: " + String(err));
        }
        break;
      }

      case "restart": {
        const { newDesc } = await prompt<{ newDesc: string }>({
          type: "input", name: "newDesc", message: "New description:",
          validate: (v: string) => v.trim() ? true : "Cannot be empty",
        } as never);
        userInput = newDesc;
        messages = [];
        break;
      }

      default:
        keepGoing = false;
    }
  }
};
