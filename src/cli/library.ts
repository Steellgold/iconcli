import type { Config } from "@/config/schema";
import { generateComponent } from "@/core/component-generator";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { optimizeSVG } from "@/core/svg-processor";
import { fetchLucideIcon, fetchLucideIcons, generateLucideCopyright } from "@/library/lucide";
import {
  fetchHeroicon,
  fetchHeroiconList,
  generateHeroiconsCopyright,
  parseHeroiconURL,
} from "@/library/heroicons";
import {
  fetchTablerIcon,
  fetchTablerIconList,
  generateTablerCopyright,
  parseTablerURL,
} from "@/library/tabler";
import type { TablerStroke, TablerStyle } from "@/library/tabler";
import type { IconMetadata } from "@/library/types";
import { logger, spinner } from "@/utils/logger";
import { extractLucideIconNameFromURL, generateIconName } from "@/utils/naming";
import { insertHeaderComment } from "@/utils/header";
import enquirer from "enquirer";
import path from "path";
import { promptHeroiconSize, promptHeroiconStyle, promptMultipleURLs, promptTablerStroke, promptTablerStyle } from "./prompts";
import { rankIcons } from "@/utils/search";

type EnquirerExt = {
  prompt: <T>(options: Record<string, unknown> | Record<string, unknown>[]) => Promise<T>;
  AutoComplete: new (options: Record<string, unknown>) => { run: () => Promise<unknown> };
};
const { prompt, AutoComplete } = enquirer as unknown as EnquirerExt;

export interface LibraryOptions {
  projectRoot: string;
  config: Config;
}

/**
 * Run library browser for importing icons from Lucide
 */
export const runLibraryBrowser = async (options: LibraryOptions): Promise<void> => {
  const { projectRoot, config } = options;

  try {
    // Select library
    const library = await promptLibrarySelection();

    if (library === "request") {
      // Open GitHub issue for library request
      const issueUrl =
        "https://github.com/Steellgold/mkicon/issues/new?template=library-request.yml";
      logger.info("Opening GitHub to request a new library...");
      logger.newline();
      logger.print(`Please open this URL in your browser:`);
      logger.print(issueUrl);
      logger.newline();
      logger.info("Thank you for your suggestion! 🙏");
      return;
    }

    if (!library) {
      logger.info("No library selected");
      return;
    }

    const method = await promptImportMethod();
    if (!method) {
      logger.info("No import method selected");
      return;
    }

    if (method === "search") {
      if (library === "heroicons") {
        await importHeroiconFromSearch(projectRoot, config);
      } else if (library === "tabler") {
        await importTablerIconFromSearch(projectRoot, config);
      } else {
        await importSingleFromSearch(projectRoot, config);
      }
      return;
    }

    await importMultipleFromURLs(projectRoot, config, library);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An error occurred");
    }
    process.exit(1);
  }
};

const promptImportMethod = async (): Promise<"search" | "urls" | null> => {
  try {
    const answer = (await prompt({
      type: "select",
      name: "method",
      message: "How do you want to import icons?",
      choices: [
        { name: "search", message: "Search and Select", value: "search" },
        { name: "urls", message: "From URL's", value: "urls" },
      ],
    })) as { method: "search" | "urls" };
    return answer.method;
  } catch {
    return null;
  }
};

