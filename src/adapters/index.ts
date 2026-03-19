export {
  resolvePrettierConfig,
  resolveFormatConfig,
  formatConfigForDisplay,
} from "./config-resolver.js";
export { applyFormatting } from "./post-processor.js";
export { isPrettierAvailable, loadPrettier } from "./project-detector.js";
export { DEFAULT_FORMAT_CONFIG } from "./types.js";
export type { DetectedFormatConfig } from "./types.js";
