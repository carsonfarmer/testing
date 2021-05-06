import { print, logger, exit } from "./utils.js";
import {
  TestDefinition,
  StackItem,
  Context,
  RunOptions,
  SuiteEnd,
  ExportedSuiteEnd,
} from "./model.js";
import { TestRunner } from "./runner.js";

const newContext = () => ({
  ...Object.freeze({
    beforeAll: [],
    beforeEach: [],
    afterEach: [],
    afterAll: [],
    waiting: 0,
    completed: 0,
    only: 0,
    completedOnly: 0,
  }),
});

async function callAll(fns: Array<() => void | Promise<void>>): Promise<void> {
  await Promise.all(fns.map((fn) => fn()));
}

function wrapHooks(
  testDef: TestDefinition,
  hooks: StackItem[]
): TestDefinition {
  const revHooks: StackItem[] = [...hooks].reverse();
  const { fn, only } = testDef;
  const wrappedFn = async function func() {
    // Before.
    for (const { beforeAll, beforeEach, completed: completedTests } of hooks) {
      if (completedTests === 0) {
        await callAll(beforeAll);
      }

      await callAll(beforeEach);
    }

    let error: Error | undefined;

    // Test.
    try {
      await fn();
    } catch (err) {
      error = err;
    }
    for (const hook of hooks) {
      hook.completed++;

      if (only) {
        hook.completedOnly++;
      }
    }

    // After.
    for (const {
      afterAll,
      afterEach,
      waiting,
      completed,
      only,
      completedOnly,
    } of revHooks) {
      await callAll(afterEach);

      if (waiting === completed || (only > 0 && only === completedOnly)) {
        await callAll(afterAll);
      }
    }
    if (error) throw error;
  };
  return { ...testDef, fn: wrappedFn };
}

/**
 * Hooks can be used to set up preconditions and clean up after tests.
 * Tests can appear before, after, or interspersed with hooks. Hooks will
 * run in the order they are defined, as appropriate; all beforeAll() hooks
 * run (once), then any beforeEach() hooks, tests, any afterEach() hooks, and
 * finally afterAll() hooks (once).
 */
export interface Hooks {
  // Runs once before the first test in this block
  beforeAll: (fn: () => void | Promise<void>) => _Suite;
  // Runs before each test in this block
  beforeEach: (fn: () => void | Promise<void>) => _Suite;
  // Runs once after the last test in this block
  afterAll: (fn: () => void | Promise<void>) => _Suite;
  // Runs after each test in this block
  afterEach: (fn: () => void | Promise<void>) => _Suite;
}

/**
 * @internal
 */
type Deferred<T> = {
  promise: Promise<T>;
  pending: boolean;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

/**
 * @internal
 */
function deferred<T = unknown>(): Deferred<T> {
  return (() => {
    let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
    let reject: (reason?: unknown) => void = () => undefined;
    let pending = true;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    }).finally(() => (pending = false));

    return {
      pending,
      promise,
      reject,
      resolve,
    };
  })();
}

class _Suite {
  /**
   * The options to control test suite runs.
   */
  options: RunOptions = {};
  // The internal context stack. Contains hooks and groups.
  #stack: StackItem[] = [];
  // The internal test registry. Contains all tests (in order) for the suite.
  #registry: TestDefinition[] = [];
  /**
   * The hooks namespace, for easier access via destructuring.
   */
  hooks: Hooks;
  // The internal test result cache.
  #cache: Deferred<SuiteEnd> = deferred();
  /**
   * The public interface to the deferred result object that resolves
   * once the test suite has been run.
   */
  readonly end: Promise<SuiteEnd> = this.#cache.promise;
  /**
   * Create a new test suite.
   * @param name Unique, human-readable name for the suite.
   * @param opts The options to control test suite runs.
   */
  constructor(readonly name: string, opts: RunOptions = {}) {
    this.options = { ...defaultRunOptions, ...opts };
    // Push new context onto the stack
    this.#stack = [{ ...newContext(), name }];
    // Manually bind the target methods we'll be using :(
    this.group = this.group.bind(this);
    this.test = this.test.bind(this);
    this.afterAll = this.afterAll.bind(this);
    this.afterEach = this.afterEach.bind(this);
    this.beforeAll = this.beforeAll.bind(this);
    this.beforeEach = this.beforeEach.bind(this);
    this.run = this.run.bind(this);
    // Convenience namespace for accessing hooks
    this.hooks = {
      afterAll: this.afterAll,
      afterEach: this.afterEach,
      beforeAll: this.beforeAll,
      beforeEach: this.beforeEach,
    };
    // Aliases
    this.it = this.it.bind(this);
    this.describe = this.describe.bind(this);
    this.before = this.before.bind(this);
    this.after = this.after.bind(this);
  }

