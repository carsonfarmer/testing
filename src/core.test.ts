import { delay, Suite, TestEvent, assert } from "./mod.js";

// Main test suite
const { test, group, run } = new Suite({ name: "core", autoRun: false });

// Failure suite
const s = new Suite({
  name: "subtests",
  exit: false,
  autoRun: false,
  reset: true,
  logger: false,
});

s.test("this will be filtered", () => {
  assert(false, "nothing to report");
});

s.test({
  name: "this will be ignored",
  fn: () => assert(false, "nothing to report"),
  ignore: true,
});

s.test({
  only: false,
  name: "def",
  fn: () => undefined,
});

// Filtering and skipping

s.test("skips", function () {
  assert(false);
});

// Now run all the above tests and clear them after completion

const skips = await s.run({ skip: /skips$/, filter: "nothing", reset: false });
const strings = await s.run({
  skip: "skips",
  filter: "/^((?!(filtered)).)*$/",
  reset: false,
});
const filtered = await s.run({ filter: /^((?!(filtered)).)*$/ });

s.test({
  only: true,
  name: "only fails",
  fn: () => undefined, // This would actually be a success
});

// Run our "silent" tests to build up test results

const onlyFails = await s.run();

// BeforeAll and AfterAll

let beforeCalled = false;
let afterCalled = false;
let beforeCount = 0;
let afterCount = 0;

// Create silent tests

s.group("multi-fails", () => {
  s.beforeAll(() => {
    beforeCalled = true;
  });

  s.afterAll(() => {
    afterCalled = true;
  });

  s.beforeEach(() => {
    beforeCount++;
  });

  s.afterEach(() => {
    afterCount++;
  });

  s.test("fail1", function () {
    assert(false, "fail1 assertion");
  });

  s.test("fail2", function () {
    assert(false, "fail2 assertion");
  });

  s.test("fail3", function () {
    assert(false, "fail3 assertion");
  });
});

const multiFails = await s.run({ logger: false });

// Custom onMessage behavior
let messageCalled = false;

const onMessage = async (msg: TestEvent) => {
  assert(msg !== undefined, "shouldn't be undefined");
  messageCalled = true;
};

// Create silent tests

s.test("onMessage", () => assert(true, "message"));

await s.run({ onMessage });

s.test("silent failures", () => {
  assert(false, "should fail");
});

const failed = await s.run({ logger: { log: () => undefined } });

group("skips and filters", () => {
  test("should skip and/or filter", () => {
    assert.strictEquals(skips.filtered, 4);
    assert.strictEquals(skips.failed, 0);
    // Because it was skipped
    assert.strictEquals(skips.ignored, 0);
  });
  test("should filter", () => {
    assert.strictEquals(filtered.filtered, 1);
    assert.strictEquals(filtered.failed, 1);
    assert.strictEquals(skips.ignored, 0);
  });
  test("should handle strings", () => {
    assert.strictEquals(strings.filtered, 2);
    assert.strictEquals(strings.failed, 0);
    assert.strictEquals(strings.ignored, 1);
  });
});

test("failures", () => {
  assert.strictEquals(failed.failed, 1);
});

test("assert", () => {
  assert(true, "something");
  assert.throws(() => assert(false, "something"));
});

test("invalid test setup", () => {
  assert.throws(() => test("error", undefined as never));
  assert.throws(() => test("", () => undefined));
  assert.throws(() => test({ name: "no function" } as never));
  assert.throws(() => test({ fn: () => undefined } as never));
});

test("missing test function", () => {
  assert.throws(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => test("blah", undefined as any),
    TypeError,
    "Missing test function"
  );
});

group("async", async () => {
  test("async test", async () => assert(true, "async should not fail"));
  test("async/await", async () => {
    await delay(100);
    return;
  });
});

test("default success", () => undefined);

test("assert success", function () {
  assert(true);
});

group("only", () => {
  test("only fails", () => {
    // Default to false (but it should be true!)
    assert(onlyFails.usedOnly, "should have used only");
  });
});

group("multiple fails", () => {
  test("expect to have called hooks", () => {
    assert.strictEquals(multiFails.failed, 3);
    assert(beforeCalled, "beforeAll should have run");
    assert(afterCalled, "afterAll should have run");
    assert.strictEquals(beforeCount, 3);
    assert.strictEquals(afterCount, 3);
  });
});

test("onMessage", () => assert(messageCalled, "should have called onMessage"));

// test("error", function () {
//   const timer = setTimeout(() => null, 10000);
//   try {
//     throw new Error("fail");
//   } finally {
//     clearTimeout(timer);
//   }
// });

// const timeout = await run({ logger: false });

// test("clear timeouts", () => {
//   assert(timeout.failed === 1, "should have failed");
//   const t = timeout.results?.shift();
//   assert.strictEquals(t?.status, "failed");
//   assert.strictEquals(t?.error?.message, "fail");
// });

export default await run();
