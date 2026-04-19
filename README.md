# gtk

BYO-credentials Google Tasks CLI.

`gtk` manages Google Tasks and task lists from the terminal without shipping shared OAuth credentials. Each user brings their own Google Cloud Desktop OAuth client JSON, authorizes their own Google account, and spends quota on their own Google Cloud project.

## Install

Local development install:

```bash
pnpm install
pnpm build
npm link
```

Run from the repo without linking:

```bash
pnpm exec tsx src/index.ts --help
node dist/index.js --help
```

Install from Homebrew after the first tagged release:

```bash
brew tap mkusaka/tap
brew install mkusaka/tap/gtk
```

Until the first tagged release is published, install from `HEAD`:

```bash
brew install --HEAD mkusaka/tap/gtk
```

## BYO Credentials

1. Create or choose a Google Cloud project.
2. Enable the Google Tasks API.
3. Configure OAuth consent for your audience.
4. Create a `Desktop app` OAuth client.
5. Download the JSON file from Google Cloud.
6. Register it with `gtk`:

```bash
gtk auth credentials add /path/to/credentials.json --name default --default
gtk auth login you@example.com
gtk auth status
```

By default `gtk` stores its local state under:

- `~/.config/gtk/clients.json`
- `~/.config/gtk/sessions.json`

Override the root with `GTK_CONFIG_DIR=/custom/path`.

## Commands

Inspect auth state:

```bash
gtk auth credentials ls
gtk auth login you@example.com --client default
gtk auth status --client default
gtk auth logout --client default --account you@example.com
```

Inspect task lists:

```bash
gtk lists ls
gtk lists ls --json
gtk lists create --title "gtk-test"
```

Work with tasks:

```bash
gtk tasks ls --list @default
gtk tasks add --list @default --title "Pay invoice" --due 2026-04-25
gtk tasks update <task-id> --list @default --notes "Waiting on finance"
gtk tasks done <task-id> --list @default
gtk tasks reopen <task-id> --list @default
gtk tasks move <task-id> --list @default --before <other-task-id>
gtk tasks delete <task-id> --list @default
```

Automation should prefer JSON output:

```bash
gtk tasks ls --list @default --json
gtk tasks get <task-id> --list @default --json
```

## Agent Skill

This repository ships one optional operator skill:

- `gtk-google-tasks`

Install from a local checkout with `npx skills add`:

```bash
npx -y skills add "$PWD" --skill gtk-google-tasks -y --copy
```

Install from GitHub with `npx skills add`:

```bash
npx -y skills add https://github.com/mkusaka/gtk --skill gtk-google-tasks -y
```

Install with GitHub CLI `gh skill`:

```bash
gh skill install mkusaka/gtk gtk-google-tasks
```

Add `--agent <host>` if you want to target a specific host such as `codex` or `claude-code`.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test
pnpm build
pnpm compile:binary
```

## Release

Pushing a `v*` tag runs the release workflow. It verifies the project, builds
Apple Silicon and Intel macOS single-file binaries with Deno, uploads tarballs
to the GitHub release, and dispatches a formula update to
`mkusaka/homebrew-tap`.

The workflow requires the `HOMEBREW_TAP_TOKEN` repository secret.
