import { updateConfig } from "@/config/manager.js";
import { Config } from "@/config/schema.js";
import { validateConfigPath } from "@/config/validator.js";
import { generateComponent } from "@/core/component-generator.js";
import { writeComponentFile } from "@/core/file-writer.js";
import { updateIndexFile } from "@/core/index-maintainer.js";
import { optimizeSVG } from "@/core/svg-processor.js";
import { fetchSVGFromURL } from "@/core/url-fetcher.js";
import { fetchLucideIcon, fetchLucideIcons, generateLucideCopyright } from "@/library/lucide.js";
import { IconMetadata } from "@/library/types.js";
import { logger, spinner } from "@/utils/logger.js";
import {
  extractIconNameFromURL,
  extractLucideIconNameFromURL,
  generateIconName,
} from "@/utils/naming.js";
import { isValidSVG } from "@/utils/validation.js";
import enquirer from "enquirer";
import fs from "fs/promises";
import path from "path";
import {
  promptConfirmIconName,
  promptCreateAnother,
  promptIconName,
  promptMultipleURLs,
  promptSVGContent,
  promptSVGSource,
  promptSVGURL,
} from "./prompts.js";

const { AutoComplete, prompt } = enquirer as any;

export interface InteractiveOptions {
  projectRoot: string;
  config: Config;
}

/**
 * Run interactive icon creation flow
 */
