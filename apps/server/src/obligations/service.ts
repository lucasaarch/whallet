import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAccount } from "../accounts/service.js";
import { requireCategory } from "../categories/service.js";
import { getDb } from "../db/index.js";
import { obligations } from "../db/schema.js";
import { createTransaction } from "../transactions/service.js";

const input = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  amountMinor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  description: z.string().trim().min(1),
  dueDate: z.coerce.date(),
});

export async function createObligation(
  direction: "payable" | "receivable",
  value: unknown,
) {
  const values = input.parse(value);
  const account = await requireAccount(values.accountId);
  if (values.categoryId) await requireCategory(values.categoryId);
  const [row] = await getDb()
    .insert(obligations)
    .values({
      ...values,
      direction,
      currency: values.currency || account.currency,
    })
    .returning();
  return row;
}
export async function listObligations(
  direction: "payable" | "receivable",
  from?: Date,
  to?: Date,
) {
  const conditions = [
    eq(obligations.direction, direction),
    eq(obligations.status, "pending"),
  ];
  if (from) conditions.push(gte(obligations.dueDate, from));
  if (to) conditions.push(lte(obligations.dueDate, to));
  return getDb()
    .select()
    .from(obligations)
    .where(and(...conditions))
    .orderBy(obligations.dueDate);
}
export async function updateObligation(id: string, value: unknown) {
  const values = input.partial().parse(value);
  const [row] = await getDb()
    .update(obligations)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(obligations.id, id), eq(obligations.status, "pending")))
    .returning();
  if (!row) throw new Error("Obligation not found");
  return row;
}
export async function cancelObligation(id: string) {
  const [row] = await getDb()
    .update(obligations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(obligations.id, id), eq(obligations.status, "pending")))
    .returning();
  if (!row) throw new Error("Obligation not found");
  return row;
}
export async function settleObligation(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(obligations)
    .where(and(eq(obligations.id, id), eq(obligations.status, "pending")))
    .limit(1);
  if (!row) throw new Error("Obligation not found");
  const created = await createTransaction({
    type: row.direction === "payable" ? "expense" : "income",
    accountId: row.accountId,
    categoryId: row.categoryId ?? undefined,
    amountMinor: row.amountMinor,
    description: row.description,
    occurredAt: new Date(),
    idempotencyKey: `obligation:${row.id}`,
  });
  const transaction = created.transactions[0];
  const [settled] = await db
    .update(obligations)
    .set({
      status: "settled",
      transactionId: transaction.id,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(obligations.id, id), eq(obligations.status, "pending")))
    .returning();
  return settled;
}
