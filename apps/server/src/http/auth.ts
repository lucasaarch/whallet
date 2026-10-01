import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";

function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
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

export function registerAuthHook(app: FastifyInstance) {
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
      return reply
        .code(401)
        .header("WWW-Authenticate", "Basic")
        .send({ error: "Unauthorized" });
    }
  });
}
