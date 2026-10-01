import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { accounts } from "../db/schema.js";

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "currency must be an ISO 4217 code");
export const accountInputSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["bank", "cash", "card", "wallet"]),
  currency: currency.default("BRL"),
});

export async function requireAccount(id: string) {
  const [account] = await getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);
  if (!account) throw new Error("Account not found");
  return account;
}

export async function createAccount(input: unknown) {
  const values = accountInputSchema.parse(input);
  const [account] = await getDb().insert(accounts).values(values).returning();
  return account;
}

export async function listAccounts() {
  return getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.status, "active"))
    .orderBy(accounts.name);
}

export async function updateAccount(id: string, input: unknown) {
  const values = accountInputSchema.partial().parse(input);
  const [account] = await getDb()
    .update(accounts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(accounts.id, id))
    .returning();
  if (!account) throw new Error("Account not found");
  return account;
}

export async function archiveAccount(id: string) {
  const [account] = await getDb()
    .update(accounts)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(accounts.id, id))
    .returning();
  if (!account) throw new Error("Account not found");
  return account;
}
