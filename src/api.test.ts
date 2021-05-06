import { Suite, suite, assert, collect } from "./mod.js";

// Main API
const { test, group, hooks, end } = new Suite("main");

test("one", () => {
  console.log("in test one");
  assert(true, "should pass");
});

hooks.beforeEach(() => {
  console.log("beforeEach");
});

hooks.beforeAll(() => {
  console.log("beforeAll");
});

hooks.afterAll(() => {
  console.log("afterAll");
});

hooks.afterEach(() => {
  console.log("afterEach");
});

group("group", () => {
  hooks.beforeAll(() => {
    console.log("beforeAll group");
  });
  test("two", () => {
    console.log("in test two");
    assert.notEquals(
      { this: "that", another: false },
      { this: "them", other: true }
    );
  });
  hooks.afterAll(() => {
    console.log("afterAll group");
  });
});

const main = await end;

// Class API
// Tests will auto-run as this is the default behavior for the Suite class
// This is in contrast to the suite function, which defaults to autoRun: false
const s = new Suite({ name: "class", exit: false });

s.test("one", () => {
  console.log("in test one");
  assert(true, "should pass");
});

s.beforeEach(() => {
  console.log("alternative beforeEach");
});

s.beforeAll(() => {
  console.log("alternative beforeAll");
});

s.afterAll(() => {
  console.log("alternative afterAll");
});

s.afterEach(() => {
  console.log("alternative afterEach");
});

s.group("alternative group", () => {
  s.beforeAll(() => {
    console.log("alternative beforeAll group");
  });
  s.test("two", () => {
    console.log("in alternative test two");
    assert.notEquals(
      { this: "that", another: false },
      { this: "them", other: true }
    );
  });
  s.afterAll(() => {
    console.log("alternative afterAll group");
  });
});

const klass = await s.end;

// Chainable
// This is an alternative API that is nice for keeping things concise
const chain = await new Suite("chainable")
  .test("one", () => {
    console.log("in test one");
    assert(true, "should pass");
  })
  .beforeEach(() => {
    console.log("alternative beforeEach");
  })
  .beforeAll(() => {
    console.log("alternative beforeAll");
  })
  .afterAll(() => {
    console.log("alternative afterAll");
  })
  .afterEach(() => {
    console.log("alternative afterEach");
  })
  // Note that group is the only method that needs to be "treated" differently
  // here we actually need to hang on to a ref to the suite (or its methods)
  .group("alternative group", (suite) => {
    suite
      .beforeAll(() => {
        console.log("alternative beforeAll group");
      })
      .test("two", () => {
        console.log("in alternative test two");
        assert.notEquals(
          { this: "that", another: false },
          { this: "them", other: true }
        );
      })
      .afterAll(() => {
        console.log("alternative afterAll group");
      });
  }).end;

// Functional (scoped)
// The suite function automatically creates, builds, and runs the suite
const func = await suite("functional", ({ test, group, hooks }) => {
  test("one", () => {
    console.log("in test one");
    assert(true, "should pass");
  });

  hooks.beforeEach(() => {
    console.log("beforeEach");
  });

  hooks.beforeAll(() => {
    console.log("beforeAll");
  });

  hooks.afterAll(() => {
    console.log("afterAll");
  });

  hooks.afterEach(() => {
    console.log("afterEach");
  });

  group("group", () => {
    hooks.beforeAll(() => {
      console.log("beforeAll group");
    });
    test("two", () => {
      console.log("in test two");
      assert.notEquals(
        { this: "that", another: false },
        { this: "them", other: true }
      );
    });
    hooks.afterAll(() => {
      console.log("afterAll group");
    });
  });
}).end;

export default await collect(main, klass, chain, func);
