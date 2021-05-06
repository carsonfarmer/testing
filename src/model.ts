import { AssertionError } from "./assert.js";

export interface ExportedSuiteEnd {
  default: SuiteEnd;
}

export type SuiteModule =
  | Promise<ExportedSuiteEnd>
  | ExportedSuiteEnd
  | SuiteEnd;

/**
 * Context represents the set of hooks and conditions for a group of tests.
 */
export interface Context {
  // Hooks to run before all tests in the group.
  beforeAll: Array<() => void | Promise<void>>;
  // Hooks to run before each test in the group.
  beforeEach: Array<() => void | Promise<void>>;
  // Hooks to run after each test in the group.
  afterEach: Array<() => void | Promise<void>>;
  // Hooks to run after all tests in the group.
  afterAll: Array<() => void | Promise<void>>;
  // The number of tests waiting to be run.
  waiting: number;
  // The number of tests that have already run.
  completed: number;
  // The number of "only" tests that should be run.
  only: number;
  // The number of completed "only" tests.
  completedOnly: number;
}

export interface TestDefinition {
  /**
   * Test function.
   */
  fn: () => void | Promise<void>;
  /**
   * Human-readable name for the test.
   */
  name: string;
  /**
   * Whether this test should be ignored.
   */
  ignore?: boolean;
  /**
   * Whether only this test should be run.
   * If at least one test has this set to true, only run tests that have
   * only set to true and fail the test suite.
   */
  only?: boolean;
  /**
   * Timeout for test in milliseconds.
   */
  timeout?: number;
}

export interface StackItem extends Context {
  name: string;
}

/**
 * TestEnd represents information about a completed test.
 */
export interface TestEnd {
  // Test name
  name: string;
  // Duration fof the entire test.
  duration: number;
  // The test status.
  status?: "ignored" | "passed" | "failed";
  // The test error in the case of a failure.
  error?: AssertionError;
}

/**
 * SuiteEnd represents information about a completed suite.
 */
export interface SuiteEnd {
  // Whether only was use to limit the test run.
  usedOnly?: boolean;
  // Duration of the entire test suite.
  duration: number;
  // The set of test results.
  results: TestEnd[];
  // The number of filtered tests.
  filtered: number;
  // The number of ignored tests.
  ignored: number;
  // The number of passed tests.
  passed: number;
  // The number of failed tests.
  failed: number;
  // The duration (in ms) after which the suite timed-out
  timeout?: number;
}

/**
 * TestEvent represents an event during a test run.
 */
export interface TestEvent {
  // The initial suite start event.
  start?: { tests: TestDefinition[] };
  // A single test start event.
  testStart?: TestDefinition;
  // A single test end event.
  testEnd?: TestEnd;
  // The final suite end event.
  end?: SuiteEnd;
}

/**
 * RunOptions represents options for controlling a test run.
 */
export interface RunOptions {
  // Whether to reset the suite after running
  reset?: boolean;
  // Timeout for total suite
  timeout?: number;
  // Whether to exit on failure.
  exit?: boolean;
  // Whether to stop at the first failure.
  failFast?: boolean;
  // Only includes tests that match the given filter.
  filter?: RegExp | string;
  // Exclude all tests that match the given filter.
  skip?: RegExp | string;
  // Whether to disable console.log during tests.
  disableLog?: boolean;
  // The reporter/logging function for test results.
  logger?: Pick<globalThis.Console, "log"> | false;
  // A callback to use for each test event.
  onMessage?: (message: TestEvent) => Promise<void>;
}
