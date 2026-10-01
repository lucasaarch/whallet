import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { categories } from "../db/schema.js";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["expense", "income"]),
});

export async function createCategory(input: unknown) {
  const values = categoryInputSchema.parse(input);
  const [category] = await getDb()
    .insert(categories)
    .values(values)
    .returning();
  return category;
}

export async function listCategories() {
  return getDb()
    .select()
    .from(categories)
    .where(eq(categories.status, "active"))
    .orderBy(categories.name);
}

export async function updateCategory(id: string, input: unknown) {
  const values = categoryInputSchema.partial().parse(input);
  const [category] = await getDb()
    .update(categories)
    .set(values)
    .where(eq(categories.id, id))
    .returning();
  if (!category) throw new Error("Category not found");
  return category;
}

export async function archiveCategory(id: string) {
  const [category] = await getDb()
    .update(categories)
    .set({ status: "archived" })
    .where(eq(categories.id, id))
    .returning();
  if (!category) throw new Error("Category not found");
  return category;
}

export async function requireCategory(id: string) {
  const [category] = await getDb()
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!category || category.status !== "active")
    throw new Error("Category not found or archived");
  return category;
}