const importSingleFromSearch = async (projectRoot: string, config: Config): Promise<void> => {
  const fetchSpinner = spinner.start("Loading Lucide Icons...");
  const icons = await fetchLucideIcons();
  fetchSpinner.succeed(`Loaded ${icons.length} icons from Lucide`);
  logger.newline();

  const iconName = await promptIconSearchAndSelect(icons);
  if (!iconName) {
    logger.info("No icon selected");
    return;
  }

  logger.newline();
  const { svgContent, metadata } = await fetchLucideIcon(iconName);

  const nameAnswer = (await prompt({
    type: "confirm",
    name: "useOriginalName",
    message: `Use '${iconName}' as component name?`,
    initial: true,
  })) as { useOriginalName: boolean };

  let componentBaseName = iconName;
  if (!nameAnswer.useOriginalName) {
    const customAnswer = (await prompt({
      type: "input",
      name: "customName",
      message: "Enter custom component name:",
      initial: iconName,
    })) as { customName: string };
    componentBaseName = customAnswer.customName;
  }

  const componentName = generateIconName(
    componentBaseName,
    config.naming.suffix,
    config.naming.componentCase
  );

  logger.separator();
  logger.newline();

  const processSpinner = spinner.start("Processing SVG...");
  const processed = await optimizeSVG(svgContent, config.optimize);
  if (config.optimize && processed.optimizedSize < processed.originalSize) {
    processSpinner.succeed(
      `SVG optimized (${processed.originalSize} bytes → ${processed.optimizedSize} bytes)`
    );
  } else {
    processSpinner.succeed("SVG processed");
  }
  logger.success(`ViewBox detected: ${processed.viewBox}`);

  logger.newline();
  const genSpinner = spinner.start("Generating component...");
  const component = await generateComponent({
    componentName,
    svgContent: processed.content,
    viewBox: processed.viewBox,
    config,
  });

  const copyright = generateLucideCopyright(metadata.iconName);
  const contentWithCopyright = insertHeaderComment(component.content, copyright);
  genSpinner.succeed(`${component.filename} generated`);

  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
  const filePath = await writeComponentFile({
    projectRoot,
    baseDir: config.baseDir,
    iconsFolder: config.iconsFolder,
    filename: component.filename,
    content: contentWithCopyright,
  });
  logger.success(`${component.filename} created`);

  if (config.maintainIndex) {
    await updateIndexFile(iconsDir, component.extension);
    logger.success("index.ts updated");
  }

  logger.separator();
  logger.newline();
  logger.title("Icon imported successfully! 🎉");
  logger.newline();
  logger.print(`📁 ${path.relative(projectRoot, filePath)}`);
  logger.print(`📚 From: Lucide Icons (${metadata.library.website})`);
  logger.newline();
  logger.print("Import:");
  logger.print(`  import { ${componentName} } from '@/components/icons';`);
  logger.newline();
  logger.print("Usage:");
  logger.print(`  <${componentName} size={24} color="blue" />`);
  logger.separator();
  logger.newline();
};

const importHeroiconFromSearch = async (projectRoot: string, config: Config): Promise<void> => {
  const fetchSpinner = spinner.start("Loading Heroicons...");
  const icons = await fetchHeroiconList();
  fetchSpinner.succeed(`Loaded ${icons.length} icons from Heroicons`);
  logger.newline();

  const iconName = await promptIconSearchAndSelect(icons);
  if (!iconName) {
    logger.info("No icon selected");
    return;
  }

  const size = await promptHeroiconSize();
  const style = await promptHeroiconStyle(size);

  logger.newline();
  const { svgContent, metadata } = await fetchHeroicon(iconName, size, style);

  const suggestedName = `${iconName}-${size}`;
  const nameAnswer = (await prompt({
    type: "confirm",
    name: "useOriginalName",
    message: `Use '${suggestedName}' as component name?`,
    initial: true,
  })) as { useOriginalName: boolean };

  let componentBaseName = suggestedName;
  if (!nameAnswer.useOriginalName) {
    const customAnswer = (await prompt({
      type: "input",
      name: "customName",
      message: "Enter custom component name:",
      initial: suggestedName,
    })) as { customName: string };
    componentBaseName = customAnswer.customName;
  }

  const componentName = generateIconName(
    componentBaseName,
    config.naming.suffix,
    config.naming.componentCase
  );

  logger.separator();
  logger.newline();

  const processSpinner = spinner.start("Processing SVG...");
  const processed = await optimizeSVG(svgContent, config.optimize);
  if (config.optimize && processed.optimizedSize < processed.originalSize) {
    processSpinner.succeed(
      `SVG optimized (${processed.originalSize} bytes → ${processed.optimizedSize} bytes)`
    );
  } else {
    processSpinner.succeed("SVG processed");
  }
  logger.success(`ViewBox detected: ${processed.viewBox}`);

  logger.newline();
  const genSpinner = spinner.start("Generating component...");
  const component = await generateComponent({
    componentName,
    svgContent: processed.content,
    viewBox: processed.viewBox,
    config,
  });

  const copyright = generateHeroiconsCopyright(iconName);
  const contentWithCopyright = insertHeaderComment(component.content, copyright);
  genSpinner.succeed(`${component.filename} generated`);

  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
  const filePath = await writeComponentFile({
    projectRoot,
    baseDir: config.baseDir,
    iconsFolder: config.iconsFolder,
    filename: component.filename,
    content: contentWithCopyright,
  });
  logger.success(`${component.filename} created`);

  if (config.maintainIndex) {
    await updateIndexFile(iconsDir, component.extension);
    logger.success("index.ts updated");
  }

  logger.separator();
  logger.newline();
  logger.title("Icon imported successfully! 🎉");
  logger.newline();
  logger.print(`📁 ${path.relative(projectRoot, filePath)}`);
  logger.print(`📐 Size: ${size}px — Style: ${style}`);
  logger.print(`📚 From: ${metadata.library.displayName} (${metadata.library.website})`);
  logger.newline();
  logger.print("Import:");
  logger.print(`  import { ${componentName} } from '@/components/icons';`);
  logger.newline();
  logger.print("Usage:");
  logger.print(`  <${componentName} size={${size}} />`);
  logger.separator();
  logger.newline();
};

