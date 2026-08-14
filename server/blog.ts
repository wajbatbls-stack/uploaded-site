import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { decodeAdminImage } from "./adminUpload";
import { storagePut } from "./storage";
import { blogArticles, blogCategories } from "../drizzle/schema";
import { getDb, recordAdminAudit } from "./db";

/** بيانات التصنيف الأولية التي اقترحها المتطلب، تُزرع فقط إن كانت الجداول فارغة. */
export const BLOG_DEFAULT_CATEGORIES: string[] = [
  "البحث العلمي",
  "الدراسة",
  "التعليم",
  "مهارات الطلاب",
  "نصائح دراسية",
  "مشاريع التخرج",
  "مقالات دينية",
  "الصلاة",
  "الصدق",
  "الأمانة",
  "الصدقة",
  "عام",
];

/** تحويل نص المقال إلى slug عربي-لاتيني مختصر. */
export function slugify(text: string): string {
  if (!text) return "";
  const replacements: Record<string, string> = {
    "أ": "a", "إ": "i", "آ": "a", "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j",
    "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
    "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "ة": "a", "و": "w", "ي": "y",
    "ى": "a", "ئ": "e", "ؤ": "w", " ": "-",
  };
  const latin = text.split("").map(ch => replacements[ch] ?? ch).join("");
  return latin
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160) || "article";
}

