import { timingSafeEqual } from "node:crypto";
import cors from "@fastify/cors";
import { healthResponseSchema } from "@whallet/contracts";
import Fastify from "fastify";
import {
  cancelTransaction,
  createAccount,
  createCategory,
  createTransaction,
  getBalance,
  getSummary,
  listAccounts,
  listCategories,
  listTransactions,
  updateTransaction,
} from "./finance.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function unauthorized(reply: {
  code: (status: number) => {
    header: (
      name: string,
      value: string,
    ) => { send: (body: unknown) => unknown };
  };
}) {
  return reply
    .code(401)
    .header("WWW-Authenticate", "Basic")
    .send({ error: "Unauthorized" });
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function parseBasicAuth(value: string | undefined) {
  if (!value?.startsWith("Basic ")) return;
  const decoded = Buffer.from(value.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return;
  return {
    user: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function errorResponse(error: unknown) {
  return { error: error instanceof Error ? error.message : "Request failed" };
}

const mcpTools = [
  {
    name: "account_create",
    description: "Create a bank, cash, card, or wallet account",
    inputSchema: {
      type: "object",
      required: ["name", "type"],
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["bank", "cash", "card", "wallet"] },
        currency: {
          type: "string",
          description: "ISO 4217 code, defaults to BRL",
        },
      },
    },
  },
  {
    name: "account_list",
    description: "List financial accounts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "category_create",
    description: "Create an income or expense category",
    inputSchema: {
      type: "object",
      required: ["name", "type"],
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["expense", "income"] },
      },
    },
  },
  {
    name: "category_list",
    description: "List categories",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "transaction_create",
    description: "Record an expense, income, transfer, or installment purchase",
    inputSchema: {
      type: "object",
      required: ["type", "accountId", "amountMinor", "description"],
      properties: {
        type: { type: "string", enum: ["expense", "income", "transfer"] },
        accountId: { type: "string" },
        destinationAccountId: { type: "string" },
        amountMinor: { type: "integer" },
        destinationAmountMinor: { type: "integer" },
        categoryId: { type: "string" },
        description: { type: "string" },
        merchant: { type: "string" },
        occurredAt: { type: "string", format: "date-time" },
        installments: { type: "integer", minimum: 1 },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "transaction_list",
    description: "List active transactions",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "transaction_update",
    description: "Edit an active transaction",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        amountMinor: { type: "integer" },
        description: { type: "string" },
        merchant: { type: "string" },
        categoryId: { type: "string" },
        occurredAt: { type: "string", format: "date-time" },
      },
    },
  },
  {
    name: "transaction_cancel",
    description: "Cancel a transaction while preserving its history",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "balance_get",
    description: "Get an account balance in its native currency",
    inputSchema: {
      type: "object",
      required: ["accountId"],
      properties: { accountId: { type: "string" } },
    },
  },
  {
    name: "summary_get",
    description: "Summarize income and expenses by currency",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
      },
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "account_create":
      return createAccount(args);
    case "account_list":
      return listAccounts();
    case "category_create":
      return createCategory(args);
    case "category_list":
      return listCategories();
    case "transaction_create":
      return createTransaction(args);
    case "transaction_list":
      return listTransactions({
        accountId:
          typeof args.accountId === "string" ? args.accountId : undefined,
        from: typeof args.from === "string" ? new Date(args.from) : undefined,
        to: typeof args.to === "string" ? new Date(args.to) : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });
    case "transaction_update":
      return updateTransaction(String(args.id), args);
    case "transaction_cancel":
      return cancelTransaction(String(args.id));
    case "balance_get":
      return getBalance(String(args.accountId));
    case "summary_get":
      return getSummary(
        typeof args.from === "string" ? new Date(args.from) : undefined,
        typeof args.to === "string" ? new Date(args.to) : undefined,
      );
    default:
      throw new Error("Method not found");
  }
}

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });
  app.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?", 1)[0];
    if (path === "/health") return;

    if (path === "/mcp") {
      const expectedKey = process.env.WHALLET_API_KEY;
      const providedKey =
        request.headers["x-api-key"] ??
        request.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (
        !expectedKey ||
        typeof providedKey !== "string" ||
        !sameSecret(providedKey, expectedKey)
      ) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      return;
    }

    const credentials = parseBasicAuth(request.headers.authorization);
    const expectedUser = process.env.WHALLET_USER;
    const expectedPassword = process.env.WHALLET_PASSWORD;
    if (
      !expectedUser ||
      !expectedPassword ||
      !credentials ||
      !sameSecret(credentials.user, expectedUser) ||
      !sameSecret(credentials.password, expectedPassword)
    ) {
      return unauthorized(reply);
    }
  });
  app.get("/health", async () =>
    healthResponseSchema.parse({ status: "ok", service: "whallet-api" }),
  );
  app.post("/accounts", async (request, reply) => {
    try {
      return await createAccount(request.body);
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
  app.get("/accounts", async (_request, reply) => {
    try {
      return await listAccounts();
    } catch (error) {
      return reply.code(503).send(errorResponse(error));
    }
  });
  app.post("/categories", async (request, reply) => {
    try {
      return await createCategory(request.body);
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
  app.get("/categories", async (_request, reply) => {
    try {
      return await listCategories();
    } catch (error) {
      return reply.code(503).send(errorResponse(error));
    }
  });
  app.post("/transactions", async (request, reply) => {
    try {
      return await createTransaction(request.body);
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
  app.get("/transactions", async (request, reply) => {
    try {
      const query = request.query as {
        accountId?: string;
        from?: string;
        to?: string;
        limit?: string;
      };
      return await listTransactions({
        accountId: query.accountId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      });
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
  app.patch<{ Params: { id: string } }>(
    "/transactions/:id",
    async (request, reply) => {
      try {
        return await updateTransaction(request.params.id, request.body);
      } catch (error) {
        return reply.code(400).send(errorResponse(error));
      }
    },
  );
  app.post<{ Params: { id: string } }>(
    "/transactions/:id/cancel",
    async (request, reply) => {
      try {
        return await cancelTransaction(request.params.id);
      } catch (error) {
        return reply.code(400).send(errorResponse(error));
      }
    },
  );
  app.get<{ Params: { id: string } }>(
    "/accounts/:id/balance",
    async (request, reply) => {
      try {
        return await getBalance(request.params.id);
      } catch (error) {
        return reply.code(400).send(errorResponse(error));
      }
    },
  );
  app.get("/summary", async (request, reply) => {
    try {
      const query = request.query as { from?: string; to?: string };
      return await getSummary(
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
      );
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
  app.post<{ Body: JsonRpcRequest }>("/mcp", async (request, reply) => {
    const body = request.body;
    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return reply.send(jsonRpcError(null, -32600, "Invalid Request"));
    }

    if (body.method === "initialize") {
      return reply.send({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "whallet", version: "0.1.0" },
        },
      });
    }

    if (body.method === "notifications/initialized")
      return reply.code(202).send();

    if (body.method === "tools/list") {
      return reply.send({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: {
          tools: mcpTools,
        },
      });
    }

    if (body.method === "tools/call" && typeof body.params?.name === "string") {
      try {
        const result = await callTool(
          body.params.name,
          (body.params.arguments as Record<string, unknown>) ?? {},
        );
        return reply.send({
          jsonrpc: "2.0",
          id: body.id ?? null,
          result: { content: [{ type: "text", text: JSON.stringify(result) }] },
        });
      } catch (error) {
        return reply.send({
          jsonrpc: "2.0",
          id: body.id ?? null,
          result: {
            isError: true,
            content: [
              { type: "text", text: JSON.stringify(errorResponse(error)) },
            ],
          },
        });
      }
    }

    return reply.send(jsonRpcError(body.id, -32601, "Method not found"));
  });
  return app;
}
