import {
  archiveAccount,
  createAccount,
  listAccounts,
  updateAccount,
} from "../accounts/service.js";
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from "../budgets.js";
import {
  archiveCategory,
  createCategory,
  listCategories,
  updateCategory,
} from "../categories/service.js";
import {
  cancelObligation,
  createObligation,
  listObligations,
  settleObligation,
  updateObligation,
} from "../obligations/service.js";
import { getBalance, getSummary } from "../reports/service.js";
import {
  cancelTransaction,
  createTransaction,
  listTransactions,
  updateTransaction,
} from "../transactions/service.js";

export const mcpTools = [
  {
    name: "payable_create",
    description: "Create an account payable due on a date",
    inputSchema: {
      type: "object",
      required: [
        "accountId",
        "amountMinor",
        "currency",
        "description",
        "dueDate",
      ],
      properties: {
        accountId: { type: "string" },
        categoryId: { type: "string" },
        amountMinor: { type: "integer" },
        currency: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string", format: "date-time" },
      },
    },
  },
  {
    name: "payable_list",
    description:
      "List pending accounts payable, optionally filtered by due date",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
    },
  },
  {
    name: "payable_update",
    description: "Edit a pending account payable",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "payable_settle",
    description: "Settle an account payable and create its expense transaction",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "payable_cancel",
    description: "Cancel a pending account payable",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "receivable_create",
    description: "Create an account receivable due on a date",
    inputSchema: {
      type: "object",
      required: [
        "accountId",
        "amountMinor",
        "currency",
        "description",
        "dueDate",
      ],
      properties: {
        accountId: { type: "string" },
        categoryId: { type: "string" },
        amountMinor: { type: "integer" },
        currency: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string", format: "date-time" },
      },
    },
  },
  {
    name: "receivable_list",
    description:
      "List pending accounts receivable, optionally filtered by due date",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
    },
  },
  {
    name: "receivable_update",
    description: "Edit a pending account receivable",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "receivable_settle",
    description:
      "Settle an account receivable and create its income transaction",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "receivable_cancel",
    description: "Cancel a pending account receivable",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },

  {
    name: "budget_create",
    description: "Create a category budget for a date period",
    inputSchema: {
      type: "object",
      required: [
        "categoryId",
        "amountMinor",
        "currency",
        "periodStart",
        "periodEnd",
      ],
      properties: {
        categoryId: { type: "string" },
        amountMinor: { type: "integer" },
        currency: { type: "string" },
        periodStart: { type: "string", format: "date-time" },
        periodEnd: { type: "string", format: "date-time" },
      },
    },
  },
  {
    name: "budget_list",
    description: "List category budgets",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "budget_update",
    description: "Update a category budget",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        amountMinor: { type: "integer" },
        currency: { type: "string" },
        periodStart: { type: "string" },
        periodEnd: { type: "string" },
      },
    },
  },
  {
    name: "budget_delete",
    description: "Delete a category budget",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "account_create",
    description: "Create a bank, cash, card, or wallet account",
    inputSchema: {
      type: "object",
      required: ["name", "type"],
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["bank", "cash", "card", "wallet"] },
        currency: {
          type: "string",
          description: "ISO 4217 code, defaults to BRL",
        },
      },
    },
  },
  {
    name: "account_update",
    description: "Update an account",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
        currency: { type: "string" },
      },
    },
  },
  {
    name: "account_archive",
    description: "Archive an account and preserve history",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "account_list",
    description: "List financial accounts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "category_create",
    description: "Create an income or expense category",
    inputSchema: {
      type: "object",
      required: ["name", "type"],
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["expense", "income"] },
      },
    },
  },
  {
    name: "category_update",
    description: "Update a category",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
      },
    },
  },
  {
    name: "category_archive",
    description: "Archive a category and preserve history",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "category_list",
    description: "List categories",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "transaction_create",
    description: "Record an expense, income, transfer, or installment purchase",
    inputSchema: {
      type: "object",
      required: ["type", "accountId", "amountMinor", "description"],
      properties: {
        type: { type: "string", enum: ["expense", "income", "transfer"] },
        accountId: { type: "string" },
        destinationAccountId: { type: "string" },
        amountMinor: { type: "integer" },
        destinationAmountMinor: { type: "integer" },
        categoryId: { type: "string" },
        description: { type: "string" },
        merchant: { type: "string" },
        occurredAt: { type: "string", format: "date-time" },
        installments: { type: "integer", minimum: 1 },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "transaction_list",
    description: "List active transactions",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        categoryId: { type: "string" },
        type: { type: "string", enum: ["expense", "income", "transfer"] },
        query: {
          type: "string",
          description: "Search description or merchant",
        },
        minAmountMinor: { type: "integer" },
        maxAmountMinor: { type: "integer" },
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "transaction_update",
    description: "Edit an active transaction",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        amountMinor: { type: "integer" },
        description: { type: "string" },
        merchant: { type: "string" },
        categoryId: { type: "string" },
        occurredAt: { type: "string", format: "date-time" },
      },
    },
  },
  {
    name: "transaction_cancel",
    description: "Cancel a transaction while preserving its history",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "balance_get",
    description: "Get an account balance in its native currency",
    inputSchema: {
      type: "object",
      required: ["accountId"],
      properties: { accountId: { type: "string" } },
    },
  },
  {
    name: "summary_get",
    description: "Summarize income and expenses by currency",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
      },
    },
  },
];

