import type { CommandDef } from "./types";

import { command as initCmd } from "./init.command";
import { command as configCmd } from "./config.command";
import { command as inspectConfigCmd } from "./inspect-config.command";
import { command as studioCmd } from "./studio.command";
import { command as listCmd } from "./list.command";
import { command as deleteCmd } from "./delete.command";
import { command as figmaCmd } from "./figma.command";
import { command as libraryCmd } from "./library.command";
import { command as spinnerCmd } from "./spinner.command";
import { command as batchCmd } from "./batch.command";
import { command as svgExportCmd } from "./svg-export.command";
import { command as pngCmd } from "./png.command";
import { command as hookCmd } from "./hook.command";
import { command as countCmd } from "./count.command";
import { command as diffCmd } from "./diff.command";
import { command as previewCmd } from "./preview.command";
import { command as pasteCmd } from "./paste.command";
import { command as urlCmd } from "./url.command";
import { command as fileCmd } from "./file.command";
import { command as watchCmd } from "./watch.command";
import { command as spriteCmd } from "./sprite.command";
import { command as aiCmd } from "./ai.command";

export const commands: CommandDef[] = [
  initCmd,
  configCmd,
  inspectConfigCmd,
  studioCmd,
  listCmd,
  deleteCmd,
  figmaCmd,
  libraryCmd,
  spinnerCmd,
  batchCmd,
  svgExportCmd,
  pngCmd,
  hookCmd,
  countCmd,
  diffCmd,
  previewCmd,
  pasteCmd,
  urlCmd,
  fileCmd,
  watchCmd,
  spriteCmd,
  aiCmd,
];

export const findCommand = (name: string | undefined): CommandDef | undefined => {
  if (!name) return undefined;
  return commands.find((c) => c.name === name || c.aliases?.includes(name));
};
