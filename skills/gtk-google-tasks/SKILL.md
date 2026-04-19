---
name: gtk-google-tasks
description: "Use when an agent needs to operate Google Tasks through the `gtk` CLI: register BYO Google Desktop OAuth credentials, authenticate a saved Google account, inspect task lists, and create, update, complete, reopen, move, or delete tasks. Trigger this skill when `gtk auth`, `gtk lists`, and `gtk tasks` should be used instead of direct Google API calls."
---

# GTK Google Tasks

## Overview

Use `gtk` when you want a local, BYO-credentials wrapper around Google Tasks. Prefer `gtk` over direct ad hoc curl or one-off OAuth code when the CLI is already available.

## When to Use This Skill

- The user wants to inspect or change Google Tasks from a terminal or agent.
- The task requires reusable CLI workflows instead of writing fresh Google API code.
- You need stable JSON output for automation around Google Tasks.

## When Not to Use This Skill

- The user wants Google Calendar events rather than Google Tasks.
- The user wants shared hosted credentials, billing mediation, or SaaS auth.
- The user only wants to discuss OAuth theory without using the CLI.

## Quick Start

1. Confirm the CLI is available.
   - Prefer `gtk --help`.
   - If you are inside the `gtk` source repo and the binary is unavailable, use `node dist/index.js --help` after `pnpm build`.
2. Make sure a BYO Desktop OAuth client JSON is registered.
   - `gtk auth credentials add /path/to/credentials.json --name default --default`
3. Authenticate the Google account.
   - `gtk auth login you@example.com`
   - `gtk auth status`
4. Inspect lists or tasks.
   - `gtk lists ls`
   - `gtk tasks ls --list @default --json`
5. If you need option-level details, read:
   - [references/command-reference.md](references/command-reference.md)
   - [references/auth-model.md](references/auth-model.md)

## Working Rules

1. Prefer `--json` whenever another tool or agent will consume the output.
2. Resolve the target list explicitly before write operations when the list name is not obvious.
3. Treat ambiguous task list titles as a stop condition, not as a guess.
4. If auth fails, distinguish:
   - missing saved OAuth client
   - missing saved session
   - revoked or expired refresh token
   - Workspace admin block
5. Keep the BYO credentials model intact. Do not assume shared project credentials exist.

## Core Workflows

### Set up BYO credentials

```bash
gtk auth credentials add /path/to/credentials.json --name default --default
gtk auth login you@example.com --client default
gtk auth status --client default
```

### Inspect task lists

```bash
gtk lists ls
gtk lists ls --json
```

### Inspect tasks

```bash
gtk tasks ls --list @default
gtk tasks ls --list @default --show-completed --json
gtk tasks get <task-id> --list @default --json
```

### Create and update tasks

```bash
gtk tasks add --list @default --title "File taxes" --due 2026-04-30
gtk tasks update <task-id> --list @default --notes "Waiting on accountant"
gtk tasks update <task-id> --list @default --clear-due
```

### Complete, reopen, move, and delete

```bash
gtk tasks done <task-id> --list @default
gtk tasks reopen <task-id> --list @default
gtk tasks move <task-id> --list @default --before <other-task-id>
gtk tasks delete <task-id> --list @default
```

## Pitfalls

- Do not use this skill for Google Calendar event operations.
- Do not assume the default Google account in the browser is the one that was actually authorized; `gtk auth status` confirms the saved account.
- Do not parse human-readable table output in automation.
- Do not ignore Workspace admin restrictions when auth works for personal Gmail but fails for a Workspace account.

## Verification Checklist

- `gtk --help` works.
- The correct client and account are selected.
- `gtk auth status` succeeds before write operations.
- `--json` output is used when the result will be parsed.
- The task list identifier or exact title is correct.
