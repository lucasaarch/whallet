import { healthResponseSchema } from "@whallet/contracts";
import type { FastifyInstance } from "fastify";
import { registerAccountRoutes } from "../accounts/routes.js";
import { registerCategoryRoutes } from "../categories/routes.js";
import { registerMcpRoutes } from "../mcp/routes.js";
import { registerReportRoutes } from "../reports/routes.js";
import { registerTransactionRoutes } from "../transactions/routes.js";

export function registerHttpRoutes(app: FastifyInstance) {
  app.get("/health", async () =>
    healthResponseSchema.parse({ status: "ok", service: "whallet-api" }),
  );
  app.get("/session", async () => ({ authenticated: true }));
  registerAccountRoutes(app);
  registerCategoryRoutes(app);
  registerTransactionRoutes(app);
  registerReportRoutes(app);
  registerMcpRoutes(app);
}
