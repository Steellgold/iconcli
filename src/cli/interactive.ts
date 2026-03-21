import { updateConfig } from "@/config/manager";
import type { Config } from "@/config/schema";
import { validateConfigPath } from "@/config/validator";
import { generateComponent } from "@/core/component-generator";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { optimizeSVG } from "@/core/svg-processor";
import { fetchSVGFromURL } from "@/core/url-fetcher";
import { fetchLucideIcon, fetchLucideIcons, generateLucideCopyright } from "@/library/lucide";
import {
  fetchHeroicon,
  fetchHeroiconList,
  generateHeroiconsCopyright,
} from "@/library/heroicons";
import type { IconMetadata } from "@/library/types";
import { logger, spinner } from "@/utils/logger";
import {
  extractIconNameFromURL,
  extractLucideIconNameFromURL,
  generateIconName,
} from "@/utils/naming";
import { isValidSVG } from "@/utils/validation";
import { previewSVGSideBySide } from "@/utils/svg-preview";
import { insertHeaderComment } from "@/utils/header";
import enquirer from "enquirer";
import fs from "fs/promises";
import path from "path";
import {
  promptCreateAnother,
  promptHeroiconSize,
  promptHeroiconStyle,
  promptIconName,
  promptIconSize,
  promptMultipleURLs,
  promptSVGContent,
  promptSVGSource,
  promptSVGURL,
} from "./prompts";
import { detectIconNameFromSvg } from "@/utils/svg-detector";

