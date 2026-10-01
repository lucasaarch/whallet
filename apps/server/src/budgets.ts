import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db/index.js";
import { budgets } from "./db/schema.js";
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
  return getDb().select().from(budgets).orderBy(budgets.periodStart);
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
