import path from "node:path";
import type { Finding } from "./types.js";

export const ignoredDirectories = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".venv", "venv",
  "__pycache__", ".pytest_cache", ".turbo", "coverage"
]);

export const languageByExtension: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
  ".py": "Python", ".rs": "Rust", ".go": "Go", ".java": "Java", ".cs": "C#",
  ".rb": "Ruby", ".php": "PHP", ".sol": "Solidity", ".sql": "SQL"
};

const sensitiveFilenames = [
  ".env", ".env.local", ".env.production", "id_rsa", "id_ed25519",
  "credentials.json", "service-account.json", "aws_credentials", ".npmrc", ".pypirc"
];

export function detectSensitiveFilename(filePath: string): Finding | null {
  const base = path.basename(filePath).toLowerCase();
  if (sensitiveFilenames.includes(base)) {
    return { title: "Sensitive file detected", severity: "high", detail: "This file may contain credentials, tokens or machine-specific secrets.", file: filePath };
  }
  if (base.endsWith(".pem") || base.endsWith(".key")) {
    return { title: "Private key-like file detected", severity: "high", detail: "This file looks like private key or certificate material.", file: filePath };
  }
  return null;
}

export function detectAiSignals(content: string, filePath: string): Finding[] {
  const checks: Array<[RegExp, string, string]> = [
    [/openai/i, "OpenAI signal detected", "OpenAI usage may require network access unless mocked or locally routed."],
    [/anthropic/i, "Anthropic signal detected", "Anthropic usage may require network access unless privately deployed or isolated."],
    [/gemini|google-generative-ai/i, "Gemini signal detected", "Gemini usage may require network access unless replaced in restricted environments."],
    [/huggingface|transformers/i, "Transformer tooling detected", "Local transformer workflows may be compatible with offline model weights."],
    [/mcp|model context protocol/i, "MCP signal detected", "MCP tools should have explicit permissions and local audit boundaries."]
  ];
  return checks.flatMap(([pattern, title, detail]) => pattern.test(content) ? [{ title, severity: "info", detail, file: filePath }] : []);
}

export function detectSecretLikeContent(content: string, filePath: string): Finding[] {
  const checks: Array<[RegExp, string]> = [
    [/sk-[A-Za-z0-9_-]{20,}/, "OpenAI-style key pattern"],
    [/AKIA[0-9A-Z]{16}/, "AWS access key pattern"],
    [/ghp_[A-Za-z0-9_]{20,}/, "GitHub token pattern"],
    [/-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/, "Private key block"],
    [/ANTHROPIC_API_KEY\s*=\s*.+/i, "Anthropic API key assignment"],
    [/OPENAI_API_KEY\s*=\s*.+/i, "OpenAI API key assignment"]
  ];
  return checks.flatMap(([pattern, title]) => pattern.test(content) ? [{ title, severity: "high", detail: "Secret-like content should not be visible to autonomous agents by default.", file: filePath }] : []);
}
