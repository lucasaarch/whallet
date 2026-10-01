import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  currency: text("currency").notNull().default("BRL"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    status: text("status").notNull().default("active"),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    destinationAccountId: uuid("destination_account_id").references(
      () => accounts.id,
    ),
    categoryId: uuid("category_id").references(() => categories.id),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    destinationAmountMinor: bigint("destination_amount_minor", {
      mode: "number",
    }),
    destinationCurrency: text("destination_currency"),
    description: text("description").notNull(),
    merchant: text("merchant"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    installmentGroupId: uuid("installment_group_id"),
    installmentNumber: integer("installment_number"),
    installmentTotal: integer("installment_total"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("transactions_account_date_idx").on(
      table.accountId,
      table.occurredAt,
    ),
    index("transactions_status_idx").on(table.status),
    uniqueIndex("transactions_idempotency_key_idx").on(table.idempotencyKey),
  ],
);

export const obligations = pgTable("obligations", {
  id: uuid("id").defaultRandom().primaryKey(),
  direction: text("direction").notNull(),
  status: text("status").notNull().default("pending"),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  categoryId: uuid("category_id").references(() => categories.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accountRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));
