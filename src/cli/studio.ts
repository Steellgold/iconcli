import type { Config } from "@/config/schema";
import { generateComponent } from "@/core/component-generator";
import { readLockFile, writeLockFile, trackGeneratedComponent } from "@/core/diff-checker";
import { writeComponentFile } from "@/core/file-writer";
import { updateIndexFile } from "@/core/index-maintainer";
import { optimizeSVG } from "@/core/svg-processor";
import { generateVariantComponent } from "@/core/variant-generator";
import { fetchSVGFromURL } from "@/core/url-fetcher";
import { fetchLucideIcon, fetchLucideIcons, generateLucideCopyright } from "@/library/lucide";
import { fetchHeroicon, fetchHeroiconList, generateHeroiconsCopyright } from "@/library/heroicons";
import { fetchTablerIcon, fetchTablerIconList, generateTablerCopyright } from "@/library/tabler";
import type { TablerStroke, TablerStyle } from "@/library/tabler";
import { generateIconName } from "@/utils/naming";
import { isValidSVG } from "@/utils/validation";
import { insertHeaderComment } from "@/utils/header";
import { logger } from "@/utils/logger";
import type { DirectionVariant, VariantComponentData } from "@/types/variants";
import { generateStudioHTML } from "./studio-html";
import http from "node:http";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export interface StudioOptions {
  projectRoot: string;
  config: Config;
}

const PORT = 2004;

const openBrowser = (url: string): void => {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {/* ignore */});
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += String(chunk); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const json = (res: http.ServerResponse, data: unknown, status = 200): void => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  });
  res.end(JSON.stringify(data));
};

// Server-side library cache
let cachedLucideIcons: Awaited<ReturnType<typeof fetchLucideIcons>> | null = null;
let cachedHeroicons: Awaited<ReturnType<typeof fetchHeroiconList>> | null = null;
let cachedTablerIcons: Awaited<ReturnType<typeof fetchTablerIconList>> | null = null;

