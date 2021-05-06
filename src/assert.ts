// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible. Do not rely on good formatting of values
// for AssertionError messages in browsers.

import { gray, green, red, stripColor, white } from "./colors.js";
import { diff, DiffResult, DiffType } from "./_diff.js";

const CAN_NOT_DISPLAY = "[Cannot display]";

interface Constructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): any;
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message.trim());
    this.name = "AssertionError";
  }
}

/**
 * Format the input object as well-behaved JSON.
 * Object keys are consistently sorted, trailing commas are removed, quotes
 * around keys are removed when possible, output is trimmed to remove
 * extraneous whitespace, etc. In general, the output should make most JSON
 * linters happy, and provides a useful means of comparison/differencing.
 * @param v Value to be formatted
 */
export function format(v: unknown): string {
  const allKeys: string[] = [];
  // NOTE: This method calls stringify twice! Once to get array of keys,
  // and again to do the actual stringify + formatting
  JSON.stringify(v, function (key, value) {
    allKeys.push(key);
    return value;
  });
  const cleaned = JSON.stringify(v, allKeys.sort(), 2);
  return cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, function (match) {
    return match.replace(/"/g, "");
  });
}

/**
 * Colors the output of assertion diffs
 * @param diffType Difference type, either added or removed
 */
function createColor(diffType: DiffType): (s: string) => string {
  switch (diffType) {
    case DiffType.added:
      return (s: string): string => green(s);
    case DiffType.removed:
      return (s: string): string => red(s);
    default:
      return white;
  }
}

/**
 * Prefixes `+` or `-` in diff output
 * @param diffType Difference type, either added or removed
 */
function createSign(diffType: DiffType): string {
  switch (diffType) {
    case DiffType.added:
      return "+   ";
    case DiffType.removed:
      return "-   ";
    default:
      return "    ";
  }
}

function buildMessage(diffResult: ReadonlyArray<DiffResult<string>>): string[] {
  const messages: string[] = [];
  messages.push("");
  messages.push("");
  messages.push(
    `    ${gray("[Diff]")} ${red("Actual")} / ${green("Expected")}`
  );
  messages.push("");
  messages.push("");
  diffResult.forEach((result: DiffResult<string>): void => {
    const c = createColor(result.type);
    messages.push(c(`${createSign(result.type)}${result.value}`));
  });
  messages.push("");

  return messages;
}

function isKeyedCollection(x: unknown): x is Set<unknown> {
  return [Symbol.iterator, "size"].every((k) => k in (x as Set<unknown>));
}

/**
 * Deep equality comparison used in assertions
 * @param c actual value
 * @param d expected value
 */
export function equal(c: unknown, d: unknown): boolean {
  const seen = new Map();
  return (function compare(a: unknown, b: unknown): boolean {
    // Have to render RegExp & Date for string comparison
    // unless it's mistreated as object
    if (
      a &&
      b &&
      ((a instanceof RegExp && b instanceof RegExp) ||
        (a instanceof URL && b instanceof URL))
    ) {
      return String(a) === String(b);
    }
    if (a instanceof Date && b instanceof Date) {
      const aTime = a.getTime();
      const bTime = b.getTime();
      // Check for NaN equality manually since NaN is not
      // equal to itself.
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return true;
      }
      return a.getTime() === b.getTime();
    }
    if (Object.is(a, b)) {
      return true;
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      if (seen.get(a) === b) {
        return true;
      }
      if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
        return false;
      }
      if (isKeyedCollection(a) && isKeyedCollection(b)) {
        if (a.size !== b.size) {
          return false;
        }

        let unmatchedEntries = a.size;

        for (const [aKey, aValue] of a.entries()) {
          for (const [bKey, bValue] of b.entries()) {
            /* Given that Map keys can be references, we need
             * to ensure that they are also deeply equal */
            if (
              (aKey === aValue && bKey === bValue && compare(aKey, bKey)) ||
              (compare(aKey, bKey) && compare(aValue, bValue))
            ) {
              unmatchedEntries--;
            }
          }
        }

        return unmatchedEntries === 0;
      }
      const merged = { ...a, ...b };
      for (const key of [
        ...Object.getOwnPropertyNames(merged),
        ...Object.getOwnPropertySymbols(merged),
      ]) {
        type Key = keyof typeof merged;
        if (!compare(a && a[key as Key], b && b[key as Key])) {
          return false;
        }
        if ((key in a && !(key in b)) || (key in b && !(key in a))) {
          return false;
        }
      }
      seen.set(a, b);
      return true;
    }
    return false;
  })(c, d);
}

/** Make an assertion, error will be thrown if `expr` does not have truthy value. */
export function assert(expr: unknown, msg = ""): asserts expr {
  if (!expr) {
    throw new AssertionError(msg);
  }
}

/**
 * Make an assertion that `actual` and `expected` are equal, deeply. If not
 * deeply equal, then throw.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 * For example:
 *```ts
 *assertEquals<number>(1, 2)
 *```
 */
