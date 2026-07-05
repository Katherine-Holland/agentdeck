import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { createPolicyDraft } from "./policy.js";
// agentdeck:ignore-file — this module references detection patterns.
import { contentScanExempt, detectAiSignals, detectSecretLikeContent, detectSensitiveFilename, ignoredDirectories, ignoredFiles, ignoreMarker, languageByExtension } from "./rules.js";
import type { Finding, PackageScript, ScanResult } from "./types.js";

export interface ScanOptions { maxFiles: number; }

function isTextCandidate(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".md", ".yml", ".yaml", ".env", ".txt", ".toml", ".ini", ".sh", ".sql"].includes(ext) || path.basename(filePath).startsWith(".env");
}

async function safeRead(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > 250_000) return null;
    return await fs.readFile(filePath, "utf8");
  } catch { return null; }
}

function uniqueFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.title}:${finding.file ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readPackageScripts(repoPath: string): Promise<PackageScript[]> {
  const content = await safeRead(path.join(repoPath, "package.json"));
  if (!content) return [];
  try {
    const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
    return Object.entries(pkg.scripts ?? {}).map(([name, command]) => ({ name, command }));
  } catch { return []; }
}

function buildAirgapSignals(aiSignals: Finding[], packageScripts: PackageScript[]): Finding[] {
  const signals: Finding[] = [];
  if (aiSignals.some((finding) => /OpenAI|Anthropic|Gemini/.test(finding.title))) {
    signals.push({ title: "Cloud AI dependency likely", severity: "medium", detail: "Repo references cloud AI providers. Air-gapped deployment may require private routing, stubs or local model replacement." });
  }
  if (packageScripts.some((script) => /curl|wget|npx/i.test(script.command))) {
    signals.push({ title: "Networked script command detected", severity: "medium", detail: "Some scripts appear to invoke network-capable tooling. Review before running in restricted environments." });
  }
  return signals;
}

function calculateScore(result: Omit<ScanResult, "score">): number {
  let score = 50;
  if (result.languages.length > 0) score += 8;
  if (result.structureSignals.some((f) => f.title === "README present")) score += 10;
  if (result.structureSignals.some((f) => f.title === "Tests detected")) score += 12;
  if (result.packageScripts.some((s) => /build/i.test(s.name))) score += 8;
  if (result.packageScripts.some((s) => /lint/i.test(s.name))) score += 7;
  if (result.aiSignals.length > 0) score += 5;
  score -= Math.min(result.securitySignals.filter((f) => f.severity === "high").length * 12, 42);
  score -= Math.min(result.airgapSignals.length * 4, 16);
  return Math.max(0, Math.min(100, score));
}

export async function scanRepository(repoPathInput: string, options: ScanOptions): Promise<ScanResult> {
  const repoPath = path.resolve(repoPathInput);
  const entries = await fg("**/*", { cwd: repoPath, dot: true, onlyFiles: true, ignore: [...ignoredDirectories].map((d) => `**/${d}/**`), absolute: false });
  const files = entries.filter((entry) => !ignoredFiles.has(path.basename(entry))).slice(0, options.maxFiles);
  const languages = new Set<string>();
  const aiSignals: Finding[] = [], securitySignals: Finding[] = [], structureSignals: Finding[] = [];
  const hasReadme = files.some((f) => /^readme\.md$/i.test(path.basename(f)));
  const hasGitignore = files.some((f) => path.basename(f) === ".gitignore");
  const hasTests = files.some((f) => /(__tests__|\.test\.|\.spec\.)/.test(f));
  if (hasReadme) structureSignals.push({ title: "README present", severity: "info", detail: "Agent context is improved by repository-level documentation." });
  if (hasGitignore) structureSignals.push({ title: ".gitignore present", severity: "info", detail: "Repository has basic exclusion boundaries." });
  if (hasTests) structureSignals.push({ title: "Tests detected", severity: "info", detail: "Tests help validate AI-generated changes." });
  for (const relativeFile of files) {
    const language = languageByExtension[path.extname(relativeFile).toLowerCase()];
    if (language) languages.add(language);
    const sensitive = detectSensitiveFilename(relativeFile);
    if (sensitive) securitySignals.push(sensitive);
    if (!isTextCandidate(relativeFile)) continue;
    if (contentScanExempt.has(path.basename(relativeFile))) continue;
    const content = await safeRead(path.join(repoPath, relativeFile));
    if (!content) continue;
    if (content.includes(ignoreMarker)) continue;
    aiSignals.push(...detectAiSignals(content, relativeFile));
    securitySignals.push(...detectSecretLikeContent(content, relativeFile));
  }
  const packageScripts = await readPackageScripts(repoPath);
  const uniqueAiSignals = uniqueFindings(aiSignals);
  const uniqueSecuritySignals = uniqueFindings(securitySignals);
  const airgapSignals = buildAirgapSignals(uniqueAiSignals, packageScripts);
  const suggestions: string[] = [];
  if (!hasReadme) suggestions.push("Add a README with setup, architecture and agent context notes.");
  if (!hasTests) suggestions.push("Add tests so AI-generated changes can be validated locally.");
  if (!packageScripts.some((s) => /lint/i.test(s.name))) suggestions.push("Add a lint command for safer automated edits.");
  if (uniqueSecuritySignals.length > 0) suggestions.push("Exclude secrets and credentials from agent context.");
  if (airgapSignals.length > 0) suggestions.push("Document offline operation, private model routing or air-gapped substitutes.");
  suggestions.push("Generate an agent policy and review allow/review/deny boundaries.");
  const partial: Omit<ScanResult, "score"> = { repoPath, fileCount: files.length, languages: [...languages].sort(), packageScripts, aiSignals: uniqueAiSignals, securitySignals: uniqueSecuritySignals, structureSignals, airgapSignals, suggestions, policy: createPolicyDraft({ aiSignals: uniqueAiSignals, securitySignals: uniqueSecuritySignals }) };
  return { ...partial, score: calculateScore(partial) };
}