  // https://github.com/microsoft/TypeScript/issues/37677
  private top(): Context {
    return this.#stack[this.#stack.length - 1];
  }

  /**
   * Adds a function to be called before all tests are run.
   */
  beforeAll(fn: () => void | Promise<void>): this {
    this.top().beforeAll.push(fn);
    return this;
  }

  /**
   * Alias for beforeAll method
   */
  before = this.beforeAll;

  /**
   * Adds a function to be called before each test runs.
   */
  beforeEach(fn: () => void | Promise<void>): this {
    this.top().beforeEach.push(fn);
    return this;
  }

  /**
   * Adds a function to be called after each test runs.
   */
  afterEach(fn: () => void | Promise<void>): this {
    this.top().afterEach.push(fn);
    return this;
  }

  /**
   * Adds a function to be called after all tests have run.
   */
  afterAll(fn: () => void | Promise<void>): this {
    this.top().afterAll.push(fn);
    return this;
  }

  /**
   * Alias for afterAll method
   */
  after = this.afterAll;

  /**
   * Groups provides a way to keep tests easier to read and organized.
   * A group is a test environment in which all tests, sub-groups, and hooks
   * are run together within a shared context.
   * @param name Unique, human-readable name for the group.
   * @param fn The initialization function.
   */
  group(name: string, fn: (suite: _Suite) => void): this {
    this.#stack.push({ ...newContext(), name });
    fn(this);
    this.#stack.pop();
    return this;
  }

  /**
   * Alias for group method
   */
  describe = this.group;

  /**
   * Reset the test suite by clearing out internal cache, registry, and stack.
   */
  reset(): this {
    // Reset the registry etc.
    this.#cache = deferred();
    this.#registry = [];
    this.#stack = [{ ...newContext(), name: this.name }];
    return this;
  }

