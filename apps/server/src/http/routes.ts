import { healthResponseSchema } from "@whallet/contracts";
import type { FastifyInstance } from "fastify";
import { registerAccountRoutes } from "../accounts/routes.js";
import { registerCategoryRoutes } from "../categories/routes.js";
import { registerMcpRoutes } from "../mcp/routes.js";
import { registerReportRoutes } from "../reports/routes.js";
import { registerTransactionRoutes } from "../transactions/routes.js";
import { subscribeDashboard } from "./events.js";

export function registerHttpRoutes(app: FastifyInstance) {
  app.get("/health", async () =>
    healthResponseSchema.parse({ status: "ok", service: "whallet-api" }),
  );
  app.get("/session", async () => ({ authenticated: true }));
  app.get("/events", async (request, reply) => {
    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    });
    response.write(`event: ready\ndata: {"ok":true}\n\n`);
    const unsubscribe = subscribeDashboard((event) => {
      response.write(
        `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
      );
    });
    const heartbeat = setInterval(
      () => response.write(": heartbeat\n\n"),
      20_000,
    );
    const close = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    request.raw.once("close", close);
  });
  registerAccountRoutes(app);
  registerCategoryRoutes(app);
  registerTransactionRoutes(app);
  registerReportRoutes(app);
  registerMcpRoutes(app);
}
