import type { Config } from "@/config/schema";
import { generateComponent } from "@/core/component-generator";
import { trackGeneratedComponent } from "@/core/diff-checker";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { optimizeSVG } from "@/core/svg-processor";
import { parseFigmaURL, fetchFigmaIcon } from "@/library/figma";
import { logger, spinner } from "@/utils/logger";
import { previewSVGSideBySide } from "@/utils/svg-preview";
import { generateIconName, extractIconNameFromURL } from "@/utils/naming";
import { isValidSVG } from "@/utils/validation";
import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import { promptIconName } from "./prompts";

const { prompt } = enquirer;

export interface FigmaOptions {
  projectRoot: string;
  config: Config;
  url?: string;
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

const GLOBAL_CREDENTIALS_PATH = path.join(os.homedir(), ".mkicon", "credentials");

/** Read FIGMA_TOKEN from an .env-style file (project or global). */
const readTokenFromFile = async (filePath: string): Promise<string | undefined> => {
  if (!existsSync(filePath)) return undefined;
  try {
    const content = await fs.readFile(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("FIGMA_TOKEN=")) {
        const value = trimmed.slice("FIGMA_TOKEN=".length).replace(/^["']|["']$/g, "").trim();
        if (value) return value;
      }
    }
  } catch { /* ignore */ }
  return undefined;
};

/** Write or update FIGMA_TOKEN in an .env-style file. */
const writeTokenToFile = async (filePath: string, token: string): Promise<void> => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  let content = "";
  if (existsSync(filePath)) {
    content = await fs.readFile(filePath, "utf-8");
  }

  const lines = content.split("\n");
  const idx = lines.findIndex((l) => l.trim().startsWith("FIGMA_TOKEN="));

  if (idx !== -1) {
    lines[idx] = `FIGMA_TOKEN=${token}`;
  } else {
    if (content && !content.endsWith("\n")) lines.push("");
    lines.push(`FIGMA_TOKEN=${token}`);
  }

  await fs.writeFile(filePath, lines.join("\n"), "utf-8");
};

/** Ensure .env is in .gitignore. Returns true if it was added. */
const ensureEnvInGitignore = async (projectRoot: string): Promise<boolean> => {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  let content = "";

  if (existsSync(gitignorePath)) {
    content = await fs.readFile(gitignorePath, "utf-8");
    const lines = content.split("\n").map((l) => l.trim());
    if (lines.includes(".env") || lines.includes("*.env")) return false;
  }

  const toAppend = content && !content.endsWith("\n") ? "\n.env\n" : ".env\n";
  await fs.appendFile(gitignorePath, toAppend, "utf-8");
  return true;
};

// ─── Prompts ─────────────────────────────────────────────────────────────────

const promptFigmaURL = async (): Promise<string> => {
  const answer = await prompt<{ url: string }>({
    type: "input",
    name: "url",
    message: "Figma URL:",
    validate: (value: string) => {
      if (!value.trim()) return "URL is required";
      if (!value.includes("figma.com")) return "Must be a valid Figma URL";
      return true;
    },
  });
  return answer.url.trim();
};

/**
 * First-time setup: guided instructions + token prompt + storage choice.
 * Returns the token to use.
 */
const runTokenSetup = async (projectRoot: string): Promise<string> => {
  logger.separator();
  logger.newline();
  logger.info("Figma token setup");
  logger.newline();
  logger.print(chalk.bold("  How to get your Figma Personal Access Token:"));
  logger.newline();
  logger.print("  1. Open Figma → click your " + chalk.bold("profile icon") + " (top left) → " + chalk.bold("Settings"));
  logger.print("  2. Scroll to " + chalk.bold('"Personal access tokens"'));
  logger.print('  3. Click ' + chalk.bold('"Generate new token"'));
  logger.print("  4. Give it a name (e.g. " + chalk.cyan("mkicon") + ")");
  logger.print("  5. Set the following scope:");
  logger.newline();
  logger.print("       " + chalk.green("✓") + " " + chalk.bold("File content") + "  →  " + chalk.cyan("file_content:read"));
  logger.newline();
  logger.print(chalk.gray("     All other scopes can be left off."));
  logger.newline();
  logger.print('  6. Click ' + chalk.bold('"Generate token"') + " and copy it");
  logger.newline();
  logger.print(chalk.gray("  ⚠  The token is only shown once — copy it before closing the dialog."));
  logger.newline();
  logger.separator();
  logger.newline();

  const { token } = await prompt<{ token: string }>({
    type: "password",
    name: "token",
    message: "Paste your Figma token:",
    validate: (v: string) => (v.trim() ? true : "Token is required"),
  });

  const cleanToken = token.trim();

  logger.newline();

  const { storage } = await prompt<{ storage: string }>({
    type: "select",
    name: "storage",
    message: "Where do you want to save this token?",
    choices: [
      {
        name: "global",
        message:
          `Save globally ${chalk.gray("(~/.mkicon/credentials — works across all your projects)")}`,
      },
      {
        name: "env",
        message:
          `Save to project ${chalk.cyan(".env")} ${chalk.gray("(this project only, stays private)")}`,
      },
      {
        name: "none",
        message: "Don't save — ask me every time",
      },
    ],
  });

  logger.newline();

  if (storage === "global") {
    await writeTokenToFile(GLOBAL_CREDENTIALS_PATH, cleanToken);
    logger.success(`Token saved globally (${chalk.gray(GLOBAL_CREDENTIALS_PATH)})`);
    logger.info("It will be used automatically in all your projects.");
  } else if (storage === "env") {
    await writeTokenToFile(path.join(projectRoot, ".env"), cleanToken);
    const addedToGitignore = await ensureEnvInGitignore(projectRoot);
    logger.success("FIGMA_TOKEN saved to .env");
    if (addedToGitignore) {
      logger.success(".env added to .gitignore");
    } else {
      logger.info(".gitignore already covers .env");
    }
  }

  logger.newline();

  return cleanToken;
};

// ─── Main flow ────────────────────────────────────────────────────────────────

/**
 * Resolve the Figma token with the following priority:
 * 1. Shell / CI env var (FIGMA_TOKEN)
 * 2. Project .env file
 * 3. Global ~/.mkicon/credentials
 * 4. First-time guided setup
 */
const resolveToken = async (projectRoot: string): Promise<string> => {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN;

  const fromProject = await readTokenFromFile(path.join(projectRoot, ".env"));
  if (fromProject) return fromProject;

  const fromGlobal = await readTokenFromFile(GLOBAL_CREDENTIALS_PATH);
  if (fromGlobal) return fromGlobal;

  return runTokenSetup(projectRoot);
};

/**
 * Run Figma import flow: fetch SVG from a Figma URL and generate a component.
 */
export const runFigmaImport = async (options: FigmaOptions): Promise<void> => {
  const { projectRoot, config, url: urlArg } = options;

  try {
    logger.title("🎨 Figma import");
    logger.newline();
    logger.print("  Select a frame or component in Figma, then right-click");
    logger.print(chalk.gray('  → "Copy link to selection" and paste it below.'));
    logger.newline();

    // Get Figma URL
    const url = urlArg || (await promptFigmaURL());

    // Parse URL
    const figmaInfo = parseFigmaURL(url);
    if (!figmaInfo) {
      logger.error(
        'Could not parse Figma URL. Use "Copy link to selection" (right-click on the frame in Figma).'
      );
      process.exit(1);
    }

    // Resolve token
    const token = await resolveToken(projectRoot);

    logger.separator();
    logger.newline();

    // Fetch SVG
    const fetchSpinner = spinner.start("Fetching SVG from Figma...");
    let svgContent: string;
    try {
      svgContent = await fetchFigmaIcon(token, figmaInfo.fileKey, figmaInfo.nodeId);
      fetchSpinner.succeed("SVG fetched from Figma");
    } catch (error) {
      fetchSpinner.fail("Failed to fetch from Figma");
      if (error instanceof Error && error.message.includes("403")) {
        logger.newline();
        logger.error("Access denied — your token may be invalid or expired.");
        logger.print(
          chalk.gray("  Delete FIGMA_TOKEN from .env or your shell to re-run setup.")
        );
      }
      throw error;
    }

    // Validate
    if (!isValidSVG(svgContent)) {
      logger.error("The fetched content is not valid SVG. Make sure you selected a vector frame.");
      process.exit(1);
    }

    // Suggest a name
    const suggestedName = extractIconNameFromURL(url) ?? undefined;

    // Ask for icon name
    const iconName = await promptIconName(suggestedName);
    const componentName = generateIconName(
      iconName,
      config.naming.suffix,
      config.naming.componentCase
    );

    logger.separator();
    logger.newline();

    // Process SVG
    const processSpinner = spinner.start("Processing SVG...");
    const processed = await optimizeSVG(svgContent, config.optimize);

    if (config.optimize && processed.optimizedSize < processed.originalSize) {
      processSpinner.succeed(
        `SVG optimized (${processed.originalSize} bytes → ${processed.optimizedSize} bytes)`
      );
    } else {
      processSpinner.succeed("SVG processed");
    }

    // Preview
    await previewSVGSideBySide(processed.content, [
      { label: "Component", value: componentName },
      { label: "Framework", value: config.framework },
      { label: "Source", value: "Figma" },
      { label: "ViewBox", value: processed.viewBox },
    ]);

    // Generate component
    logger.newline();
    const genSpinner = spinner.start("Generating component...");
    const component = await generateComponent({
      componentName,
      svgContent: processed.content,
      viewBox: processed.viewBox,
      config,
    });
    genSpinner.succeed(`${component.filename} generated`);

    // Write file
    const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
    const filePath = await writeComponentFile({
      projectRoot,
      baseDir: config.baseDir,
      iconsFolder: config.iconsFolder,
      filename: component.filename,
      content: component.content,
    });

    await trackGeneratedComponent(
      projectRoot,
      component.filename,
      componentName,
      url,
      processed.content,
      { library: "figma" }
    );

    logger.success(`${component.filename} created`);

    // Update index
    if (config.maintainIndex) {
      await updateIndexFile(iconsDir, component.extension);
      logger.success("index.ts updated");
    }

    logger.separator();
    logger.newline();
    logger.title("Icon created successfully! 🎉");
    logger.newline();
    logger.print(`📁 ${path.relative(projectRoot, filePath)}`);
    logger.newline();
    logger.print("Import:");
    logger.print(`  import { ${componentName} } from '@/components/icons';`);
    logger.newline();
    logger.print("Usage:");
    logger.print(`  <${componentName} size={24} />`);
    logger.separator();
    logger.newline();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An error occurred");
    }
    process.exit(1);
  }
};