const importTablerIconFromSearch = async (projectRoot: string, config: Config): Promise<void> => {
  // Ask style first — filled/outline have different icon sets, not all icons have a filled variant
  const style: TablerStyle = await promptTablerStyle();
  let stroke: TablerStroke = 2;
  if (style === "outline") {
    stroke = await promptTablerStroke();
  }

  const fetchSpinner = spinner.start(`Loading Tabler Icons (${style})...`);
  const icons = await fetchTablerIconList(style);
  fetchSpinner.succeed(`Loaded ${icons.length} ${style} icons from Tabler Icons`);
  logger.newline();

  const iconName = await promptIconSearchAndSelect(icons);
  if (!iconName) {
    logger.info("No icon selected");
    return;
  }

  logger.newline();
  const suggestedName = style === "filled" ? `${iconName}-filled` : iconName;
  const { svgContent, metadata } = await fetchTablerIcon(iconName, style, stroke);

  const nameAnswer = (await prompt({
    type: "confirm",
    name: "useOriginalName",
    message: `Use '${suggestedName}' as component name?`,
    initial: true,
  })) as { useOriginalName: boolean };

  let componentBaseName = suggestedName;
  if (!nameAnswer.useOriginalName) {
    const customAnswer = (await prompt({
      type: "input",
      name: "customName",
      message: "Enter custom component name:",
      initial: suggestedName,
    })) as { customName: string };
    componentBaseName = customAnswer.customName;
  }

  const componentName = generateIconName(
    componentBaseName,
    config.naming.suffix,
    config.naming.componentCase
  );

  logger.separator();
  logger.newline();

  const processSpinner = spinner.start("Processing SVG...");
  const processed = await optimizeSVG(svgContent, config.optimize);
  if (config.optimize && processed.optimizedSize < processed.originalSize) {
    processSpinner.succeed(
      `SVG optimized (${processed.originalSize} bytes → ${processed.optimizedSize} bytes)`
    );
  } else {
    processSpinner.succeed("SVG processed");
  }
  logger.success(`ViewBox detected: ${processed.viewBox}`);

  logger.newline();
  const genSpinner = spinner.start("Generating component...");
  const component = await generateComponent({
    componentName,
    svgContent: processed.content,
    viewBox: processed.viewBox,
    config,
  });

  const copyright = generateTablerCopyright(iconName);
  const contentWithCopyright = insertHeaderComment(component.content, copyright);
  genSpinner.succeed(`${component.filename} generated`);

  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
  const filePath = await writeComponentFile({
    projectRoot,
    baseDir: config.baseDir,
    iconsFolder: config.iconsFolder,
    filename: component.filename,
    content: contentWithCopyright,
  });
  logger.success(`${component.filename} created`);

  if (config.maintainIndex) {
    await updateIndexFile(iconsDir, component.extension);
    logger.success("index.ts updated");
  }

  logger.separator();
  logger.newline();
  logger.title("Icon imported successfully! 🎉");
  logger.newline();
  logger.print(`📁 ${path.relative(projectRoot, filePath)}`);
  logger.print(`🎨 Style: ${style}${style === "outline" ? ` — Stroke: ${stroke}` : ""}`);
  logger.print(`📚 From: ${metadata.library.displayName} (${metadata.library.website})`);
  logger.newline();
  logger.print("Import:");
  logger.print(`  import { ${componentName} } from '@/components/icons';`);
  logger.newline();
  logger.print("Usage:");
  logger.print(`  <${componentName} size={24} />`);
  logger.separator();
  logger.newline();
};

