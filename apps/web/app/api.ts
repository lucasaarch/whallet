export type Transaction = {
  id: string;
  type: "expense" | "income" | "transfer";
  amountMinor: number;
  description: string;
  merchant?: string | null;
  occurredAt: string;
  currency: string;
};
export type Summary = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  transferMinor: number;
  netMinor: number;
  transactionCount: number;
};

export async function apiFetch<T>(
  path: string,
  authorization: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      authorization,
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (response.status === 401) throw new Error("Sessão expirada");
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => null))?.error ??
        "Não foi possível carregar os dados",
    );
  return response.json() as Promise<T>;
}
