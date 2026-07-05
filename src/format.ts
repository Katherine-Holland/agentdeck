import chalk from "chalk";
import type { Finding, ScanResult, Severity } from "./types.js";

// ── design tokens ──────────────────────────────────────────────
// One idea: colour is meaning, never decoration.
// Chrome (labels, rules, hints) is dim. Values are plain.
// The only saturated colour on screen belongs to severity and state.

const LABEL_WIDTH = 14;
const INDENT = "  ";

const dim = chalk.dim;
const label = (text: string) => dim(text.toLowerCase().padEnd(LABEL_WIDTH));

const severityStyle: Record<Severity, (s: string) => string> = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.blue,
  info: chalk.dim
};

const severityTag: Record<Severity, string> = {
  high: "high",
  medium: "med",
  low: "low",
  info: "info"
};

const glyph = {
  ok: chalk.green("✓"),
  attention: chalk.yellow("!"),
  blocker: chalk.red("!"),
  neutral: dim("·"),
  action: dim("→")
};

// ── primitives ─────────────────────────────────────────────────

function row(name: string, value: string): string {
  return `${INDENT}${label(name)}${value}`;
}

function heading(title: string): string {
  return `\n${INDENT}${dim(title.toLowerCase())}\n`;
}

function readinessBar(score: number): string {
  const cells = 10;
  const filled = Math.round((score / 100) * cells);
  const tone = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
  const bar = tone("█".repeat(filled)) + dim("░".repeat(cells - filled));
  return `${bar}  ${tone(String(score))}${dim("/100")}`;
}

function check(state: "ok" | "attention" | "blocker" | "neutral", name: string, note?: string): string {
  const mark = glyph[state];
  const body = name.padEnd(20);
  return `${INDENT}${INDENT}${mark} ${body}${note ? dim(note) : ""}`;
}

interface GroupedFinding {
  title: string;
  severity: Severity;
  files: string[];
}

function groupFindings(findings: Finding[]): GroupedFinding[] {
  const groups = new Map<string, GroupedFinding>();
  for (const finding of findings) {
    const existing = groups.get(finding.title);
    if (existing) {
      if (finding.file) existing.files.push(finding.file);
    } else {
      groups.set(finding.title, { title: finding.title, severity: finding.severity, files: finding.file ? [finding.file] : [] });
    }
  }
  return [...groups.values()];
}

function findingRow(finding: GroupedFinding): string {
  const tag = severityStyle[finding.severity](severityTag[finding.severity].padEnd(6));
  const title = finding.title.padEnd(36);
  const [first, ...rest] = finding.files;
  const location = first ? dim(rest.length ? `${first} +${rest.length}` : first) : "";
  return `${INDENT}${INDENT}${tag}${title}${location}`;
}

function emptyRow(text: string): string {
  return `${INDENT}${INDENT}${dim(text)}`;
}

function severityRank(severity: Severity): number {
  return { high: 0, medium: 1, low: 2, info: 3 }[severity];
}

// ── views ──────────────────────────────────────────────────────

export function dashboard(result: ScanResult): string {
  const lines: string[] = [];
  const hasReadme = result.structureSignals.some((f) => f.title === "README present");
  const hasTests = result.structureSignals.some((f) => f.title === "Tests detected");
  const hasBuild = result.packageScripts.some((s) => /build/i.test(s.name));
  const highSecurity = result.securitySignals.filter((f) => f.severity === "high").length;
  const airgapConcerns = result.airgapSignals.length;

  // header — the wordmark is weight, not colour
  lines.push("");
  lines.push(`${INDENT}${chalk.bold("agentdeck")} ${dim("0.1.0")}`);
  lines.push(`${INDENT}${dim("agent readiness · local only")}`);
  lines.push("");
  lines.push(row("repository", result.repoPath));
  lines.push(row("files", `${result.fileCount} ${dim("scanned")}`));
  lines.push(row("readiness", readinessBar(result.score)));

  lines.push(heading("surface"));
  lines.push(check(hasReadme ? "ok" : "neutral", "readme", hasReadme ? "present" : "missing"));
  lines.push(check(hasTests ? "ok" : "neutral", "tests", hasTests ? "detected" : "none found"));
  lines.push(check(hasBuild ? "ok" : "neutral", "build script", hasBuild ? "present" : "none found"));
  lines.push(check(
    highSecurity > 0 ? "blocker" : "ok",
    "secrets",
    highSecurity > 0 ? `${highSecurity} finding${highSecurity === 1 ? "" : "s"}` : "none detected"
  ));
  lines.push(check(
    airgapConcerns > 0 ? "attention" : "ok",
    "air gap",
    airgapConcerns > 0 ? `${airgapConcerns} concern${airgapConcerns === 1 ? "" : "s"}` : "no blockers detected"
  ));

  lines.push(heading("languages"));
  lines.push(result.languages.length
    ? `${INDENT}${INDENT}${result.languages.join(dim(" · "))}`
    : emptyRow("none detected"));

  const findings = groupFindings([...result.securitySignals, ...result.airgapSignals, ...result.aiSignals])
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  lines.push(heading("findings"));
  lines.push(findings.length
    ? findings.slice(0, 10).map(findingRow).join("\n")
    : emptyRow("nothing to report"));
  if (findings.length > 10) lines.push(emptyRow(`+ ${findings.length - 10} more · agentdeck scan . --json`));

  lines.push(heading("policy"));
  lines.push(`${INDENT}${INDENT}${chalk.green("allow ".padEnd(8))}${dim(result.policy.allow.join("  "))}`);
  lines.push(`${INDENT}${INDENT}${chalk.yellow("review".padEnd(8))}${dim(result.policy.review.join("  "))}`);
  lines.push(`${INDENT}${INDENT}${chalk.red("deny  ".padEnd(8))}${dim(result.policy.deny.join("  "))}`);

  lines.push(heading("next"));
  for (const suggestion of result.suggestions.slice(0, 4)) {
    const quiet = suggestion.charAt(0).toLowerCase() + suggestion.slice(1).replace(/\.$/, "");
    lines.push(`${INDENT}${INDENT}${glyph.action} ${quiet}`);
  }

  lines.push("");
  lines.push(`${INDENT}${dim("agentdeck scan . --json for machine-readable output")}`);
  lines.push("");
  return lines.join("\n");
}

export function compactReport(result: ScanResult): string {
  const highSecurity = result.securitySignals.filter((f) => f.severity === "high").length;
  return [
    "",
    `${INDENT}${chalk.bold("agentdeck")} ${dim("scan")}`,
    "",
    row("repository", result.repoPath),
    row("readiness", readinessBar(result.score)),
    row("languages", result.languages.join(", ") || dim("none")),
    row("security", highSecurity > 0 ? chalk.red(`${highSecurity} high-severity`) : chalk.green("clean")),
    row("air gap", result.airgapSignals.length > 0 ? chalk.yellow(`${result.airgapSignals.length} concern${result.airgapSignals.length === 1 ? "" : "s"}`) : chalk.green("no blockers")),
    ""
  ].join("\n");
}
