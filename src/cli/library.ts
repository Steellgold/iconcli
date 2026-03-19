import type { Config } from "@/config/schema";
import { generateComponent } from "@/core/component-generator";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { optimizeSVG } from "@/core/svg-processor";
import { fetchLucideIcon, fetchLucideIcons, generateLucideCopyright } from "@/library/lucide";
import type { IconMetadata } from "@/library/types";
import { logger, spinner } from "@/utils/logger";
import { extractLucideIconNameFromURL, generateIconName } from "@/utils/naming";
import enquirer from "enquirer";
import path from "path";
import { promptMultipleURLs } from "./prompts";

const { prompt, AutoComplete } = enquirer as any;

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
      console.log(`Please open this URL in your browser:`);
      console.log(issueUrl);
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
      await importSingleFromSearch(projectRoot, config);
      return;
    }

    await importMultipleFromURLs(projectRoot, config);
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
  const contentWithCopyright = `${copyright}\n\n${component.content}`;
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
  console.log(`📁 ${path.relative(projectRoot, filePath)}`);
  console.log(`📚 From: Lucide Icons (${metadata.library.website})`);
  logger.newline();
  console.log("Import:");
  console.log(`  import { ${componentName} } from '@/components/icons';`);
  logger.newline();
  console.log("Usage:");
  console.log(`  <${componentName} size={24} color="blue" />`);
  logger.separator();
  logger.newline();
};

const importMultipleFromURLs = async (projectRoot: string, config: Config): Promise<void> => {
  logger.newline();
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
    const iconName = extractLucideIconNameFromURL(rawUrl);
    if (!iconName) {
      failures.push({ url: rawUrl, reason: "Invalid Lucide icon URL" });
      logger.error(`[${i + 1}/${urls.length}] Invalid Lucide URL: ${rawUrl}`);
      continue;
    }

    try {
      const fetchSpinner = spinner.start(`[${i + 1}/${urls.length}] Fetching ${iconName}...`);
      const { svgContent, metadata } = await fetchLucideIcon(iconName);
      fetchSpinner.succeed(`[${i + 1}/${urls.length}] Fetched ${iconName}`);

      const componentName = generateIconName(
        iconName,
        config.naming.suffix,
        config.naming.componentCase
      );

      const processSpinner = spinner.start(`[${i + 1}/${urls.length}] Processing ${iconName}...`);
      const processed = await optimizeSVG(svgContent, config.optimize);
      processSpinner.succeed(`[${i + 1}/${urls.length}] Processed ${iconName}`);

      const component = await generateComponent({
        componentName,
        svgContent: processed.content,
        viewBox: processed.viewBox,
        config,
      });

      const copyright = generateLucideCopyright(metadata.iconName);
      const contentWithCopyright = `${copyright}\n\n${component.content}`;
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
      console.log(`📁 ${path.relative(projectRoot, item.filePath)}`);
      console.log(`   import { ${item.componentName} } from '@/components/icons';`);
    }
    logger.newline();
  }

  if (failures.length > 0) {
    logger.error(`${failures.length} URL${failures.length > 1 ? "s" : ""} failed:`);
    for (const failure of failures) {
      console.log(`  ❌ ${failure.url}`);
      console.log(`     ${failure.reason}`);
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
        { name: "", role: "separator" },
        { name: "request", message: "💡 Request a new library", value: "request" },
      ],
    })) as { library: string };

    return answer.library;
  } catch (error) {
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
      suggest(input: string, choices: any[]) {
        if (!input) {return choices.slice(0, 15);}

        const lowerInput = input.toLowerCase();

        const matchingIcons = icons.filter((icon) => {
          if (icon.name.toLowerCase().includes(lowerInput)) {return true;}
          return icon.tags.some((tag: string) => tag.toLowerCase().includes(lowerInput));
        });

        return matchingIcons.slice(0, 15).map((icon) => ({
          name: icon.name,
          message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(", ")})` : ""}`,
          value: icon.name,
        }));
      },
    });

    const selected = await autocomplete.run();
    return selected as string;
  } catch (error) {
    // User cancelled
    return null;
  }
};