type EnquirerExt = {
  prompt: <T>(options: Record<string, unknown> | Record<string, unknown>[]) => Promise<T>;
  AutoComplete: new (options: Record<string, unknown>) => { run: () => Promise<unknown> };
};
const { AutoComplete, prompt } = enquirer as unknown as EnquirerExt;

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
  let cachedHeroicons: IconMetadata[] | null = null;
  let selectedLibrary: "lucide" | "heroicons" = "lucide";

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
              { name: "heroicons", message: "Heroicons (300+ icons)", value: "heroicons" },
              { name: "separator", role: "separator" },
              { name: "request", message: "💡 Request a new library", value: "request" },
            ],
          })) as { library: string };

          selectedLibrary = libraryAnswer.library === "heroicons" ? "heroicons" : "lucide";

          if (libraryAnswer.library === "request") {
            const issueUrl =
              "https://github.com/Steellgold/mkicon/issues/new?template=library-request.yml";
            logger.info("Opening GitHub to request a new library...");
            logger.newline();
            logger.print("Please open this URL in your browser:");
            logger.print(issueUrl);
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

            // Try Heroicons URL first, then Lucide
            const { parseHeroiconURL } = await import("@/library/heroicons");
            const heroiconParsed = parseHeroiconURL(url);
            const lucideIconName = !heroiconParsed ? extractLucideIconNameFromURL(url) : null;

            if (!heroiconParsed && !lucideIconName) {
              failures.push({ url, reason: "Unrecognized library URL" });
              logger.error(`[${i + 1}/${urls.length}] Unrecognized URL: ${url}`);
              continue;
            }

            try {
              let libSvg: string;
              let iconDisplayName: string;
              let copyright: string;

              if (heroiconParsed) {
                const { iconName, size, style } = heroiconParsed;
                const fetchSpinner = spinner.start(
                  `[${i + 1}/${urls.length}] Fetching ${iconName} (${size}/${style})...`
                );
                const result = await fetchHeroicon(iconName, size, style);
                libSvg = result.svgContent;
                iconDisplayName = `${iconName}-${size}`;
                copyright = generateHeroiconsCopyright(iconName);
                fetchSpinner.succeed(`[${i + 1}/${urls.length}] Fetched ${iconDisplayName}`);
              } else {
                const fetchSpinner = spinner.start(
                  `[${i + 1}/${urls.length}] Fetching ${lucideIconName}...`
                );
                const result = await fetchLucideIcon(lucideIconName!);
                libSvg = result.svgContent;
                iconDisplayName = lucideIconName!;
                copyright = generateLucideCopyright(lucideIconName!);
                fetchSpinner.succeed(`[${i + 1}/${urls.length}] Fetched ${iconDisplayName}`);
              }

              const iconName = heroiconParsed ? `${heroiconParsed.iconName}-${heroiconParsed.size}` : lucideIconName!;

              const componentName = generateIconName(
                iconName,
                config.naming.suffix,
                config.naming.componentCase
              );

              const processSpinner = spinner.start(
                `[${i + 1}/${urls.length}] Processing ${iconDisplayName}...`
              );
              const processed = await optimizeSVG(libSvg, config.optimize);
              processSpinner.succeed(`[${i + 1}/${urls.length}] Processed ${iconDisplayName}`);

              const component = await generateComponent({
                componentName,
                svgContent: processed.content,
                viewBox: processed.viewBox,
                config,
              });

              const contentWithCopyright = insertHeaderComment(component.content, copyright);

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
              logger.print(`  ❌ ${failure.url}`);
              logger.print(`     ${failure.reason}`);
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
        if (selectedLibrary === "heroicons") {
          if (cachedHeroicons) {
            icons = cachedHeroicons;
          } else {
            const fetchSpinner = spinner.start("Loading Heroicons...");
            icons = await fetchHeroiconList();
            fetchSpinner.succeed(`Loaded ${icons.length} icons from Heroicons`);
            logger.newline();
            cachedHeroicons = icons;
          }
        } else {
          if (cachedLucideIcons) {
            icons = cachedLucideIcons;
          } else {
            const fetchSpinner = spinner.start("Loading Lucide Icons...");
            icons = await fetchLucideIcons();
            fetchSpinner.succeed(`Loaded ${icons.length} icons from Lucide`);
            logger.newline();
            cachedLucideIcons = icons;
          }
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
          suggest(input: string, choices: Record<string, unknown>[]) {
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

        const selectedIcon = (await autocomplete.run()) as string;

        logger.newline();

        if (selectedLibrary === "heroicons") {
          const size = await promptHeroiconSize();
          const style = await promptHeroiconStyle(size);
          const { svgContent: libSvg } = await fetchHeroicon(selectedIcon, size, style);
          svgContent = libSvg;
          suggestedName = `${selectedIcon}-${size}`;
          copyrightHeader = generateHeroiconsCopyright(selectedIcon);
        } else {
          const { svgContent: libSvg, metadata } = await fetchLucideIcon(selectedIcon);
          svgContent = libSvg;
          suggestedName = selectedIcon;
          copyrightHeader = generateLucideCopyright(metadata.iconName);
        }
      } else if (source === "paste") {
        svgContent = await promptSVGContent();
        suggestedName = detectIconNameFromSvg(svgContent);
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

      // Ask for icon name — pre-filled if a name was detected/suggested
      const iconName = await promptIconName(suggestedName ?? undefined);
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

      // Show SVG preview with info panel
      await previewSVGSideBySide(processed.content, [
        { label: "Component", value: componentName },
        { label: "Framework", value: config.framework },
        { label: "ViewBox", value: processed.viewBox },
        {
          label: "Size",
          value:
            config.optimize && processed.optimizedSize < processed.originalSize
              ? `${processed.originalSize}B → ${processed.optimizedSize}B`
              : `${processed.originalSize}B`,
        },
      ]);

      // Optional size metadata for non-library sources
      let iconSizeMeta: number | null = null;
      if (source !== "library") {
        iconSizeMeta = await promptIconSize();
      }

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
        ? insertHeaderComment(component.content, copyrightHeader)
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
      logger.print(`📁 ${path.relative(projectRoot, filePath)}`);
      if (iconSizeMeta !== null) {
        logger.print(`📐 Size: ${iconSizeMeta}px`);
      }
      logger.newline();
      logger.print("Import:");
      logger.print(`  import { ${componentName} } from '@/components/icons';`);
      logger.newline();
      logger.print("Usage:");
      logger.print(`  <${componentName} size={24} color="blue" />`);
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
        cachedHeroicons = null;
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
      cachedHeroicons = null;
      createAnother = await promptCreateAnother();
    }
  }

  logger.info("Goodbye! 👋");
};
