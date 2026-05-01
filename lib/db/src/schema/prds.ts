import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prdsTable = pgTable("prds", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  problem: text("problem"),
  audience: text("audience"),
  successCriteria: text("success_criteria"),
  productName: text("product_name"),
  rawOutput: text("raw_output").notNull(),
  shareToken: text("share_token").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskStatusTable = pgTable("task_status", {
  id: text("id").primaryKey(),
  prdId: text("prd_id").notNull().references(() => prdsTable.id),
  taskId: text("task_id").notNull(),
  status: text("status").notNull().default("todo"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const prdVersionsTable = pgTable("prd_versions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  prdId: text("prd_id").notNull().references(() => prdsTable.id),
  versionNumber: integer("version_number").notNull(),
  snapshot: text("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPrdSchema = createInsertSchema(prdsTable);
export type InsertPrd = z.infer<typeof insertPrdSchema>;
export type Prd = typeof prdsTable.$inferSelect;
export type TaskStatus = typeof taskStatusTable.$inferSelect;
export type PrdVersion = typeof prdVersionsTable.$inferSelect;
