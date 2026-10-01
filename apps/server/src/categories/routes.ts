import type { FastifyInstance } from "fastify";
import {
  archiveCategory,
  createCategory,
  listCategories,
  updateCategory,
} from "./service.js";

const errorResponse = (error: unknown) => ({
  error: error instanceof Error ? error.message : "Request failed",
});
export function registerCategoryRoutes(app: FastifyInstance) {
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
  app.patch<{ Params: { id: string } }>(
    "/categories/:id",
    async (request, reply) => {
      try {
        return await updateCategory(request.params.id, request.body);
      } catch (error) {
        return reply.code(400).send(errorResponse(error));
      }
    },
  );
  app.post<{ Params: { id: string } }>(
    "/categories/:id/archive",
    async (request, reply) => {
      try {
        return await archiveCategory(request.params.id);
      } catch (error) {
        return reply.code(400).send(errorResponse(error));
      }
    },
  );
}
