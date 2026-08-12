import { bigint, index, int, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  source: varchar("source", { length: 80 }).default("direct").notNull(),
  deviceType: varchar("deviceType", { length: 24 }).default("desktop").notNull(),
  visitedAt: timestamp("visitedAt").defaultNow().notNull(),
}, table => ({
  visitsDateIndex: index("site_visits_date_index").on(table.visitedAt),
  visitsSourceIndex: index("site_visits_source_index").on(table.source),
  visitsDeviceIndex: index("site_visits_device_index").on(table.deviceType),
}));

export const siteOrders = mysqlTable("site_orders", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 180 }).notNull(),
  service: varchar("service", { length: 255 }).notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

/** Single-owner credential record. Passwords are stored as a salted scrypt hash only. */
export const ownerAccounts = mysqlTable("owner_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  sessionVersion: int("sessionVersion").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  ownerEmailUnique: uniqueIndex("owner_accounts_email_unique").on(table.email),
}));

export const customers = mysqlTable("customers", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  university: varchar("university", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  customerEmailIndex: index("customers_email_index").on(table.email),
  customerPhoneIndex: index("customers_phone_index").on(table.phone),
}));

export const mediaFiles = mysqlTable("media_files", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: longtext("url").notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
  category: mysqlEnum("category", ["image", "document", "other"]).notNull(),
  usage: varchar("usage", { length: 80 }).default("library").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  mediaCategoryIndex: index("media_files_category_index").on(table.category),
}));

export const assignmentRequests = mysqlTable("assignment_requests", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  customerId: bigint("customerId", { mode: "number" }),
  studentName: varchar("studentName", { length: 180 }).notNull(),
  studentId: varchar("studentId", { length: 100 }).notNull(),
  university: varchar("university", { length: 200 }).notNull(),
  college: varchar("college", { length: 200 }).notNull(),
  department: varchar("department", { length: 200 }),
  course: varchar("course", { length: 200 }).notNull(),
  professor: varchar("professor", { length: 180 }).notNull(),
  serviceType: varchar("serviceType", { length: 255 }).notNull(),
  deadline: varchar("deadline", { length: 10 }).notNull(),
  description: longtext("description").notNull(),
  attachmentMediaId: bigint("attachmentMediaId", { mode: "number" }),
  status: mysqlEnum("status", ["new", "reviewing", "in_progress", "completed", "cancelled"]).default("new").notNull(),
  adminNotes: longtext("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  assignmentStatusIndex: index("assignment_requests_status_index").on(table.status),
  assignmentCreatedAtIndex: index("assignment_requests_created_at_index").on(table.createdAt),
}));

export const contactMessages = mysqlTable("contact_messages", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  customerId: bigint("customerId", { mode: "number" }),
  name: varchar("name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: longtext("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "replied", "archived"]).default("new").notNull(),
  adminNotes: longtext("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  contactStatusIndex: index("contact_messages_status_index").on(table.status),
  contactCreatedAtIndex: index("contact_messages_created_at_index").on(table.createdAt),
}));

export const submittedReviews = mysqlTable("submitted_reviews", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  university: varchar("university", { length: 200 }).notNull(),
  review: longtext("review").notNull(),
  rating: int("rating").default(5).notNull(),
  status: mysqlEnum("status", ["pending", "published", "hidden"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  reviewStatusIndex: index("submitted_reviews_status_index").on(table.status),
}));

export const adminAuditEvents = mysqlTable("admin_audit_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  details: longtext("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  auditCreatedAtIndex: index("admin_audit_events_created_at_index").on(table.createdAt),
}));

export type ContentCollection = typeof contentCollections.$inferSelect;
export type InsertContentCollection = typeof contentCollections.$inferInsert;