const importMultipleFromURLs = async (
  projectRoot: string,
  config: Config,
  library = "lucide"
): Promise<void> => {
  logger.newline();

  if (library === "heroicons") {
    logger.info(
      "Heroicons URL format: https://raw.githubusercontent.com/tailwindlabs/heroicons/master/src/{size}/{style}/{name}.svg"
    );
    logger.newline();
  } else if (library === "tabler") {
    logger.info(
      "Tabler Icons URL format: https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/{style}/{name}.svg"
    );
    logger.newline();
  }

  const urls = await promptMultipleURLs();
  if (urls.length === 0) {
    logger.info("No URL provided");
    return;
  }

  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
  const successes: Array<{ componentName: string; filePath: string }> = [];
  const failures: Array<{ url: string; reason: string }> = [];
  let extensionForIndex: string | null = null;

  for (let i = 0; i < urls.length; i += 1) {
    const rawUrl = urls[i];

    // Try Heroicons URL first, then Tabler, then Lucide
    const heroiconParsed = parseHeroiconURL(rawUrl);
    const tablerParsed = !heroiconParsed ? parseTablerURL(rawUrl) : null;
    const lucideIconName = !heroiconParsed && !tablerParsed ? extractLucideIconNameFromURL(rawUrl) : null;

    if (!heroiconParsed && !tablerParsed && !lucideIconName) {
      failures.push({ url: rawUrl, reason: "Unrecognized library URL" });
      logger.error(`[${i + 1}/${urls.length}] Unrecognized URL: ${rawUrl}`);
      continue;
    }

    try {
      let svgContent: string;
      let iconDisplayName: string;
      let copyright: string;

      if (heroiconParsed) {
        const { iconName, size, style } = heroiconParsed;
        const fetchSpinner = spinner.start(
          `[${i + 1}/${urls.length}] Fetching ${iconName} (${size}/${style})...`
        );
        const result = await fetchHeroicon(iconName, size, style);
        svgContent = result.svgContent;
        iconDisplayName = `${iconName}-${size}`;
        copyright = generateHeroiconsCopyright(iconName);
        fetchSpinner.succeed(`[${i + 1}/${urls.length}] Fetched ${iconDisplayName}`);
      } else if (tablerParsed) {
        const { iconName, style } = tablerParsed;
        const fetchSpinner = spinner.start(
          `[${i + 1}/${urls.length}] Fetching ${iconName} (${style})...`
        );
        const result = await fetchTablerIcon(iconName, style, 2);
        svgContent = result.svgContent;
        iconDisplayName = style === "filled" ? `${iconName}-filled` : iconName;
        copyright = generateTablerCopyright(iconName);
        fetchSpinner.succeed(`[${i + 1}/${urls.length}] Fetched ${iconDisplayName}`);
      } else {
        const fetchSpinner = spinner.start(
          `[${i + 1}/${urls.length}] Fetching ${lucideIconName}...`
        );
        const result = await fetchLucideIcon(lucideIconName!);
        svgContent = result.svgContent;
        iconDisplayName = lucideIconName!;
        copyright = generateLucideCopyright(lucideIconName!);
        fetchSpinner.succeed(`[${i + 1}/${urls.length}] Fetched ${iconDisplayName}`);
      }

      const componentName = generateIconName(
        iconDisplayName,
        config.naming.suffix,
        config.naming.componentCase
      );

      const processSpinner = spinner.start(
        `[${i + 1}/${urls.length}] Processing ${iconDisplayName}...`
      );
      const processed = await optimizeSVG(svgContent, config.optimize);
      processSpinner.succeed(`[${i + 1}/${urls.length}] Processed ${iconDisplayName}`);

      const component = await generateComponent({
        componentName,
        svgContent: processed.content,
        viewBox: processed.viewBox,
        config,
      });

      const contentWithCopyright = insertHeaderComment(component.content, copyright);
      const filePath = await writeComponentFile({
        projectRoot,
        baseDir: config.baseDir,
        iconsFolder: config.iconsFolder,
        filename: component.filename,
        content: contentWithCopyright,
      });

      if (!extensionForIndex) {
        extensionForIndex = component.extension;
      }
      successes.push({ componentName, filePath });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      failures.push({ url: rawUrl, reason });
      logger.error(`[${i + 1}/${urls.length}] Failed: ${rawUrl} (${reason})`);
    }
  }

  if (config.maintainIndex && extensionForIndex && successes.length > 0) {
    await updateIndexFile(iconsDir, extensionForIndex);
    logger.success("index.ts updated");
  }

  logger.separator();
  logger.newline();
  if (successes.length > 0) {
    logger.title(
      `${successes.length} icon${successes.length > 1 ? "s" : ""} imported successfully! 🎉`
    );
    logger.newline();
    for (const item of successes) {
      logger.print(`📁 ${path.relative(projectRoot, item.filePath)}`);
      logger.print(`   import { ${item.componentName} } from '@/components/icons';`);
    }
    logger.newline();
  }

  if (failures.length > 0) {
    logger.error(`${failures.length} URL${failures.length > 1 ? "s" : ""} failed:`);
    for (const failure of failures) {
      logger.print(`  ❌ ${failure.url}`);
      logger.print(`     ${failure.reason}`);
    }
    logger.newline();
  }
  logger.separator();
  logger.newline();
};