export async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "payable_create":
      return createObligation("payable", args);
    case "payable_list":
      return listObligations(
        "payable",
        typeof args.from === "string" ? new Date(args.from) : undefined,
        typeof args.to === "string" ? new Date(args.to) : undefined,
      );
    case "payable_update":
      return updateObligation(String(args.id), args);
    case "payable_settle":
      return settleObligation(String(args.id));
    case "payable_cancel":
      return cancelObligation(String(args.id));
    case "receivable_create":
      return createObligation("receivable", args);
    case "receivable_list":
      return listObligations(
        "receivable",
        typeof args.from === "string" ? new Date(args.from) : undefined,
        typeof args.to === "string" ? new Date(args.to) : undefined,
      );
    case "receivable_update":
      return updateObligation(String(args.id), args);
    case "receivable_settle":
      return settleObligation(String(args.id));
    case "receivable_cancel":
      return cancelObligation(String(args.id));
    case "budget_create":
      return createBudget(args);
    case "budget_list":
      return listBudgets();
    case "budget_update":
      return updateBudget(String(args.id), args);
    case "budget_delete":
      return deleteBudget(String(args.id));
    case "account_create":
      return createAccount(args);
    case "account_list":
      return listAccounts();
    case "account_update":
      return updateAccount(String(args.id), args);
    case "account_archive":
      return archiveAccount(String(args.id));
    case "category_create":
      return createCategory(args);
    case "category_list":
      return listCategories();
    case "category_update":
      return updateCategory(String(args.id), args);
    case "category_archive":
      return archiveCategory(String(args.id));
    case "transaction_create":
      return createTransaction(args);
    case "transaction_list":
      return listTransactions({
        accountId:
          typeof args.accountId === "string" ? args.accountId : undefined,
        categoryId:
          typeof args.categoryId === "string" ? args.categoryId : undefined,
        type:
          args.type === "expense" ||
          args.type === "income" ||
          args.type === "transfer"
            ? args.type
            : undefined,
        query: typeof args.query === "string" ? args.query : undefined,
        minAmountMinor:
          typeof args.minAmountMinor === "number"
            ? args.minAmountMinor
            : undefined,
        maxAmountMinor:
          typeof args.maxAmountMinor === "number"
            ? args.maxAmountMinor
            : undefined,
        from: typeof args.from === "string" ? new Date(args.from) : undefined,
        to: typeof args.to === "string" ? new Date(args.to) : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });
    case "transaction_update":
      return updateTransaction(String(args.id), args);
    case "transaction_cancel":
      return cancelTransaction(String(args.id));
    case "balance_get":
      return getBalance(String(args.accountId));
    case "summary_get":
      return getSummary(
        typeof args.from === "string" ? new Date(args.from) : undefined,
        typeof args.to === "string" ? new Date(args.to) : undefined,
      );
    default:
      throw new Error("Method not found");
  }
}
