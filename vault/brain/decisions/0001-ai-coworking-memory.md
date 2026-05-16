# ADR 0001 — Repo-backed AI Working Memory

**Date:** 2026-05-16
**Status:** Accepted

## Context

ZZC uses multiple AI assistants (Claude Code as principal engineer, ChatGPT Pro as co-CTO). Each session starts cold — no shared memory of prior decisions, architecture rules, or project state. This causes repeated re-derivation of context, inconsistent decisions, and drift from established patterns.

## Decision

Create `vault/brain/` as a repo-committed directory of structured markdown files that any AI assistant can read at session start. This acts as shared working memory across tools and sessions.

## Structure

- `current-state.md` — live project status
- `architecture/rules.md` — non-negotiable technical constraints
- `infra/ai-stack.md` — AI provider registry with model IDs
- `operations/` — deployment and credential procedures
- `roadmap/` — prioritized work queue
- `decisions/` — architecture decision records (this format)
- `prompts/` — system prompts for each AI role

## Consequences

- AI assistants that read `current-state.md` + `architecture/rules.md` first will stay aligned
- `AI_CONTEXT.md` at repo root signals which files to read
- All ADRs are additive — never delete a decision record
- `current-state.md` must be updated at the end of each work session

## Alternatives Considered

- Claude memory system (`.claude/projects/`) — Claude-specific, not visible to ChatGPT
- CLAUDE.md — already used for code conventions, not project state
- Google Doc — not version-controlled, not co-located with code