/**
 * Prompt user to select a library
 */
const promptLibrarySelection = async (): Promise<string | null> => {
  try {
    const answer = (await prompt({
      type: "select",
      name: "library",
      message: "Select an icon library:",
      choices: [
        { name: "lucide", message: "Lucide Icons (1700+ icons)", value: "lucide" },
        { name: "heroicons", message: "Heroicons (300+ icons)", value: "heroicons" },
        { name: "tabler", message: "Tabler Icons (5500+ icons)", value: "tabler" },
        { name: "", role: "separator" },
        { name: "request", message: "💡 Request a new library", value: "request" },
      ],
    })) as { library: string };

    return answer.library;
  } catch {
    // User cancelled
    return null;
  }
};

/**
 * Prompt user to search and select a single icon
 */
const promptIconSearchAndSelect = async (icons: IconMetadata[]): Promise<string | null> => {
  const iconChoices = icons.map((icon) => ({
    name: icon.name,
    message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(", ")})` : ""}`,
    value: icon.name,
  }));

  try {
    const autocomplete = new AutoComplete({
      name: "icon",
      message: "Search for an icon:",
      limit: 15,
      choices: iconChoices,
      suggest(input: string, choices: Record<string, unknown>[]) {
        if (!input) {return choices.slice(0, 15);}

        return rankIcons(icons, input).slice(0, 15).map((icon) => ({
          name: icon.name,
          message: `${icon.name}${icon.tags.length > 0 ? ` (${icon.tags.slice(0, 3).join(", ")})` : ""}`,
          value: icon.name,
        }));
      },
    });

    const selected = await autocomplete.run();
    return selected as string;
  } catch {
    // User cancelled
    return null;
  }
};