export function equals(actual: unknown, expected: unknown, msg?: string): void;
export function equals<T>(actual: T, expected: T, msg?: string): void;
export function equals(actual: unknown, expected: unknown, msg?: string): void {
  if (equal(actual, expected)) {
    return;
  }
  let message = "";
  const actualString = format(actual);
  const expectedString = format(expected);
  try {
    const diffResult = diff(
      actualString.split("\n"),
      expectedString.split("\n")
    );
    const diffMsg = buildMessage(diffResult).join("\n");
    message = `Values are not equal:\n${diffMsg}`;
  } catch {
    message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
  }
  if (msg) {
    message = msg;
  }
  throw new AssertionError(message);
}

/**
 * Make an assertion that `actual` and `expected` are not equal, deeply.
 * If not then throw.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 * For example:
 *```ts
 *assertNotEquals<number>(1, 2)
 *```
 */
export function notEquals(
  actual: unknown,
  expected: unknown,
  msg?: string
): void;
export function notEquals<T>(actual: T, expected: T, msg?: string): void;
export function notEquals(
  actual: unknown,
  expected: unknown,
  msg?: string
): void {
  if (!equal(actual, expected)) {
    return;
  }
  let actualString: string;
  let expectedString: string;
  try {
    actualString = String(actual);
  } catch {
    actualString = "[Cannot display]";
  }
  try {
    expectedString = String(expected);
  } catch {
    expectedString = "[Cannot display]";
  }
  if (!msg) {
    msg = `actual: ${actualString} expected: ${expectedString}`;
  }
  throw new AssertionError(msg);
}

/**
 * Make an assertion that `actual` and `expected` are strictly equal.  If
 * not then throw.
 * ```ts
 * assertStrictEquals(1, 2)
 * ```
 */
export function strictEquals(
  actual: unknown,
  expected: unknown,
  msg?: string
): void;
export function strictEquals<T>(actual: T, expected: T, msg?: string): void;
export function strictEquals(
  actual: unknown,
  expected: unknown,
  msg?: string
): void {
  if (actual === expected) {
    return;
  }

  let message: string;

  if (msg) {
    message = msg;
  } else {
    const actualString = format(actual);
    const expectedString = format(expected);

    if (actualString === expectedString) {
      const withOffset = actualString
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n");
      message = `Values have the same structure but are not reference-equal:\n\n${red(
        withOffset
      )}\n`;
    } else {
      try {
        const diffResult = diff(
          actualString.split("\n"),
          expectedString.split("\n")
        );
        const diffMsg = buildMessage(diffResult).join("\n");
        message = `Values are not strictly equal:\n${diffMsg}`;
      } catch {
        message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
      }
    }
  }

  throw new AssertionError(message);
}

/**
 * Make an assertion that `actual` and `expected` are not strictly equal.
 * If the values are strictly equal then throw.
 * ```ts
 * assertNotStrictEquals(1, 1)
 * ```
 */
export function notStrictEquals(
  actual: unknown,
  expected: unknown,
  msg?: string
): void;
export function notStrictEquals<T>(actual: T, expected: T, msg?: string): void;
export function notStrictEquals(
  actual: unknown,
  expected: unknown,
  msg?: string
): void {
  if (actual !== expected) {
    return;
  }

  throw new AssertionError(
    msg ?? `Expected "actual" to be strictly unequal to: ${format(actual)}\n`
  );
}

/**
 * Make an assertion that actual is not null or undefined. If not
 * then thrown.
 */
export function exists(actual: unknown, msg?: string): void {
  if (actual === undefined || actual === null) {
    if (!msg) {
      msg = `actual: "${actual}" expected to match anything but null or undefined`;
    }
    throw new AssertionError(msg);
  }
}

/**
 * Make an assertion that actual includes expected. If not
 * then thrown.
 */
export function stringIncludes(
  actual: string,
  expected: string,
  msg?: string
): void {
  if (!actual.includes(expected)) {
    if (!msg) {
      msg = `actual: "${actual}" expected to contain: "${expected}"`;
    }
    throw new AssertionError(msg);
  }
}

/**
 * Make an assertion that `actual` includes the `expected` values.
 * If not then an error will be thrown.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 * For example:
 *```ts
 *assertArrayIncludes<number>([1, 2], [2])
 *```
 */
export function arrayIncludes(
  actual: ArrayLike<unknown>,
  expected: ArrayLike<unknown>,
  msg?: string
): void;
export function arrayIncludes<T>(
  actual: ArrayLike<T>,
  expected: ArrayLike<T>,
  msg?: string
): void;
export function arrayIncludes(
  actual: ArrayLike<unknown>,
  expected: ArrayLike<unknown>,
  msg?: string
): void {
  const missing: unknown[] = [];
  for (let i = 0; i < expected.length; i++) {
    let found = false;
    for (let j = 0; j < actual.length; j++) {
      if (equal(expected[i], actual[j])) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(expected[i]);
    }
  }
  if (missing.length === 0) {
    return;
  }
  if (!msg) {
    msg = `actual: "${format(actual)}" expected to include: "${format(
      expected
    )}"\nmissing: ${format(missing)}`;
  }
  throw new AssertionError(msg);
}

