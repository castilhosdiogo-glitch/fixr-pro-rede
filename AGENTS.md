# Project agent instructions

## Source of truth

- Read `MD/README.md` and the relevant files under `MD/` before changing project behavior, architecture, data, configuration, deployment, or risk controls.
- Treat `PROJECT_CONTEXT.json`, `Fixr/`, Prisma, `packages/api/`, and historical root guides as historical unless current code confirms them.

## Context synchronization contract

- Every requested project change must update both the implementation/configuration file and the relevant document under `MD/` when the documented state changes.
- Validate code and documentation together and include them in the same repository update.
- Preserve unrelated local changes; never fold them into the task's commit.

## Skills and specialist agents

- Codex-compatible skills live under `.agents/skills/`.
- Converted specialist agents use the `agent-<name>` skill prefix.
- Converted workflows use the `workflow-<name>` skill prefix.
- Read a selected `SKILL.md` completely before acting, and load only the references/scripts it routes to.
- `.agent/` is the preserved Antigravity source. Do not edit it as part of Codex work unless the user explicitly requests synchronization back to the source format.
- References to Antigravity, Claude-specific tools, modes, or slash commands are conceptual. Use the Codex tools actually available.
- Spawn subagents only when the user or higher-priority instructions explicitly asks for delegation or parallel agent work.

## Validation

- Run validation proportional to risk after every modification.
- Prefer project-native commands from `package.json`, `admin/package.json`, and the relevant skill scripts.
- Do not claim deployment, remote database state, secrets, cron configuration, or production behavior without direct verification.
