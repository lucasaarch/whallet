# Whallet

Whallet is a pnpm monorepo with a Fastify API, a Next.js frontend, and shared contracts.

## Development

```sh
pnpm install
pnpm dev
```

The API listens on `http://localhost:8080` and the frontend on `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` and set these variables:

- `DATABASE_URL` points to the PostgreSQL database used by the ledger.
- `WHALLET_USER` and `WHALLET_PASSWORD` protect API routes with HTTP Basic Auth.
- `WHALLET_API_KEY` protects the `/mcp` JSON-RPC endpoint. Send it as `x-api-key` or `Authorization: Bearer <key>`.

`/health` is public. The MCP endpoint supports account, category, transaction, balance, and summary tools.

Create or update the database schema with:

```sh
pnpm --filter @whallet/server db:generate
pnpm --filter @whallet/server db:migrate
```

Accounts own their currency, so BRL, USD, EUR, and other ISO 4217 currencies can coexist. Cross-currency transfers require both source and destination amounts; Whallet does not invent exchange rates.

## Checks

```sh
pnpm lint
pnpm build
```