/**
 * Make an assertion that `actual` match RegExp `expected`. If not
 * then thrown
 */
export function match(actual: string, expected: RegExp, msg?: string): void {
  if (!expected.test(actual)) {
    if (!msg) {
      msg = `actual: "${actual}" expected to match: "${expected}"`;
    }
    throw new AssertionError(msg);
  }
}

/**
 * Make an assertion that `actual` not match RegExp `expected`. If match
 * then thrown
 */
export function notMatch(actual: string, expected: RegExp, msg?: string): void {
  if (expected.test(actual)) {
    if (!msg) {
      msg = `actual: "${actual}" expected to not match: "${expected}"`;
    }
    throw new AssertionError(msg);
  }
}

/**
 * Make an assertion that `actual` object is a subset of `expected` object, deeply.
 * If not, then throw.
 */
export function objectMatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actual: Record<PropertyKey, any>,
  expected: Record<PropertyKey, unknown>
): void {
  type loose = Record<PropertyKey, unknown>;
  const seen = new WeakMap();
  return equals(
    (function filter(a: loose, b: loose): loose {
      // Prevent infinite loop with circular references with same filter
      if (seen.has(a) && seen.get(a) === b) {
        return a;
      }
      seen.set(a, b);
      // Filter keys and symbols which are present in both actual and expected
      const filtered = {} as loose;
      const entries = [
        ...Object.getOwnPropertyNames(a),
        ...Object.getOwnPropertySymbols(a),
      ]
        .filter((key) => key in b)
        .map((key) => [key, a[key as string]]) as Array<[string, unknown]>;
      // Build filtered object and filter recursively on nested objects references
      for (const [key, value] of entries) {
        if (typeof value === "object") {
          const subset = (b as loose)[key];
          if (typeof subset === "object" && subset) {
            filtered[key] = filter(value as loose, subset as loose);
            continue;
          }
        }
        filtered[key] = value;
      }
      return filtered;
    })(actual, expected),
    expected
  );
}

/**
 * Forcefully throws a failed assertion
 */
export function fail(msg?: string): void {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  assert(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
}

/**
 * Executes a function, expecting it to throw.  If it does not, then it
 * throws.  An error class and a string that should be included in the
 * error message can also be asserted.
 */
export function throws<T = void>(
  fn: () => T,
  ErrorClass?: Constructor,
  msgIncludes = "",
  msg?: string
): Error {
  let doesThrow = false;
  let error = null;
  try {
    fn();
  } catch (e) {
    if (e instanceof Error === false) {
      throw new AssertionError("A non-Error object was thrown.");
    }
    if (ErrorClass && !(e instanceof ErrorClass)) {
      msg = `Expected error to be instance of "${ErrorClass.name}", but was "${
        e.constructor.name
      }"${msg ? `: ${msg}` : "."}`;
      throw new AssertionError(msg);
    }
    if (
      msgIncludes &&
      !stripColor(e.message).includes(stripColor(msgIncludes))
    ) {
      msg = `Expected error message to include "${msgIncludes}", but got "${
        e.message
      }"${msg ? `: ${msg}` : "."}`;
      throw new AssertionError(msg);
    }
    doesThrow = true;
    error = e;
  }
  if (!doesThrow) {
    msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
    throw new AssertionError(msg);
  }
  return error;
}

/**
 * Executes a function which returns a promise, expecting it to throw or reject.
 * If it does not, then it throws.  An error class and a string that should be
 * included in the error message can also be asserted.
 */
export async function rejects<T = void>(
  fn: () => Promise<T>,
  ErrorClass?: Constructor,
  msgIncludes = "",
  msg?: string
): Promise<Error> {
  let doesThrow = false;
  let error = null;
  try {
    await fn();
  } catch (e) {
    if (e instanceof Error === false) {
      throw new AssertionError("A non-Error object was thrown or rejected.");
    }
    if (ErrorClass && !(e instanceof ErrorClass)) {
      msg = `Expected error to be instance of "${ErrorClass.name}", but got "${
        e.name
      }"${msg ? `: ${msg}` : "."}`;
      throw new AssertionError(msg);
    }
    if (
      msgIncludes &&
      !stripColor(e.message).includes(stripColor(msgIncludes))
    ) {
      msg = `Expected error message to include "${msgIncludes}", but got "${
        e.message
      }"${msg ? `: ${msg}` : "."}`;
      throw new AssertionError(msg);
    }
    doesThrow = true;
    error = e;
  }
  if (!doesThrow) {
    msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
    throw new AssertionError(msg);
  }
  return error;
}

/** Use this to stub out methods that will throw when invoked. */
export function unimplemented(msg?: string): never {
  throw new AssertionError(msg || "unimplemented");
}

/** Use this to assert unreachable code. */
export function unreachable(): never {
  throw new AssertionError("unreachable");
}
