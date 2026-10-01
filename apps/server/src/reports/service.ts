import { and, eq, gte, lte, sql } from "drizzle-orm";
import { requireAccount } from "../accounts/service.js";
import { getDb } from "../db/index.js";
import { transactions } from "../db/schema.js";

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
      incomeMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountMinor} else 0 end), 0)`,
      expenseMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountMinor} else 0 end), 0)`,
      transferMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'transfer' then ${transactions.amountMinor} else 0 end), 0)`,
      netMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountMinor} when ${transactions.type} = 'expense' then -${transactions.amountMinor} else 0 end), 0)`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.currency, transactions.type);
}
