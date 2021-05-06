import path from "path";
import { collect, SuiteModule } from "./mod.js";

const suites: SuiteModule[] = process.argv
  .slice(2)
  .map(async (suite) => await import(path.resolve(suite)));
await collect(...suites);
