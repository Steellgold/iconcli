const VERSION = "0.6.0";
const REPO = "https://github.com/Steellgold/mkicon";

/**
 * Generate the mkicon file header comment.
 * Uses HTML comments for Vue/Svelte, JS block comments for React/React Native.
 */
export const generateMkiconHeader = (framework: string): string => {
  if (framework === "vue" || framework === "svelte") {
    return `<!-- Generated with mkicon v${VERSION} — ${REPO} -->\n`;
  }

  return `/**\n * Generated with mkicon v${VERSION}\n * ${REPO}\n */\n\n`;
};

/**
 * Insert an additional comment block (e.g. library copyright) right after
 * the mkicon header in the generated component content.
 *
 * Result order: mkicon header → copyright → imports → component code
 */
export const insertHeaderComment = (content: string, comment: string): string => {
  // JS/TS block comment: ends with "*/\n\n"
  const jsEnd = content.indexOf("*/\n\n");
  if (jsEnd !== -1) {
    return `${content.slice(0, jsEnd + 4) + comment  }\n\n${  content.slice(jsEnd + 4)}`;
  }

  // Vue/Svelte HTML comment: ends with "-->\n"
  const htmlEnd = content.indexOf("-->\n");
  if (htmlEnd !== -1) {
    return `${content.slice(0, htmlEnd + 4) + comment  }\n\n${  content.slice(htmlEnd + 4)}`;
  }

  // Fallback: prepend
  return `${comment  }\n\n${  content}`;
};