export const runInteractive = async (options: InteractiveOptions): Promise<void> => {
  const { projectRoot, config: initialConfig } = options;
  let config = initialConfig;

  // Validate config path
  const validation = await validateConfigPath(projectRoot, config);
  if (!validation.valid) {
    logger.error("Setup cancelled");
    return;
  }

  if (validation.updatedConfig) {
    config = validation.updatedConfig;
    await updateConfig(projectRoot, config);
  }

  let createAnother = true;
  let previousSource: "paste" | "url" | "file" | "library" | null = null;
  let previousLibraryMode: "search" | "urls" | null = null;
  let cachedLucideIcons: IconMetadata[] | null = null;

  while (createAnother) {
    try {
      // Resume directly in library search flow when user chose "create another"
      let source: "paste" | "url" | "file" | "library";
      const shouldResumeLibrarySearch =
        previousSource === "library" &&
        previousLibraryMode === "search" &&
        cachedLucideIcons !== null;

      if (shouldResumeLibrarySearch) {
        source = "library";
      } else {
        const sourceAnswer = await promptSVGSource();
        source = sourceAnswer.source;
      }

      let svgContent: string;
      let suggestedName: string | null = null;
      let copyrightHeader: string | null = null;
      let currentLibraryMode: "search" | "urls" | null = null;

      // Get SVG content based on source
      if (source === "library") {
        const shouldResumeLibrarySearch =
          previousSource === "library" &&
          previousLibraryMode === "search" &&
          cachedLucideIcons !== null;

        if (!shouldResumeLibrarySearch) {
          const libraryAnswer = (await prompt({
            type: "select",
            name: "library",
            message: "Select an icon library:",
            choices: [
              { name: "lucide", message: "Lucide Icons (1700+ icons)", value: "lucide" },
              { name: "separator", role: "separator" },
              { name: "request", message: "💡 Request a new library", value: "request" },
            ],
          })) as { library: string };

          if (libraryAnswer.library === "request") {
            const issueUrl =
              "https://github.com/Steellgold/mkicon/issues/new?template=library-request.yml";
            logger.info("Opening GitHub to request a new library...");
            logger.newline();
            console.log("Please open this URL in your browser:");
            console.log(issueUrl);
            logger.newline();
            logger.info("Thank you for your suggestion! 🙏");
            logger.newline();
            createAnother = await promptCreateAnother();
            previousSource = null;
            previousLibraryMode = null;
            cachedLucideIcons = null;
            continue;
          }

          const methodAnswer = (await prompt({
            type: "select",
            name: "method",
            message: "How do you want to import icons?",
            choices: [
              { name: "search", message: "Search and Select", value: "search" },
              { name: "urls", message: "From URL's", value: "urls" },
            ],
          })) as { method: "search" | "urls" };

          currentLibraryMode = methodAnswer.method;
        } else {
          currentLibraryMode = "search";
        }

        if (currentLibraryMode === "urls") {
          logger.newline();
          const urls = await promptMultipleURLs();

          if (urls.length === 0) {
            logger.info("No URL provided");
            createAnother = await promptCreateAnother();
            previousSource = null;
            previousLibraryMode = null;
            cachedLucideIcons = null;
            continue;
          }

          const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
          const failures: Array<{ url: string; reason: string }> = [];
          let successCount = 0;
          let extensionForIndex: string | null = null;

          for (let i = 0; i < urls.length; i += 1) {
            const url = urls[i];
            const iconName = extractLucideIconNameFromURL(url);

            if (!iconName) {
              failures.push({ url, reason: "Invalid Lucide icon URL" });
              logger.error(`[${i + 1}/${urls.length}] Invalid Lucide URL: ${url}`);
              continue;
            }

            try {
              const fetchSpinner = spinner.start(
                `[${i + 1}/${urls.length}] Fetching ${iconName}...`
              );
              const { svgContent: libSvg, metadata } = await fetchLucideIcon(iconName);
              fetchSpinner.succeed(`[${i + 1}/${urls.length}] Fetched ${iconName}`);

              const componentName = generateIconName(
                iconName,
                config.naming.suffix,
                config.naming.componentCase
              );

              const processSpinner = spinner.start(
                `[${i + 1}/${urls.length}] Processing ${iconName}...`
              );
              const processed = await optimizeSVG(libSvg, config.optimize);
              processSpinner.succeed(`[${i + 1}/${urls.length}] Processed ${iconName}`);

              const component = await generateComponent({
                componentName,
                svgContent: processed.content,
                viewBox: processed.viewBox,
                config,
              });

              const copyright = generateLucideCopyright(metadata.iconName);
              const contentWithCopyright = `${copyright}\n\n${component.content}`;

              await writeComponentFile({
                projectRoot,
                baseDir: config.baseDir,
                iconsFolder: config.iconsFolder,
                filename: component.filename,
                content: contentWithCopyright,
              });

              if (!extensionForIndex) {
                extensionForIndex = component.extension;
              }
              successCount += 1;
            } catch (error) {
              const reason = error instanceof Error ? error.message : "Unknown error";
              failures.push({ url, reason });
              logger.error(`[${i + 1}/${urls.length}] Failed: ${url} (${reason})`);
            }
          }

          if (config.maintainIndex && extensionForIndex && successCount > 0) {
            await updateIndexFile(iconsDir, extensionForIndex);
            logger.success("index.ts updated");
          }

          logger.separator();
          logger.newline();
          if (successCount > 0) {
            logger.title(
              `${successCount} icon${successCount > 1 ? "s" : ""} imported successfully! 🎉`
            );
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

          createAnother = await promptCreateAnother();
          previousSource = null;
          previousLibraryMode = null;
          cachedLucideIcons = null;
          if (createAnother) {
            logger.newline();
          }
          continue;
        }

        let icons: IconMetadata[];
        if (cachedLucideIcons) {
          icons = cachedLucideIcons;
        } else {
          const fetchSpinner = spinner.start("Loading Lucide Icons...");
          icons = await fetchLucideIcons();
          fetchSpinner.succeed(`Loaded ${icons.length} icons from Lucide`);
          logger.newline();
          cachedLucideIcons = icons;
        }

        const iconChoices = icons.map((icon) => ({
          name: icon.name,
          message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(", ")})` : ""}`,
          value: icon.name,
        }));

        const autocomplete = new AutoComplete({
          name: "icon",
          message: "Search for an icon:",
          limit: 15,
          choices: iconChoices,
          suggest(input: string, choices: any[]) {
            if (!input) return choices.slice(0, 15);

            const lowerInput = input.toLowerCase();
            const matchingIcons = icons.filter((icon) => {
              if (icon.name.toLowerCase().includes(lowerInput)) return true;
              return icon.tags.some((tag: string) => tag.toLowerCase().includes(lowerInput));
            });

            return matchingIcons.slice(0, 15).map((icon) => ({
              name: icon.name,
              message: `${icon.name} ${icon.tags.length > 0 ? `(${icon.tags.slice(0, 3).join(", ")})` : ""}`,
              value: icon.name,
            }));
          },
        });

        const selectedIcon = (await autocomplete.run()) as string;
        suggestedName = selectedIcon;

        logger.newline();
        const { svgContent: libSvg, metadata } = await fetchLucideIcon(selectedIcon);
        svgContent = libSvg;
        copyrightHeader = generateLucideCopyright(metadata.iconName);
      } else if (source === "paste") {
        svgContent = await promptSVGContent();
        previousSource = null;
        previousLibraryMode = null;
        cachedLucideIcons = null;
      } else if (source === "url") {
        const url = await promptSVGURL();

        // Extract suggested name from URL
        suggestedName = extractIconNameFromURL(url);

        const loadSpinner = spinner.start("Fetching SVG from URL...");

        try {
          svgContent = await fetchSVGFromURL(url);
          loadSpinner.succeed("SVG fetched successfully");
        } catch (error) {
          loadSpinner.fail("Failed to fetch SVG");
          throw error;
        }
        previousSource = null;
        previousLibraryMode = null;
        cachedLucideIcons = null;
      } else {
        // file source
        const filePath = await promptSVGContent(); // TODO: Use file prompt
        svgContent = await fs.readFile(filePath, "utf-8");
        previousSource = null;
        previousLibraryMode = null;
        cachedLucideIcons = null;
      }

      // Validate SVG
      if (!isValidSVG(svgContent)) {
        logger.error("Invalid SVG content");
        continue;
      }

      // Ask for icon name (with suggestion if available)
      let iconName: string;

      if (suggestedName) {
        const useSuggested = await promptConfirmIconName(suggestedName);
        if (useSuggested) {
          iconName = suggestedName;
        } else {
          iconName = await promptIconName();
        }
      } else {
        iconName = await promptIconName();
      }
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

      logger.success(`ViewBox detected: ${processed.viewBox}`);

      // Generate component
      logger.newline();
      const genSpinner = spinner.start("Generating component...");
      const component = await generateComponent({
        componentName,
        svgContent: processed.content,
        viewBox: processed.viewBox,
        config,
      });

      // Add copyright header if from library
      const finalContent = copyrightHeader
        ? `${copyrightHeader}\n\n${component.content}`
        : component.content;

      genSpinner.succeed(`${component.filename} generated`);

      // Write file
      const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
      const filePath = await writeComponentFile({
        projectRoot,
        baseDir: config.baseDir,
        iconsFolder: config.iconsFolder,
        filename: component.filename,
        content: finalContent,
      });

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
      console.log(`📁 ${path.relative(projectRoot, filePath)}`);
      logger.newline();
      console.log("Import:");
      console.log(`  import { ${componentName} } from '@/components/icons';`);
      logger.newline();
      console.log("Usage:");
      console.log(`  <${componentName} size={24} color="blue" />`);
      logger.separator();
      logger.newline();

      if (source === "library") {
        previousSource = "library";
        previousLibraryMode = "search";
      }

      // Ask if user wants to create another
      createAnother = await promptCreateAnother();

      if (!createAnother) {
        previousSource = null;
        previousLibraryMode = null;
        cachedLucideIcons = null;
      }

      if (createAnother) {
        logger.newline();
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error("An error occurred");
      }

      previousSource = null;
      previousLibraryMode = null;
      cachedLucideIcons = null;
      createAnother = await promptCreateAnother();
    }
  }

  logger.info("Goodbye! 👋");
};
