# AgentDeck

**A local-first terminal dashboard for AI-agent readiness in secure and air-gapped environments.**

AgentDeck is a TypeScript CLI that scans a repository and presents a clean terminal dashboard showing whether an autonomous AI coding agent could safely work inside that project.

It is designed around a simple idea:

> In secure environments, developer tooling should be local, inspectable, auditable and useful without needing a cloud service or editor marketplace extension.

## Why a CLI?

VS Code extensions are useful in normal developer environments, but high-security and air-gapped teams often need tooling that is easier to inspect, approve, package and run offline.

AgentDeck explores what AI developer tooling might look like when it is terminal-native, local-first, suitable for restricted environments, easy to audit, usable without cloud telemetry and independent of IDE/plugin ecosystems.

## Features

AgentDeck scans a repository for:

- project languages
- package scripts
- README/test/build signals
- AI provider usage
- MCP-related signals
- sensitive filenames
- secret-like content
- agent policy boundaries
- air-gap readiness concerns
- suggested next actions

## Install

Requires Node.js 20 or newer.

```bash
npm install
npm run build
```

## Local Development

```bash
npm install
npm test
npm run build
```

Run directly from source while developing:

```bash
npm run dev -- dashboard .
npm run dev -- scan .
```

To install the CLI commands locally from this checkout:

```bash
npm link
agentdeck dashboard .
agentdeck scan .
ad scan .
```

## Run

During development:

```bash
npm run dev -- dashboard .
```

or after building:

```bash
node dist/index.js dashboard .
```

## Commands

```bash
agentdeck dashboard .
agentdeck scan .
agentdeck scan . --json
ad scan .
agentdeck policy .
```

## Example

```text
AGENTDECK
Local terminal dashboard for AI-agent readiness

Repository        /secure/repo
Mode              local-only
Files scanned     218
Agent readiness   76/100

SURFACE
✓ README present
✓ Tests detected
⚠ AI provider SDK detected
✕ Sensitive file detected

POLICY PREVIEW
ALLOW   src/**, test/**, docs/**
REVIEW  package.json, .github/**, infra/**
DENY    .env, .ssh/**, credentials.json, *.pem
```

## Positioning

This is intentionally small, but it demonstrates local-first AI systems, secure AI infrastructure, autonomous software engineering, air-gapped deployment, AI-agent observability and tasteful terminal UX.
