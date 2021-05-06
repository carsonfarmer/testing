// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import {
  format,
  assert,
  arrayIncludes,
  equals,
  exists,
  AssertionError,
  match,
  notEquals,
  notMatch,
  notStrictEquals,
  objectMatch,
  strictEquals,
  stringIncludes,
  throws,
  rejects,
  equal,
  fail,
  unimplemented,
  unreachable,
} from "./assert.js";
import { bold, gray, green, red, stripColor, yellow } from "./colors.js";
import Suite from "./mod.js";

const suite = new Suite("assert");
const { test, end } = suite;

test("testingEqual", function (): void {
  assert(equal("world", "world"));
  assert(!equal("hello", "world"));
  assert(equal(5, 5));
  assert(!equal(5, 6));
  assert(equal(NaN, NaN));
  assert(equal({ hello: "world" }, { hello: "world" }));
  assert(!equal({ world: "hello" }, { hello: "world" }));
  assert(
    equal(
      { hello: "world", hi: { there: "everyone" } },
      { hello: "world", hi: { there: "everyone" } }
    )
  );
  assert(
    !equal(
      { hello: "world", hi: { there: "everyone" } },
      { hello: "world", hi: { there: "everyone else" } }
    )
  );
  assert(equal({ [Symbol.for("foo")]: "bar" }, { [Symbol.for("foo")]: "bar" }));
  assert(!equal({ [Symbol("foo")]: "bar" }, { [Symbol("foo")]: "bar" }));
  assert(equal(/deno/, /deno/));
  assert(!equal(/deno/, /node/));
  assert(equal(new Date(2019, 0, 3), new Date(2019, 0, 3)));
  assert(!equal(new Date(2019, 0, 3), new Date(2019, 1, 3)));
  assert(
    !equal(
      new Date(2019, 0, 3, 4, 20, 1, 10),
      new Date(2019, 0, 3, 4, 20, 1, 20)
    )
  );
  assert(equal(new Date("Invalid"), new Date("Invalid")));
  assert(!equal(new Date("Invalid"), new Date(2019, 0, 3)));
  assert(!equal(new Date("Invalid"), new Date(2019, 0, 3, 4, 20, 1, 10)));
  assert(equal(new Set([1]), new Set([1])));
  assert(!equal(new Set([1]), new Set([2])));
  assert(equal(new Set([1, 2, 3]), new Set([3, 2, 1])));
  assert(equal(new Set([1, new Set([2, 3])]), new Set([new Set([3, 2]), 1])));
  assert(!equal(new Set([1, 2]), new Set([3, 2, 1])));
  assert(!equal(new Set([1, 2, 3]), new Set([4, 5, 6])));
  assert(equal(new Set("denosaurus"), new Set("denosaurussss")));
  assert(equal(new Map(), new Map()));
  assert(
    equal(
      new Map([
        ["foo", "bar"],
        ["baz", "baz"],
      ]),
      new Map([
        ["foo", "bar"],
        ["baz", "baz"],
      ])
    )
  );
  assert(
    equal(
      new Map([["foo", new Map([["bar", "baz"]])]]),
      new Map([["foo", new Map([["bar", "baz"]])]])
    )
  );
  assert(
    equal(
      new Map([["foo", { bar: "baz" }]]),
      new Map([["foo", { bar: "baz" }]])
    )
  );
  assert(
    equal(
      new Map([
        ["foo", "bar"],
        ["baz", "qux"],
      ]),
      new Map([
        ["baz", "qux"],
        ["foo", "bar"],
      ])
    )
  );
  assert(equal(new Map([["foo", ["bar"]]]), new Map([["foo", ["bar"]]])));
  assert(!equal(new Map([["foo", "bar"]]), new Map([["bar", "baz"]])));
  assert(
    !equal(
      new Map([["foo", "bar"]]),
      new Map([
        ["foo", "bar"],
        ["bar", "baz"],
      ])
    )
  );
  assert(
    !equal(
      new Map([["foo", new Map([["bar", "baz"]])]]),
      new Map([["foo", new Map([["bar", "qux"]])]])
    )
  );
  assert(equal(new Map([[{ x: 1 }, true]]), new Map([[{ x: 1 }, true]])));
  assert(!equal(new Map([[{ x: 1 }, true]]), new Map([[{ x: 1 }, false]])));
  assert(!equal(new Map([[{ x: 1 }, true]]), new Map([[{ x: 2 }, true]])));
  assert(equal([1, 2, 3], [1, 2, 3]));
  assert(equal([1, [2, 3]], [1, [2, 3]]));
  assert(!equal([1, 2, 3, 4], [1, 2, 3]));
  assert(!equal([1, 2, 3, 4], [1, 2, 3]));
  assert(!equal([1, 2, 3, 4], [1, 4, 2, 3]));
  assert(equal(new Uint8Array([1, 2, 3, 4]), new Uint8Array([1, 2, 3, 4])));
  assert(!equal(new Uint8Array([1, 2, 3, 4]), new Uint8Array([2, 1, 4, 3])));
  assert(
    equal(new URL("https://example.test"), new URL("https://example.test"))
  );
  assert(
    !equal(
      new URL("https://example.test"),
      new URL("https://example.test/with-path")
    )
  );
  assert(
    !equal({ a: undefined, b: undefined }, { a: undefined, c: undefined })
  );
  assert(!equal({ a: undefined, b: undefined }, { a: undefined }));
});

