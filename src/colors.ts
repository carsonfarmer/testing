// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// https://github.com/denoland/deno_std/blob/main/fmt/colors.ts

interface Code {
  open: string;
  close: string;
  regexp: RegExp;
}

/**
 * Builds color code
 * @param open
 * @param close
 */
function code(open: number[], close: number): Code {
  return {
    open: `\x1b[${open.join(";")}m`,
    close: `\x1b[${close}m`,
    regexp: new RegExp(`\\x1b\\[${close}m`, "g"),
  };
}

/**
 * Applies color and background based on color code and its associated text
 * @param str text to apply color settings to
 * @param code color code to apply
 */
function run(str: string, code: Code): string {
  return `${code.open}${str.replace(code.regexp, code.open)}${code.close}`;
}

/**
 * Set text color to green.
 * @param str text to make green
 */
export function green(str: string): string {
  return run(str, code([32], 39));
}

/**
 * Set text color to red.
 * @param str text to make red
 */
export function red(str: string): string {
  return run(str, code([31], 39));
}

/**
 * Set text color to yellow.
 * @param str text to make yellow
 */
export function yellow(str: string): string {
  return run(str, code([33], 39));
}

/**
 * Set text color to white.
 * @param str text to make white
 */
export function white(str: string): string {
  return run(str, code([37], 39));
}

/**
 * Set text color to gray.
 * @param str text to make gray
 */
export function gray(str: string): string {
  return run(str, code([90], 39));
}

/**
 * Make the text bold.
 * @param str text to make bold
 */
export function bold(str: string): string {
  return run(str, code([1], 22));
}

/**
 * Make the text italic.
 * @param str text to make italic
 */
export function italic(str: string): string {
  return run(str, code([3], 23));
}

// https://github.com/chalk/ansi-regex/blob/2b56fb0c7a07108e5b54241e8faec160d393aedb/index.js
const ANSI_PATTERN = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  ].join("|"),
  "g"
);

/**
 * Remove ANSI escape codes from the string.
 * @param string to remove ANSI escape codes from
 */
export function stripColor(string: string): string {
  return string.replace(ANSI_PATTERN, "");
}
