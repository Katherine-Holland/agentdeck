#!/usr/bin/env node
import { Command } from "commander";
import { dashboard, compactReport } from "./format.js";
import { scanRepository } from "./scanner.js";

const program = new Command();

program
  .name("agentdeck")
  .description("agent readiness for air-gapped repositories")
  .version("0.1.0");

function parseMaxFiles(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Invalid --max-files value");
  return parsed;
}

function exitOnHighSeverity(hasHigh: boolean): void {
  if (hasHigh) process.exitCode = 2;
}

program
  .command("dashboard", { isDefault: true })
  .argument("[path]", "repository path", ".")
  .option("--max-files <number>", "maximum files to scan", "2000")
  .description("render the readiness dashboard (default)")
  .action(async (repoPath: string, options: { maxFiles: string }) => {
    const result = await scanRepository(repoPath, { maxFiles: parseMaxFiles(options.maxFiles) });
    console.log(dashboard(result));
    exitOnHighSeverity(result.securitySignals.some((f) => f.severity === "high"));
  });

program
  .command("scan")
  .argument("[path]", "repository path", ".")
  .option("--json", "print machine-readable JSON")
  .option("--max-files <number>", "maximum files to scan", "2000")
  .description("run a compact scan")
  .action(async (repoPath: string, options: { json?: boolean; maxFiles: string }) => {
    const result = await scanRepository(repoPath, { maxFiles: parseMaxFiles(options.maxFiles) });
    console.log(options.json ? JSON.stringify(result, null, 2) : compactReport(result));
    exitOnHighSeverity(result.securitySignals.some((f) => f.severity === "high"));
  });

program
  .command("policy")
  .argument("[path]", "repository path", ".")
  .option("--max-files <number>", "maximum files to scan", "2000")
  .description("generate a draft local agent policy")
  .action(async (repoPath: string, options: { maxFiles: string }) => {
    const result = await scanRepository(repoPath, { maxFiles: parseMaxFiles(options.maxFiles) });
    console.log(JSON.stringify(result.policy, null, 2));
  });

program.parseAsync();