test("testingNotEquals", function (): void {
  const a = { foo: "bar" };
  const b = { bar: "foo" };
  notEquals(a, b);
  notEquals("Denosaurus", "Tyrannosaurus");
  notEquals(
    new Date(2019, 0, 3, 4, 20, 1, 10),
    new Date(2019, 0, 3, 4, 20, 1, 20)
  );
  notEquals(new Date("invalid"), new Date(2019, 0, 3, 4, 20, 1, 20));
  let didThrow;
  try {
    notEquals("Raptor", "Raptor");
    didThrow = false;
  } catch (e) {
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  equals(didThrow, true);
});

test("testingAssertExists", function (): void {
  exists("Denosaurus");
  exists(false);
  exists(0);
  exists("");
  exists(-0);
  exists(0);
  exists(NaN);
  let didThrow;
  try {
    exists(undefined);
    didThrow = false;
  } catch (e) {
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  equals(didThrow, true);
  didThrow = false;
  try {
    exists(null);
    didThrow = false;
  } catch (e) {
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  equals(didThrow, true);
});

test("testingAssertStringContains", function (): void {
  stringIncludes("Denosaurus", "saur");
  stringIncludes("Denosaurus", "Deno");
  stringIncludes("Denosaurus", "rus");
  let didThrow;
  try {
    stringIncludes("Denosaurus", "Raptor");
    didThrow = false;
  } catch (e) {
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  equals(didThrow, true);
});

test("testingArrayContains", function (): void {
  const fixture = ["deno", "iz", "luv"];
  const fixtureObject = [{ deno: "luv" }, { deno: "Js" }];
  arrayIncludes(fixture, ["deno"]);
  arrayIncludes(fixtureObject, [{ deno: "luv" }]);
  arrayIncludes(Uint8Array.from([1, 2, 3, 4]), Uint8Array.from([1, 2, 3]));
  throws(
    (): void => arrayIncludes(fixtureObject, [{ deno: "node" }]),
    AssertionError,
    `actual: "[
  {
    deno: "luv"
  },
  {
    deno: "Js"
  }
]" expected to include: "[
  {
    deno: "node"
  }
]"
missing: [
  {
    deno: "node"
  }
]`
  );
});

test("testingAssertStringContainsThrow", function (): void {
  let didThrow = false;
  try {
    stringIncludes("Denosaurus from Jurassic", "Raptor");
  } catch (e) {
    assert(
      e.message ===
        `actual: "Denosaurus from Jurassic" expected to contain: "Raptor"`
    );
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  assert(didThrow);
});

test("testingAssertStringMatching", function (): void {
  match("foobar@deno.com", RegExp(/[a-zA-Z]+@[a-zA-Z]+.com/));
});

test("testingAssertStringMatchingThrows", function (): void {
  let didThrow = false;
  try {
    match("Denosaurus from Jurassic", RegExp(/Raptor/));
  } catch (e) {
    assert(
      e.message ===
        `actual: "Denosaurus from Jurassic" expected to match: "/Raptor/"`
    );
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  assert(didThrow);
});

test("testingAssertStringNotMatching", function (): void {
  notMatch("foobar.deno.com", RegExp(/[a-zA-Z]+@[a-zA-Z]+.com/));
});

test("testingAssertStringNotMatchingThrows", function (): void {
  let didThrow = false;
  try {
    notMatch("Denosaurus from Jurassic", RegExp(/from/));
  } catch (e) {
    assert(
      e.message ===
        `actual: "Denosaurus from Jurassic" expected to not match: "/from/"`
    );
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  assert(didThrow);
});

test("testingAssertObjectMatching", function (): void {
  const sym = Symbol("foo");
  const a = { foo: true, bar: false };
  const b = { ...a, baz: a };
  const c = { ...b, qux: b };
  const d = { corge: c, grault: c };
  const e = { foo: true } as { [key: string]: unknown };
  e.bar = e;
  const f = { [sym]: true, bar: false };
  interface r {
    foo: boolean;
    bar: boolean;
  }
  const g: r = { foo: true, bar: false };

  // Simple subset
  objectMatch(a, {
    foo: true,
  });
  // Subset with another subset
  objectMatch(b, {
    foo: true,
    baz: { bar: false },
  });
  // Subset with multiple subsets
  objectMatch(c, {
    foo: true,
    baz: { bar: false },
    qux: {
      baz: { foo: true },
    },
  });
  // Subset with same object reference as subset
  objectMatch(d, {
    corge: {
      foo: true,
      qux: { bar: false },
    },
    grault: {
      bar: false,
      qux: { foo: true },
    },
  });
  // Subset with circular reference
  objectMatch(e, {
    foo: true,
    bar: {
      bar: {
        bar: {
          foo: true,
        },
      },
    },
  });
  // Subset with interface
  objectMatch(g, { bar: false });
  // Subset with same symbol
  objectMatch(f, {
    [sym]: true,
  });
  // Missing key
  {
    let didThrow;
    try {
      objectMatch(
        {
          foo: true,
        },
        {
          foo: true,
          bar: false,
        }
      );
      didThrow = false;
    } catch (e) {
      assert(e instanceof AssertionError);
      didThrow = true;
    }
    equals(didThrow, true);
  }
  // Simple subset
  {
    let didThrow;
    try {
      objectMatch(a, {
        foo: false,
      });
      didThrow = false;
    } catch (e) {
      assert(e instanceof AssertionError);
      didThrow = true;
    }
    equals(didThrow, true);
  }
  // Subset with another subset
  {
    let didThrow;
    try {
      objectMatch(b, {
        foo: true,
        baz: { bar: true },
      });
      didThrow = false;
    } catch (e) {
      assert(e instanceof AssertionError);
      didThrow = true;
    }
    equals(didThrow, true);
  }
  // Subset with multiple subsets
  {
    let didThrow;
    try {
      objectMatch(c, {
        foo: true,
        baz: { bar: false },
        qux: {
          baz: { foo: false },
        },
      });
      didThrow = false;
    } catch (e) {
      assert(e instanceof AssertionError);
      didThrow = true;
    }
    equals(didThrow, true);
  }
  // Subset with same object reference as subset
  {
    let didThrow;
    try {
      objectMatch(d, {
        corge: {
          foo: true,
          qux: { bar: true },
        },
        grault: {
          bar: false,
          qux: { foo: false },
        },
      });
      didThrow = false;
    } catch (e) {
      assert(e instanceof AssertionError);
      didThrow = true;
    }
    equals(didThrow, true);
  }
  // Subset with circular reference
  {
    let didThrow;
    try {
      objectMatch(e, {
        foo: true,
        bar: {
          bar: {
            bar: {
              foo: false,
            },
          },
        },
      });
      didThrow = false;
    } catch (e) {
      assert(e instanceof AssertionError);
      didThrow = true;
    }
    equals(didThrow, true);
  }
  // Subset with symbol key but with string key subset
  {
    let didThrow;
    try {
      objectMatch(f, {
        foo: true,
      });
      didThrow = false;
    } catch (e) {
      assert(e instanceof AssertionError);
      didThrow = true;
    }
    equals(didThrow, true);
  }
});

test("testingAssertsUnimplemented", function (): void {
  let didThrow = false;
  try {
    unimplemented();
  } catch (e) {
    assert(e.message === "unimplemented");
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  assert(didThrow);
});

test("testingAssertsUnreachable", function (): void {
  let didThrow = false;
  try {
    unreachable();
  } catch (e) {
    assert(e.message === "unreachable");
    assert(e instanceof AssertionError);
    didThrow = true;
  }
  assert(didThrow);
});

test("testingAssertFail", function (): void {
  throws(fail, AssertionError, "Failed assertion.");
  throws(
    (): void => {
      fail("foo");
    },
    AssertionError,
    "Failed assertion: foo"
  );
});

test("testingAssertFailWithWrongErrorClass", function (): void {
  throws(
    (): void => {
      //This next assertThrows will throw an AssertionError due to the wrong
      //expected error class
      throws(
        (): void => {
          fail("foo");
        },
        TypeError,
        "Failed assertion: foo"
      );
    },
    AssertionError,
    `Expected error to be instance of "TypeError", but was "AssertionError"`
  );
});

test("testingAssertThrowsWithReturnType", () => {
  throws(() => {
    throw new Error();
  });
});

test("testingAssertThrowsAsyncWithReturnType", () => {
  rejects(() => {
    throw new Error();
  });
});

const createHeader = (): string[] => [
  "",
  "",
  `    ${gray(bold("[Diff]"))} ${red(bold("Actual"))} / ${green(
    bold("Expected")
  )}`,
  "",
  "",
];

const added: (s: string) => string = (s: string): string =>
  green(bold(stripColor(s)));
const removed: (s: string) => string = (s: string): string =>
  red(bold(stripColor(s)));

test({
  name: "pass case",
  fn(): void {
    equals({ a: 10 }, { a: 10 });
    equals(true, true);
    equals(10, 10);
    equals("abc", "abc");
    equals({ a: 10, b: { c: "1" } }, { a: 10, b: { c: "1" } });
    equals(new Date("invalid"), new Date("invalid"));
  },
});

test({
  name: "failed with number",
  fn(): void {
    throws(
      (): void => equals(1, 2),
      AssertionError,
      [
        "Values are not equal:",
        ...createHeader(),
        removed(`-   ${yellow("1")}`),
        added(`+   ${yellow("2")}`),
      ].join("\n")
    );
  },
});

test({
  name: "failed with number vs string",
  fn(): void {
    throws(
      (): void => equals(1, "1"),
      AssertionError,
      [
        "Values are not equal:",
        ...createHeader(),
        removed(`-   ${yellow("1")}`),
        added(`+   "1"`),
      ].join("\n")
    );
  },
});

test({
  name: "failed with array",
  fn(): void {
    throws(
      (): void => equals([1, "2", 3], ["1", "2", 3]),
      AssertionError,
      `
    [
-     1,
+     "1",
      "2",
      3
    ]`
    );
  },
});

test({
  name: "failed with object",
  fn(): void {
    throws(
      (): void => equals({ a: 1, b: "2", c: 3 }, { a: 1, b: 2, c: [3] }),
      AssertionError,
      `
    {
      a: 1,
+     b: 2,
+     c: [
+       3
+     ]
-     b: "2",
-     c: 3
    }`
    );
  },
});

test({
  name: "failed with date",
  fn(): void {
    throws(
      (): void =>
        equals(
          new Date(2019, 0, 3, 4, 20, 1, 10),
          new Date(2019, 0, 3, 4, 20, 1, 20)
        ),
      AssertionError,
      [
        "Values are not equal:",
        ...createHeader(),
        removed(`-   "${new Date(2019, 0, 3, 4, 20, 1, 10).toISOString()}"`),
        added(`+   "${new Date(2019, 0, 3, 4, 20, 1, 20).toISOString()}"`),
      ].join("\n")
    );
    throws(
      (): void =>
        equals(new Date("invalid"), new Date(2019, 0, 3, 4, 20, 1, 20)),
      AssertionError,
      [
        "Values are not equal:",
        ...createHeader(),
        removed(`-   null`),
        added(`+   "${new Date(2019, 0, 3, 4, 20, 1, 20).toISOString()}"`),
      ].join("\n")
    );
  },
});

test({
  name: "strict pass case",
  fn(): void {
    strictEquals(true, true);
    strictEquals(10, 10);
    strictEquals("abc", "abc");

    const xs = [1, false, "foo"];
    const ys = xs;
    strictEquals(xs, ys);

    const x = { a: 1 };
    const y = x;
    strictEquals(x, y);
  },
});

test({
  name: "strict failed with structure diff",
  fn(): void {
    throws(
      (): void => strictEquals({ a: 1, b: 2 }, { a: 1, c: [3] }),
      AssertionError,
      `
    {
      a: 1,
+     c: [
+       3
+     ]
-     b: 2
    }`
    );
  },
});

test({
  name: "strict failed with reference diff",
  fn(): void {
    throws(
      (): void => strictEquals({ a: 1, b: 2 }, { a: 1, b: 2 }),
      AssertionError,
      `Values have the same structure but are not reference-equal:

    {
      a: 1,
      b: 2
    }`
    );
  },
});

test({
  name: "strictly unequal pass case",
  fn(): void {
    notStrictEquals(true, false);
    notStrictEquals(10, 11);
    notStrictEquals("abc", "xyz");
    notStrictEquals(1, "1");

    const xs = [1, false, "foo"];
    const ys = [1, true, "bar"];
    notStrictEquals(xs, ys);

    const x = { a: 1 };
    const y = { a: 2 };
    notStrictEquals(x, y);
  },
});

test({
  name: "strictly unequal fail case",
  fn(): void {
    throws(() => notStrictEquals(1, 1), AssertionError);
  },
});

test({
  name: "assert* functions with specified type parameter",
  fn(): void {
    equals<string>("hello", "hello");
    notEquals<number>(1, 2);
    arrayIncludes<boolean>([true, false], [true]);
    const value = { x: 1 };
    strictEquals<typeof value>(value, value);
    // eslint-disable-next-line @typescript-eslint/ban-types
    notStrictEquals<object>(value, { x: 1 });
  },
});

test("Assert Throws Non-Error Fail", () => {
  throws(
    () => {
      throws(
        () => {
          throw "Panic!";
        },
        String,
        "Panic!"
      );
    },
    AssertionError,
    "A non-Error object was thrown."
  );

  throws(
    () => {
      throws(() => {
        throw null;
      });
    },
    AssertionError,
    "A non-Error object was thrown."
  );

  throws(
    () => {
      throws(() => {
        throw undefined;
      });
    },
    AssertionError,
    "A non-Error object was thrown."
  );
});

test("Assert Throws Async Non-Error Fail", () => {
  rejects(
    () => {
      return rejects(
        () => {
          return Promise.reject("Panic!");
        },
        String,
        "Panic!"
      );
    },
    AssertionError,
    "A non-Error object was thrown or rejected."
  );

  rejects(
    () => {
      return rejects(() => {
        return Promise.reject(null);
      });
    },
    AssertionError,
    "A non-Error object was thrown or rejected."
  );

  rejects(
    () => {
      return rejects(() => {
        return Promise.reject(undefined);
      });
    },
    AssertionError,
    "A non-Error object was thrown or rejected."
  );

  rejects(
    () => {
      return rejects(() => {
        throw undefined;
      });
    },
    AssertionError,
    "A non-Error object was thrown or rejected."
  );
});

test("assertEquals diff for differently ordered objects", () => {
  throws(
    () => {
      equals(
        {
          aaaaaaaaaaaaaaaaaaaaaaaa: 0,
          bbbbbbbbbbbbbbbbbbbbbbbb: 0,
          ccccccccccccccccccccccc: 0,
        },
        {
          ccccccccccccccccccccccc: 1,
          aaaaaaaaaaaaaaaaaaaaaaaa: 0,
          bbbbbbbbbbbbbbbbbbbbbbbb: 0,
        }
      );
    },
    AssertionError,
    `
    {
      aaaaaaaaaaaaaaaaaaaaaaaa: 0,
      bbbbbbbbbbbbbbbbbbbbbbbb: 0,
-     ccccccccccccccccccccccc: 0
+     ccccccccccccccccccccccc: 1
    }`
  );
});

// Check that the diff formatter overrides some default behaviours of
// `Deno.inspect()` which are problematic for diffing.
test("assert diff formatting", () => {
  // Wraps objects into multiple lines even when they are small. Prints trailing
  // commas.
  equals(
    stripColor(format({ a: 1, b: 2 })),
    `{
  a: 1,
  b: 2
}`
  );

  // Same for nested small objects.
  equals(
    stripColor(format([{ x: { a: 1, b: 2 }, y: ["a", "b"] }])),
    `[
  {
    x: {
      a: 1,
      b: 2
    },
    y: [
      "a",
      "b"
    ]
  }
]`
  );

  // Grouping is disabled.
  equals(
    stripColor(format(["i", "i", "i", "i", "i", "i", "i"])),
    `[
  "i",
  "i",
  "i",
  "i",
  "i",
  "i",
  "i"
]`
  );
});

test("Assert Throws Parent Error", () => {
  throws(
    () => {
      throw new AssertionError("Fail!");
    },
    Error,
    "Fail!"
  );
});

test("Assert Throws Async Parent Error", () => {
  rejects(
    () => {
      throw new AssertionError("Fail!");
    },
    Error,
    "Fail!"
  );
});

export default await end;
