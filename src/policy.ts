import type { AgentPolicy, ScanResult } from "./types.js";

export function createPolicyDraft(partial?: Partial<ScanResult>): AgentPolicy {
  const notes = [
    "Generated locally by AgentDeck.",
    "Review before using as an enforcement policy.",
    "Deny rules should be applied before allow rules."
  ];
  if (partial?.aiSignals?.length) notes.push("AI provider usage detected. Document network requirements before air-gapped deployment.");
  if (partial?.securitySignals?.length) notes.push("Sensitive files detected. Exclude these from agent context and automated modification.");
  return {
    mode: "local-only",
    allow: ["src/**", "test/**", "tests/**", "docs/**", "README.md"],
    review: ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", ".github/**", "infra/**"],
    deny: [".env", ".env.*", ".ssh/**", "credentials.json", "service-account.json", "*.pem", "*.key", ".npmrc"],
    notes
  };
}
