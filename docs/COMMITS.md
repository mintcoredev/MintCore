# Commit Message Conventions

MintCore uses the [Conventional Commits](https://www.conventionalcommits.org/) standard to
produce a machine-readable commit history that drives automated changelog generation and
semantic version bumps.

## Format

```
type(scope): short description

[optional body]

[optional footer(s)]
```

- The **type** and **short description** are required.
- The **scope** is optional but encouraged; use lowercase, no spaces.
- The short description must be written in the **imperative mood** and must **not** end with a period.
- The body and footer are optional but recommended for non-trivial changes.

## Types

| Type | Purpose |
|------|---------|
| `feat` | A new feature visible to consumers |
| `fix` | A bug fix |
| `docs` | Documentation changes only (no source code changes) |
| `test` | Adding or updating tests; no production code changes |
| `refactor` | Code restructuring without behavior changes |
| `chore` | Maintenance tasks (dependency updates, config, tooling) |
| `perf` | Performance improvements |
| `ci` | Changes to CI/CD configuration (e.g., GitHub Actions) |

> **Breaking changes** must append `!` after the type/scope or include a `BREAKING CHANGE:` footer.
> Example: `feat(engine)!: remove legacy mintFT overload`

## Scopes

Use the module or area of the codebase affected. Common scopes in MintCore:

| Scope | Area |
|-------|------|
| `engine` | Core minting engine (`src/core/`) |
| `hex` | Hex encoding/decoding utilities (`src/utils/`) |
| `keys` | Key management and wallet utilities (`src/utils/keys.ts`) |
| `ft` | Fungible token logic |
| `nft` | Non-fungible token logic |
| `cli` | Command-line interface / example scripts |
| `chronik` | Chronik blockchain indexer provider (`src/providers/`) |
| `metadata` | Token metadata handling |
| `utils` | Shared utility functions (`src/utils/`) |
| `deps` | Dependency changes |
| `release` | Release-process changes |

## Examples

```
feat(engine): add NFT attribute validation
fix(hex): handle empty string in fromHex()
docs: add FT minting example to cookbook
test(nft): cover edge case where commitment is zero-length
refactor(ft): extract supply calculation to helper function
chore(deps): bump @bitauth/libauth to 2.1.0
perf(engine): cache serialized scripts between calls
ci: add release workflow triggered on v* tags
```

## Reverting Commits

Use `revert:` as the type and reference the reverted commit SHA in the footer:

```
revert: feat(engine): add NFT attribute validation

Refs: abc1234
```
