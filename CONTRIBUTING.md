# Contributing to MintCore

Thank you for your interest in contributing! This guide walks you through everything you need
to get started.

## Table of Contents

1. [Local Setup](#local-setup)
2. [Running Tests](#running-tests)
3. [Code Formatting](#code-formatting)
4. [Commit Messages](#commit-messages)
5. [Proposing Changes](#proposing-changes)
6. [Running CLI Examples](#running-cli-examples)
7. [Further Reading](#further-reading)

---

## Local Setup

**Prerequisites:** Node.js ≥ 18 and npm ≥ 9.

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-fork>/MintCore.git
cd MintCore

# 2. Install dependencies
npm install

# 3. Build the TypeScript source
npm run build
```

---

## Running Tests

MintCore uses [Vitest](https://vitest.dev/) as its test runner.

```bash
# Run the full test suite once
npm test

# Watch mode (re-runs on file changes)
npx vitest
```

All tests live in the `tests/` directory. Please keep test files co-located with the feature
they cover and name them `*.test.ts`.

---

## Code Formatting

There is no auto-formatter enforced yet. Please follow the style of the surrounding code:

- 2-space indentation
- Single quotes for string literals
- Trailing commas in multi-line objects and arrays
- Explicit TypeScript return types on all exported functions

---

## Commit Messages

MintCore follows the [Conventional Commits](docs/COMMITS.md) standard.

Quick summary:

```
type(scope): short imperative description
```

Examples:

```
feat(engine): add NFT attribute validation
fix(hex): handle empty string in fromHex()
docs: add FT minting example to cookbook
```

See [docs/COMMITS.md](docs/COMMITS.md) for the full list of types, scopes, and examples.

---

## Proposing Changes

### Bugfixes and small improvements

1. Open an issue describing the bug or improvement.
2. Create a branch: `git checkout -b fix/short-description`.
3. Make your changes, add or update tests, and commit using Conventional Commits.
4. Open a Pull Request against `main` and fill in the PR template.

### New features

1. Open a **Feature Request** issue first and wait for maintainer feedback before coding.
2. Follow the same branch / PR flow as above.

### Breaking changes

Breaking changes require additional steps. See [docs/VERSIONING.md](docs/VERSIONING.md) for the
full process, including the required **Migration Guide** in the PR description.

---

## Running CLI Examples

The `campaigns/` directory contains example scripts and campaign definitions.

```bash
# Build first so imports resolve
npm run build

# Run a specific example (adjust path as needed)
node dist/index.js
```

TypeScript examples can be run directly with `ts-node`:

```bash
npx ts-node --esm src/index.ts
```

---

## Further Reading

- [Versioning Policy](docs/VERSIONING.md) — how MintCore versions its releases
- [Commit Conventions](docs/COMMITS.md) — how to write commit messages
- [CHANGELOG](CHANGELOG.md) — history of released versions
