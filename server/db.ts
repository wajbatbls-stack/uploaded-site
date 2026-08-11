import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { contentCollections, InsertUser, siteOrders, siteVisits, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { SITE_SEED } from "./siteSeed";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

const collectionLabels: Record<string, string> = {
  services: "الخدمات الرئيسية والفرعية",
  plans: "الاشتراكات",
  downloads: "التحميلات",
  articles: "المدونة",
  reviews: "آراء الطلاب",
  partners: "الشركاء",
  faqs: "الأسئلة الشائعة",
  siteSettings: "إعدادات الموقع والإعلانات والمرشد الصوتي",
};

export async function ensureSiteSeeded() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const seeded = await db.select({ id: contentCollections.id }).from(contentCollections).limit(1);
  if (seeded.length) return;

  const records = Object.entries(SITE_SEED).map(([collectionKey, content]) => ({
    collectionKey,
    label: collectionLabels[collectionKey] ?? collectionKey,
    content: JSON.stringify(content),
  }));
  await db.insert(contentCollections).values(records);
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
  await db.update(contentCollections)
    .set({ content: JSON.stringify(content) })
    .where(eq(contentCollections.collectionKey, collectionKey));
  return { success: true } as const;
}

export async function recordSiteVisit(path: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteVisits).values({ path: path.slice(0, 255) });
}

export async function recordSiteOrder(studentName: string, service: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteOrders).values({ studentName: studentName.slice(0, 180), service: service.slice(0, 255) });
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const [{ visits }] = await db.select({ visits: sql<number>`count(*)` }).from(siteVisits);
  const [{ orders }] = await db.select({ orders: sql<number>`count(*)` }).from(siteOrders);
  const recentVisits = await db.select().from(siteVisits).orderBy(desc(siteVisits.visitedAt)).limit(50);
  const recentOrders = await db.select().from(siteOrders).orderBy(desc(siteOrders.submittedAt)).limit(50);
  return { visits, orders, recentVisits, recentOrders };
}
