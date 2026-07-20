---
name: cortex-project
description: Uses the Proyecto ecosystem (code knowledge graph) to reduce token usage when exploring a repository. Apply before reading files to understand structure, dependencies, or impact of a change, and after finishing a task to keep the graph current.
---

# Cortex Project

Proyecto is a structural knowledge graph of a code repository (files, symbols,
imports, calls, extends/implements) — not a copy of the source. Use it to
avoid the `grep → read full file → grep again` cycle when you only need to
know *what's related to what*, not the full contents.

## Before reading files to explore structure

When the task is "what calls this", "what does this import", "what would
break if I change this", or "where is X implemented" — query the graph
before opening files:

1. `cortex_project_graph` with `nodeId` — level 1, relations only (no file
   reads). Omit `nodeId` to list root nodes and find a starting point.
2. `cortex_project_nodes` with the ids you got back — level 2 (metadata) by
   default, or `level: 3` for signature/summary. Still no file reads.
3. `cortex_project_search` when you don't have a node id yet — semantic
   search over exported symbols by what they do, not their exact name.
4. Only after the graph narrows it down, `Read` the specific file at the
   `path`/`startLine`/`endLine` the graph gave you (level 4/5) — never the
   whole file speculatively when a range is already known.

If the project has never been indexed (`cortex_project_graph` returns an
empty graph, or the project doesn't exist yet), fall back to normal
grep/read exploration for this task — indexing happens at the end (below),
so the next task benefits.

## Confidence: EXTRACTED vs INFERRED

Every edge from `cortex_project_graph` carries a `confidence` field:

- `EXTRACTED` — read straight off a real declaration (same-file, or the
  import statement itself). Treat as fact.
- `INFERRED` — resolved by matching an import binding or a
  constructor-injected field's type by name, without confirming the symbol
  actually lives there. Treat as a strong hint, not ground truth — verify
  with a targeted grep/read before asserting it in anything that matters
  (a bug root cause, a refactor's blast radius).

A missing edge isn't proof either — it can mean "not indexed yet" rather
than "nothing calls this". Never report an edge's absence as a fact about
the codebase.

## After finishing a task

Call `cortex_project_index` once, after making code changes and before
ending the session (register happens automatically on first call — no
separate registration step needed). This re-parses only the files that
changed since the last index (via git diff), so it stays cheap even on
large repos.

Skip this for trivial changes (typo fixes, comment edits) — index when the
change is substantial enough that a future task would benefit from an
up-to-date graph.

## Scope

Proyecto only extracts exported top-level declarations (classes,
interfaces, functions, hooks, components) and class methods — not private
helpers or local closures. For anything not in the graph, a normal `Read`
is still the right tool.
