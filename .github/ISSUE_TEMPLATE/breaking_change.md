---
name: Breaking change proposal
about: Propose a change that breaks backward compatibility in MintCore
title: "[Breaking] "
labels: breaking-change
assignees: ""
---

## Description of the Breaking Change

<!-- Clearly describe what existing behavior will change and why it is necessary. -->

## Justification

<!-- Why is this breaking change required? What problem does it solve that cannot be solved in a non-breaking way? -->

## Migration Guide

<!-- Provide a step-by-step guide that users must follow to migrate their code after this change. Include before/after code examples where possible. -->

**Before:**

```ts
// existing usage
```

**After:**

```ts
// new usage
```

## Impacted Modules

<!-- Check all modules that are affected by this change. -->

- [ ] `engine`
- [ ] `chronik`
- [ ] `metadata`
- [ ] `utils`
- [ ] `ft` (Fungible Tokens)
- [ ] `nft` (Non-Fungible Tokens)
- [ ] `cli`

## Test Updates Required

<!-- Describe which existing tests need to be updated and what new tests need to be added to cover the change. -->
