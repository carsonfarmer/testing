import { suite } from "./mod.js";

// To enable serial tests, await the test suite
export default await suite({
  name: "hooks",
  disableLog: true,
  fn: ({ hooks, test, group }) => {
    hooks.beforeAll(() => {
      console.log("before all global");
    });

    hooks.beforeAll(() => {
      console.log("second before all global");
    });

    hooks.beforeEach(() => {
      console.log("before each global");
    });

    hooks.afterEach(() => {
      console.log("after each global");
    });

    hooks.afterAll(() => {
      console.log("after all global");
    });

    test("1", () => {
      console.log("1");
    });

    test({
      name: "2",
      fn() {
        console.log("2");
      },
      ignore: true,
    });

    test("3", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log("3");
    });

    group("group 1", () => {
      hooks.beforeAll(() => {
        console.log("before all group 1");
      });

      hooks.beforeEach(() => {
        console.log("before each group 1");
      });

      hooks.afterEach(() => {
        console.log("after each group 1");
      });

      hooks.afterAll(() => {
        console.log("after all group 1");
      });

      test("1", () => {
        console.log("1");
      });

      test({
        name: "2",
        fn() {
          console.log("2");
        },
        ignore: true,
      });

      test("3", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("3");
      });
    });

    group("group 2", () => {
      hooks.beforeAll(() => {
        console.log("before all group 2");
      });

      hooks.beforeEach(() => {
        console.log("before each group 2");
      });

      hooks.afterEach(() => {
        console.log("after each group 2");
      });

      hooks.afterAll(() => {
        console.log("after all group 2");
      });

      test("1", () => {
        console.log("1");
      });

      group("group 3", () => {
        hooks.beforeAll(() => {
          console.log("before all group 3");
        });

        hooks.beforeEach(() => {
          console.log("before each group 3");
        });

        hooks.afterEach(() => {
          console.log("after each group 3");
        });

        hooks.afterAll(() => {
          console.log("after all group 3");
        });

        test("1", () => {
          console.log("1");
        });

        test({
          name: "2",
          fn() {
            console.log("2");
          },
          ignore: true,
        });

        test("3", async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          console.log("3");
        });
      });

      test("3", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("3");
      });
    });
  },
}).end;
