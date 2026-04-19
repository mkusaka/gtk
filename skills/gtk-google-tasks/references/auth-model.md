# GTK Auth Model

`gtk` uses a BYO-credentials model.

## What that means

- Every user brings their own Google Cloud Desktop OAuth client JSON.
- `gtk` stores client metadata in `clients.json`.
- `gtk` stores per-account OAuth sessions in `sessions.json`.
- The Google Cloud project attached to that OAuth client is the quota and billing boundary.

## What `gtk` does not assume

- no shared hosted OAuth client
- no app-managed billing layer
- no service account or domain-wide delegation
- no Calendar event access

## Workspace notes

- A Workspace account can authorize a client created under a personal Google Cloud project if the OAuth audience and test-user settings allow it.
- A Workspace admin can still block the external OAuth app at the domain policy layer.

## Operator guidance

- If auth works for Gmail but fails for Workspace, check admin policy before debugging the CLI.
- If the refresh token is revoked, run `gtk auth login` again.
- If multiple clients exist, choose one explicitly with `--client <name>`.