export async function listBlogCategories(): Promise<CategoryRow[]> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const rows = await db.select().from(blogCategories).orderBy(asc(blogCategories.sortOrder), desc(blogCategories.createdAt));
  return rows.map(row => ({
    id: Number(row.id),
    name: row.name,
    sortOrder: Number(row.sortOrder),
    isVisible: Boolean(row.isVisible),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function listBlogCategoriesPublic(): Promise<CategoryRow[]> {
  return (await listBlogCategories()).filter(c => c.isVisible);
}

export async function listBlogArticles(): Promise<ArticleRow[]> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const rows = await db.select().from(blogArticles).orderBy(asc(blogArticles.sortOrder), desc(blogArticles.createdAt));
  return rows.map(row => ({
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    author: row.author,
    publishedText: row.publishedText ?? "",
    categoryId: row.categoryId != null ? Number(row.categoryId) : null,
    categoryText: row.categoryText ?? null,
    imageKey: row.imageKey ?? null,
    imageUrl: row.imageUrl ?? null,
    sortOrder: Number(row.sortOrder),
    isVisible: Boolean(row.isVisible),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function listBlogArticlesPublic(input: { category?: number | null; search?: string } = {}): Promise<ArticleRow[]> {
  const categories = await listBlogCategoriesPublic();
  const visibleCategoryIds = new Set(categories.map(c => c.id));
  const articles = await listBlogArticles();
  const { search } = input;
  return articles.filter(article => {
    if (!article.isVisible) return false;
    if (input.category != null) {
      if (!article.categoryId || !visibleCategoryIds.has(article.categoryId)) return false;
      if (article.categoryId !== input.category) return false;
    } else if (!article.categoryId || !visibleCategoryIds.has(article.categoryId)) {
      return false;
    }
    if (search && search.trim()) {
      const needle = search.trim().toLowerCase();
      const haystack = `${article.title} ${article.summary ?? ""} ${article.categoryText ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    }
    return true;
  });
}

export async function getBlogArticleBySlug(slug: string): Promise<ArticleRow | null> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const row = (await db.select().from(blogArticles).where(eq(blogArticles.slug, slug)).limit(1))[0];
  if (!row) return null;
  const article: ArticleRow = {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    author: row.author,
    publishedText: row.publishedText ?? "",
    categoryId: row.categoryId != null ? Number(row.categoryId) : null,
    categoryText: row.categoryText ?? null,
    imageKey: row.imageKey ?? null,
    imageUrl: row.imageUrl ?? null,
    sortOrder: Number(row.sortOrder),
    isVisible: Boolean(row.isVisible),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  return article;
}

export async function getBlogCategoryById(id: number): Promise<CategoryRow | null> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const row = (await db.select().from(blogCategories).where(eq(blogCategories.id, id)).limit(1))[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    sortOrder: Number(row.sortOrder),
    isVisible: Boolean(row.isVisible),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** التأكد من عدم وجود مقالة مخفية بـ slug مكرر. */
async function assertArticleBySlug(id: number, slug: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const existing = await db.select({ id: blogArticles.id }).from(blogArticles).where(eq(blogArticles.slug, slug)).limit(1);
  if (existing[0] && existing[0].id !== id) {
    throw new TRPCError({ code: "CONFLICT", message: "يوجد مقال آخر بنفس الرابط، غيّر العنوان قليلًا" });
  }
}

export async function createBlogCategory(input: { name: string; sortOrder?: number; isVisible?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const name = String(input.name).trim().slice(0, 120);
  if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "اسم التصنيف مطلوب" });
  const result = await db.insert(blogCategories).values({
    name,
    sortOrder: input.sortOrder ?? 0,
    isVisible: input.isVisible ?? true,
  });
  return { id: Number(result[0].insertId), name };
}

export async function updateBlogCategory(id: number, input: Partial<{ name: string; sortOrder: number; isVisible: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = String(input.name).trim().slice(0, 120);
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isVisible !== undefined) updates.isVisible = Boolean(input.isVisible);
  if (Object.keys(updates).length > 0) {
    await db.update(blogCategories).set(updates).where(eq(blogCategories.id, id));
  }
  return { success: true } as const;
}

export async function deleteBlogCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const count = await db.select({ count: blogArticles.id }).from(blogArticles).where(eq(blogArticles.categoryId, id)).limit(1);
  if (count.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن حذف التصنيف لأنه مرتبط بمقالات؛ انقل المقالات لتصنيف آخر أولًا أو أخفِ التصنيف" });
  }
  await db.delete(blogCategories).where(eq(blogCategories.id, id));
  return { success: true } as const;
}

export async function setBlogCategoryVisibility(id: number, isVisible: boolean) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.update(blogCategories).set({ isVisible }).where(eq(blogCategories.id, id));
  return { success: true } as const;
}

export async function moveBlogCategory(id: number, direction: 1 | -1) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const row = (await db.select().from(blogCategories).where(eq(blogCategories.id, id)).limit(1))[0];
  if (!row) return { success: false as const };
  const neighbors = await db.select().from(blogCategories).orderBy(asc(blogCategories.sortOrder), desc(blogCategories.createdAt));
  const index = neighbors.findIndex(n => n.id === row.id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= neighbors.length) return { success: false as const };
  const [current, other] = [neighbors[index], neighbors[target]];
  await db.update(blogCategories).set({ sortOrder: other.sortOrder }).where(eq(blogCategories.id, current.id));
  await db.update(blogCategories).set({ sortOrder: current.sortOrder }).where(eq(blogCategories.id, other.id));
  return { success: true as const };
}

export async function createBlogArticle(input: {
  title: string;
  summary?: string;
  body?: string;
  author?: string;
  publishedText?: string;
  categoryId?: number | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const title = String(input.title).trim();
  if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "عنوان المقال مطلوب" });
  let slug = slugify(title);
  let suffix = "";
  for (let attempt = 0; attempt < 100; attempt++) {
    await assertArticleBySlug(-1, slug + suffix);
    const result = await db.insert(blogArticles).values({
      title: title.slice(0, 300),
      slug: (slug + suffix).slice(0, 320),
      summary: input.summary ?? null,
      body: input.body ?? null,
      author: input.author ? String(input.author).slice(0, 160) : "فريق واجبات بلس",
      publishedText: input.publishedText ?? null,
      categoryId: input.categoryId ?? null,
      categoryText: null,
      imageKey: input.imageKey ?? null,
      imageUrl: input.imageUrl ?? null,
      sortOrder: input.sortOrder ?? 0,
      isVisible: input.isVisible ?? true,
    });
    if (result[0]?.insertId) {
      const category = input.categoryId ? await getBlogCategoryById(input.categoryId) : null;
      return { id: Number(result[0].insertId), slug: (slug + suffix).slice(0, 320), categoryName: category?.name ?? null };
    }
    suffix = `-${attempt + 2}`;
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء المقال" });
}

export async function updateBlogArticle(id: number, input: {
  title?: string;
  summary?: string | null;
  body?: string | null;
  author?: string;
  publishedText?: string | null;
  categoryId?: number | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = String(input.title).trim();
    if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "عنوان المقال مطلوب" });
    updates.title = title.slice(0, 300);
    updates.slug = slugify(title).slice(0, 320);
  }
  if (input.summary !== undefined) updates.summary = input.summary ?? null;
  if (input.body !== undefined) updates.body = input.body ?? null;
  if (input.author !== undefined) updates.author = String(input.author).slice(0, 160);
  if (input.publishedText !== undefined) updates.publishedText = input.publishedText || null;
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (input.imageKey !== undefined) updates.imageKey = input.imageKey;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isVisible !== undefined) updates.isVisible = Boolean(input.isVisible);
  if (Object.keys(updates).length > 0) {
    if (updates.slug) await assertArticleBySlug(id, updates.slug as string);
    await db.update(blogArticles).set(updates).where(eq(blogArticles.id, id));
  }
  return { success: true } as const;
}

export async function deleteBlogArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.delete(blogArticles).where(eq(blogArticles.id, id));
  return { success: true } as const;
}

export async function setBlogArticleVisibility(id: number, isVisible: boolean) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.update(blogArticles).set({ isVisible }).where(eq(blogArticles.id, id));
  return { success: true } as const;
}

export async function moveBlogArticle(id: number, direction: 1 | -1) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const row = (await db.select().from(blogArticles).where(eq(blogArticles.id, id)).limit(1))[0];
  if (!row) return { success: false as const };
  const neighbors = await db.select().from(blogArticles).orderBy(asc(blogArticles.sortOrder), desc(blogArticles.createdAt));
  const index = neighbors.findIndex(n => n.id === row.id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= neighbors.length) return { success: false as const };
  const [current, other] = [neighbors[index], neighbors[target]];
  await db.update(blogArticles).set({ sortOrder: other.sortOrder }).where(eq(blogArticles.id, current.id));
  await db.update(blogArticles).set({ sortOrder: current.sortOrder }).where(eq(blogArticles.id, other.id));
  return { success: true as const };
}

/**
 * هجرة لمرة واحدة: نسخ المقالات الست الحالية من content_collections (articles)
 * إلى جداول المدونة الجديدة مع مطابقة التصنيفات، دون فقدان أي محتوى.
 */
export async function migrateLegacyBlogArticles(): Promise<{ migrated: boolean; counts: { categories: number; articles: number } }> {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const existingArticles = await db.select({ id: blogArticles.id }).from(blogArticles);
  if (existingArticles.length > 0) return { migrated: false, counts: { categories: 0, articles: 0 } };
  const existingCategories = await listBlogCategories();
  if (existingCategories.length === 0) {
    for (let index = 0; index < BLOG_DEFAULT_CATEGORIES.length; index++) {
      await db.insert(blogCategories).values({ name: BLOG_DEFAULT_CATEGORIES[index], sortOrder: index, isVisible: true });
    }
  }
  const categories = await listBlogCategories();
  const byName = new Map(categories.map(c => [c.name, c.id]));
  const { contentCollections } = await import("../drizzle/schema");
  const collection = (await db.select().from(contentCollections).where(eq(contentCollections.collectionKey, "articles")).limit(1))[0];
  if (!collection?.content) return { migrated: false, counts: { categories: categories.length, articles: 0 } };
  let items: unknown[] = [];
  try {
    items = JSON.parse(String(collection.content));
  } catch {
    return { migrated: false, counts: { categories: categories.length, articles: 0 } };
  }
  if (!Array.isArray(items)) return { migrated: false, counts: { categories: categories.length, articles: 0 } };
  let count = 0;
  for (let index = 0; index < items.length; index++) {
    const item = items[index] as Record<string, unknown>;
    if (!item || typeof item !== "object") continue;
    const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : `مقال رقم ${index + 1}`;
    const categoryText = typeof item.category === "string" ? item.category.trim() : "";
    let categoryId: number | null = null;
    if (categoryText) {
      categoryId = byName.get(categoryText) ?? byName.get("عام") ?? null;
    }
    let slug = slugify(title);
    const baseSlug = slug;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        await assertArticleBySlug(-1, slug);
        await db.insert(blogArticles).values({
          title: title.slice(0, 300),
          slug: slug.slice(0, 320),
          summary: typeof item.summary === "string" ? (item.summary || null) : null,
          body: typeof item.body === "string" ? (item.body || null) : null,
          author: "فريق واجبات بلس",
          publishedText: typeof item.publishedText === "string" ? (item.publishedText || null) : null,
          categoryId,
          categoryText: categoryText || null,
          sortOrder: Number(item.sortOrder ?? index) || 0,
          isVisible: Boolean(item.isVisible ?? true),
        });
        count += 1;
        break;
      } catch (error) {
        slug = `${baseSlug}-${attempt + 2}`;
        if (attempt === 99) throw error;
      }
    }
  }
  return { migrated: true, counts: { categories: categories.length, articles: count } };
}

export const blogCategoryRowSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().max(120),
  sortOrder: z.number().int(),
  isVisible: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const blogArticleRowSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().max(300),
  slug: z.string().max(320),
  summary: z.string().nullable(),
  body: z.string().nullable(),
  author: z.string().max(160),
  publishedText: z.string(),
  categoryId: z.number().int().nullable(),
  categoryText: z.string().nullable(),
  imageKey: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number().int(),
  isVisible: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CategoryRow = z.infer<typeof blogCategoryRowSchema>;
export type ArticleRow = z.infer<typeof blogArticleRowSchema>;

const blogCategoryCreateInput = z.object({
  name: z.string().min(1).max(120),
});

const blogCategoryUpdateInput = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120).optional(),
  isVisible: z.boolean().optional(),
});

const blogCategoryMoveInput = z.object({
  id: z.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

export const blogArticleCreateInput = z.object({
  title: z.string().min(1).max(300),
  summary: z.string().max(6000).optional(),
  body: z.string().max(200000).optional(),
  author: z.string().min(1).max(160).optional(),
  publishedText: z.string().max(60).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  imageKey: z.string().max(512).nullable().optional(),
  imageUrl: z.string().max(2000).nullable().optional(),
});

export const blogArticleUpdateInput = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(300).optional(),
  summary: z.string().max(6000).nullable().optional(),
  body: z.string().max(200000).nullable().optional(),
  author: z.string().min(1).max(160).optional(),
  publishedText: z.string().max(60).nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  imageKey: z.string().max(512).nullable().optional(),
  imageUrl: z.string().max(2000).nullable().optional(),
});

const blogArticleIdInput = z.object({ id: z.number().int().positive() });

const blogArticleMoveInput = z.object({
  id: z.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

async function withArticle(id: number, action: () => Promise<unknown>) {
  const articles = await listBlogArticles();
  if (!articles.find(a => a.id === id)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "المقال غير موجود" });
  }
  return action();
}

async function withCategory(id: number, action: () => Promise<unknown>) {
  if (!(await getBlogCategoryById(id))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "التصنيف غير موجود" });
  }
  return action();
}

export const blogRouter = router({
  /** القائمة العامة الظاهرة لموقع الزائر مع بحث وتصفية. */
  publicList: publicProcedure.input(z.union([z.object({
    category: z.number().int().positive().nullable().optional(),
    search: z.string().max(200).optional(),
  }), z.null()]).optional()).query(async ({ input }) => {
    void migrateLegacyBlogArticles().catch(() => {});
    const opts = (input && typeof input === "object") ? input : {};
    const [categories, articles] = await Promise.all([
      listBlogCategoriesPublic(),
      listBlogArticlesPublic(opts),
    ]);
    return {
      categories: categories.map(({ id, name, sortOrder, isVisible }) => ({ id, name, sortOrder, isVisible })),
      articles: articles.map(({ imageKey, ...rest }) => rest),
    };
  }),

  /** تفاصيل مقال برابطه العام حتى للمخفي (للمالك في المعاينة)، أو الظاهر للزائر. */
  bySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(320) })).query(async ({ input }) => {
    const article = await getBlogArticleBySlug(input.slug);
    if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "المقال غير موجود" });
    return { article };
  }),

  categories: ownerProcedure.query(async () => {
    void migrateLegacyBlogArticles().catch(() => {});
    return { categories: await listBlogCategories() };
  }),

  articles: ownerProcedure.query(async () => {
    void migrateLegacyBlogArticles().catch(() => {});
    return { articles: await listBlogArticles() };
  }),

  createCategory: ownerProcedure.input(blogCategoryCreateInput).mutation(async ({ input }) => {
    const result = await createBlogCategory(input);
    await recordAdminAudit("blog_category_created", "blog_category", String(result.id), input);
    return result;
  }),

  updateCategory: ownerProcedure.input(blogCategoryUpdateInput).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    await withCategory(id, async () => {});
    await updateBlogCategory(id, updates);
    await recordAdminAudit("blog_category_updated", "blog_category", String(id), updates);
    return { success: true };
  }),

  deleteCategory: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await withCategory(input.id, async () => {});
    await deleteBlogCategory(input.id);
    await recordAdminAudit("blog_category_deleted", "blog_category", String(input.id));
    return { success: true };
  }),

  uploadArticleImage: ownerProcedure.input(z.object({ id: z.number().int().positive(), mimeType: z.string().min(1).max(120), dataUrl: z.string().min(1).max(4_300_000) })).mutation(async ({ input }) => {
    const image = decodeAdminImage(input.dataUrl, input.mimeType);
    const storageKey = `wajbat-plus/blog-articles/${input.id}.${image.extension}`;
    return storagePut(storageKey, image.bytes, input.mimeType);
  }),

  setCategoryVisibility: ownerProcedure.input(z.object({ id: z.number().int().positive(), isVisible: z.boolean() })).mutation(async ({ input }) => {
    await withCategory(input.id, async () => {});
    await setBlogCategoryVisibility(input.id, input.isVisible);
    await recordAdminAudit("blog_category_visibility_changed", "blog_category", String(input.id), input);
    return { success: true };
  }),

  moveCategory: ownerProcedure.input(blogCategoryMoveInput).mutation(async ({ input }) => {
    await withCategory(input.id, async () => {});
    const result = await moveBlogCategory(input.id, input.direction === "up" ? 1 : -1);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر تغيير ترتيب التصنيف" });
    await recordAdminAudit("blog_category_reordered", "blog_category", String(input.id), input);
    return result;
  }),

  createArticle: ownerProcedure.input(blogArticleCreateInput).mutation(async ({ input }) => {
    const result = await createBlogArticle(input);
    await recordAdminAudit("blog_article_created", "blog_article", String(result.id), { title: input.title });
    return result;
  }),

  updateArticle: ownerProcedure.input(blogArticleUpdateInput).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    await withArticle(id, async () => {});
    await updateBlogArticle(id, updates);
    await recordAdminAudit("blog_article_updated", "blog_article", String(id), Object.keys(updates));
    return { success: true };
  }),

  deleteArticle: ownerProcedure.input(blogArticleIdInput).mutation(async ({ input }) => {
    await withArticle(input.id, async () => {});
    await deleteBlogArticle(input.id);
    await recordAdminAudit("blog_article_deleted", "blog_article", String(input.id));
    return { success: true };
  }),

  setArticleVisibility: ownerProcedure.input(z.object({ id: z.number().int().positive(), isVisible: z.boolean() })).mutation(async ({ input }) => {
    await withArticle(input.id, async () => {});
    await setBlogArticleVisibility(input.id, input.isVisible);
    await recordAdminAudit("blog_article_visibility_changed", "blog_article", String(input.id), input);
    return { success: true };
  }),

  moveArticle: ownerProcedure.input(blogArticleMoveInput).mutation(async ({ input }) => {
    await withArticle(input.id, async () => {});
    const result = await moveBlogArticle(input.id, input.direction === "up" ? 1 : -1);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر تغيير ترتيب المقال" });
    await recordAdminAudit("blog_article_reordered", "blog_article", String(input.id), input);
    return result;
  }),

  seedDefaultCategories: ownerProcedure.mutation(async () => {
    const categories = await listBlogCategories();
    if (categories.length > 0) return { seeded: false, count: categories.length };
    for (let index = 0; index < BLOG_DEFAULT_CATEGORIES.length; index++) {
      await seedBlogCategory(blogCategories, { name: BLOG_DEFAULT_CATEGORIES[index], sortOrder: index, isVisible: true });
    }
    await recordAdminAudit("blog_categories_seeded", "blog_category", undefined, { count: BLOG_DEFAULT_CATEGORIES.length });
    return { seeded: true, count: BLOG_DEFAULT_CATEGORIES.length };
  }),
});

/** إدراج تصنيف مباشر بمحددات صريحة. */
async function seedBlogCategory(table: typeof blogCategories, values: { name: string; sortOrder: number; isVisible: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  await db.insert(table).values(values);
}
