import type { FastifyInstance } from "fastify";
import { callTool, mcpTools } from "./tools.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function errorResponse(error: unknown) {
  return { error: error instanceof Error ? error.message : "Request failed" };
}

export function registerMcpRoutes(app: FastifyInstance) {
  app.get("/mcp", async () => ({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: "whallet", version: "0.1.0" },
    tools: mcpTools,
  }));

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
        result: { tools: mcpTools },
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
}
