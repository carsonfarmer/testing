import { TestEvent } from "./model.js";
import { gray, red, green, italic, yellow } from "./colors.js";

/**
 * Terminate a script (in Node.js or browser).
 * @param code The exit code. Defaults to 0.
 */
export function exit(code?: number): void {
  if (typeof process !== "undefined") {
    process.exit(code || 0);
  } else if (typeof window !== "undefined") {
    const prevOnError = window.onerror;
    window.onerror = () => {
      window.onerror = prevOnError;
      return true;
    };
  }
  throw new Error(`Termination with exit code ${code || 0}.`);
}

/**
 * Create a promise that resolves in `ms` milliseconds.
 * @param ms The timeout in milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Create a logger that can be enabled/disabled.
export const logger = (function () {
  let oldConsoleLog: typeof globalThis.console.log | null = null;
  return {
    log: oldConsoleLog ?? globalThis.console.log,
    enable: function () {
      if (oldConsoleLog == null) return;

      globalThis.console.log = oldConsoleLog;
    },

    disable: function disableLogger() {
      oldConsoleLog = console.log;
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      globalThis.console.log = function () {};
    },
  };
})();

export class TimeoutError extends Error {}

export const timeout = <T = unknown>(
  promise: Promise<T> | T,
  timeout = Infinity
): Promise<T> => {
  let clear: ReturnType<typeof setTimeout>;
  const t = new Promise<T>((_, reject) => {
    clear = setTimeout(
      () => reject(new TimeoutError(`timeout after ${timeout}ms`)),
      timeout
    );
  });
  const p = Promise.resolve(promise).finally(() => clearTimeout(clear));
  return Promise.race([p, t]);
};

function formatDuration(time = 0) {
  const timeStr = `(${time}ms)`;
  return gray(italic(timeStr));
}

export function print(message: TestEvent, log: (str: string) => void): void {
  const redFailed = red("failed");
  const greenOk = green("ok");
  const yellowIgnored = yellow("ignored");
  if (message.start != null) {
    log(`running ${message.start.tests.length} tests`);
  } else if (message.testStart != null) {
    // const { name } = message.testStart;
    // log(`test ${name} ... `);
    // noop for the moment
    return;
  } else if (message.testEnd != null) {
    const { name, status, duration } = message.testEnd;
    switch (status) {
      case "passed":
        log(`test ${name} ... ${greenOk} ${formatDuration(duration)}`);
        break;
      case "failed":
        log(`test ${name} ... ${redFailed} ${formatDuration(duration)}`);
        break;
      case "ignored":
        log(`test ${name} ... ${yellowIgnored} ${formatDuration(duration)}`);
        break;
    }
  } else if (message.end != null) {
    /* c8 ignore next */
    const failures = message.end.results?.filter((m) => m.error != null) ?? [];
    if (failures.length > 0) {
      log(`\nfailures:\n`);
      for (const { name, error } of failures) {
        if (!error) continue;
        // const stackString = error.stack?.split("\n").slice(1).join("\n") ?? "";
        log(name);
        // const head = red(
        //   `${error.name}${error.code ? ` [${error.code}]` : ""}`
        // );
        // log(`${head}: ${error.message}\n${gray(stackString)}`);
        log(String(error.stack));
        log("");
      }
    }

    if (message.end.timeout) {
      log(`\n${redFailed} due to timeout after ${message.end.timeout}ms\n`);
      return;
    }

    log(
      `\ntest result: ${message.end.failed ? redFailed : greenOk}. ` +
        `${message.end.passed} passed; ` +
        `${message.end.failed} failed; ` +
        `${message.end.ignored} ignored; ` +
        `${message.end.filtered} filtered out ` +
        `${formatDuration(message.end.duration)}\n`
    );

    if (message.end.usedOnly && message.end.failed == 0) {
      log(`${redFailed} because the "only" option was used\n`);
    }
  }
}
