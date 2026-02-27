# MintCore Project Board

This document explains the purpose and workflow of the
[MintCore GitHub Project Board](https://github.com/orgs/mintcoredev/projects).

---

## Purpose

The project board gives maintainers and contributors a shared view of every
piece of work in flight — from unscheduled ideas all the way through to merged
code.  It is the single source of truth for roadmap planning and contributor
coordination.

---

## Board Columns

| Column | Purpose |
|--------|---------|
| **Backlog** | Unprioritized ideas, feature requests, and future improvements that have not yet been scheduled for active development. |
| **In Progress** | Work that is actively being developed in an open pull request or a currently assigned issue. |
| **Done** | Completed tasks whose pull requests have been merged into `main`. |

---

## Automation Rules

The board uses GitHub automation to reduce manual triage:

| Trigger | Action |
|---------|--------|
| New issue opened | Added to **Backlog** |
| Issue reopened | Moved back to **Backlog** |
| Pull request opened | Added to **In Progress** |
| Pull request reopened | Moved back to **In Progress** |
| Pull request merged | Moved to **Done** |

> **Note:** Automation handles placement; manual moves are still possible and
> sometimes necessary (e.g. de-prioritising an issue back to Backlog).

---

## How Issues Move Through the Workflow

```
New issue opened
      │
      ▼
  [ Backlog ]  ──── assigned / PR opened ────▶  [ In Progress ]
                                                        │
                                              PR merged into main
                                                        │
                                                        ▼
                                                    [ Done ]
```

1. **Backlog → In Progress** — a maintainer assigns the issue *or* a
   contributor opens a pull request that references it.
2. **In Progress → Done** — the linked pull request is merged into `main`.
3. **Done → Backlog** — a regression or follow-up causes the issue to be
   reopened; it returns to Backlog automatically.

---

## How Contributors Should Use the Board

### Opening an issue

* Use one of the issue templates (bug report, feature request, or breaking
  change proposal).  The template picker routes each type to the correct
  column automatically.
* You do **not** need to add the issue to the project board manually — the
  automation takes care of that.

### Starting work on an issue

1. Comment on the issue to let the team know you are picking it up.
2. A maintainer will assign the issue to you (or you can self-assign if you
   have write access).
3. The card will move (or can be moved manually) to **In Progress**.

### Submitting a pull request

* Reference the issue in your PR description using
  `Closes #<issue-number>` so GitHub links them automatically.
* Opening the PR moves the board card to **In Progress** if it is not
   already there.
* When the PR is merged the card moves to **Done** automatically.

### Keeping the board tidy

* If you decide to stop working on an issue, un-assign yourself and move the
  card back to **Backlog** so another contributor can pick it up.
* Avoid leaving stale cards in **In Progress** — if a PR is abandoned,
  close it and return the issue to **Backlog**.

---

## Further Reading

* [CONTRIBUTING.md](CONTRIBUTING.md) — full PR flow, branch naming, commit
  conventions, and local setup.
* [VERSIONING.md](VERSIONING.md) — how MintCore versions its releases.
* [COMMITS.md](COMMITS.md) — Conventional Commits reference.
