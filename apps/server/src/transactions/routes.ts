import type { FastifyInstance } from "fastify";
import {
  cancelTransaction,
  createTransaction,
  listTransactions,
  updateTransaction,
} from "./service.js";

const errorResponse = (error: unknown) => ({
  error: error instanceof Error ? error.message : "Request failed",
});
export function registerTransactionRoutes(app: FastifyInstance) {
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
        categoryId?: string;
        type?: "expense" | "income" | "transfer";
        query?: string;
        minAmountMinor?: string;
        maxAmountMinor?: string;
        from?: string;
        to?: string;
        limit?: string;
      };
      return await listTransactions({
        accountId: query.accountId,
        categoryId: query.categoryId,
        type: query.type,
        query: query.query,
        minAmountMinor: query.minAmountMinor
          ? Number(query.minAmountMinor)
          : undefined,
        maxAmountMinor: query.maxAmountMinor
          ? Number(query.maxAmountMinor)
          : undefined,
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
}
