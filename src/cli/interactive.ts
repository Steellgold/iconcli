import { updateConfig } from "@/config/manager";
import type { Config } from "@/config/schema";
import { validateConfigPath } from "@/config/validator";
import { generateComponent } from "@/core/component-generator";
import { trackGeneratedComponent } from "@/core/diff-checker";
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
import {
  fetchTablerIcon,
  fetchTablerIconList,
  generateTablerCopyright,
  parseTablerURL,
} from "@/library/tabler";
import type { TablerStroke, TablerStyle } from "@/library/tabler";
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
  promptTablerStroke,
  promptTablerStyle,
} from "./prompts";
import { runFigmaImport } from "./figma";
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
  let cachedTablerIcons: IconMetadata[] | null = null;
  let selectedLibrary: "lucide" | "heroicons" | "tabler" = "lucide";

  while (createAnother) {
    try {
      // Resume directly in library search flow when user chose "create another"
      let source: "paste" | "url" | "file" | "library" | "figma";
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

      // Figma: delegate entirely to the figma flow then loop back
      if (source === "figma") {
        await runFigmaImport({ projectRoot, config });
        createAnother = await promptCreateAnother();
        previousSource = null;
        continue;
      }

      let svgContent: string;
      let suggestedName: string | null = null;
      let copyrightHeader: string | null = null;
      let currentLibraryMode: "search" | "urls" | null = null;
      let svgSourcePath = "source:paste";
      let iconLibrary: string | undefined;
      let iconLibraryName: string | undefined;
      let libraryIconSize: number | undefined;

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
              { name: "tabler", message: "Tabler Icons (5500+ icons)", value: "tabler" },
              { name: "separator", role: "separator" },
              { name: "request", message: "💡 Request a new library", value: "request" },
            ],
          })) as { library: string };

          selectedLibrary =
            libraryAnswer.library === "heroicons" ? "heroicons" :
            libraryAnswer.library === "tabler" ? "tabler" : "lucide";

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

            // Try Heroicons URL first, then Tabler, then Lucide
            const { parseHeroiconURL } = await import("@/library/heroicons");
            const heroiconParsed = parseHeroiconURL(url);
            const tablerParsed = !heroiconParsed ? parseTablerURL(url) : null;
            const lucideIconName = !heroiconParsed && !tablerParsed ? extractLucideIconNameFromURL(url) : null;

            if (!heroiconParsed && !tablerParsed && !lucideIconName) {
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
              } else if (tablerParsed) {
                const { iconName, style } = tablerParsed;
                const fetchSpinner = spinner.start(
                  `[${i + 1}/${urls.length}] Fetching ${iconName} (${style})...`
                );
                const result = await fetchTablerIcon(iconName, style, 2);
                libSvg = result.svgContent;
                iconDisplayName = style === "filled" ? `${iconName}-filled` : iconName;
                copyright = generateTablerCopyright(iconName);
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

              const iconName = heroiconParsed
                ? `${heroiconParsed.iconName}-${heroiconParsed.size}`
                : tablerParsed
                  ? (tablerParsed.style === "filled" ? `${tablerParsed.iconName}-filled` : tablerParsed.iconName)
                  : lucideIconName!;

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

              await trackGeneratedComponent(
                projectRoot,
                component.filename,
                componentName,
                url,
                processed.content,
                {
                  library: heroiconParsed ? "heroicons" : tablerParsed ? "tabler" : "lucide",
                  libraryIconName: heroiconParsed
                    ? heroiconParsed.iconName
                    : tablerParsed
                      ? tablerParsed.iconName
                      : lucideIconName!,
                  ...(heroiconParsed ? { iconSize: heroiconParsed.size } : {}),
                }
              );

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

        // ── Load icon list ──────────────────────────────────────────────────
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
        } else if (selectedLibrary === "tabler") {
          if (cachedTablerIcons) {
            icons = cachedTablerIcons;
          } else {
            const fetchSpinner = spinner.start("Loading Tabler Icons...");
            icons = await fetchTablerIconList();
            fetchSpinner.succeed(`Loaded ${icons.length} icons from Tabler Icons`);
            logger.newline();
            cachedTablerIcons = icons;
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

        // ── For Heroicons, ask size/style once for the whole batch ──────────
        let heroiconBulkSize: number | undefined;
        let heroiconBulkStyle: string | undefined;
        if (selectedLibrary === "heroicons") {
          heroiconBulkSize = await promptHeroiconSize();
          heroiconBulkStyle = await promptHeroiconStyle(heroiconBulkSize as Parameters<typeof promptHeroiconStyle>[0]);
          logger.newline();
        }

        // ── For Tabler Icons, ask style/stroke once for the whole batch ─────
        let tablerBulkStyle: TablerStyle | undefined;
        let tablerBulkStroke: TablerStroke | undefined;
        if (selectedLibrary === "tabler") {
          tablerBulkStyle = await promptTablerStyle();
          if (tablerBulkStyle === "outline") {
            tablerBulkStroke = await promptTablerStroke();
          }
          logger.newline();
        }

        // ── Multi-select loop ────────────────────────────────────────────────
        const selectedIconNames: string[] = [];

        while (true) {
          const doneLabel =
            selectedIconNames.length > 0
              ? `✓  Done  (${selectedIconNames.length} selected)`
              : "✓  Done — skip";

          const availableChoices = icons
            .filter((icon) => !selectedIconNames.includes(icon.name))
            .map((icon) => ({
              name: icon.name,
              message: `${icon.name}${icon.tags.length > 0 ? `  (${icon.tags.slice(0, 3).join(", ")})` : ""}`,
              value: icon.name,
            }));

          const allChoices = [
            { name: "__done__", message: doneLabel, value: "__done__" },
            ...availableChoices,
          ];

          const ac = new AutoComplete({
            name: "icon",
            message:
              selectedIconNames.length > 0
                ? `Search icons  [${selectedIconNames.length} selected — add more or choose Done]:`
                : "Search for an icon:",
            limit: 15,
            choices: allChoices,
            suggest(input: string, choices: Record<string, unknown>[]) {
              type C = { name: string; message: string; value: string };
              const doneChoice = choices.find((c) => (c as C).name === "__done__") as C | undefined;
              if (!input) {
                return [doneChoice, ...choices.filter((c) => (c as C).name !== "__done__").slice(0, 14)];
              }
              const lowerInput = input.toLowerCase();
              const matches = icons
                .filter((icon) => !selectedIconNames.includes(icon.name))
                .filter((icon) => {
                  if (icon.name.toLowerCase().includes(lowerInput)) return true;
                  return icon.tags.some((tag: string) => tag.toLowerCase().includes(lowerInput));
                });
              return [
                doneChoice,
                ...matches.slice(0, 14).map((icon) => ({
                  name: icon.name,
                  message: `${icon.name}${icon.tags.length > 0 ? `  (${icon.tags.slice(0, 3).join(", ")})` : ""}`,
                  value: icon.name,
                })),
              ];
            },
          });

          const picked = (await ac.run()) as string;
          if (picked === "__done__") break;
          selectedIconNames.push(picked);
        }

        if (selectedIconNames.length === 0) {
          logger.info("No icons selected.");
          createAnother = await promptCreateAnother();
          previousSource = null;
          previousLibraryMode = null;
          if (createAnother) logger.newline();
          continue;
        }

        // ── Fetch, process, write all selected icons ─────────────────────────
        const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
        const failures: Array<{ name: string; reason: string }> = [];
        let successCount = 0;
        let extensionForIndex: string | null = null;

        for (let i = 0; i < selectedIconNames.length; i += 1) {
          const iconName = selectedIconNames[i];
          const prefix = `[${i + 1}/${selectedIconNames.length}]`;

          try {
            let libSvg: string;
            let iconDisplayName: string;
            let copyright: string;
            let iconNameForComponent: string;
            let iconSizeForEntry: number | undefined;

            if (selectedLibrary === "heroicons") {
              const fetchSpinner = spinner.start(`${prefix} Fetching ${iconName}...`);
              const result = await fetchHeroicon(
                iconName,
                heroiconBulkSize as Parameters<typeof fetchHeroicon>[1],
                heroiconBulkStyle as Parameters<typeof fetchHeroicon>[2]
              );
              libSvg = result.svgContent;
              iconDisplayName = `${iconName}-${heroiconBulkSize}`;
              copyright = generateHeroiconsCopyright(iconName);
              iconNameForComponent = iconDisplayName;
              iconSizeForEntry = heroiconBulkSize;
              fetchSpinner.succeed(`${prefix} Fetched ${iconDisplayName}`);
            } else if (selectedLibrary === "tabler") {
              const fetchSpinner = spinner.start(`${prefix} Fetching ${iconName}...`);
              const result = await fetchTablerIcon(
                iconName,
                tablerBulkStyle!,
                tablerBulkStroke ?? 2
              );
              libSvg = result.svgContent;
              iconDisplayName = tablerBulkStyle === "filled" ? `${iconName}-filled` : iconName;
              copyright = generateTablerCopyright(iconName);
              iconNameForComponent = iconDisplayName;
              fetchSpinner.succeed(`${prefix} Fetched ${iconDisplayName}`);
            } else {
              const fetchSpinner = spinner.start(`${prefix} Fetching ${iconName}...`);
              const result = await fetchLucideIcon(iconName);
              libSvg = result.svgContent;
              iconDisplayName = iconName;
              copyright = generateLucideCopyright(result.metadata.iconName);
              iconNameForComponent = iconName;
              fetchSpinner.succeed(`${prefix} Fetched ${iconDisplayName}`);
            }

            const componentName = generateIconName(
              iconNameForComponent,
              config.naming.suffix,
              config.naming.componentCase
            );

            const processSpinner = spinner.start(`${prefix} Processing ${iconDisplayName}...`);
            const processed = await optimizeSVG(libSvg, config.optimize);
            processSpinner.succeed(`${prefix} Processed ${iconDisplayName}`);

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

            await trackGeneratedComponent(
              projectRoot,
              component.filename,
              componentName,
              `library:${selectedLibrary}/${iconName}`,
              processed.content,
              {
                library: selectedLibrary,
                libraryIconName: iconName,
                ...(iconSizeForEntry !== undefined ? { iconSize: iconSizeForEntry } : {}),
              }
            );

            if (!extensionForIndex) extensionForIndex = component.extension;
            successCount += 1;
          } catch (error) {
            const reason = error instanceof Error ? error.message : "Unknown error";
            failures.push({ name: iconName, reason });
            logger.error(`${prefix} Failed: ${iconName} (${reason})`);
          }
        }

        if (config.maintainIndex && extensionForIndex && successCount > 0) {
          await updateIndexFile(iconsDir, extensionForIndex);
          logger.success("index.ts updated");
        }

        logger.separator();
        logger.newline();
        if (successCount > 0) {
          logger.title(`${successCount} icon${successCount !== 1 ? "s" : ""} imported successfully! 🎉`);
          logger.newline();
        }
        if (failures.length > 0) {
          logger.error(`${failures.length} failed:`);
          for (const failure of failures) {
            logger.print(`  ❌ ${failure.name}: ${failure.reason}`);
          }
          logger.newline();
        }
        logger.separator();
        logger.newline();

        previousSource = "library";
        previousLibraryMode = "search";
        createAnother = await promptCreateAnother();
        if (!createAnother) {
          previousSource = null;
          previousLibraryMode = null;
          cachedLucideIcons = null;
          cachedHeroicons = null;
        cachedTablerIcons = null;
        }
        if (createAnother) logger.newline();
        continue;
      } else if (source === "paste") {
        svgContent = await promptSVGContent();
        suggestedName = detectIconNameFromSvg(svgContent);
        svgSourcePath = "source:paste";
        previousSource = null;
        previousLibraryMode = null;
        cachedLucideIcons = null;
      } else if (source === "url") {
        const url = await promptSVGURL();

        // Extract suggested name from URL
        suggestedName = extractIconNameFromURL(url);
        svgSourcePath = url;

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
        svgSourcePath = filePath;
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

      await trackGeneratedComponent(
        projectRoot,
        component.filename,
        componentName,
        svgSourcePath,
        processed.content,
        {
          ...(iconSizeMeta !== null ? { iconSize: iconSizeMeta } : libraryIconSize !== undefined ? { iconSize: libraryIconSize } : {}),
          ...(iconLibrary ? { library: iconLibrary } : {}),
          ...(iconLibraryName ? { libraryIconName: iconLibraryName } : {}),
        }
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
        cachedTablerIcons = null;
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
