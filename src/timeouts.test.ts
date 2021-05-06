import { delay, Suite, assert } from "./mod.js";

// Main test suite
// Also test bdd style aliases
const { it, describe, run } = new Suite({
  name: "timeout",
  exit: false,
  reset: true,
  autoRun: false,
});

// Failure suite
const s = new Suite({
  name: "subtests",
  exit: false,
  autoRun: false,
  timeout: 10,
  reset: true,
  logger: false,
});

s.test({
  name: "timeout",
  fn: async () => {
    await delay(20);
    assert(true, "this should pass");
  },
});

const res1 = await s.run();

s.options.timeout = undefined;

s.test({
  name: "timeout",
  timeout: 10,
  fn: async () => {
    await delay(20);
    assert(true, "this should pass");
  },
});

s.test({
  name: "not timeout",
  fn: async () => {
    assert(true, "this should pass");
  },
});

const res2 = await s.run();

describe("timeouts", () => {
  it("should support timeouts at the suite level", () => {
    // But not any individual tests
    assert.strictEquals(res1.failed, 0);
    assert.strictEquals(res1.timeout, 10);
  });

  it("should support timeouts at the test level", () => {
    // But not any individual tests
    assert.strictEquals(res2.failed, 1);
    assert.strictEquals(res2.timeout, undefined);
  });
});

export default await run();
