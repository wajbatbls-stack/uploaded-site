import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminAuditEvents,
  assignmentRequests,
  contactMessages,
  contentCollections,
  customers,
  InsertUser,
  mediaFiles,
  siteOrders,
  siteVisits,
  submittedReviews,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { SITE_SEED } from "./siteSeed";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : undefined);
  if (values.role) updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const collectionLabels: Record<string, string> = {
  services: "الخدمات الرئيسية والفرعية",
  plans: "الاشتراكات",
  downloads: "التحميلات",
  articles: "المدونة",
  reviews: "آراء الطلاب",
  partners: "الشركاء",
  faqs: "الأسئلة الشائعة",
  siteSettings: "إعدادات الموقع والإعلانات وSEO",
  aboutContent: "من نحن",
  teamMembers: "فريق الإدارة",
};

export async function ensureSiteSeeded() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const seeded = await db.select({ collectionKey: contentCollections.collectionKey }).from(contentCollections);
  const existingKeys = new Set(seeded.map(row => row.collectionKey));
  const records = Object.entries(SITE_SEED).filter(([collectionKey]) => !existingKeys.has(collectionKey)).map(([collectionKey, content]) => ({
    collectionKey,
    label: collectionLabels[collectionKey] ?? collectionKey,
    content: JSON.stringify(content),
  }));
  if (records.length) await db.insert(contentCollections).values(records);
}

export async function getPublicSiteContent() {
  await ensureSiteSeeded();
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const rows = await db.select().from(contentCollections);
  return Object.fromEntries(rows.map(row => [row.collectionKey, JSON.parse(row.content)]));
}

export async function getAdminCollections() {
  await ensureSiteSeeded();
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.select().from(contentCollections).orderBy(contentCollections.id);
}

export async function saveCollection(collectionKey: string, content: unknown) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.update(contentCollections).set({ content: JSON.stringify(content) }).where(eq(contentCollections.collectionKey, collectionKey));
  return { success: true } as const;
}

export async function recordSiteVisit(path: string, metadata: { source?: string; deviceType?: string } = {}) {
  const db = await getDb();
  if (db) await db.insert(siteVisits).values({
    path: path.slice(0, 255),
    source: (metadata.source || "direct").slice(0, 80),
    deviceType: (metadata.deviceType || "desktop").slice(0, 24),
  });
}

export async function recordSiteOrder(studentName: string, service: string) {
  const db = await getDb();
  if (db) await db.insert(siteOrders).values({ studentName: studentName.slice(0, 180), service: service.slice(0, 255) });
}

export type RequestInput = {
  studentName: string; studentId: string; university: string; college: string; department?: string;
  course: string; professor: string; serviceType: string; deadline: string; description: string;
  email?: string; phone?: string; attachmentMediaId?: number;
};

