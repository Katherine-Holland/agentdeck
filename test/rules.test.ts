// agentdeck:ignore-file — fixtures below intentionally contain detection patterns.
import { describe, expect, it } from "vitest";
import { detectAiSignals, detectSecretLikeContent, detectSensitiveFilename } from "../src/rules.js";

describe("detectSensitiveFilename", () => {
  it("flags dotenv files as high severity", () => {
    const finding = detectSensitiveFilename("config/.env");
    expect(finding?.severity).toBe("high");
  });

  it("flags private key material", () => {
    expect(detectSensitiveFilename("certs/server.pem")?.severity).toBe("high");
    expect(detectSensitiveFilename("keys/deploy.key")?.severity).toBe("high");
  });

  it("ignores ordinary source files", () => {
    expect(detectSensitiveFilename("src/index.ts")).toBeNull();
  });
});

describe("detectSecretLikeContent", () => {
  it("flags OpenAI-style keys", () => {
    const findings = detectSecretLikeContent("const key = 'sk-abcdefghijklmnopqrstuv';", "src/config.ts");
    expect(findings.some((f) => f.title === "OpenAI-style key pattern")).toBe(true);
  });

  it("flags private key blocks", () => {
    const findings = detectSecretLikeContent("-----BEGIN RSA PRIVATE KEY-----", "deploy/key.txt");
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("high");
  });

  it("stays quiet on clean content", () => {
    expect(detectSecretLikeContent("export const answer = 42;", "src/math.ts")).toHaveLength(0);
  });
});

describe("detectAiSignals", () => {
  it("detects provider references", () => {
    const findings = detectAiSignals("import OpenAI from 'openai';", "src/client.ts");
    expect(findings.some((f) => f.title === "OpenAI signal detected")).toBe(true);
  });

  it("requires word boundaries for MCP so hashes do not match", () => {
    expect(detectAiSignals("integrity: sha512-xKmcpQr9", "package-lock.json")).toHaveLength(0);
    expect(detectAiSignals("uses the MCP protocol", "README.md").some((f) => f.title === "MCP signal detected")).toBe(true);
  });
});
