// agentdeck:ignore-file — fixtures below intentionally contain detection patterns.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/scanner.js";

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdeck-noise-"));
  for (const [name, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await fs.writeFile(path.join(dir, name), content);
  }
  return dir;
}

describe("noise control", () => {
  it("skips content scanning in files carrying the ignore marker", async () => {
    const dir = await fixture({
      "src/patterns.ts": "// agentdeck:ignore-file\nconst probe = 'openai anthropic';"
    });
    const result = await scanRepository(dir, { maxFiles: 100 });
    expect(result.aiSignals).toHaveLength(0);
  });

  it("does not scan lockfile content for signals", async () => {
    const dir = await fixture({
      "package-lock.json": JSON.stringify({ packages: { "node_modules/openai": { version: "1.0.0" } } })
    });
    const result = await scanRepository(dir, { maxFiles: 100 });
    expect(result.aiSignals).toHaveLength(0);
  });

  it("excludes desktop litter from the file count", async () => {
    const dir = await fixture({ ".DS_Store": "junk", "README.md": "# Demo" });
    const result = await scanRepository(dir, { maxFiles: 100 });
    expect(result.fileCount).toBe(1);
  });

  it("still detects real findings when noise controls are active", async () => {
    const dir = await fixture({
      ".env": "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuv",
      "src/app.ts": "import OpenAI from 'openai';"
    });
    const result = await scanRepository(dir, { maxFiles: 100 });
    expect(result.securitySignals.some((f) => f.severity === "high")).toBe(true);
    expect(result.aiSignals.length).toBeGreaterThan(0);
  });
});
