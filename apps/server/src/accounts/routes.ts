import type { FastifyInstance } from "fastify";
import {
  archiveAccount,
  createAccount,
  listAccounts,
  updateAccount,
} from "./service.js";

const errorResponse = (error: unknown) => ({
  error: error instanceof Error ? error.message : "Request failed",
});
export function registerAccountRoutes(app: FastifyInstance) {
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
  app.patch<{ Params: { id: string } }>(
    "/accounts/:id",
    async (request, reply) => {
      try {
        return await updateAccount(request.params.id, request.body);
      } catch (error) {
        return reply.code(400).send(errorResponse(error));
      }
    },
  );
  app.post<{ Params: { id: string } }>(
    "/accounts/:id/archive",
    async (request, reply) => {
      try {
        return await archiveAccount(request.params.id);
      } catch (error) {
        return reply.code(400).send(errorResponse(error));
      }
    },
  );
}
