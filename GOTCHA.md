# GOTCHA

## OAuth and Google Workspace

- `gtk` assumes a Google `Desktop app` OAuth client JSON.
- If the Google Cloud project is still in testing, the target Google account must be added as a test user.
- A Google Workspace admin can still block an external OAuth app even if the OAuth client itself is valid.
- The browser callback flow uses a local loopback server on `127.0.0.1`. Remote shells without local browser access will fail unless a manual auth-code flow is added later.

## Tasks API behavior

- `gtk tasks ls --show-completed` also enables hidden tasks because Google Tasks requires `showHidden=true` for completed items created in first-party clients.
- `@default` is a valid Google Tasks list identifier and should remain the default list target.
- Task list title matching is exact. Multiple lists with the same title are a hard error.
- Due dates are stored as RFC3339 timestamps. Date-only input is interpreted in the local timezone before conversion.

## CLI/operator expectations

- Automation should use `--json`; text output is for humans only.
- Changes to commands or flags must be reflected in the installable skill and README in the same change set.
