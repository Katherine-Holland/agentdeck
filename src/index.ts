#!/usr/bin/env node
import { Command } from "commander";
import { dashboard, compactReport } from "./format.js";
import { scanRepository } from "./scanner.js";

const program = new Command();
program.name("agentdeck").description("A local-first terminal dashboard for AI-agent readiness.").version("0.1.0");
function parseMaxFiles(value: string): number { const parsed = Number.parseInt(value, 10); if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Invalid --max-files value"); return parsed; }
program.command("dashboard").argument("<path>", "Repository path").option("--max-files <number>", "Maximum files to scan", "2000").description("Render a local terminal dashboard").action(async (repoPath: string, options: { maxFiles: string }) => { const result = await scanRepository(repoPath, { maxFiles: parseMaxFiles(options.maxFiles) }); console.log(dashboard(result)); if (result.securitySignals.some((f) => f.severity === "high")) process.exitCode = 2; });
program.command("scan").argument("<path>", "Repository path").option("--json", "Print JSON").option("--max-files <number>", "Maximum files to scan", "2000").description("Run a repository scan").action(async (repoPath: string, options: { json?: boolean; maxFiles: string }) => { const result = await scanRepository(repoPath, { maxFiles: parseMaxFiles(options.maxFiles) }); console.log(options.json ? JSON.stringify(result, null, 2) : compactReport(result)); if (result.securitySignals.some((f) => f.severity === "high")) process.exitCode = 2; });
program.command("policy").argument("<path>", "Repository path").option("--max-files <number>", "Maximum files to scan", "2000").description("Generate a draft local agent policy").action(async (repoPath: string, options: { maxFiles: string }) => { const result = await scanRepository(repoPath, { maxFiles: parseMaxFiles(options.maxFiles) }); console.log(JSON.stringify(result.policy, null, 2)); });
program.parseAsync();
