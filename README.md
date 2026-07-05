# AgentDeck
<!-- agentdeck:ignore-file -->

[![ci](https://github.com/Katherine-Holland/agentdeck/actions/workflows/ci.yml/badge.svg)](https://github.com/Katherine-Holland/agentdeck/actions/workflows/ci.yml)

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

## Noise control

Scanners live or die on false positives, so AgentDeck is deliberate about what it will not report:

- Files containing the marker `agentdeck:ignore-file` (in a comment) are excluded from content scanning. AgentDeck's own detection-pattern source carries this marker, so the tool reports clean on its own repository.
- Lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) are exempt from content-signal scanning; machine-generated hashes trigger pattern noise, and dependency intent is better read from `package.json`.
- Desktop litter (`.DS_Store`, `Thumbs.db`, `desktop.ini`) is never counted or scanned.

## Continuous integration

AgentDeck scans itself on every push. The CI workflow runs the test suite, builds, then executes `agentdeck scan .` against its own repository — a high-severity finding exits with code 2 and fails the build. The same exit-code contract can gate any CI pipeline.

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
agentdeck .              # dashboard (default command)
agentdeck dashboard .
agentdeck scan .         # compact report
agentdeck scan . --json  # machine-readable output
agentdeck policy .       # draft agent policy as JSON
ad .                     # short alias
```

Exits with code 2 when high-severity findings are present, so it can gate CI.

## Example

```text
  agentdeck 0.1.0
  agent readiness · local only

  repository    /secure/repo
  files         218 scanned
  readiness     ███████░░░  76/100

  surface

    ✓ readme              present
    ✓ tests               detected
    ✓ build script        present
    ! secrets             2 findings
    ! air gap             1 concern

  findings

    high  Sensitive file detected             .env
    med   Cloud AI dependency likely
    info  MCP signal detected                 src/tools.ts +2

  policy

    allow   src/**  test/**  docs/**
    review  package.json  .github/**  infra/**
    deny    .env  .ssh/**  credentials.json  *.pem

  next

    → exclude secrets and credentials from agent context
    → document offline operation or air-gapped substitutes
```

## Positioning

This is intentionally small, but it demonstrates local-first AI systems, secure AI infrastructure, autonomous software engineering, air-gapped deployment, AI-agent observability and tasteful terminal UX.
