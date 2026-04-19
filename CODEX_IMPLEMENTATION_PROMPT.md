# GTK Implementation Prompt

`gtk` is a BYO-credentials Google Tasks CLI. Before changing code:

1. Read [TODO.md](./TODO.md) and [GOTCHA.md](./GOTCHA.md).
2. Preserve the BYO model. Do not add shared OAuth credentials, hosted auth brokering, or billing logic unless the user explicitly asks for it.
3. Treat Google Tasks as the product boundary. Do not silently drift into Google Calendar events.
4. Keep the installable operator skill in sync with the CLI:
   - `skills/gtk-google-tasks/SKILL.md`
   - `skills/gtk-google-tasks/agents/openai.yaml`
   - `skills/gtk-google-tasks/references/*.md`
5. Keep `README.md` aligned with the real commands and auth flow.
6. If command names, flags, output shape, config paths, or auth behavior change, update:
   - `README.md`
   - `skills/gtk-google-tasks/references/command-reference.md`
   - `skills/gtk-google-tasks/references/auth-model.md`
   - `GOTCHA.md` if new operator pitfalls appear

## Product assumptions

- Users bring their own Google Cloud Desktop OAuth client JSON.
- Local state is stored under `GTK_CONFIG_DIR` or `~/.config/gtk`.
- Human-readable output is the default.
- `--json` is the stable automation path.

## Implementation priorities

1. Keep auth failure modes explicit:
   - missing credentials
   - no saved session
   - expired or revoked refresh token
   - Workspace admin block
2. Prefer exact task list matching:
   - ID first
   - exact title second
   - ambiguous title is an error
3. Keep tests for due parsing, list resolution, and config path handling.
4. Run `pnpm lint`, `pnpm test`, and `pnpm build` before closing work.

## Non-goals by default

- shared SaaS auth
- service account / domain-wide delegation
- TUI
- background sync
- notifications
- Google Calendar event management
