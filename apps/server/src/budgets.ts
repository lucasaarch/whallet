import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db/index.js";
import { budgets, transactions } from "./db/schema.js";
const input = z.object({
  categoryId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});
export async function createBudget(value: unknown) {
  const [row] = await getDb()
    .insert(budgets)
    .values(input.parse(value))
    .returning();
  return row;
}
export async function listBudgets() {
  const rows = await getDb()
    .select()
    .from(budgets)
    .orderBy(budgets.periodStart);
  return Promise.all(
    rows.map(async (budget) => {
      const [spent] = await getDb()
        .select({
          amountMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.status, "active"),
            eq(transactions.categoryId, budget.categoryId),
            eq(transactions.type, "expense"),
            gte(transactions.occurredAt, budget.periodStart),
            lte(transactions.occurredAt, budget.periodEnd),
          ),
        );
      const spentMinor = spent?.amountMinor ?? 0;
      return {
        ...budget,
        spentMinor,
        remainingMinor: budget.amountMinor - spentMinor,
        usedPercent: budget.amountMinor
          ? (spentMinor / budget.amountMinor) * 100
          : 0,
      };
    }),
  );
}
export async function updateBudget(id: string, value: unknown) {
  const [row] = await getDb()
    .update(budgets)
    .set({ ...input.partial().parse(value), updatedAt: new Date() })
    .where(eq(budgets.id, id))
    .returning();
  if (!row) throw new Error("Budget not found");
  return row;
}
export async function deleteBudget(id: string) {
  const [row] = await getDb()
    .delete(budgets)
    .where(eq(budgets.id, id))
    .returning();
  if (!row) throw new Error("Budget not found");
  return row;
}
