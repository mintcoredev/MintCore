# Versioning Policy

MintCore follows [Semantic Versioning 2.0.0](https://semver.org/) (`MAJOR.MINOR.PATCH`).

## Version Components

| Component | When to increment | Examples |
|-----------|------------------|---------|
| **MAJOR** | Breaking API changes, removed or renamed exports, changed behavior that breaks existing consumers | `0.x.x → 1.0.0` |
| **MINOR** | New features added in a backward-compatible manner | `1.0.x → 1.1.0` |
| **PATCH** | Backward-compatible bug fixes, test improvements, documentation updates | `1.0.0 → 1.0.1` |

## Pre-release Tags

Pre-release versions may be suffixed with a hyphen and an identifier:

| Tag | Meaning |
|-----|---------|
| `-alpha` | Early preview; API may change significantly |
| `-beta` | Feature-complete; may still have known issues |
| `-rc` | Release candidate; ready for final testing |

Examples: `1.0.0-alpha`, `1.0.0-beta.1`, `1.0.0-rc.2`

## Tests Define the Public API Surface

The test suite (`tests/`) is the authoritative record of what MintCore publicly guarantees.
Every exported function, type, and constant that appears in a test is considered part of the
public API and is subject to SemVer compatibility guarantees.

- Adding a new test for a previously untested path does **not** constitute a breaking change.
- Removing or changing a tested behavior that consumers rely on **is** a breaking change and
  requires a MAJOR version bump.
- Refactoring internals that are not observable through the public API is a PATCH-level change.

## Proposing Breaking Changes

Breaking changes (MAJOR bumps) require explicit review before merging:

1. **Open an issue** titled `[breaking] <short description>` and describe the motivation,
   the impact on existing consumers, and any migration path.
2. **Label the PR** with `breaking-change` and reference the issue.
3. The PR description must include a **Migration Guide** section explaining how existing
   consumers should update their code.
4. At least one maintainer must approve the migration guide before the PR is merged.
5. The CHANGELOG entry under the new MAJOR version must include a `Removed` or `Changed`
   section that mirrors the migration guide.
