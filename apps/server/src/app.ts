import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAuthHook } from "./http/auth.js";
import { registerHttpRoutes } from "./http/routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });
  registerAuthHook(app);
  registerHttpRoutes(app);
  return app;
}
