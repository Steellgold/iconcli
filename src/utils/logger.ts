/* eslint-disable no-console */
import chalk from "chalk";
import ora, { type Ora } from "ora";

export const logger = {
  success: (message: string) => {
    console.log(chalk.green("✓"), message);
  },

  error: (message: string) => {
    console.log(chalk.red("✗"), message);
  },

  info: (message: string) => {
    console.log(chalk.blue("ℹ"), message);
  },

  warning: (message: string) => {
    console.log(chalk.yellow("⚠"), message);
  },

  title: (message: string) => {
    console.log(chalk.bold.cyan(`\n${message}\n`));
  },

  separator: () => {
    console.log(chalk.gray("─".repeat(45)));
  },

  newline: () => {
    console.log();
  },

  print: (message = "") => {
    console.log(message);
  },
};

export const spinner = {
  start: (text: string): Ora => {
    return ora({ text, color: "cyan" }).start();
  },
};
