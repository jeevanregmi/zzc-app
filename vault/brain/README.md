# ZZC — AI Working Memory

This directory is the shared brain for all AI assistants working on ZZC.
Read `current-state.md` and `architecture/rules.md` before any work session.

## Directory

| Path | Purpose |
|---|---|
| `current-state.md` | Live project status — update after every session |
| `architecture/rules.md` | Non-negotiable technical rules |
| `infra/ai-stack.md` | AI provider registry |
| `operations/deployment.md` | How to deploy |
| `operations/credentials.md` | Credential locations (no values) |
| `roadmap/next-30-days.md` | Prioritized work queue |
| `decisions/` | Architecture decision records |
| `prompts/` | System prompts for each AI role |

## AI Roles

| AI | Role |
|---|---|
| Claude Code (Sonnet 4.6) | Principal engineer — executes code, deploys, fixes |
| ChatGPT Pro | Co-CTO — architecture strategy, sequencing, product decisions |
| Founder | Product vision, final decisions |
