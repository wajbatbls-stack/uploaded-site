import { describe, expect, it, vi, afterEach } from "vitest";
import { slugify, BLOG_DEFAULT_CATEGORIES, migrateLegacyBlogArticles } from "./blog";
import * as blogDb from "./blog";
import { getBlogArticleBySlug, listBlogArticlesPublic } from "./blog";

/** متعاون وهمي لقاعدة البيانات: لا نصل لقاعدة البيانات الفعلية في الاختبارات. */
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => mockDb as unknown),
    recordAdminAudit: vi.fn(async () => {}),
  };
});

const drizzleInsertResult = [{ insertId: BigInt(1) }] as any;

let pendingRows: unknown[] | null = null;

/** سلسلة قابلة للانتظار (تُرجع pendingRows أو []) وتقبل where/orderBy/limit للتفرع. */
const chainBase: any = {
  where: vi.fn(() => chainBase),
  orderBy: vi.fn(() => chainBase),
  limit: vi.fn(async () => (pendingRows ?? [])),
  then(resolve: any, reject: any) {
    return Promise.resolve(pendingRows ?? []).then(resolve, reject);
  },
};
const emptyChain = chainBase;

/** تجهيز صفوف وهمية لآخر select قادم (مثال للمقالات الموجودة في اختبار الهجرة). */
function stubNextRows(rows: unknown[]) {
  pendingRows = rows;
}

const mockDb = {
  insert: vi.fn(() => ({ values: vi.fn(async () => drizzleInsertResult) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
  delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
  select: vi.fn(() => ({
    from: vi.fn(() => emptyChain),
  })),
  from: vi.fn(() => emptyChain),
} as any;

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => mockDb) }));

afterEach(() => {
  pendingRows = null;
  vi.clearAllMocks();
});

vi.mock("../drizzle/schema", async () => {
  const actual = await vi.importActual("../drizzle/schema");
  return {
    ...actual,
    blogCategories: {
      id: { id: "blog_categories.id" },
      name: "name",
      sortOrder: "sortOrder",
      isVisible: "isVisible",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    blogArticles: {
      id: { id: "blog_articles.id" },
      title: "title",
      slug: "slug",
      summary: "summary",
      body: "body",
      author: "author",
      publishedText: "publishedText",
      categoryId: "categoryId",
      categoryText: "categoryText",
      imageKey: "imageKey",
      imageUrl: "imageUrl",
      sortOrder: "sortOrder",
      isVisible: "isVisible",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  };
});

describe("slugify", () => {
  it("يحوّل عنوانًا عربيًا إلى slug لاتيني", () => {
    expect(slugify("أهمية الصلاة في حياة المسلم")).toBe("ahmya-alslaa-fy-hyaa-almslm");
  });

  it("ينظف الرموز غير الصالحة ويحد الطول", () => {
    const long = "م".repeat(300);
    expect(slugify(long).length).toBeLessThanOrEqual(160);
    expect(slugify("عنوان @ خاص # 2026!")).toBe("anwan-khas-2026");
  });

  it("يعيد fallback عند نص فارغ", () => {
    expect(slugify("")).toBe("");
  });
});

describe("blog db helpers", () => {
  it("تصدير الدوال الأساسية دون أخطاء", () => {
    expect(typeof blogDb.listBlogCategories).toBe("function");
    expect(typeof blogDb.listBlogCategoriesPublic).toBe("function");
    expect(typeof blogDb.listBlogArticles).toBe("function");
    expect(typeof blogDb.listBlogArticlesPublic).toBe("function");
    expect(typeof blogDb.getBlogArticleBySlug).toBe("function");
    expect(typeof blogDb.getBlogCategoryById).toBe("function");
    expect(typeof blogDb.createBlogCategory).toBe("function");
    expect(typeof blogDb.updateBlogCategory).toBe("function");
    expect(typeof blogDb.deleteBlogCategory).toBe("function");
    expect(typeof blogDb.createBlogArticle).toBe("function");
    expect(typeof blogDb.updateBlogArticle).toBe("function");
    expect(typeof blogDb.deleteBlogArticle).toBe("function");
    expect(typeof blogDb.migrateLegacyBlogArticles).toBe("function");
    expect(Array.isArray(BLOG_DEFAULT_CATEGORIES)).toBe(true);
    expect(BLOG_DEFAULT_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("getBlogArticleBySlug يعيد المقال المطابق لـ slug", async () => {
    stubNextRows([{ id: 42, slug: "test-slug", title: "مقال تجريبي", isVisible: true }]);
    const article = await getBlogArticleBySlug("test-slug");
    expect(article?.id).toBe(42);
    expect(article?.slug).toBe("test-slug");
  });

  it("getBlogArticleBySlug يعيد null عند عدم وجود مقال", async () => {
    pendingRows = null;
    const article = await getBlogArticleBySlug("missing-slug");
    expect(article).toBeNull();
  });

  it("listBlogArticlesPublic يستدعي orderBy على الجدول", async () => {
    const publicList = await listBlogArticlesPublic();
    expect(mockDb.select).toHaveBeenCalled();
    expect(emptyChain.orderBy).toHaveBeenCalled();
    expect(Array.isArray(publicList)).toBe(true);
  }, 10_000);
});

describe("blog migration", () => {
  it("migrateLegacyBlogArticles لا يزرع عند عدم توفر قاعدة البيانات", async () => {
    const result = await migrateLegacyBlogArticles().catch(() => ({ migrated: false }));
    expect(result.migrated).toBe(false);
  });

  it("migrateLegacyBlogArticles لا يزرع عند وجود مقالات فعلية", async () => {
    stubNextRows([{ id: 99 }]);
    const result = await migrateLegacyBlogArticles();
    expect(result.migrated).toBe(false);
    expect(mockDb.insert).not.toHaveBeenCalled();
  }, 10_000);
});
