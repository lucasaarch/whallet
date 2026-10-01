import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db/index.js";
import { accounts, categories, transactions } from "./db/schema.js";

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "currency must be an ISO 4217 code");
const date = z.coerce.date();

export const accountInputSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["bank", "cash", "card", "wallet"]),
  currency: currency.default("BRL"),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["expense", "income"]),
});

export const transactionInputSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  accountId: z.string().uuid(),
  destinationAccountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  amountMinor: z.number().int().positive(),
  destinationAmountMinor: z.number().int().positive().optional(),
  description: z.string().trim().min(1),
  merchant: z.string().trim().optional(),
  occurredAt: date.default(() => new Date()),
  installments: z.number().int().min(1).max(120).default(1),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

function addMonths(value: Date, months: number) {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function splitAmount(total: number, count: number) {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from(
    { length: count },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

async function requireAccount(id: string) {
  const db = getDb();
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);
  if (!account) throw new Error("Account not found");
  return account;
}

export async function createAccount(input: unknown) {
  const values = accountInputSchema.parse(input);
  const db = getDb();
  const [account] = await db.insert(accounts).values(values).returning();
  return account;
}

export async function listAccounts() {
  return getDb().select().from(accounts).orderBy(accounts.name);
}

export async function createCategory(input: unknown) {
  const values = categoryInputSchema.parse(input);
  const db = getDb();
  const [category] = await db.insert(categories).values(values).returning();
  return category;
}

export async function listCategories() {
  return getDb().select().from(categories).orderBy(categories.name);
}

export async function createTransaction(input: unknown) {
  const values = transactionInputSchema.parse(input);
  const db = getDb();
  const account = await requireAccount(values.accountId);

  if (values.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, values.idempotencyKey))
      .limit(1);
    if (existing) return { transactions: [existing], duplicate: true };
  }

  if (values.type === "transfer") {
    if (
      !values.destinationAccountId ||
      values.destinationAccountId === values.accountId
    )
      throw new Error("Transfer requires a different destination account");
    const destination = await requireAccount(values.destinationAccountId);
    if (values.installments !== 1)
      throw new Error("Transfers cannot be split into installments");
    const [created] = await db
      .insert(transactions)
      .values({
        type: values.type,
        accountId: account.id,
        destinationAccountId: destination.id,
        amountMinor: values.amountMinor,
        currency: account.currency,
        destinationAmountMinor:
          values.destinationAmountMinor ?? values.amountMinor,
        destinationCurrency: destination.currency,
        description: values.description,
        merchant: values.merchant,
        occurredAt: values.occurredAt,
        idempotencyKey: values.idempotencyKey,
      })
      .returning();
    return { transactions: [created], duplicate: false };
  }

  const amounts = splitAmount(values.amountMinor, values.installments);
  const groupId = values.installments > 1 ? randomUUID() : undefined;
  const created = await db
    .insert(transactions)
    .values(
      amounts.map((amount, index) => ({
        type: values.type,
        accountId: account.id,
        categoryId: values.categoryId,
        amountMinor: amount,
        currency: account.currency,
        description: values.description,
        merchant: values.merchant,
        occurredAt: addMonths(values.occurredAt, index),
        installmentGroupId: groupId,
        installmentNumber: values.installments > 1 ? index + 1 : undefined,
        installmentTotal:
          values.installments > 1 ? values.installments : undefined,
        idempotencyKey: index === 0 ? values.idempotencyKey : undefined,
      })),
    )
    .returning();
  return { transactions: created, duplicate: false };
}

export async function listTransactions(filters: {
  accountId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const conditions = [eq(transactions.status, "active")];
  if (filters.accountId) {
    const accountCondition = or(
      eq(transactions.accountId, filters.accountId),
      eq(transactions.destinationAccountId, filters.accountId),
    );
    if (accountCondition) conditions.push(accountCondition);
  }
  if (filters.from) conditions.push(gte(transactions.occurredAt, filters.from));
  if (filters.to) conditions.push(lte(transactions.occurredAt, filters.to));
  return getDb()
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredAt))
    .limit(Math.min(filters.limit ?? 50, 100));
}

export async function updateTransaction(id: string, input: unknown) {
  const values = z
    .object({
      amountMinor: z.number().int().positive().optional(),
      description: z.string().trim().min(1).optional(),
      merchant: z.string().trim().optional(),
      categoryId: z.string().uuid().nullable().optional(),
      occurredAt: date.optional(),
    })
    .parse(input);
  const [updated] = await getDb()
    .update(transactions)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.status, "active")))
    .returning();
  if (!updated) throw new Error("Transaction not found");
  return updated;
}

export async function cancelTransaction(id: string) {
  const [cancelled] = await getDb()
    .update(transactions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.status, "active")))
    .returning();
  if (!cancelled) throw new Error("Transaction not found");
  return cancelled;
}

export async function getBalance(accountId: string) {
  const account = await requireAccount(accountId);
  const [result] = await getDb()
    .select({
      amountMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' and ${transactions.accountId} = ${accountId} then ${transactions.amountMinor} when ${transactions.type} = 'expense' and ${transactions.accountId} = ${accountId} then -${transactions.amountMinor} when ${transactions.type} = 'transfer' and ${transactions.accountId} = ${accountId} then -${transactions.amountMinor} when ${transactions.type} = 'transfer' and ${transactions.destinationAccountId} = ${accountId} then ${transactions.destinationAmountMinor} else 0 end), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.status, "active"));
  return {
    accountId,
    currency: account.currency,
    amountMinor: result.amountMinor ?? 0,
  };
}

export async function getSummary(from?: Date, to?: Date) {
  const conditions = [eq(transactions.status, "active")];
  if (from) conditions.push(gte(transactions.occurredAt, from));
  if (to) conditions.push(lte(transactions.occurredAt, to));
  return getDb()
    .select({
      currency: transactions.currency,
      type: transactions.type,
      amountMinor: sql<number>`sum(${transactions.amountMinor})`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.currency, transactions.type);
}
