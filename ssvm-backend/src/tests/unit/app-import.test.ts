import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("app module import lifecycle", () => {
  it("imports app.ts in a fresh process without leaving active handles", () => {
    const script = `
      import { pathToFileURL } from "node:url";
      import { resolve } from "node:path";
      await new Promise((done) => setTimeout(done, 50));
      const before = process.getActiveResourcesInfo().sort();
      await import(pathToFileURL(resolve("src/app.ts")).href);
      await new Promise((done) => setTimeout(done, 100));
      const after = process.getActiveResourcesInfo().sort();
      const remaining = [...after];
      for (const resource of before) {
        const index = remaining.indexOf(resource);
        if (index >= 0) remaining.splice(index, 1);
      }
      const leaks = remaining.filter((r) => r !== "FSReqPromise");
      if (leaks.length > 0) {
        console.error(JSON.stringify({ leakedResources: leaks }));
        process.exitCode = 1;
      } else {
        console.log(JSON.stringify({ leakedResources: [] }));
      }
    `;

    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", script],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(output.trim()).toBe(JSON.stringify({ leakedResources: [] }));
  });
});
