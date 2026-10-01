import type { FastifyInstance } from "fastify";
import { getBalance, getSummary } from "./service.js";

const errorResponse = (error: unknown) => ({
  error: error instanceof Error ? error.message : "Request failed",
});
export function registerReportRoutes(app: FastifyInstance) {
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
}
