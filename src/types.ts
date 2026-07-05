export type Severity = "info" | "low" | "medium" | "high";

export interface Finding {
  title: string;
  severity: Severity;
  detail: string;
  file?: string;
}

export interface PackageScript {
  name: string;
  command: string;
}

export interface AgentPolicy {
  mode: "local-only";
  allow: string[];
  review: string[];
  deny: string[];
  notes: string[];
}

export interface ScanResult {
  repoPath: string;
  fileCount: number;
  languages: string[];
  packageScripts: PackageScript[];
  aiSignals: Finding[];
  securitySignals: Finding[];
  structureSignals: Finding[];
  airgapSignals: Finding[];
  suggestions: string[];
  policy: AgentPolicy;
  score: number;
}
