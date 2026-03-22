import type { Config } from "@/config/schema";
import { processSingleSvgFile } from "@/batch/processor";
import { readLockFile, writeLockFile } from "@/core/diff-checker";
import { updateIndexFile } from "@/core/index-maintainer";
import { logger } from "@/utils/logger";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

export interface WatchOptions {
  projectRoot: string;
  config: Config;
  watchDir: string;
  debounce?: number;
}

const DEFAULT_DEBOUNCE = 500;

export const runWatch = async (options: WatchOptions): Promise<void> => {
  const { projectRoot, config, watchDir, debounce = DEFAULT_DEBOUNCE } = options;

  const resolvedDir = path.isAbsolute(watchDir)
    ? watchDir
    : path.resolve(process.cwd(), watchDir);

  if (!existsSync(resolvedDir)) {
    logger.error(`Directory not found: ${watchDir}`);
    process.exit(1);
  }

  const { watch } = await import("chokidar");

  logger.title("👀 mkicon watch");
  logger.info(`Watching: ${path.relative(projectRoot, resolvedDir)}/`);
  logger.info(`Output:   ${config.baseDir}/${config.iconsFolder}/`);
  logger.info(`Debounce: ${debounce}ms`);
  logger.separator();
  logger.print("  Press Ctrl+C to stop.\n");

  // Pending debounce timers per file
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const schedule = (svgPath: string, event: "add" | "change" | "unlink"): void => {
    const existing = timers.get(svgPath);
    if (existing) {clearTimeout(existing);}

    timers.set(
      svgPath,
      setTimeout(() => {
        timers.delete(svgPath);
        void handle(svgPath, event);
      }, debounce),
    );
  };

  const handle = async (svgPath: string, event: "add" | "change" | "unlink"): Promise<void> => {
    const rel = path.relative(resolvedDir, svgPath);

    if (event === "unlink") {
      await handleDelete(svgPath, rel, projectRoot, config);
      return;
    }

    try {
      const filename = await processSingleSvgFile(svgPath, projectRoot, config);
      const verb = event === "add" ? "Created" : "Updated";
      logger.success(`${verb}: ${rel} → ${filename}`);
    } catch (err) {
      logger.error(`Failed: ${rel} — ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const watcher = watch(resolvedDir, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
    ignored: /(^|[/\\])\../,  // ignore dot-files
  }).on("add", (p) => {
    if (p.endsWith(".svg")) {schedule(p, "add");}
  }).on("change", (p) => {
    if (p.endsWith(".svg")) {schedule(p, "change");}
  }).on("unlink", (p) => {
    if (p.endsWith(".svg")) {schedule(p, "unlink");}
  }).on("error", (err) => {
    logger.error(`Watcher error: ${String(err)}`);
  });

  const shutdown = async (): Promise<void> => {
    logger.newline();
    logger.info("Stopping watcher...");
    for (const t of timers.values()) {clearTimeout(t);}
    await watcher.close();
    logger.success("Done.");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
};

const handleDelete = async (
  svgPath: string,
  rel: string,
  projectRoot: string,
  config: Config,
): Promise<void> => {
  const lock = await readLockFile(projectRoot);

  // Find the lock entry whose sourcePath matches this SVG
  const entry = Object.entries(lock).find(([, e]) => {
    const abs = path.isAbsolute(e.sourcePath)
      ? e.sourcePath
      : path.join(projectRoot, e.sourcePath);
    return abs === svgPath || path.relative(projectRoot, abs) === rel;
  });

  if (!entry) {
    logger.warning(`Deleted: ${rel} (no tracked component found)`);
    return;
  }

  const [filename, lockEntry] = entry;
  const iconsDir = path.join(projectRoot, config.baseDir, config.iconsFolder);
  const componentPath = path.join(iconsDir, filename);

  try {
    await fs.unlink(componentPath);
    delete lock[filename];
    await writeLockFile(projectRoot, lock);

    if (config.maintainIndex) {
      // Determine extension from a sibling component or fall back to .tsx
      const ext = path.extname(filename) || ".tsx";
      await updateIndexFile(iconsDir, ext);
    }

    logger.success(`Deleted: ${rel} → removed ${filename}`);
  } catch {
    logger.warning(`Deleted: ${rel} → could not remove ${lockEntry.componentName} (${filename})`);
  }
};
