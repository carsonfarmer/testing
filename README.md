# `@nullify/testing`

## Why?

Because writing tests should be just like writing any other code. When writing tests with `@nullify/testing`, test modules are simple standalone scripts. They can be run in NodeJS, browsers, on mobile devices, etc. There are no external test runners or special global variables to require. Simply import `@nullify/testing`, define your tests using APIs that are similar to other testing frameworks, and run the script "as is".

It will automatically run as a test suite!

## Features

- No cli, external test runners, or global variables
- Minimal and fast API with zero dependencies
- Async/await and promise support
- Run suites serially or concurrently
- Supports timeouts at the suite and individual test level
- Browser support (thanks to ES modules)
- Use any assertion library you want (but comes with its own)
- Built with Typescript, and supports Typescript tests
- Coverage reporting tools "just work"

## Usage

There are multiple alternative APIs to make using `@nullify/testing` as easy as possible. Each test "suite" is a self-contained test suite, with its own runner and "stack" of hooks. Hooks are scoped to a given suite, and possibly to a given group within a suite. Ideally, each suite is its own module, and can be auto-run on import. For more complex testing scenarios, it is possible to include multiple suites in a single module, or to use an "index" test script to import multiple test suites.

Tests _within_ a suite are run serially. But, individual suites can be run concurrently. Concurrency is simply a function of how the test suite is run. If you export a "promised" suite from a module and await it before running the next, you have serial tests, otherwise, you'll have concurrent tests!

### Examples

**Suite as object**

Import and create a new suite object. Tests can be awaited to support running multiple suites in series (or concurrently). Specify optional settings to control suite behavior, such as disabling `console.log` output, or auto-running the whole suite.

```typescript
// one.test.js
import { Suite, assert } from "@nullify/testing";

const { test, end } = Suite.create("object");

test("one", () => {
  assert(true, "should pass");
});

// Export awaited promise to enable chain-able test suites!
export default await end;
```

A series of test suites like the above can be chained with:

```typescript
// index.test.js
await import("one.test.js");
await import("two.test.js");
...
import("one.test.js").then(() => import("two.test.js"));

export {}
```

Alternatively, `@nullify/testing` comes with a tool to "collect" suites into a single run:

```typescript
import { collect } from "@nullify/testing";

// Run tests in series
collect(
  await import("./one.test.js"),
  await import("./two.test.js"),
  await import("./three.test.js")
);
```

**Suite as class**

Import and create a new test Suite. By default, a Suite will automatically run your tests on import. Suites also support chained methods for a concise test specification.

```typescript
import { Suite, assert } from "@nullify/testing";

// Tests will auto-run when this module is imported/run
const suite = new Suite("class");

suite
  .beforeEach(() => {
    // Setup test here
  })
  .test("one", () => {
    assert(true, "should pass");
  })
  .afterEach(() => {
    // Cleanup test here
  });
```

**Suite as function**

Suites can be kept isolated within the same module, or across multiple (importable) modules. To make specifying multiple suites per module nicer (or at last, nicer looking), there is also a "functional" API that lets you to scope test methods to a single suite setup function:

```typescript
import { suite, assert } from "@nullify/testing";

suite("func", ({ test, group, hooks }) => {
  test("one", () => {
    assert(true, "should pass");
  });

  group("group", () => {
    hooks.beforeAll(() => {
      // Group-specific test setup
    });
    test("two", () => {
      // This will fail!
      assert.deepStrictEqual(
        { this: "that", another: false },
        { this: "them", other: true }
      );
    });
  });
});
```

**Typescript support**

Since suites are just scripts, simply run your script with Typescript support:

```bash
node --loader ts-node/esm file.test.ts
```

**Test coverage**

Most test coverage tools "just work", without any additional effort:

```bash
c8 node file.test.js
```

**Browser support**

Runs in any modern browser with ES module support. Simply import it and define your tests; no bundlers required. In fact, if you're viewing this README via https://carsonfarmer.github.io/testing/ or somewhere that allows `<script/>`, you can see the test results for the following "suite" in your developer console!

```html
<script type="module">
  import { Suite, assert } from "https://unpkg.com/@nullify/testing";

  const suite = new Suite("example");
  suite.test("one", () => {
    assert(true, "should pass");
  });
</script>
```

**Alternative APIs**

To make migrating existing test suites over to `@nullify/testing` easier, the library comes with (a limited set of) built-in aliases for BDD style interfaces. Just include the imports and destructuring at the top of
your test files, and you're pretty much good to go!

```typescript
import { Suite, assert } from "@nullify/testing";

const { it, describe, before } = Suite.create("bdd");

describe("the main test", () => {
  let something: string = "";
  before(() => {
    something = "from nothing!";
  });
  it("should be strictly equal", () => {
    assert.strictEquals(something, "from nothing!");
  });
});
```

<script type="module" unsafe-inline>
  import { Suite, assert } from "https://unpkg.com/@nullify/testing/dist/mod.js";

  const suite = new Suite("example");
  suite.test("one", () => {
    assert(true, "should pass");
  });
</script>

## Details/Thanks

The `@nullify/testing` library borrows heavily from the Deno standard library [`testing` module](https://github.com/denoland/deno_std/tree/main/testing), the builtin [`Deno.test`](https://doc.deno.land/builtin/stable#Deno.test) tooling, as well as [`node-test`](https://github.com/ben-page/node-test), and [`hooked`](https://github.com/luvies/deno_hooked). It is kept simple by only supporting ES modules, promises and async/await patterns, and a very limited and opinionated API. What this leads to is simpler tests that "just work".

Hooks are implemented using a last-in first-out (LIFO) stack (thanks `hooked`), and the built-in test runner is a simple ordered test registry that can be iterated over as an async iterable (thanks Deno). The built-in assertion library is borrowed directly from Deno with minimal changes (thanks again Deno). The main difference is in how objects are formatted for comparison. This library uses vanilla `JSON.stringify` behavior to keep things simple and compatible, but at the expense of twice as many calls to `JSON.stringify` (thanks Stackoverflow).
