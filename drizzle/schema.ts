import { bigint, int, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Content is deliberately stored by named collection so every item remains editable without altering the public site's original UI. */
export const contentCollections = mysqlTable("content_collections", {
  id: int("id").autoincrement().primaryKey(),
  collectionKey: varchar("collectionKey", { length: 80 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  content: longtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  collectionKeyUnique: uniqueIndex("content_collections_key_unique").on(table.collectionKey),
}));

export const siteVisits = mysqlTable("site_visits", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  path: varchar("path", { length: 255 }).notNull(),
  visitedAt: timestamp("visitedAt").defaultNow().notNull(),
});

export const siteOrders = mysqlTable("site_orders", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 180 }).notNull(),
  service: varchar("service", { length: 255 }).notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type ContentCollection = typeof contentCollections.$inferSelect;
export type InsertContentCollection = typeof contentCollections.$inferInsert;
