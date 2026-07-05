import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/scanner.js";

describe("scanRepository", () => {
  it("detects agent-readiness signals", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdeck-"));
    await fs.writeFile(path.join(dir, "README.md"), "# Demo");
    await fs.writeFile(path.join(dir, ".env"), "EXAMPLE_ONLY=not-a-secret");
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ scripts: { build: "tsc", test: "vitest run", lint: "tsc --noEmit" }, dependencies: { openai: "latest" } }));
    await fs.writeFile(path.join(dir, "index.ts"), "import OpenAI from 'openai';");
    const result = await scanRepository(dir, { maxFiles: 100 });
    expect(result.languages).toContain("TypeScript");
    expect(result.packageScripts.some((script) => script.name === "test")).toBe(true);
    expect(result.aiSignals.length).toBeGreaterThan(0);
    expect(result.securitySignals.length).toBeGreaterThan(0);
    expect(result.policy.mode).toBe("local-only");
  });
});