  /**
   * Register a test which will be run when the suite is run.
   * `fn` can be async if required.
   * @example
   * ```typescript
   * import  { Suite, assert } from "@nullify/testing";
   * const { test } = new Suite("test")
   *
   * test({
   *   name: "example test",
   *   fn(): void {
   *     assert.strictEquals("world", "world");
   *   },
   * });
   *
   * test({
   *   name: "example ignored test",
   *   ignore: true, // Could be conditional
   *   fn(): void {
   *     // This test is ignored if ignore is true
   *   },
   * });
   *
   * test({
   *   name: "example async test",
   *   async fn() {
   *     const data = await Promise.resolve("hello world");
   *     assert.strictEquals(data, "Hello world");
   *   }
   * });
   * ```
   */
  test(t: TestDefinition): this;
  /**
   * Register a test which will be run when the suite is run.
   * `fn` can be async if required.
   * @example
   * ```typescript
   * import  { Suite, assert } from "@nullify/testing";
   * const { test } = new Suite("test")
   *
   * test("My test description", (): void => {
   *   assert.strictEquals("hello", "hello");
   * });
   *
   * test("My async test description", async (): Promise<void> => {
   *     const data = await Promise.resolve("hello world");
   *     assert.strictEquals(data, "Hello world");
   * });
   * ```
   * */
  test(name: string, fn: () => void | Promise<void>): this;
  test(t: TestDefinition | string, fn?: () => void | Promise<void>): this {
    let testDef: TestDefinition;
    const defaults = {
      ignore: false,
      only: false,
      timeout: 2000,
    };

    if (typeof t === "string") {
      if (!fn || typeof fn != "function") {
        throw new TypeError("Missing test function");
      }
      if (!t) {
        throw new TypeError("The test name can't be empty");
      }
      testDef = { fn: fn, name: t, ...defaults };
    } else {
      if (!t.fn) {
        throw new TypeError("Missing test function");
      }
      if (!t.name) {
        throw new TypeError("The test name can't be empty");
      }
      testDef = { ...defaults, ...t };
    }

    // Set up waiting count
    if (!testDef.ignore) {
      this.#stack.map((name) => name.waiting++);
    }

    if (testDef.only) {
      this.#stack.map((name) => name.only++);
    }

    // Generate name
    const name = this.#stack.map(({ name: n }) => n);
    name.push(testDef.name);
    testDef.name = name.join(" > ");

    // Copy stack at time of function registration
    const copy = [...this.#stack];

    this.#registry.push(wrapHooks(testDef, copy));
    return this;
  }

  /**
   * Alias for test method
   */
  it = this.test;

  /**
   * Manually run the test suite. This is generally not needed, as the test
   * suite should run automatically in most cases (unless `autoRun` is set to
   * false).
   * @param opts The options to control test suite run.
   */
  async run(opts: RunOptions = {}): Promise<SuiteEnd> {
    if (!this.#cache.pending) return this.end;
    const options = { ...this.options, ...opts };
    const filterFn = createFilterFn(options.filter, options.skip);
    let timedOut = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (options.timeout) {
      t = setTimeout(() => (timedOut = true), options.timeout);
    }

    const runner = new TestRunner(
      this.#registry,
      filterFn,
      options.failFast ?? false
    );

    if (options.disableLog) {
      logger.disable();
    }

    let endMsg: SuiteEnd | undefined;
    for await (const message of runner) {
      if (timedOut) break;
      if (options.onMessage != null) {
        await options.onMessage(message);
      }
      if (options.logger) {
        print(message, options.logger.log);
      }
      if (message.end != null) {
        endMsg = message.end;
      }
    }
    if (timedOut) {
      endMsg = { ...emptyEndMsg, ...endMsg, timeout: options.timeout ?? 0 };
      if (options.logger) {
        print({ end: endMsg }, options.logger.log);
      }
    }
    if (options.disableLog) {
      logger.enable();
    }
    const final = endMsg ?? emptyEndMsg;
    this.#cache.resolve(final);
    if (endMsg) {
      if ((endMsg.failed > 0 || endMsg.usedOnly) && options.exit) {
        exit(1);
      }
    }
    if (t) clearTimeout(t);
    if (options.reset) this.reset();
    return final;
  }
}

const emptyEndMsg = {
  usedOnly: false,
  duration: 0,
  results: [],
  filtered: 0,
  ignored: 0,
  passed: 0,
  failed: 0,
};

/**
 * SuiteOptions represents options for controlling a test suite.
 */
export interface SuiteOptions extends RunOptions {
  name?: string;
  autoRun?: boolean;
}

/**
 * CreateOptions represents options for creating a new test suite.
 */
export interface CreateOptions extends SuiteOptions {
  fn?: (suite: Suite) => void;
}

/**
 * A test Suite is a test environment in which all tests, groups, and hooks are
 * run together.
 */
export class Suite extends _Suite {
  constructor(name: string);
  constructor(opts: SuiteOptions);
  constructor(opts: string | SuiteOptions = {}) {
    if (typeof opts === "string") {
      opts = { name: opts };
    }
    const { name, ...options } = { autoRun: true, ...opts };
    // We use a separate class here for the auto-run feature. By calling
    // setImmediate (setTimeout in practice) here, we can auto-run the suite
    // _after_ it has be initialized and all the tests have been registered.
    // Otherwise, we end up running the suite twice, once with 0 tests before
    // registering, and once with n tests after they have been registered.
    super(name ?? "[anonymous]", options);
    if (options.autoRun) setTimeout(() => this.run(), 0);
  }

  /**
   * Create a new test suite.
   * @param name Unique, human-readable name for the suite.
   */
  static create(name: string): Suite;
  /**
   * Create a new test suite.
   * @param opts The options to control test suite initialization and runs.
   */
  static create(opts?: SuiteOptions): Suite;
  static create(opts: string | SuiteOptions = {}): Suite {
    if (typeof opts === "string") {
      if (!opts) {
        throw new TypeError("The test name can't be empty");
      }
      opts = { name: opts };
    } else {
      if (!opts.name) {
        throw new TypeError("The test name can't be empty");
      }
    }
    return new Suite(opts);
  }
}

/**
 * Collect a set of suite results, export suites, or promised suite results.
 * @param mods Suite results, modules exporting suite results.
 */
export async function collect(
  ...mods: Array<Promise<ExportedSuiteEnd> | ExportedSuiteEnd | SuiteEnd>
): Promise<SuiteEnd> {
  const promises = mods.map((mod) =>
    Promise.resolve(mod).then((p) => {
      return (p as { default: SuiteEnd }).default
        ? (p as { default: SuiteEnd }).default
        : (p as SuiteEnd);
    })
  );
  const results: SuiteEnd[] = await Promise.all(promises);
  const end: SuiteEnd = { ...emptyEndMsg, results: [] };
  for (const value of results) {
    end.duration += value.duration;
    end.failed += value.failed;
    end.filtered += value.filtered;
    end.ignored += value.ignored;
    end.passed += value.passed;
    end.results.push(...value.results);
    end.usedOnly = end.usedOnly && value.usedOnly;
  }
  // TODO: Maybe don't assume console.log here?
  console.log(`collected ${results.length} suites`);
  print({ end }, console.log);
  return end;
}

/**
 * Create a new test suite from an initialization function.
 */
export function suite(s: string, fn: (suite: Suite) => void): Suite;
export function suite(opts: CreateOptions): Suite;
export function suite(
  s: string | CreateOptions = {},
  fn?: (suite: Suite) => void
): Suite {
  let suiteDef: CreateOptions = {};
  if (typeof s === "string") {
    if (!fn || typeof fn != "function") {
      throw new TypeError("Missing test function");
    }
    if (!s) {
      throw new TypeError("The test name can't be empty");
    }
    suiteDef = { ...suiteDef, fn, name: s };
  } else {
    if (!s.fn) {
      throw new TypeError("Missing test function");
    }
    if (!s.name) {
      throw new TypeError("The test name can't be empty");
    }
    suiteDef = { ...suiteDef, ...s };
  }
  const suite = new Suite(suiteDef);
  if (suiteDef.fn) suiteDef.fn(suite);
  return suite;
}

function createFilterFn(filter?: RegExp | string, skip?: RegExp | string) {
  return (def: TestDefinition) => {
    let passes = true;
    if (filter) {
      if (filter instanceof RegExp) {
        passes = passes && filter.test(def.name);
      } else if (filter.startsWith("/") && filter.endsWith("/")) {
        const filterAsRegex = new RegExp(filter.slice(1, filter.length - 1));
        passes = passes && filterAsRegex.test(def.name);
      } else {
        passes = passes && def.name.includes(filter);
      }
    }
    if (skip) {
      if (skip instanceof RegExp) {
        passes = passes && !skip.test(def.name);
      } else {
        passes = passes && !def.name.includes(skip);
      }
    }

    return passes;
  };
}

const defaultRunOptions: RunOptions = {
  timeout: 5_000, // TODO: What does mocha et al default to?
  exit: true,
  failFast: false,
  filter: undefined,
  skip: undefined,
  disableLog: false,
  logger: logger,
  onMessage: undefined,
};