export const runStudio = async ({ projectRoot, config }: StudioOptions): Promise<void> => {
  const html = generateStudioHTML(config);

  const server = http.createServer(async (req, res) => {
    const base = `http://localhost:${PORT}`;
    const url = new URL(req.url ?? "/", base);
    const { pathname } = url;
    const method = req.method ?? "GET";

    try {
      // ── Static ──────────────────────────────────────────────────────────
      if (method === "GET" && pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      // ── Icons list (lock file) ───────────────────────────────────────────
      if (method === "GET" && pathname === "/api/icons") {
        json(res, await readLockFile(projectRoot));
        return;
      }

      // ── Library icon list ────────────────────────────────────────────────
      // GET /api/library?lib=lucide|heroicons
      if (method === "GET" && pathname === "/api/library") {
        const lib = url.searchParams.get("lib") ?? "lucide";
        if (lib === "heroicons") {
          if (!cachedHeroicons) cachedHeroicons = await fetchHeroiconList();
          json(res, cachedHeroicons);
        } else if (lib === "tabler") {
          if (!cachedTablerIcons) cachedTablerIcons = await fetchTablerIconList();
          json(res, cachedTablerIcons);
        } else {
          if (!cachedLucideIcons) cachedLucideIcons = await fetchLucideIcons();
          json(res, cachedLucideIcons);
        }
        return;
      }

      // ── Library SVG preview ──────────────────────────────────────────────
      // GET /api/library/svg?lib=lucide&name=arrow-right
      // GET /api/library/svg?lib=heroicons&name=arrow-up&size=24&style=outline
      if (method === "GET" && pathname === "/api/library/svg") {
        const lib = url.searchParams.get("lib") ?? "lucide";
        const name = url.searchParams.get("name") ?? "";
        if (!name) { json(res, { error: "name required" }, 400); return; }

        if (lib === "heroicons") {
          const size = parseInt(url.searchParams.get("size") ?? "24", 10) as 16 | 20 | 24;
          const style = (url.searchParams.get("style") ?? "outline") as "solid" | "outline";
          const { svgContent } = await fetchHeroicon(name, size, style);
          json(res, { svgContent });
        } else if (lib === "tabler") {
          const style = (url.searchParams.get("style") ?? "outline") as TablerStyle;
          const stroke = parseFloat(url.searchParams.get("stroke") ?? "2") as TablerStroke;
          const { svgContent } = await fetchTablerIcon(name, style, stroke);
          json(res, { svgContent });
        } else {
          const { svgContent } = await fetchLucideIcon(name);
          json(res, { svgContent });
        }
        return;
      }

      // ── Import ───────────────────────────────────────────────────────────
      // POST /api/import
      if (method === "POST" && pathname === "/api/import") {
        const body = JSON.parse(await readBody(req)) as {
          source: "library" | "paste" | "url";
          svgContent?: string;
          svgUrl?: string;
          library?: string;
          libraryIconName?: string;
          heroiconSize?: number;
          heroiconStyle?: string;
          tablerStyle?: string;
          tablerStroke?: number;
          componentName: string;
          iconSize?: number;
        };

        let svgContent: string;
        let copyright: string | null = null;
        let svgSourcePath: string;
        let libMeta: { library?: string; libraryIconName?: string; iconSize?: number } = {};

        if (body.source === "library") {
          const lib = body.library ?? "lucide";
          const iconName = body.libraryIconName ?? "";

          if (lib === "heroicons") {
            const size = (body.heroiconSize ?? 24) as 16 | 20 | 24;
            const style = (body.heroiconStyle ?? "outline") as "solid" | "outline";
            const result = await fetchHeroicon(iconName, size, style);
            svgContent = result.svgContent;
            copyright = generateHeroiconsCopyright(iconName);
            svgSourcePath = `library:heroicons/${iconName}-${size}`;
            libMeta = { library: "heroicons", libraryIconName: iconName, iconSize: size };
          } else if (lib === "tabler") {
            const style = (body.tablerStyle ?? "outline") as TablerStyle;
            const stroke = (body.tablerStroke ?? 2) as TablerStroke;
            const computedName = style === "filled" ? `${iconName}-filled` : iconName;
            const result = await fetchTablerIcon(iconName, style, stroke);
            svgContent = result.svgContent;
            copyright = generateTablerCopyright(iconName);
            svgSourcePath = `library:tabler/${computedName}`;
            libMeta = { library: "tabler", libraryIconName: iconName };
          } else {
            const result = await fetchLucideIcon(iconName);
            svgContent = result.svgContent;
            copyright = generateLucideCopyright(result.metadata.iconName);
            svgSourcePath = `library:lucide/${iconName}`;
            libMeta = { library: "lucide", libraryIconName: iconName };
          }
        } else if (body.source === "url") {
          if (!body.svgUrl) { json(res, { error: "svgUrl required" }, 400); return; }
          svgContent = await fetchSVGFromURL(body.svgUrl);
          svgSourcePath = body.svgUrl;
        } else {
          if (!body.svgContent) { json(res, { error: "svgContent required" }, 400); return; }
          svgContent = body.svgContent;
          svgSourcePath = "source:paste";
        }

        if (!isValidSVG(svgContent)) {
          json(res, { error: "Invalid SVG content" }, 400);
          return;
        }

        const componentName = generateIconName(
          body.componentName,
          config.naming.suffix,
          config.naming.componentCase
        );

        const processed = await optimizeSVG(svgContent, config.optimize);

        const component = await generateComponent({
          componentName,
          svgContent: processed.content,
          viewBox: processed.viewBox,
          config,
        });

        const finalContent = copyright
          ? insertHeaderComment(component.content, copyright)
          : component.content;

        const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);

        await writeComponentFile({
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
          { ...libMeta, ...(body.iconSize ? { iconSize: body.iconSize } : {}) }
        );

        if (config.maintainIndex) {
          await updateIndexFile(iconsDir, component.extension);
        }

        json(res, { success: true, componentName, filename: component.filename });
        return;
      }

      // ── Delete ───────────────────────────────────────────────────────────
      // POST /api/delete  { filenames: string[] }
      if (method === "POST" && pathname === "/api/delete") {
        const { filenames } = JSON.parse(await readBody(req)) as { filenames: string[] };
        const lock = await readLockFile(projectRoot);
        const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
        let ext = "";
        for (const filename of filenames) {
          try { await fs.unlink(path.join(iconsDir, filename)); } catch { /* already gone */ }
          ext = path.extname(filename);
          delete lock[filename];
        }
        await writeLockFile(projectRoot, lock);
        if (config.maintainIndex && ext) await updateIndexFile(iconsDir, ext);
        json(res, { success: true, deleted: filenames.length });
        return;
      }

      // ── Rename ───────────────────────────────────────────────────────────
      // POST /api/rename  { filename: string, newName: string }
      if (method === "POST" && pathname === "/api/rename") {
        const { filename, newName } = JSON.parse(await readBody(req)) as { filename: string; newName: string };
        const lock = await readLockFile(projectRoot);
        const entry = lock[filename] as (typeof lock)[string] & { svgContent?: string } | undefined;
        if (!entry) { json(res, { error: "Icon not found" }, 404); return; }

        const newComponentName = generateIconName(newName, config.naming.suffix, config.naming.componentCase);
        const svgContent: string = (entry as Record<string, string>).svgContent ?? "";
        const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

        const component = await generateComponent({ componentName: newComponentName, svgContent, viewBox, config });

        let finalContent = component.content;
        const lib = (entry as Record<string, string>).library;
        if (lib === "lucide") finalContent = insertHeaderComment(component.content, generateLucideCopyright(newComponentName));
        else if (lib === "heroicons") finalContent = insertHeaderComment(component.content, generateHeroiconsCopyright(newComponentName));
        else if (lib === "tabler") finalContent = insertHeaderComment(component.content, generateTablerCopyright(newComponentName));

        const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
        await writeComponentFile({ projectRoot, baseDir: config.baseDir, iconsFolder: config.iconsFolder, filename: component.filename, content: finalContent });
        try { await fs.unlink(path.join(iconsDir, filename)); } catch { /* already gone */ }

        delete lock[filename];
        lock[component.filename] = { ...(entry as object), componentName: newComponentName, filename: component.filename } as typeof lock[string];
        await writeLockFile(projectRoot, lock);
        if (config.maintainIndex) await updateIndexFile(iconsDir, component.extension);

        json(res, { success: true, oldFilename: filename, newFilename: component.filename, componentName: newComponentName });
        return;
      }

      // ── Directive import ─────────────────────────────────────────────────
      // POST /api/import-directive
      // body: { componentName, slots: { [dir]: { library, libraryIconName, heroiconSize?, heroiconStyle? } } }
      if (method === "POST" && pathname === "/api/import-directive") {
        const DIR_TO_VARIANT: Record<string, DirectionVariant> = {
          n: "up", ne: "up-right", e: "right", se: "down-right",
          s: "down", sw: "down-left", w: "left", nw: "up-left",
        };

        const body = JSON.parse(await readBody(req)) as {
          componentName: string;
          slots: Record<string, {
            library: string;
            libraryIconName: string;
            heroiconSize?: number;
            heroiconStyle?: string;
            tablerStyle?: string;
            tablerStroke?: number;
          }>;
        };

        const variants: VariantComponentData["variants"] = [];
        const directions: DirectionVariant[] = [];

        for (const [dir, slot] of Object.entries(body.slots)) {
          const variant = DIR_TO_VARIANT[dir];
          if (!variant) continue;

          let svgContent: string;
          if (slot.library === "heroicons") {
            const size = (slot.heroiconSize ?? 24) as 16 | 20 | 24;
            const style = (slot.heroiconStyle ?? "outline") as "solid" | "outline";
            const result = await fetchHeroicon(slot.libraryIconName, size, style);
            svgContent = result.svgContent;
          } else if (slot.library === "tabler") {
            const style = (slot.tablerStyle ?? "outline") as TablerStyle;
            const stroke = (slot.tablerStroke ?? 2) as TablerStroke;
            const result = await fetchTablerIcon(slot.libraryIconName, style, stroke);
            svgContent = result.svgContent;
          } else {
            const result = await fetchLucideIcon(slot.libraryIconName);
            svgContent = result.svgContent;
          }

          const processed = await optimizeSVG(svgContent, config.optimize);
          variants.push({ variant, svgContent: processed.content, viewBox: processed.viewBox });
          directions.push(variant);
        }

        if (variants.length === 0) {
          json(res, { error: "No valid slots provided" }, 400);
          return;
        }

        const variantData: VariantComponentData = {
          config: { type: "direction", baseName: body.componentName, directions },
          variants,
        };

        const component = await generateVariantComponent({ variantData, config });

        await writeComponentFile({
          projectRoot,
          baseDir: config.baseDir,
          iconsFolder: config.iconsFolder,
          filename: component.filename,
          content: component.content,
        });

        await trackGeneratedComponent(
          projectRoot,
          component.filename,
          body.componentName,
          "studio:directive",
          variants[0]?.svgContent ?? ""
        );

        const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
        if (config.maintainIndex) await updateIndexFile(iconsDir, component.extension);

        // Store variant metadata in lock for studio display
        const lock2 = await readLockFile(projectRoot);
        if (lock2[component.filename]) {
          Object.assign(lock2[component.filename] as Record<string, unknown>, {
            variantType: "direction",
            directions,
            variantSvgs: Object.fromEntries(variants.map(v => [v.variant, v.svgContent])),
          });
          await writeLockFile(projectRoot, lock2);
        }

        json(res, { success: true, componentName: body.componentName, filename: component.filename });
        return;
      }

      res.writeHead(404).end("Not found");
    } catch (err) {
      json(res, { error: err instanceof Error ? err.message : "Server error" }, 500);
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    const url = `http://localhost:${PORT}`;
    logger.newline();
    logger.success(`mkicon studio running at ${url}`);
    logger.print("  Press Ctrl+C to stop.");
    logger.newline();
    openBrowser(url);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(`Port ${PORT} is already in use. Is mkicon studio already running?`);
    } else {
      logger.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });

  const sockets = new Set<import("node:net").Socket>();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });

  const shutdown = () => {
    logger.newline();
    logger.info("Stopping mkicon studio...");
    for (const socket of sockets) socket.destroy();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  await new Promise<void>(() => {/* intentionally never resolves */});
};
