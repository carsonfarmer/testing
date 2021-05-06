import { collect } from "./mod.js";

// Run tests in series
collect(
  await import("./assert.test.js"),
  await import("./core.test.js"),
  await import("./hooks.test.js"),
  await import("./timeouts.test.js"),
  await import("./api.test.js")
);
// Run tests in parallel
// collect(import("./hooks.test.js"), import("./assert.test.js"));
