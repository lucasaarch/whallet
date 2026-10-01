# Whallet

## Project language

- Keep source code, comments, commit messages, README files, and agent instructions in English.
- Keep all user-facing product text, labels, messages, and navigation in Brazilian Portuguese.

## Workspace

- This is a pnpm monorepo.
- `apps/server` contains the Fastify API.
- `apps/web` contains the Next.js frontend and proxies `/api/*` to the API.
- `packages/contracts` contains shared runtime-validated contracts.

## Checks

- Run `pnpm lint` after source changes.
- Run `pnpm build` before considering a change complete.
