import { Suite, suite, collect } from "./testing.js";
export type { SuiteOptions, CreateOptions } from "./testing.js";
export { Suite, suite, collect };
export default Suite;
export type {
  TestEnd,
  SuiteEnd,
  TestDefinition,
  TestEvent,
  RunOptions,
  ExportedSuiteEnd,
  SuiteModule,
} from "./model.js";
export { delay, exit } from "./utils.js";
import * as Assertions from "./assert.js";
import { assert as Assert } from "./assert.js";

const assert: typeof Assertions & typeof Assert = Object.assign(
  Assert,
  Assertions
);
export { assert };
export { AssertionError } from "./assert.js";
