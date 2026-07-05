import chalk from "chalk";
import type { Finding, ScanResult } from "./types.js";

function line(label: string, value: string): string { return `${chalk.gray(label.padEnd(18))}${value}`; }
function status(ok: boolean, label: string): string { return ok ? `${chalk.green("✓")} ${label}` : `${chalk.red("✕")} ${label}`; }
function warn(label: string): string { return `${chalk.yellow("⚠")} ${label}`; }
function severity(finding: Finding): string { if (finding.severity === "high") return chalk.red("HIGH"); if (finding.severity === "medium") return chalk.yellow("MED"); if (finding.severity === "low") return chalk.blue("LOW"); return chalk.gray("INFO"); }
function scoreText(score: number): string { if (score >= 80) return chalk.green(`${score}/100`); if (score >= 60) return chalk.yellow(`${score}/100`); return chalk.red(`${score}/100`); }
function section(title: string): string { return `
${chalk.bold(title.toUpperCase())}
${chalk.gray("─".repeat(title.length + 6))}`; }
function findingRows(findings: Finding[], empty = "None detected"): string { if (findings.length === 0) return chalk.gray(empty); return findings.slice(0, 8).map((finding) => { const location = finding.file ? chalk.gray(` ${finding.file}`) : ""; return `  ${severity(finding)}  ${finding.title}${location}`; }).join("\n"); }

export function dashboard(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(""); lines.push(chalk.bold.cyan("AGENTDECK")); lines.push(chalk.gray("Local terminal dashboard for AI-agent readiness")); lines.push("");
  lines.push(line("Repository", result.repoPath)); lines.push(line("Mode", chalk.green("local-only"))); lines.push(line("Files scanned", String(result.fileCount))); lines.push(line("Agent readiness", scoreText(result.score)));
  const hasReadme = result.structureSignals.some((f) => f.title === "README present");
  const hasTests = result.structureSignals.some((f) => f.title === "Tests detected");
  const hasBuild = result.packageScripts.some((s) => /build/i.test(s.name));
  const hasHighSecurity = result.securitySignals.some((f) => f.severity === "high");
  const hasAirgapConcern = result.airgapSignals.length > 0;
  lines.push(section("Surface")); lines.push(`  ${status(hasReadme, "README present")}`); lines.push(`  ${status(hasTests, "Tests detected")}`); lines.push(`  ${status(hasBuild, "Build script detected")}`); lines.push(`  ${hasHighSecurity ? warn("Sensitive files need review") : status(true, "No high-risk secret files detected")}`); lines.push(`  ${hasAirgapConcern ? warn("Air-gap concerns detected") : status(true, "No obvious cloud dependency concerns")}`);
  lines.push(section("Languages")); lines.push(result.languages.length ? `  ${result.languages.join(", ")}` : `  ${chalk.gray("No major languages detected")}`);
  lines.push(section("AI Signals")); lines.push(findingRows(result.aiSignals, "No AI-provider signals detected"));
  lines.push(section("Security Signals")); lines.push(findingRows(result.securitySignals, "No sensitive files or secret-like content detected"));
  lines.push(section("Airgap Readiness")); lines.push(findingRows(result.airgapSignals, "No obvious air-gap blockers detected"));
  lines.push(section("Policy Preview")); lines.push(`${chalk.gray("  ALLOW ")} ${result.policy.allow.join(", ")}`); lines.push(`${chalk.gray("  REVIEW")} ${result.policy.review.join(", ")}`); lines.push(`${chalk.gray("  DENY  ")} ${result.policy.deny.join(", ")}`);
  lines.push(section("Next Actions")); for (const suggestion of result.suggestions.slice(0, 5)) lines.push(`  ${chalk.cyan("•")} ${suggestion}`);
  lines.push(""); return lines.join("\n");
}

export function compactReport(result: ScanResult): string {
  return [chalk.bold.cyan("AgentDeck Scan"), line("Repository", result.repoPath), line("Readiness", scoreText(result.score)), line("Languages", result.languages.join(", ") || "None"), line("Security findings", String(result.securitySignals.length)), line("Airgap findings", String(result.airgapSignals.length))].join("\n");
}
