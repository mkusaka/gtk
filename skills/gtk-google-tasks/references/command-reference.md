# GTK Command Reference

Use this file when you need option-level details while applying `$gtk-google-tasks`.

## Auth

Register a Desktop OAuth client JSON:

```bash
gtk auth credentials add /path/to/credentials.json --name default --default
```

List saved OAuth clients:

```bash
gtk auth credentials ls
gtk auth credentials ls --json
```

Authenticate and inspect state:

```bash
gtk auth login you@example.com --client default
gtk auth status --client default
gtk auth status --client default --account you@example.com --json
gtk auth logout --client default --account you@example.com
```

## Task lists

```bash
gtk lists ls
gtk lists ls --client default --account you@example.com --json
gtk lists create --title "gtk-test"
```

Notes:

- `gtk` can create task lists, but it does not yet delete them.
- `@default` is the default list target for task commands.

## Tasks

List tasks:

```bash
gtk tasks ls --list @default
gtk tasks ls --list @default --show-completed
gtk tasks ls --list @default --due-after 2026-04-01 --due-before 2026-04-30 --json
```

Create:

```bash
gtk tasks add --list @default --title "File taxes"
gtk tasks add --list @default --title "Book flights" --notes "Check baggage rules" --due 2026-05-15T00:00:00.000Z
```

Update:

```bash
gtk tasks update <task-id> --list @default --title "Updated title"
gtk tasks update <task-id> --list @default --notes "Updated notes"
gtk tasks update <task-id> --list @default --due 2026-05-20T00:00:00.000Z
gtk tasks update <task-id> --list @default --clear-due
```

Status transitions:

```bash
gtk tasks done <task-id> --list @default
gtk tasks reopen <task-id> --list @default
```

Reorder and delete:

```bash
gtk tasks move <task-id> --list @default --before <other-task-id>
gtk tasks move <task-id> --list @default --after <other-task-id>
gtk tasks delete <task-id> --list @default
```

## Suggested Automation Pattern

Prefer JSON output:

```bash
gtk tasks ls --list @default --json
gtk tasks get <task-id> --list @default --json
gtk lists ls --json
```

## Notes

- If more than one saved Google session exists for the same client, pass `--account <email>`.
- If more than one task list shares the same title, use the list ID instead of the title.
- For `gtk tasks add/update --due`, prefer explicit RFC3339 UTC timestamps such as `2026-05-20T00:00:00.000Z`.
- In `gtk 0.0.1`, date-only `YYYY-MM-DD` input is parsed in the local timezone before conversion to RFC3339, which can shift the stored due date by one day in timezones ahead of UTC.
