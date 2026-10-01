import { healthResponseSchema } from "@whallet/contracts";

export default async function Home() {
  const response = await fetch("http://localhost:3000/api/health", {
    cache: "no-store",
  });
  const health = healthResponseSchema.parse(await response.json());

  return (
    <main>
      <h1>Whallet</h1>
      <p>API: {health.status === "ok" ? "online" : "indisponível"}</p>
    </main>
  );
}
