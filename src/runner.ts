import { TestEvent, TestDefinition, TestEnd } from "./model.js";
import { timeout } from "./utils.js";

export class TestRunner implements AsyncIterable<TestEvent> {
  #usedOnly = false;
  stats: {
    filtered: number;
    ignored: number;
    passed: number;
    failed: number;
  };
  filterFn: (value: TestDefinition) => boolean;
  failFast: boolean;
  testsToRun: TestDefinition[];

  constructor(
    tests: TestDefinition[],
    filterFn: (value: TestDefinition) => boolean,
    failFast: boolean
  ) {
    this.stats = {
      filtered: 0,
      ignored: 0,
      passed: 0,
      failed: 0,
    };
    this.filterFn = filterFn;
    this.failFast = failFast;
    const onlyTests = tests.filter(({ only }) => only);
    this.#usedOnly = onlyTests.length > 0;
    const unfilteredTests = this.#usedOnly ? onlyTests : tests;
    this.testsToRun = unfilteredTests.filter(filterFn);
    this.stats.filtered = unfilteredTests.length - this.testsToRun.length;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<TestEvent> {
    yield { start: { tests: this.testsToRun } };

    const results = [];
    const suiteStart = +new Date();
    for (const test of this.testsToRun) {
      const endMessage: TestEnd = {
        name: test.name,
        duration: 0,
      };
      yield { testStart: { ...test } };
      if (test.ignore) {
        endMessage.status = "ignored";
        this.stats.ignored++;
      } else {
        const start = +new Date();
        let end: number = start;
        try {
          await timeout(test.fn(), test.timeout);
          end = +new Date();
          endMessage.status = "passed";
          this.stats.passed++;
        } catch (err) {
          endMessage.status = "failed";
          endMessage.error = err;
          this.stats.failed++;
        }
        endMessage.duration = end - start;
      }
      results.push(endMessage);
      yield { testEnd: endMessage };
      if (this.failFast && endMessage.error != null) {
        break;
      }
    }

    const duration = +new Date() - suiteStart;

    yield {
      end: { ...this.stats, usedOnly: this.#usedOnly, duration, results },
    };
  }
}