async function upsertCustomer(input: { fullName: string; email?: string; phone?: string; university?: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const email = input.email?.trim().toLowerCase() || undefined;
  const phone = input.phone?.trim() || undefined;
  const clauses = [email ? eq(customers.email, email) : undefined, phone ? eq(customers.phone, phone) : undefined].filter(Boolean);
  const existing = clauses.length ? await db.select().from(customers).where(or(...clauses as [any, ...any[]])).limit(1) : [];
  if (existing[0]) {
    await db.update(customers).set({ fullName: input.fullName, email: email ?? existing[0].email, phone: phone ?? existing[0].phone, university: input.university ?? existing[0].university }).where(eq(customers.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(customers).values({ fullName: input.fullName, email: email ?? null, phone: phone ?? null, university: input.university ?? null });
  return Number(result[0].insertId);
}

export async function createAssignmentRequest(input: RequestInput) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const customerId = await upsertCustomer({ fullName: input.studentName, email: input.email, phone: input.phone, university: input.university });
  const { email: _email, phone: _phone, ...request } = input;
  const result = await db.insert(assignmentRequests).values({ ...request, customerId, department: input.department ?? null, attachmentMediaId: input.attachmentMediaId ?? null });
  return { id: Number(result[0].insertId), customerId };
}

export async function listAssignmentRequests(input: { search?: string; status?: string; limit?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const conditions = [
    input.status ? eq(assignmentRequests.status, input.status as any) : undefined,
    input.search ? or(like(assignmentRequests.studentName, `%${input.search}%`), like(assignmentRequests.course, `%${input.search}%`), like(assignmentRequests.university, `%${input.search}%`)) : undefined,
  ].filter(Boolean);
  return db.select().from(assignmentRequests).where(conditions.length ? and(...conditions as [any, ...any[]]) : undefined).orderBy(desc(assignmentRequests.createdAt)).limit(input.limit ?? 100);
}

export async function updateAssignmentRequest(id: number, input: { status?: string; adminNotes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.update(assignmentRequests).set({ status: input.status as any, adminNotes: input.adminNotes }).where(eq(assignmentRequests.id, id));
  return { success: true } as const;
}

export async function createContactMessage(input: { name: string; phone: string; email?: string; subject: string; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const customerId = await upsertCustomer({ fullName: input.name, email: input.email, phone: input.phone });
  const result = await db.insert(contactMessages).values({ ...input, email: input.email?.trim().toLowerCase() ?? null, customerId });
  return { id: Number(result[0].insertId) };
}

export async function listContactMessages(input: { status?: string; search?: string; limit?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const conditions = [
    input.status ? eq(contactMessages.status, input.status as any) : undefined,
    input.search ? or(like(contactMessages.name, `%${input.search}%`), like(contactMessages.subject, `%${input.search}%`), like(contactMessages.phone, `%${input.search}%`)) : undefined,
  ].filter(Boolean);
  return db.select().from(contactMessages).where(conditions.length ? and(...conditions as [any, ...any[]]) : undefined).orderBy(desc(contactMessages.createdAt)).limit(input.limit ?? 100);
}

export async function updateContactMessage(id: number, input: { status?: string; adminNotes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.update(contactMessages).set({ status: input.status as any, adminNotes: input.adminNotes }).where(eq(contactMessages.id, id));
  return { success: true } as const;
}

export async function createSubmittedReview(input: { name: string; university: string; review: string; rating: number }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const result = await db.insert(submittedReviews).values(input);
  return { id: Number(result[0].insertId) };
}

export async function listSubmittedReviews(status?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.select().from(submittedReviews).where(status ? eq(submittedReviews.status, status as any) : undefined).orderBy(desc(submittedReviews.createdAt)).limit(100);
}

export async function updateSubmittedReview(id: number, status: "pending" | "published" | "hidden") {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.update(submittedReviews).set({ status }).where(eq(submittedReviews.id, id));
  return { success: true } as const;
}

export async function deleteSubmittedReview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.delete(submittedReviews).where(eq(submittedReviews.id, id));
  return { success: true } as const;
}

export async function registerMedia(input: { storageKey: string; url: string; originalName: string; mimeType: string; sizeBytes: number; category: "image" | "document" | "other"; usage?: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const result = await db.insert(mediaFiles).values({ ...input, usage: input.usage ?? "library" });
  return { id: Number(result[0].insertId), ...input };
}

export async function listMedia(category?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.select().from(mediaFiles).where(category ? eq(mediaFiles.category, category as any) : undefined).orderBy(desc(mediaFiles.createdAt)).limit(200);
}

export async function removeMedia(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
  return { success: true } as const;
}

export async function recordAdminAudit(action: string, entityType: string, entityId?: string, details?: unknown) {
  const db = await getDb();
  if (db) await db.insert(adminAuditEvents).values({ action, entityType, entityId: entityId ?? null, details: details ? JSON.stringify(details) : null });
}

const ARABIC_MONTHS: Record<string, number> = { "يناير": 0, "فبراير": 1, "مارس": 2, "أبريل": 3, "مايو": 4, "يونيو": 5, "يوليو": 6, "أغسطس": 7, "سبتمبر": 8, "أكتوبر": 9, "نوفمبر": 10, "ديسمبر": 11 };

export function sortRecentArticles(items: unknown[]): Record<string, unknown>[] {
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const publishedText = typeof item.publishedText === "string" ? item.publishedText.trim() : "";
      const match = publishedText.match(/^(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+(\d{4})$/);
      const publishedAt = match ? Date.UTC(Number(match[3]), ARABIC_MONTHS[match[2]], Number(match[1])) : 0;
      return { ...item, __publishedAt: publishedAt, __index: index };
    })
    .sort((left, right) => Number(right.__publishedAt) - Number(left.__publishedAt) || Number(left.__index) - Number(right.__index))
    .slice(0, 10)
    .map(({ __publishedAt: _publishedAt, __index: _index, ...item }) => item);
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [[{ visits }], [{ orders }], [{ requests }], [{ messages }], [{ pendingReviews }], [{ visitsToday }], [{ visitsWeek }], [{ visitsMonth }]] = await Promise.all([
    db.select({ visits: sql<number>`count(*)` }).from(siteVisits),
    db.select({ orders: sql<number>`count(*)` }).from(siteOrders),
    db.select({ requests: sql<number>`count(*)` }).from(assignmentRequests),
    db.select({ messages: sql<number>`count(*)` }).from(contactMessages).where(eq(contactMessages.status, "new")),
    db.select({ pendingReviews: sql<number>`count(*)` }).from(submittedReviews).where(eq(submittedReviews.status, "pending")),
    db.select({ visitsToday: sql<number>`count(*)` }).from(siteVisits).where(gte(siteVisits.visitedAt, todayStart)),
    db.select({ visitsWeek: sql<number>`count(*)` }).from(siteVisits).where(gte(siteVisits.visitedAt, weekStart)),
    db.select({ visitsMonth: sql<number>`count(*)` }).from(siteVisits).where(gte(siteVisits.visitedAt, monthStart)),
  ]);
  const visitCount = sql<number>`count(*)`;
  const [recentVisits, recentOrders, recentRequests, recentMessages, recentReviews, recentMedia, activities, dailyVisitRows, trafficSources, deviceTypes, requestStatuses, contentViewRows, articleCollection] = await Promise.all([
    db.select().from(siteVisits).orderBy(desc(siteVisits.visitedAt)).limit(50),
    db.select().from(siteOrders).orderBy(desc(siteOrders.submittedAt)).limit(50),
    db.select().from(assignmentRequests).orderBy(desc(assignmentRequests.createdAt)).limit(10),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(10),
    db.select().from(submittedReviews).orderBy(desc(submittedReviews.createdAt)).limit(10),
    db.select().from(mediaFiles).orderBy(desc(mediaFiles.createdAt)).limit(10),
    db.select().from(adminAuditEvents).orderBy(desc(adminAuditEvents.createdAt)).limit(30),
    db.select({ visitedAt: siteVisits.visitedAt }).from(siteVisits)
      .where(sql`${siteVisits.visitedAt} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`)
      .orderBy(siteVisits.visitedAt),
    db.select({ source: siteVisits.source, count: visitCount }).from(siteVisits)
      .groupBy(siteVisits.source).orderBy(desc(visitCount)).limit(12),
    db.select({ deviceType: siteVisits.deviceType, count: visitCount }).from(siteVisits)
      .groupBy(siteVisits.deviceType).orderBy(desc(visitCount)),
    db.select({ status: assignmentRequests.status, count: sql<number>`count(*)` }).from(assignmentRequests)
      .groupBy(assignmentRequests.status),
    db.select({ path: siteVisits.path, count: visitCount }).from(siteVisits)
      .where(or(like(siteVisits.path, "/services/%"), like(siteVisits.path, "/blog/articles/%"), like(siteVisits.path, "/downloads/files/%")))
      .groupBy(siteVisits.path).orderBy(desc(visitCount)).limit(60),
    db.select({ content: contentCollections.content }).from(contentCollections).where(eq(contentCollections.collectionKey, "articles")).limit(1),
  ]);
  const dailyVisitMap = new Map<string, number>();
  for (const visit of dailyVisitRows) {
    const date = new Date(visit.visitedAt).toISOString().slice(0, 10);
    dailyVisitMap.set(date, (dailyVisitMap.get(date) ?? 0) + 1);
  }
  const dailyVisits = Array.from(dailyVisitMap.entries()).map(([date, count]) => ({ date, count }));
  let recentArticles: unknown[] = [];
  try {
    const parsed = articleCollection[0] ? JSON.parse(articleCollection[0].content) : [];
    recentArticles = Array.isArray(parsed) ? sortRecentArticles(parsed) : [];
  } catch {
    recentArticles = [];
  }
  const topServices = contentViewRows.filter(row => row.path.startsWith("/services/")).slice(0, 5);
  const topArticles = contentViewRows.filter(row => row.path.startsWith("/blog/articles/")).slice(0, 5);
  const topDownloads = contentViewRows.filter(row => row.path.startsWith("/downloads/files/")).slice(0, 5);
  return { visits, visitsToday, visitsWeek, visitsMonth, orders, requests, messages, pendingReviews, recentVisits, recentOrders, recentRequests, recentMessages, recentReviews, recentMedia, recentArticles, activities, dailyVisits, trafficSources, deviceTypes, requestStatuses, topServices, topArticles, topDownloads };
}

export async function exportSiteBackup() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const [collections, requests, messages, reviews, media] = await Promise.all([
    db.select().from(contentCollections), db.select().from(assignmentRequests), db.select().from(contactMessages), db.select().from(submittedReviews), db.select().from(mediaFiles),
  ]);
  return { exportedAt: new Date().toISOString(), schemaVersion: 1, collections, requests, messages, reviews, media };
}

export async function restoreContentBackup(backup: unknown) {
  if (!backup || typeof backup !== "object") throw new Error("ملف النسخة الاحتياطية غير صالح");
  const collections = (backup as { collections?: unknown }).collections;
  if (!Array.isArray(collections)) throw new Error("لا يحتوي الملف على محتوى قابل للاستعادة");
  const validCollections = collections.flatMap(row => {
    if (!row || typeof row !== "object") return [];
    const candidate = row as { collectionKey?: unknown; label?: unknown; content?: unknown };
    if (typeof candidate.collectionKey !== "string" || typeof candidate.label !== "string" || typeof candidate.content !== "string") return [];
    if (!candidate.collectionKey.trim() || candidate.collectionKey.length > 80 || candidate.label.length > 160) return [];
    try { JSON.parse(candidate.content); } catch { return []; }
    return [{ collectionKey: candidate.collectionKey, label: candidate.label, content: candidate.content }];
  });
  if (!validCollections.length) throw new Error("لا توجد مجموعات محتوى صالحة داخل النسخة الاحتياطية");
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  for (const collection of validCollections) {
    await db.insert(contentCollections).values(collection).onDuplicateKeyUpdate({
      set: { label: collection.label, content: collection.content },
    });
  }
  return { success: true as const, restoredCollections: validCollections.length };
}
