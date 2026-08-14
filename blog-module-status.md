# حالة تطوير «إدارة المدونة الأكاديمية» — جلسة 2026-08-14

المواصفات الكاملة في /home/ubuntu/upload/pasted_content_15.txt (670 سطرًا): 25 بندًا — تصنيفات مدارة بالكامل (12 تصنيفًا أوليًا)، إضافة مقال (عنوان/ملخص/محتوى كامل بمحرر/صورة تُرفع من الجهاز/تصنيف/كاتب/تاريخ/حالة/ترتيب)، تعديل/حذف بإلغاء-تأكيد، إظهار/إخفاء، ترتيب، بحث (عنوان/ملخص/تصنيف)، تصفية بالتصنيف، بطاقات احترافية (صورة/تصنيف/عنوان/ملخص/كاتب/تاريخ/اقرأ المزيد)، صفحة مقال كاملة (رابط مستقل مثل #/blog/articles/...) مع أزرار مشاركة (واتساب/X/Facebook/Telegram — بدون إظهار رقم المالك) وزر «← العودة إلى المدونة»، معاينة قبل النشر، صلاحيات مالك فقط، عدم حذف أي محتوى حالي.

## تدقيق الحالة الحالية (مكتمل)

### المدونة الحالية
- `content_collections` جدول واحد لكل المجموعات؛ مجموعة `articles` موجودة فيها 6 مقالات حقيقية (sortOrder 0-5، الحقول: sortOrder/title/category/publishedText/summary/body/isVisible). منها «مقال جديد» فارغ.
- `server/db.ts` سطور 141-180: SITE_SEED + listCollections + saveCollection (بـ ownerProcedure، يحفظ snapshot في siteDesignHistory قبل التعديل — نظام استعادة موجود).
- `server/routers.ts` سطر 376: `admin.saveCollection`؛ سطر 421 استعادة نسخ احتياطي.
- `site-app-r13.js` سطر 253: المحتوى يُحمّل من site.content عبر site.content.publicList؛ المقالات: ARTICLES = {id, title, category, date, summary, content} من sortOrder.
- `blogPage()` سطر 487: التصنيفات ثابتة بالكود ["الكل","البحث العلمي","نصائح دراسية","مشاريع تخرج"]، لا بحث، البطاقة coverها «▤» (لا صورة)، meta يعرض التاريخ والتصنيف.
- `articleModal()` سطر 492: نافذة منبثقة تعرض المحتوى، مشاركة تويتر وواتساب فقط.
- `data-action="open-article"` سطر 723: يفتح النافذة ويسجل عرض `/blog/articles/{id}` (id هو فهرس المصفوفة!).
- لا يوجد قسم إدارة مدونة في لوحة المالك admin-app-r21.js (المدونة موجودة ضمن content editor في settings فقط عبر saveCollection).

### بنية نمط المشاريع السابقة (للاستفادة)
- جداول: نمط download_categories/download_files أو contact_* (id, sortOrder, isVisible, ...).
- رفع الصور: نفس نمط contact: `storagePut` في الخادم + API.uploadImage من المدير، 4MB حد.
- مدير vanilla JS نمط `WajbatContactManager`: `admin-contact-manager-r4.js` مع activate()/renderInto() وبصمات.
- site-app يستخدم managedContact من site.contact.publicList — نمط مشابه للـ blog: نضيف site.blog.publicList.
- الاختبار نمط downloadsAssets.test.ts: يتحقق من أسماء الملفات المصدَّرة (site-app-r13.js → يجب تحديثه إلى إصدار جديد عند تغيير اسم الملف).
- auto-publish مفعّل؛ checkpoint = نشر فوري.
- روابط: https://uploadplus-47dkogbk.manus.space | /admin | ADMIN_EMAIL bdalslamanwralajsh@gmail.com / abd77312.

## الخطة التقنية المقترحة
1. جداول جديدة: blog_categories (id/name/slug?/isVisible/sortOrder) + blog_articles (id/title/slug/summary/body/author/publishedText/categoryId/sortOrder/isVisible/imageUrl) في drizzle/schema.ts + migrate + webdev_execute_sql.
2. server/blog.ts router جديد: admin.blog (categories CRUD + articles CRUD + visibility + move + uploadImage) + site.blog (publicList: يقبل category filter + query للبحث، يرجع مقالات ظاهرة فقط + تصنيفات ظاهرة).
3. هجرة: قراءة مجموعة articles الحالية وتحويلها إلى الجداول الجديدة دون حذف (مع ملاحظة أن تصنيفات المقالات الحالية نصية — نُبقي حقل categoryText احتياطيًا أو نطابق مع التصنيفات).
4. مدير لوحة المالك admin-blog-manager-r1.js + بصمة جديدة لـ admin-app-r22.js مع قسم «إدارة المدونة» (نمط navSections: blog) + admin.html.
5. site-app-r14.js: blogPage ديناميكي (بحث + تصفية + بطاقات بصورة) + blogArticlePage() برابط #/blog/articles/{id} (بدل modal) + أزرار مشاركة 4 + زر عودة.
6. تحديث اختبارات الأصول للرموز الجديدة + 68 اختبار + build + checkpoint.

## بنود todo.md لهذا التطوير (ستُضاف كـ [ ])
تصنيفات: إضافة/تعديل/حذف/إظهار/إخفاء/ترتيب، ليست ثابتة بالكود.
مقالات: إضافة (9 حقول) / تعديل / حذف بتأكيد / إظهار-إخفاء / ترتيب / رفع صورة معاينة-استبدال-حذف / الكاتب / التاريخ.
الزائر: بحث، تصفية، بطاقات (صورة/تصنيف/عنوان/ملخص/كاتب/تاريخ/اقرأ المزيد)، صفحة كاملة، مشاركة 4 منصات (رابط المقال لا رقم المالك)، رابط مستقل لكل مقال، زر عودة للمدونة.
صلاحيات: مالك فقط للإدارة. عدم حذف المحتوى الحالي. حفظ دائم DB.

## تقدم التنفيذ (2026-08-14)

### منجز
- schema.ts: أضيف blog_categories + blog_articles (مع categoryText احتياطي + slug) ✓
- الترحيل: drizzle/0012_sour_bloodstorm.sql + طُبق عبر webdev_execute_sql ✓ (الجداول + 5 إنديكسات)
- server/blog.ts كُتب: router blog (publicList/bySlug + categories/articles + CRUD تصنيفات ومقالات + visibility + move + seedDefaultCategories + migrateLegacyBlogArticles) — أخطاء TS متبقية: dbInsert في seedDefaultCategories (Record<string,unknown>) يجب تبسيطه إلى db.insert(blogCategories).values({name, sortOrder, isVisible}) مباشرة (drizzle يحتاج كائن typed).
- لم يُربط blogRouter بعد في routers.ts — يجب import { blogRouter } من server/blog وإضافة blog: blogRouter داخل admin و site routers (sخط 346: visitorTargetPath z.enum; سطر 350: contact: contactRouter — تحقق exact location قبل التعديل).
- todo.md: بنود المدونة أُضيفت في نهايته (كلها [ ] حتى الآن).

### خطوات متبقية (المرحلة 2 → 5)
1. إصلاح dbInsert في server/blog.ts.
2. ربط blogRouter في routers.ts (admin.blog و site.blog) — استخدم publicProcedure لـ publicList وbySlug.
3. رفع صورة: admin.uploadImage موجود (storagePut "wajbat-plus/admin-images/logo.{ext}") — نفضل مسار خاص blog مثل blog/article-123.png: استخدم storagePut مباشرة من adminUpload.decodeAdminImage + storagePut في blog router? الأسهل: في مدير الواجهة نرفع عبر admin.uploadImage ثم نحفظ imageUrl — لا، هذا سيكتب فوق logo.png! استخدم storagePut من blog router بنفس نمط contact (contact يستخدم /api/trpc/admin.uploadImage الذي يكتب logo — لكن contact يعمل فعليًا... يبدوا أن كل مدير يكتب فوق نفس الملف — مقبول أو استخدم blog/articles/{id}). الحل: أضيف blog.uploadArticleImage في blogRouter: decodeAdminImage + storagePut("wajbat-plus/admin-images/blog-article.{ext}",...) — كل مقال له ملفه.
4. اختبار vitest جديد server/blog.test.ts (تصنيفات CRUD + مقالات + بحث public + هجرة legacy).
5. المدير: admin-blog-manager-r1.js بنمط admin-contact-manager-r4.js (API endpoints admin.blog.* + admin.blog.uploadArticleImage + بصمة). ثم admin-app-r22.js: قسم «إدارة المدونة الأكاديمية» في navSections (راجع كيف أُضيف contact في admin-app-r21.js: grep "contact" في admin-app-r21.js لأخذ النمط) + admin.html إشارة admin-app-r22.js.
6. الزائر: site-app-r14.js: blogPage ديناميكي + blogArticlePage (#/blog/articles/{slug}) مشاركة 4 منصات + زر عودة + البحث/التصفية. تحديث بصمة في index.html.
7. تحديث اختبارات الأصول (ownerLoginR13Assets.test.ts? downloadsAssets/visitorLinksAssets test للأسماء r13→r14). pnpm test + build + checkpoint.
8. تسليم: https://uploadplus-47dkogbk.manus.space | /admin

### ملاحظات نمط مهمة
- admin-app-r21.js يحمّل المديريات بنمط: `if (section === "contact") return WajbatContactManager.activate(...)` مع API URLs "/api/trpc/admin.contact.*" و auth token من localStorage.
- site-app-r13.js: تحميل publicList في سطر ~240: `const content = await site.content.publicList(...)` ثم visible() وفرز. ARTICLES تُبنى من content.articles.
- recordContentView(path) موجود في site-app يسجل زيارات.
- storagePut مستورد في routers.ts؛ import من storage.ts (storagePut).
- decodeAdminImage من adminUpload.ts.

## تقدم تقني محدث (مرحلة الخادم - شبه منجزة)

### مكتمل في الخادم
- server/blog.ts: كامل router (publicList/bySlug/categories/articles + CRUD تصنيفات ومقالات + visibility + move + seedDefaultCategories + migrateLegacyBlogArticles + uploadArticleImage) — TS نظيف ✓
- routers.ts: blogRouter مربوط في site.blog و admin.blog (import في الأعلى سطر 24-26) ✓
- server/blog.test.ts: 9 اختبارات، 7 ناجحة. المتبقي: اختباران يفشلان بـ "rows.map is not a function" في listBlogCategories لأن await على async fn مع Object.assign properties يرجع fn نفسها (JS quirk: await على async function يعيد resolved value لكن Object.assign يعيد الدالة نفسها عند التقييم؟ — السبب الحقيقي: emptyChain هو async fn + خصائص، await عليه يرجع [] لكن .orderBy() على emptyChain (الخاصية vi.fn) يرجع emptyChain ثم await يرجع []... لكن الخطأ يقول rows ليست مصفوفة في listBlogCategories سطر 48-49 — أي أن await db.select().from().orderBy(asc, desc) يرجع emptyChain نفسه! لأن orderBy الخاصية تعيد emptyChain لكن ثم await عليه... إذا rows = emptyChain! السبب: الكود يستدعي orderBy() ثم awaits — يجب أن يرجع []. لكن Object.assign(fn, props) حيث props.where=fn→self: عند await self، js resolves the promise returned by calling self — self() without call returns the fn object itself (async fn body لم يُنفذ). await على fn بدون استدعاء = fn itself! — الحل: اجعل emptyChain thenable عبر Symbol.asyncIterator أو الأسهل: اجعل orderBy يعيد Promise.resolve(emptyChain)? لا — الحل الصحيح: اجعل where/orderBy تعيد emptyChain الذي عنده then يعرف بـ Promise.resolve([]). أبسط: استبدل Object.assign بـ class أو اجعل emptyChain يحتوي then: () => Promise.resolve([]).class

### الحل المقترح لاختبارات blog.test.ts
اجعل emptyChain كائن عادي + then (thenable):
```ts
const chainBase: any = {
  where: vi.fn(() => chainBase),
  orderBy: vi.fn(() => chainBase),
  limit: vi.fn(async () => []),
  then: (resolve: any, reject: any) => Promise.resolve([]).then(resolve, reject),
};
```
- mockReturnValueOnce في اختبار getBlogArticleBySlug يجب أن يبقى على chainBase.where (يعيد object له limit) — مع thenable يصبح: where.mockReturnValueOnce(Object.assign({}, chainBase, {limit: vi.fn(async () => [{id:42...}])})).
- اختبار migrateLegacyBlogArticles: chainBase.limit.mockResolvedValueOnce([{id:99}]) يعمل.
- ملاحظة: chainBase.where/orderBy يعيدان chainBase نفسه (thenable دائم).

### ملفات المشروع الرئيسية الحالية
- admin-app-r21.js, admin-contact-manager-r4.js, site-app-r13.js (آخر checkpoint: 8eb0750d)
- client/public/index.html يشير admin-app-r21.js
- site-app-r13.js: blogPage وblogArticlePage موجودة (ARTICLES من content) — ستُستبدل بـ site-app-r14.js
- todo.md بنود المدونة أُضيفت في النهاية (كلها [ ])
- النطاق: https://uploadplus-47dkogbk.manus.space | /admin = owner login: bdalslamanwralajsh@gmail.com / abd77312

## نمط مديري الإدارة (Vanilla JS) للمرجعية

مديرو الإدارة الحاليون: admin-contact-manager-r4.js، admin-downloads-manager-r2.js. الأنماط الأساسية:
- كائن API بالمسارات `/api/trpc/admin.contact.*` و`/api/trpc/admin.uploadImage` للرفع (multipart مع file + key).
- استدعاء الإجراءات عبر fetch مع `credentials: "same-origin", cache: "no-store"` وinput بصيغة superjson JSON: `JSON.stringify({ json: input })` و`Content-Type: application/json`.
- الاستجابة: `res.json()` ثم `data.result.data` للنجاح (superjson).
- النمط المعماري: IIFE `(function(){...})()` مع `activate()` و`renderInto(container)`، يُسجّل عالميًا `window.WajbatContactManager = { activate, renderInto }`.
- admin-app-r21.js يحمل manager modules: `window.WajbatContactManager` و`window.WajbatDownloadsManager`؛ الاستدعاء عبر mountCompatibleVisitorLinksManager ونمط renderInto داخل قسم.

## قرارات مدير المدونة الجديد
- الملف: client/public/assets/js/admin-blog-manager-r1.js (بصمة r1) + تحديث admin-app-r21.js (إضافة script tag وإدراج قسم "إدارة المدونة الأكاديمية" في التنقل — يجب فحص قسم blog الحالي في admin-app-r21.js أولًا لتفادي تعارض).
- الإجراءات: admin.blog.listCategories / listCategoriesPublic / createCategory / updateCategory / deleteCategory / seedDefaultCategories / listArticles / listArticlesPublic / bySlug / createArticle / updateArticle / deleteArticle / setArticleVisibility / moveArticle / uploadArticleImage.
- رفع صورة المقال: admin.blog.uploadArticleImage (multipart: file + articleId) → storagePut.

## قرارات التكامل في لوحة المالك (مُثبتة)

admin.html يحمل المديرات بالتسلسل (script loader)؛ أضيف admin-blog-manager-r1.js بعد contactManager في المسارين (onload و onerror fallback) بصيغة: `blogManager.src = "/assets/js/admin-blog-manager-r1.js?v=blog-r1"; blogManager.async = false; blogManager.onload = () => { const contactManager = ... }; document.body.append(blogManager);`

admin-app-r21.js: (1) إضافة "blog" إلى مجموعة "المحتوى" في nav: `items: ["services", "plans", "downloads", "blog", "articles", "reviews", ...]`. (2) إضافة labels entry (labels[key] = [icon, title, description]) — يوجد labels في سطر 5. (3) إضافة mountCompatibleBlogManager على نمط mountCompatibleContactManager مع `[data-blog-workspace]` و`mountCompatibleBlogManager()` يستدعي `window.WajbatBlogManager.activate?.()`. (4) في contentWorkspace إضافة `if (key === "blog") { const w = mountCompatibleBlogManager(); if (w) return w; }`. (5) إزالة "articles" من مجموعة المحتوى القديمة (نقلها لمجموعة أخرى؟ لا — سنبقيها مخفية أو نحذفها: الحل: نُبقي "articles" لكن نجعل معالجها يعرض موجهًا للانتقال إلى "blog") — القرار: نُبقي articles في nav (تظهر كـ"المقالات القديمة") لكن معالجها يشير للجمهور الجديد؛ أو الأوضح: نجعل `blog` هو قسم "المقالات" الجديد ونبقي "articles" كما هو (القديم) دون المساس. الأفضل للمستخدم: نضع blog في المحتوى بجانب articles (اسم: "المدونة الأكاديمية" 📰).

نمط IIFE للمدير (متطابق مع admin-contact-manager): object `manager` فيه state/request(mutate via GET input)/mutate(POST)/esc/toast/window.WajbatBlogManager=manager؛ يُستدعى `manager.mountCompatible()` في نهاية الملف. request عبر GET `?input=encodeURIComponent(JSON.stringify({json:input}))` وPOST body `JSON.stringify({json:input})` — نفس نمط contact (superjson wrapper).

خادم: procedures في server/blog.ts تحت `blogRouter` = { categories: {...}, articles: {...} } — المسارات: admin.blog.listCategories, createCategory, updateCategory, deleteCategory, seedDefaultCategories, listArticles, createArticle, updateArticle, deleteArticle, setArticleVisibility, moveArticle, uploadArticleImage. publicList في site.blog.*.

## نمط mount الدقيق في admin-app-r21.js (للمدير الجديد)

نمط mountCompatibleContactManager (الأسطر 55-63):
```js
function mountCompatibleContactManager() {
  const manager = window.WajbatContactManager;
  if (state.selected !== "contact" || typeof manager?.activate !== "function") return null;
  queueMicrotask(() => {
    if (!document.querySelector("[data-contact-workspace]") || state.selected !== "contact") return;
    try { manager.activate(); } catch (error) { toast(messageOf(error)); }
  });
  return `<section class="workspace side-workspace" data-contact-workspace><div class="workspace-body"></div></section>`;
}
```

contentWorkspace (سطر 73) يبني: `if (key === "contact") { const managerWorkspace = mountCompatibleContactManager(); if (managerWorkspace) return managerWorkspace; }` قبل legacyContentWorkspace — أضيف block مماثل لـ key === "blog" مع `mountCompatibleBlogManager()` و`[data-blog-workspace]`.

المديرات تُحمّل بـ admin.html عبر script loader تسلسلي (onload nested) مع fallback على onerror — أضيف admin-blog-manager-r1.js بعد contactManager في كلا المسارين.

المشروع الآن في server/blog.ts (router categories+articles، uploadArticleImage عبر storagePut)، server/blog.test.ts (9 اختبارات ناجحة)، tables blog_categories/blog_articles مطبقة.

المتبقي في الخادم: لا شيء. المتبقي: مدير الإدارة admin-blog-manager-r1.js، ربطه في admin.html + admin-app-r21.js (nav "blog" في مجموعة المحتوى، labels، mountCompatibleBlogManager، contentWorkspace)، ثم site-app-r14.js: blogPage + articlePage ديناميكية من site.blog.publicList/bySlug بدل ARTICLES القديمة (مع بحث، تصفية تصنيف، بطاقات، صفحة كاملة، روابط #/blog/article/:slug مستقلة، مشاركة واتساب/تيليجرام/نسخ).

## مخططات الإدخال الدقيقة (server/blog.ts)

التصنيف: createCategory {name}, updateCategory {id, name?, isVisible?}, deleteCategory {id}, setCategoryVisibility {id, isVisible}, moveCategory {id, direction:"up"|"down"}, categories (query)، seedDefaultCategories (mutation بلا input).

المقال: createArticle {title, summary?, body?, author?, publishedText?, categoryId?, imageKey?, imageUrl?}. updateArticle {id, title?, summary?, body?, author?, publishedText?, categoryId?, imageKey?, imageUrl?}. deleteArticle/setArticleVisibility/moveArticle {id...} كما التوقع. uploadArticleImage {id, mimeType, dataUrl} → {key, url}.

publicList {category?, search?} → {categories[{id,name,sortOrder,isVisible}], articles[{...rest, imageKey excluded→ imageUrl}]}. bySlug {slug} → {article} (يشمل كل الحقول + imageUrl).

## تقدم المرحلة 3 (مدير لوحة المالك) — مكتمل

أُنشئ client/public/assets/js/admin-blog-manager-r1.js كاملًا: تبويبان (مقالات/تصنيفات)، CRUD كامل، رفع صور بحد 4MB، معاينة Markdown، نوافذ تأكيد داخلية، register: window.WajbatBlogManager + mountCompatible/autoBind.

## المتبقي الآن
1. admin.html: إضافة blogManager بعد contactManager في مسارَي onload/onerror (src="/assets/js/admin-blog-manager-r1.js?v=blog-r1").
2. admin-app-r21.js: (أ) labels: إضافة blog entry — فحص سطر 5 labels أولًا. (ب) nav: إضافة "blog" لمجموعة "المحتوى". (ج) mountCompatibleBlogManager على نمط contact (data-blog-workspace). (د) contentWorkspace: block لـ key==="blog". (هـ) تحديث بصمة الملف إلى admin-app-r22.js + تحديث admin.html المرجع.
3. site-app-r14.js: blogPage ديناميكية (site.blog.publicList) + صفحة مقال #/blog/article/:slug (bySlug) مع بحث وتصفية تصنيف ومشاركة (نسخ/واتساب/تيليجرام) بدل ARTICLES القديمة — مع بقاء backward fallback على ARTICLES القديمة حتى الهجرة.
4. اختبار vitest للبصمة الجديدة + pnpm build + checkpoint.

ملاحظة: أخطاء devserver المعروضة (17:03-17:04) قديمة — آخر تشغيل 17:07 نظيف 0 أخطاء.

## تقدم المرحلة 3 (مدير الإدارة) — مكتمل بالكامل

- admin-blog-manager-r1.js مكتوب في client/public/assets/js/ (window.WajbatBlogManager، mountCompatible/autoBind، container يُعين من admin-app، load() يستدعي admin.blog.categories + admin.blog.articles).
- admin.html: تم إدراج blogManager في مسار onload ومسار onerror بعد contactManager، + fallback بعد 4 ثوانٍ (retryBlog).
- admin-app-r22.js: نُسِخ من admin-app-r21.js المعدّل — labels["articles"] أصبحت "المدونة الأكاديمية"، nav محتوى أضيف "blog"، mountCompatibleBlogManager (container يُوضع على [data-blog-workspace] ثم load)، contentWorkspace block لـ key==="blog". admin.html يشير الآن إلى admin-app-r22.js?v=blog-r1.
- ملاحظة مهمة: admin-app-r21.js الأصلي (القديم) ما زال موجودًا — أي جلسة أخرى قد ترجع لـ r21.

## تصميم blogPage الأصلي في site-app-r13.js (الحفاظ عليه)
- الصفحة: container section + page-title "المدونة الأكاديمية" + page-intro + category-pills (btn btn-primary/active, btn-outline) + grid grid-3 + article-card (card) + article-modal (modal open).
- cats الحالية: ["الكل", "البحث العلمي", "نصائح دراسية", "مشاريع تخرج"] — يجب أن تصبح تصنيفات DB ديناميكية (categoryId/اسم) مع fallback على القديمة.
- article-card: cover "▤" (سأضيف imageUrl إن وُجدت)، article-meta (◷ تاريخ ◈ تصنيف)، h3 عنوان، p ملخص، btn btn-outline "اقرأ المزيد" data-action="open-article" data-article=id.
- articleModal: modal open مع modal-card، category chip btn btn-muted، تاريخ، h2، modal-content، share-row (تويتر + واتساب) — سأضيف نسخ الرابط + تيليجرام.
- state.article يُضبط عبر event delegation: `if (action === "open-article") {...recordContentView(`/blog/articles/${id}`)}` — سأنقله من ARTICLES إلى managedBlog.articles.
- render في /blog: route case "/blog": blogPage(); الحالة في site-app-r13.js render(): case "/blog" (سطر 612).

## خطة site-app-r14.js (المرحلة 4)
- copy من site-app-r13.js → site-app-r14.js مع التعديلات التالية:
  1. managedBlog = {} يُحمَّل عبر rpcQuery("site.blog.publicList", {category?, search?}) في loadSiteBlog() (نمط loadSiteContact + loadSiteDownloads في init).
  2. blogPage: cats من managedBlog.categories (المرئية)، search field جديد (input data-action="blog-search")، filtered بالعنوان والملخص، articles من managedBlog.articles مع imageUrl (إلا: <img src=imageUrl class="article-cover-image"> بدل ▤)، fallback على ARTICLES القديمة إن لم يُحمَّل (isVisible legacy).
  3. articleModal → صفحة كاملة: route جديدة "#/blog/article/:slug" (تُقرأ في currentPath أو parseHash) + bySlug عبر rpcQuery مع تخزين slug في state.articleSlug والبيانات في state.previewArticle. صفحة تعرض cover كبير، meta، title، summary، body بـ renderMarkdown بسيط (هيدرات/فقرات/قوائم/غليظ/مائل).
  4. زر مشاركة: نسخة/واتساب/تيليجرام (نمط wa() موجود، wa(title)).
  5. open-article الحالي يبقى داعمًا (modal)، لكن الأفضل إبقاء open-article يعمل عبر id في managedBlog.
  6. init: loadSiteBlog() عند التحميل (إضافة إلى قائمة التحميلات، مع render عند /blog).
  7. تحديث index.html (site entry) للإشارة إلى r14 — فحص أين يشير index.html إلى site-app.
- بعد ذلك: vitest (بصمة r14 + blogManager), pnpm build, checkpoint.

## روابط إجراءات الخادم
- admin.blog.{categories,articles,createCategory,updateCategory,deleteCategory,setCategoryVisibility,moveCategory,createArticle,updateArticle,deleteArticle,setArticleVisibility,moveArticle,uploadArticleImage,seedDefaultCategories}
- site.blog.publicList{category?,search?}, site.blog.bySlug{slug}

## تحديث الحالة — لحظة كتابة السكربت patch_site_app_r14.py

site-app-r14.js نُسِخ من r13 (768 سطر). التعديلات المخطط تنفيذها عبر /tmp/patch_site_app_r14.py:
1. managedBlog global + managedBlogSearch + renderMarkdown/applyInline (قبل articleModal).
2. loadSiteBlog() يستدعي site.blog.publicList ويُستدعى في bootSite مع downloads/contact، وإعادة render عند /blog بعد التحميل.
3. blogPage ديناميكية: تصنيفات DB + فلاتر + بحث + صور + fallback على ARTICLES القديمة.
4. articleModal موسع (previewArticle غير مستخدم — سنعتمد state.article من open-article على id في managedBlog/ARTICLES مع slug: managedBlog.articles.find(id)).
5. blogArticlePage: صفحة كاملة للـ slug — route "/blog/article/*" (انتبه: سكربت الباتش فيه مشكلة switch — راجع الناتج: يجب أن يكون في switch: case "/blog" ثم default: if startsWith("/blog/article/") return blogArticlePage(); else return notFound();).
6. event delegation: open-article يضبط state.article من managedBlog أولاً ثم ARTICLES، ويوجه إلى /blog/article/:slug مباشرة إن وُجد slug (بدل modal) — الأفضل: modal يبقى كما هو لكن يوجه لصفحة slug. القرار: اجعل open-article يذهب إلى "#/blog/article/{slug}" (go).
7. copy-article-link action في event delegation (clipboard + toast).
8. title في render: "/blog/article/..." → "المقال | واجبات بلس".
9. index.html: site-app-r14.js (client/public/index.html سطر 28).
10. اختبار أصول: التحقق من وجود r14 في index.html.

ملاحظات تقنية من الكود:
- rpcQuery(procedure, input) موجود سطر 96 — يستقبل input object، site.blog.publicList بلا إدخال (null).
- esc/safeCss/wa موجودان.
- pageContent switch سطر 606، render title سطر 625.
- bootSite سطر 755، Promise.all لـ loadSiteDownloads/loadSiteContact.
- event delegation click سطر 713.
- الموقع المنشور: uploadplus-47dkogbk.manus.space — auto-publish مفعّل.

## بعد patch_site_app_r14.py:
- تحقق pnpm build + pnpm test (أضف اختبار بصمة r14 + blogManager r1).
- checkpoint + تسليم.

## تشخيص 404 في /#/blog/article/1 (مرحلة الزائر)
السبب: عند فتح hash=blog/article/* مباشرة، render() يُستدعى في bootSite قبل اكتمال loadSiteBlog()، فيكون managedBlog null وblogArticlePage يعيد notFound(). الحل: في loadSiteBlog عند الاكتمال، أعد render() إذا كان currentPath().startsWith("/blog/article/"). (نفس منطق #/downloads في bootSite).
تم: صفحة /#/blog تعرض المقالات القديمة ARTICLES (managedBlog فارع — يجب التحقق: هل seedDefaultCategories أو بيانات موجودة؟ لا توجد مقالات في DB بعد — fallback صحيح). المقالات تظهر بدون صور ▤ (صحيح، لا صور).

## خطوات متبقية لمرحلة الزائر:
1. إصلاح إعادة render عند اكتمال loadSiteBlog لصفحات /blog و/blog/article.
2. اختبار صفحة مقال (يجب أولًا إضافة مقال عبر الإدارة أو DB للتحقق — يمكن إدخال مقال اختباري ثم حذفه).
3. pnpm test + build، إضافة اختبارات بصمة r14 + style-r2 + blogManager r1.
4. checkpoint وتسليم.

## تشخيص webdev_debug لـ 404 صفحة المقال (14 أغسطس 17:30)
1. switch في pageContent(): يجب التحقق أن السطر الحالي `default: if (currentPath().startsWith("/blog/article/")) return blogArticlePage(); return notFound();` يعمل فعلًا (كانت هناك محاولة سابقة بـ placeholder لم تُنفذ بسبب SyntaxError في سكربت بايثون — لكن إصلاح لاحق "switch fixed" نفّذ السطر الصحيح. يجب grep للتأكد).
2. blogArticlePage يبحث فقط في managedBlog.articles — إن كان managedBlog فارعًا يعيد notFound. المقال migrate-check-1 أُدرج في DB عبر SQL بنجاح (slug='migrate-check-1', is_visible=1).
3. احتمال أن loadSiteBlog يستدعي site.blog.publicList لكن الإجراء قد يرمي (مثلاً categoryId للمقال يشير لتصنيف محذوف؟ لا) أو أن الاسم خاطئ. اختبار: curl http://localhost:3000/api/trpc/site.blog.publicList?input={} — يجب أن يعيد المقال.
4. السطر المضاف في bootSite: loadSiteBlog().then(() => render) — لكن render() قد لا يُعيد عرض المسار إذا currentPath() يبدأ بـ /blog/article/ — يجب التأكد من أن render يستدعي pageContent() الذي يطابق المسار.
5. فحص: صفحة #/blog تعرض مقالات ARTICLES القديمة فقط = إشارة أن managedBlog articles فارع! أي publicList لا يعيد مقالات أو managedBlog لا يُعيَّن.
خطة: curl الموقع المحلي للتحقق من publicList ثم إصلاح root cause.

## نتيجة فحص DB (17:45)
- blog_articles فيها 12 مقالًا هُجّرت من ARTICLES القديمة (slugs مثل kyfya-ktaba-albhth-alalmy, trq-tnzym-wqt-aldrasa, nsaeh-lltfwq-aldrsy). migration عمل عند أول تشغيل للمقال.
- لم يتم إدراج مقال migrate-check-1 فعليًا (الأداة أعادت success لكن صفًا فارغًا — ربما SELECT أعاد نجاحًا فقط).
- publicList curl أعطى articles=[] لأن loadSiteBlog في الموقع أعاد []؟ لا — curl أظهر [] حقيقيًا! لكن DB فيها 12 مقالًا visible!
  ⇒ فحص: curl /api/trpc/site.blog.publicList أعاد articles=[] — لماذا؟ listBlogArticles يستدعي getDb() — ربما خطأ أو connection fail في env الخادم؟ أو orderBy مع asc/desc غير مستورد؟ يجب فحص server logs عند curl.

## حالة 17:48
publicList يعمل: 12 تصنيفًا، 6 مقالات مرئية. صفحة #/blog تعرض 3 مقالات ARTICLES القديمة (المقالات المهاجرة لا تظهر لأنها categoryId في نطاق التصنيفات المرئية؟ لا — 6 مقالات يجب أن تظهر. فحص لاحق).
صفحة المقال /#/blog/article/kyfya-ktaba-albhth-alalmy ما زالت 404.
الخطوة التالية: فحص switch في pageContent() في site-app-r14.js — هل فيه السطر: default: if (currentPath().startsWith('/blog/article/')) return blogArticlePage(); return notFound();
ثم فحص blogArticlePage: هل يبحث عبر managedBlog.articles.find(a => a.slug === slug)?
ملاحظة: صفحة #/blog تعرض 3 بطاقات فقط = المقالات القديمة من ARTICLES (الأولى في filtered). يجب فحص لماذا 6 مقالات مهاجرة لا تظهر: filtered = (active==='الكل' ? articles) — articles = managedBlog || ARTICLES — إذا managedBlog فيها 6 مقالات يجب أن تظهر 6! لكن 3 فقط. قد يكون السبب: managedBlog null لأن loadSiteBlog يعيد []؟ لا — curl أظهر 6. أو أن grid تظهر من ARTICLES لأن managedBlog.articles فارع في JS؟ هذا يعني loadSiteBlog فشل في المتصفح! فحص networkRequests.log.

## تشخيص 17:50 (الحاسم)
الكود في r14 صحيح: default في switch يعيد blogArticlePage() للمسار /blog/article/*. وblogArticlePage يبحث في managedBlog?.articles.
النتيجة: 404 لأن managedBlog.articles فارغ في المتصفح. السبب شبه مؤكد: loadSiteBlog تفشل أو أن managedBlog لا يُعيَّن قبل الرندر.
ملاحظة مهمة: networkRequests.log لا يظهر أي طلب site.blog.publicList من المتصفح (grep count=10 لكن لم أرَ url blog واضحًا في آخر السجلات)! بينما contact/publicList وdownloads يظهران. إذن loadSiteBlog ربما لا يُستدعى أصلًا؟ bootSite يستدعيها في Promise.all. لكن bootSite قد يفشل عند rpcQuery("site.publicContent") (applyManagedContent(await rpcQuery(...)) — throw inside applyManagedContent يوقف؟ لا — داخل try/catch).
فحص آخر: السطر 839: loadSiteBlog().then(...) — هذا استدعاء loadSiteBlog مرة ثانية (duplicate) غير ضار.
التالي: فحص browserConsole.log عند فتح /#/blog/article (اللقطات السابقة لم تكن لها أخطاء console). الأسطر اللاحقة: console لا يظهر خطأ. ربما السكربت r14 لم يُحمَّل أصلًا؟ index.html line 28: appModule.src = "/assets/js/site-app-r14.js" — صحيح.
فحص مباشر: curl لموقع النشر للتحقق من أن published version يحتوي r14 (النشر تلقائي عند checkpoint لكن آخر checkpoint قبل r14!).

## تشخيص 18:00 (حسم جذري)
- dist/index.html يُولَّد من client/index.html (React SPA فارغ "Example Page") وليس من client/public/index.html.
- النشر (auto-publish) يخدم dist → موقع النشر الحالي يعرض React SPA فارغ وليس موقع واجبات بلاس!
- لكن القطات screenshots أظهرت الموقع الأصلي؟ الـ screenshots تُلتقط من dev preview (localhost:3000) الذي يخدم publicDir؟ لا — dev preview أظهر الموقع الأصلي لأن... في الحقيقة dev server يعرض "Example Page"؟ يجب التحقق!
- اللقطات السابقة (blogPage بمقالات 6) — من أي مصدر؟ على الأرجح screenshots تُلتقط عبر browser tool من preview URL وهو localhost:3000 — لكن curl localhost:3000 أعاد SPA الأصل.
- احتمال: لقطات tool أعادت "Example Page" ولم أنتبه! الصور السابقة يجب فحصها مجددًا.
- الخلاصة: بنية المشروع الأصلية: client/public/index.html = الموقع الأصلي (site-app)، لكن upgrade إلى web-db-user غيّر: vite ينسخ publicDir لكن index.html الرئيسي يأتي من client/index.html (React). يجب إصلاح: جعل vite يستخدم client/public/index.html كأساس (publicDir: client/public يعطي dist/public — غير كافٍ) أو وضع index.html في جذر client نفسه.
- القرار: فحص كيف يعمل admin.html — يعمل لأن admin.html في publicDir ويُخدم مباشرة؟ curl localhost:3000/admin.html → 200 من publicDir. النشر: dist/public/admin.html يخدم admin! لكن / يخدم React.

## تشخيص 18:05 (الحسم النهائي للعرض)
النشر والمحلي كلاهما يخدمان الموقع الأصلي "واجبات بلس" على / (وليس React Example Page — لأن server/index.ts يحتمل أنه يعيد index.html من publicDir كـ SPA catch-all على المسارات غير /api). إذن site-app-r14.js يعمل فعلًا في النشر.
النتيجة العملية: مشكلة 404 لصفحة المقال كانت في preview سابق قبل إصلاح إعادة render أو أن loadSiteBlog لم يكتمل. الشبكة networkRequests.log أظهرت طلبات blog.publicList = 10 (توجد!). والصور تظهر الآن (publicList أعطى 12 تصنيفًا و6 مقالات).
المتبقي: التحقق البصري النهائي من صفحة المقال عبر المسار المنشور (https://uploadplus-47dkogbk.manus.space/#/blog/article/...) مع مقال حقيقي، ثم اختبار صفحة blog الرئيسية، ثم مدير المدونة في الإدارة، ثم pnpm test + build + checkpoint + تسليم.

## تشخيص 18:10 (الحاسم)
الـ dev preview المحلي يعمل تمامًا: site.blog.publicList يرجع 12 تصنيفًا و6 مقالات مرئية، صفحة blog تعرض البطاقات والتصنيفات والصور (من DB)، لكن صفحة المقال عبر المسار المباشر ما زالت تعرض المحتوى بشكل غير مكتمل أو 404 في preview — يجب التحقق البصري من #/blog/article/SLUG مباشرة.
المنشور (production) ما زال نسخة قديمة: blogRouter غير موجود → يحتاج checkpoint جديد (auto-publish مفعّل → checkpoint ينشر مباشرة).
الصور: مقالات migrate ليس لها صور (imageUrl فارغ ← placeholder ▤ يظهر — متوافق مع التصميم الأصلي).
خطوات متبقية: 1) تحقق بصري صفحة المقال في preview بمسار مباشر. 2) pnpm test. 3) checkpoint (ينشر). 4) تسليم.

## تشخيص 404 صفحة المقال (17:35) — details
switch في pageContent (سطر 652-666 في r14): case "/blog": blogPage(); default: if (currentPath().startsWith("/blog/article/")) return blogArticlePage(); else notFound().
عند فتح #/blog/article/كيفية-كتابة-البحث-العلمي ظهر 404 (React-style "Did you forget to add the page to the router?" — هذا نص من wouterNotFoundClient؟ لا — النص "Page Not Found 404 / Did you forget to add the page to the router?" هو نص NotFound.tsx في client/src/pages! أي أن React Home render يظهر هذا؟ لا — client/src/pages/Home لا يحتويه. ربما r14 يحتوي نفس النص في notFound().
النص الظاهر: "404 Page Not Found / Did you forget to add the page to the router?" — هذا نص من wouter NotFound! أي أن الرندر يتم من client/src App.tsx (React) وليس site-app-r14!
الخلاصة الجذرية: SPA الموقع الأصلي يعمل على الإنتاج (curl أثبت الموقع الأصلي)، لكن dev preview (3000-...) قد يخدم index.html من vite (client/index.html = React SPA مع NotFound "Did you forget to add the page to the router?")! curl localhost:3000/ أظهر "واجبات بلس" — لكنه ربما من React Home؟ لا، Home.tsx لا يحتوي "واجبات بلس". إذن curl localhost يعرض الموقع الأصلي (SPA catch-all يعيد index.html الأصلي)، بينما browser عبر proxy يعرض شيئًا آخر؟ لا — screenshots / و/#/blog أظهرتا الموقع الأصلي!
احتمال حقيقي: الرندر الأول يظهر الموقع الأصلي ثم عند hashchange/redirect... صفحة المقال تذهب wouter؟ غير ممكن لأن site-app يحول hashchange بنفسه.
الأسطر الظاهرة في markdown: "Page Not Found 404 / Did you forget to add the page to the router?" + "Title: المقال | المدونة الأكاديمية | واجبات بلس" — title تغيّر (يعني blogArticlePage نفذ set title) ثم notFound ظهر! أي أن الصفحة رُندرت ثم عُرض notFound — أو أن blogArticlePage بداخلها تعرض notFound عندما لا تجد المقال.
فحص: blogArticlePage في r14 — هل تعرض notFound() عندما article غير موجود؟ slug decodeURL → بحث. السبب المحتمل: loadSiteBlog async لم يكتمل عند أول render على المسار المباشر → managedBlog null → articlePage تعرض notFound. إصلاح سابق كان إعادة render عند اكتمال loadSiteBlog — لكن ربما لم يُطبّق أو currentPath لم يعرف وقت التنفيذ. يجب فحص r14 عند loadSiteBlog وblogArticlePage الحاليين.

## إصلاح bootSite (17:36)
لاحظت أن في bootSite يوجد سطران متداخلان:
1) `void Promise.all([...loadSiteBlog()]).then(() => { if (location.hash.startsWith("#/downloads")) render(); else if (location.hash.startsWith("#/blog")) render(); }).catch(() => {});`
2) `loadSiteBlog().then(() => { if (currentPath() && currentPath().startsWith("/blog/article/")) render(); }).catch(() => {});`
السبب المحتمل لعدم ظهور صفحة المقال: السطر 2 يفحص currentPath().startsWith — لكنه موجود! المشكلة: loadSiteBlog() يُستدعى مرتين — الأول Promise.all والثاني منفصل — كلاهما await على rpcQuery. يجب أن يعمل لكن... "Did you forget to add the page to the router?" يظهر في notFound() فقط عندما pageContent يرجع notFound — أي أن blogArticlePage لم تُستدعَ.
الحقيقة: عند التحميل الأول location.hash="" ثم bootSite يضع hash="/" ثم render() → "/" home. لا يوجد hashchange بعد render الأول لأن hash="/" ليس /blog/article/! الحل الصحيح: render بعد كل loadSiteBlog إذا كان المسار الحالي article. سأدمج الإصلاحين: render إذا hash يبدأ بـ #/blog أو #/blog/article.

## 17:37: لا زال 404 بعد إصلاح bootSite
النص "Did you forget to add the page to the router?" — يجب فحص: من أين يأتي هذا النص في r14 (grep). هل blogArticlePage() تستدعي notFound() داخليًا عندما !article (أي قبل اكتمال التحميل في الرندر الأولي، ثم لا يعاد render)؟ أم أن switch لا يطابق؟
أيضًا: ربما location.hash يبدأ بـ "#/blog/article/..." لكن currentPath() يقطعه أو decode يعيد شيء آخر.
مهم: يجب grep "Did you forget" في r14 لتحديد مصدره، ثم قراءة blogArticlePage كاملة (السطر 536+) وفحص متى ترجع notFound().

## 17:38: التشخيص النهائي لـ 404
- currentPath() يعمل صحيحًا: "/blog/article/كيفية-كتابة-البحث-العلمي"
- switch default يطابق blogArticlePage() عبر startsWith("/blog/article/") ✓
- blogArticlePage(): يبحث في managedBlog?.articles — إذا !article يرجع notFound()
- السبب: في الرندر الأولي (قبل اكتمال loadSiteBlog) managedBlog === null → !article → notFound(). بعدها loadSiteBlog يكتمل لكن bootSite لا يعيد render لأن bootSite كان قد نفّذ hash="/" فقط (لا يوجد hashchange بعد render الأول).
- إصلاح bootSite الذي طبقته يضيف render عند بدء hash بـ #/blog لكن المتصفح يفتح المسار مباشرة — bootSite يُستدعى قبل render الأول؟ ترتيب bootSite: loadSiteBlog ضمن Promise.all → then() يعيد render إذا hash يبدأ بـ #/blog. هذا كافٍ نظريًا!
- لكن انتظر: bootSite() في الأصل: applyManagedContent ثم Promise.all → then render إذا blog. ثم hasInitialHash=true (hash موجود) → render() مباشرة! أي أن render() الثاني يحدث متزامنًا قبل اكتمال Promise.all ثم عند اكتماله يعاد render ✓ يجب أن يعمل!
- هل التعديل طُبّق فعليًا؟ نعم "patched bootSite". لكن المتصفح يفتح صفحة جديدة — r14 يجب أن يُعاد تحميله من dev server مباشرة (لا كاش للملفات في dev).
- احتمال آخر: hash عند التحميل: "#/blog/article/...%D9" — currentPath() يستبدل # فقط. يبدو صحيحًا.
- احتمال: loadSiteBlog يفشل (catch) → managedBlog={categories:[], articles:[]} → !article → notFound()! هل rpcQuery "site.blog.publicList" ناجح؟ curl المحلي أظهر 12 تصنيفًا و6 مقالات ✓. لكن ربما في المتصفح يفشل لسبب CORS/session؟ curl نجح بدون auth → يجب أن ينجح.
- احتمال: السبب أن render() المتزامن بعد Promise.all ثم render() مباشر... في fact bootSite يعيد render() إذا !hasInitialHash يضع hash="/". هنا hasInitialHash=true → لا hashchange — ثم render() مباشر → notFound (managedBlog null). ثم عند اكتمال Promise.all → render() → يجب أن يجد المقال. لكن المتصفح أظهر 404 دائمًا!
- التشكك: هل patch طُبّق على الملف الذي يخدمه dev؟ نعم نفس المسار. هل bootSite أعيد تعريفه؟ هل يوجد bootSite مزدوج؟

## 17:38: السبب الحقيقي وجد — publicList يعيد 400 Bad Request في المتصفح!
networkRequests.log: `/api/trpc/site.blog.publicList?input={"json":null}` → status 400 Bad Request.
السبب المرجح: publicListProcedure في blog.ts يتطلب input (z.object مع حقل اختياري) لكن المتصفح يرسل input=json:null — أو أن الخادم المنشور/المحلي يطلب input غير null بينما publicQuery في tRPC يتطلب `input: null` بصيغة مختلفة. curl نجح لأن curl استخدم input=null (بدون json wrapper) أو لأن الإجراء يعيد 400 عندما input ليس مطابقًا للـ zod schema.
الحل: فحص مخطط publicList في server/blog.ts: publicProcedure.input(...). — الأرجح: الإجراء يعرف input كـ z.object({}) بدون افتراضي، والتغذية {json:null} لا تطابق. الحل الأسهل: في r14، استدعاء rpcQuery("site.blog.publicList") بدون input (input=null افتراضيًا) — لكن tRPC يحوّلها. أو تعديل الإجراء ليصبح .input(z.object({}).optional()) أو .input(z.null().optional()).
ملاحظة: loadSiteDownloads وloadSiteContact يعملان بنفس النمط rpcQuery("site.downloads.publicList") — يجب مقارنة تعريفاتهما مع blog.publicList لمعرفة الفرق (لماذا هذه 400 وتلك تنجح؟).

## 17:40: تأكيد نهائي
tRPC v11: الإجراء `input(z.object({...}).optional())` لا يقبل `input={"json":null}` — خطأ expected object received null. contact يعمل لأن publicList هناك بلا input إطلاقًا (query بلا input). الحل في r14: عدم تمرير input (rpcQuery("site.blog.publicList") — لكن rpcQuery يضيف ?input={json:input}... لا. الحل: تعديل publicList في blog.ts ليقبل z.union([z.object(...), z.null()]) أو z.any().optional() — الأسلم: تغيير .input(z.object({...}).optional()) إلى .input(z.union([z.object({...}), z.null()]).optional()) مع input ?? {} داخل الاستعلام. كما يجب مراجعة bySlug وadmin procedures — admin procedures تمرر input حقيقي فلا مشكلة.
- publicList في r14 يُستدعى بلا مدخلات: rpcQuery("site.blog.publicList") يمرر input=null افتراضيًا في fetch — يجب التوافق مع z.null() union.

## 17:40 (محدّث): الإصلاح طُبّق
- server/blog.ts: publicList أصبح يقبل z.union([object, z.null()]).optional() — التجميع tsc نجح 0 أخطاء.
- التحقق التالي: curl localhost /api/trpc/site.blog.publicList?input={"json":null} → يجب أن يعيد 200 مع 12 تصنيفًا و6 مقالات.
- أخطاء devserver المعروضة (17:04-17:06: routers.ts unterminated string, blogRouter/downloadsRouter not defined) قديمة — كانت قبل إصلاح routers.ts، والخادم يعمل الآن.
- بعد التحقق: اختبار صفحة المقال #/blog/article/كيفية-كتابة-البحث-العلمي في dev preview.
- ثم: التحقق من لوحة المالك (/admin → قسم المدونة الجديدة) — admin-blog-manager-r1.js مربوط في admin.html بعد contactManager، وadmin-app-r22.js في admin.html مع بصمة جديدة (admin-app-r22.js + admin-blog-manager-r1.js).
- أخطاء devserver في admin: grep -a 2026-08-14T17 .manus-logs/devserver.log | grep -i "blog\|error" | tail.
- بعد النجاح: pnpm test + pnpm build + checkpoint + تسليم.

## 17:39: صفحة المقال تعمل بالكامل
صفحة /#/blog/article/{slug} تعرض العنوان والتلخيص والنص والتاريخ والتصنيف وأزرار المشاركة (تويتر/واتساب/تيليجرام/نسخ رابط) وزر العودة للمدونة. publicList يعمل الآن (200 مع 12 تصنيفًا و6 مقالات بعد إصلاح z.union([...,z.null()])). الـ slugs الفعلية في DB: kyfya-ktaba-albhth-alalmy، trq-tnzym-wqt-aldrasa، nsaeh-lltfwq-aldrasy، kyfya-akhtyar-mshrwa-altkhrj، mharat-albhth-alalmy، mqal-jdyd (مقال فارغ — سيُخفى أو يُستخدم للتحقق في الإدارة).
المقال "مقال جديد" (id=6) يظهر isVisible=true — ربما كان مقال اختباري أُنشئ سابقًا؛ أفضل إخفاؤه (isVisible=0) حتى لا يظهر للزائر كنص فارغ.
المتبقي: (1) إخفاء مقال الاختبار الفارغ، (2) اختبار صفحة المدونة #/blog، (3) اختبار لوحة المالك (تسجيل دخول + قسم المدونة)، (4) pnpm test + build + checkpoint + تسليم.
ملاحظة لوحة المالك: admin-app-r22.js + admin-blog-manager-r1.js — يجب التحقق من بصمتيهما في admin.html (grep r22 وblogManager في admin.html).
رابط لوحة الإدارة: https://uploadplus-47dkogbk.manus.space/admin (بريد bdalslamanwralajsh@gmail.com / رمز abd77312).

## 17:41: صفحة المدونة #/blog تعمل
التصنيفات (12) والبحث والبطاقات الخمس ظاهرة. لكن صور المقالات لم تُعرض (placeholder رمادي) — ربما لأن articles في publicList لا تحتوي image_url أو لأن نمط image لا يوجد في البطاقة. يجب فحص: blogPage في r14: كيف تعرض imageKey؟ وهل publicList يعيد image_url؟ والمقالات الهُجّرة قد لا تملك صورة (image_url فارغة في Legacy). الحل: إذا لم توجد صورة اعرض placeholder — هذا مقبول، لكن يجب التأكد أن الكود يدعم الصورة عند توفرها (في r14 أضفت دعم imageKey). فحص r14 blogPage للتحقق.

## 17:41: صفحة تسجيل دخول لوحة المالك
صفحة /admin.html تعرض نموذج الدخول (بريد + كلمة مرور + زر بصمة/Passkey + زر تسجيل الدخول). البيانات: bdalslamanwralajsh@gmail.com / abd77312. بعد الدخول سأفتح قسم «إدارة المدونة الأكاديمية» من التنقل (blog في admin-app-r22.js) وأختبر: قائمة المقالات، نموذج إضافة مقال (عنوان/تلخيص/نص/تصنيف/صورة/إظهار)، تعديل، إخفاء، حذف، ترتيب، رفع صورة، معاينة.
ملاحظة: يجب أن يكون قسم «إدارة المدونة الأكاديمية» (blog) ظاهرًا في nav مجموعة المحتوى. إذا كانت هناك أخطاء في console بعد الدخول سأراجع devserver/browserConsole logs.
الخطوات المتبقية بعد الاختبار: pnpm test + pnpm build + webdev_save_checkpoint (auto-publish) + تسليم الروابط للمستخدم.

## 17:41: فشل تسجيل الدخول بالبيانات المعروفة
عند إدخال bdalslamanwralajsh@gmail.com / abd77312 ظهرت «بيانات الدخول غير صحيحة» في dev preview. يجب التحقق من ADMIN_EMAIL/ADMIN_PASSWORD عبر webdev_request_secrets أو فحص كيف يتحقق الخادم (env) — قد يكون السندبوكس أعيد ضبطه وفقد الـ env، أو أن env موجود لكن الخادم لا يقرأه. الحل: إعادة تأكيد السرينات عبر webdev_request_secrets (مع القيم المعروفة حرفيًا preventMatching=true لأن القيمة قد تكون stale).

## 18:06: تشخيص فشل تسجيل الدخول في المتصفح رغم نجاح اختبارات vitest
- vitest adminAuth.login نجح 3/3 بعد تثبيت ADMIN_EMAIL/ADMIN_PASSWORD — السرينات صالحة.
- الخادم يستخدم جدول ownerAccounts: getOrSeedOwnerAccount() يقرأ الصف الأول؛ validateAdminCredentials يقارن البريد المُطبّع (normalizedEmail) مع الحساب وهاش scrypt.
- فشل المتصفح + نجاح الاختبار = حساب موجود مسبقًا في ownerAccounts ببريد مختلف (سطور بيضاء/حروف مخفية من seed قديم)، والاختبار يستخدم ENV المطبّع الذي يطابق.
- الحل: فحص جدول ownerAccounts عبر SQL، ثم تحديث البريد/الهاش ليطابقا ENV حرفيًا (أو حذف الصف القديم وإعادة seed بحذف الجلسة القديمة).

## 18:08: نتيجة curl الحاسمة
curl localhost:3000/api/trpc/adminAuth.login بالبيانات الصحيحة → {"success":true} + cookie session صحيح. إذن الخادم صحيح تمامًا والمشكلة في المتصفح داخل السندبوكس فقط. الاحتمال: (1) المتصفح استخدم نسخة قديمة من admin-app محفظة cache، (2) حقول النموذج type="text" وbrowser autofill أدخل قيمًا مختلفة فعلًا (الملء يعرض "bdalslamanwralajsh@...gmail" مقطوعة)، (3) CSRF/cookies. نعيد الاختبار بنقرات يدوية مع تفريغ الكاش أو نختبر على النطاق المنشور مباشرة.

## 18:09: سبب تعليق «جار التحقق من صلاحية الوصول» في الإنتاج
admin.html (النسخة المنشورة) ما زال يستدعي admin-app-r21.js?v=contact-r3 بدل r22 — إذن checkpoint الأخير (8eb0750d) لا يتضمن تحديث admin.html للإشارة إلى r22! الـ dev preview يستخدم ملف admin.html المحلي الذي يستدعي r22، لكن الملف المنشور في git (checkpoint) قديم. يجب: تعديل client/public/admin.html لإشارة admin-app-r22.js?v=blog-r1 وحفظ checkpoint جديد (auto-publish). (يُحتمل أن الجلسة السابقة عدّلت admin.html خارج git أو أن checkpoint لم يشمل التعديل.) ملاحظة: تسجيل الدخول فعّال (curl + console fetch يُرجعان success) لكن boot في r21 يتعثر (loading دائم) — ربما بسبب خطأ في r21 نفسه.

## 18:09 (تحديث): حالة الملفات فيWorking copy (قبل checkpoint)
- كل تطوير المدونة موجود كتعديلات محلية غير محفوظة في checkpoint: admin.html → r22 ✓ (محلي فقط)، index.html → site-app-r14.js + style-r2.css ✓ (محلي)، style.css معدل (أنماط article-h/article-body-full) ✓.
- ملفات جديدة غير متتبعة: admin-app-r22.js، admin-blog-manager-r1.js، site-app-r14.js، server/blog.ts، server/blog.test.ts، drizzle/0012_sour_bloodstorm.sql، style-r2.css.
- تعديلات متتبعة: admin-app-r21.js (معدّل جزئيًا — ربما نسخة وسيطة)، server/routers.ts (imports + site.blog + admin.blog مضافة ✓).
- تعديلات schema.ts وdrizzle/meta (blog_categories/blog_articles) موجودة محليًا وطُبّقت في DB.
- خطأ الكونسول القديم "downloadsRouter is not defined" من جلسة dev قديمة (بعد إعادة الإقلاع لا يهم؛ يجب التأكد بعد إعادة التشغيل).
- المشكلة الوحيدة في الإنتاج: admin.html المنشور يشير إلى admin-app-r21.js?v=contact-r3 (checkpoint قديم) → بعد checkpoint جديد ستُحدّث. تسجيل الدخول API يعمل (curl+console).
- ملاحظة: admin-app-r21.js معدّل محليًا — تحقق مما إذا كان التعديل ضروريًا أم يكفي r22. يجب قراءة diff كاملاً أو التأكد أن r22 هو الذي سيُستخدم.
- خطوة تالية: التأكد من أن كل شيء TS نظيف + pnpm test + pnpm build + checkpoint.

## 18:10: حسم ملف الرقصة الرئيسي
admin-app-r22.js مطابق تمامًا لـ admin-app-r21.js المعدل محليًا (diff واحد: 3 أسطر — label مقالات→مدونة أكاديمية + إضافة blog لمجموعة المحتوى + mountCompatibleBlogManager). إذن تعديل r21 هو نفسه محتوى r22 ولا حاجة لنسخة r22 منفصلة — سنستخدم r22 في index (admin.html يشير إلى r22) ونضيفه git. كل شيء جاهز للـ build/test.

## 18:13: تحقق الإنتاج بعد checkpoint 0f438a3f
الدخول نجح (الجلسة محفوظة) ولوحة الإدارة في الإنتاج تعرض النسخة الجديدة: قسم «المدونة» يظهر في التنقل مع عدّاد 6 مقالات، «آخر المقالات» تعرض 4 مقالات، و«أكثر المقالات مشاهدة» تعمل. الخطوة التالية: فتح قسم المدونة، إنشاء تصنيف + مقال بصورة مرفوعة، ثم التحقق من عرض الزائر ثم حذف بيانات الاختبار.

## 18:13 (توثيق): قسم «المدونة» يعرض المحتوى القديم وليس مدير المدونة الجديد
فتح قسم المدونة من التنقل عرض «أضف، عدّل، أظهر أو أخفِ» — أي واجهة contentWorkspace الافتراضية القديمة (المحفوظة سابقًا في content_collection كـ"مقالات")، وليس واجهة WajbatBlogManager (التصنيفات + المقالات الجديدة). السبب المرجح: في contentWorkspace()، شرط blog يُفحص بعد downloads/contact وقبل services، لكن mountCompatibleBlogManager يعيد null عندما لا يكون window.WajbatBlogManager موجودًا — هنا يجب التحقق مما إذا كان admin-blog-manager-r1.js حُمّل فعلًا في الإنتاج. في لقطة الإنتاج لا يبدو أن الواجهة الجديدة ظهرت → احتمال عدم تحميل سكريبت الإدارة أو أن state.selected لم يكن "blog" عند التحميل. يجب فحص console الإنتاج.

## 18:14 (تشخيص): الإنتاج يخدم admin.html القديم
fetch('/admin.html') في الإنتاج يعيد admin-app-r21.js?v=contact-r3 وليس r22! رغم أن checkpoint 0f438a3f حُفظ ونُشر (auto-publish). لكن صفحة الإدارة الحالية في المتصفح تُظهر «لوحة المالك» وتعمل — أي أن الجلسة السابقة حمّلت r21 قديمًا (كان يعمل جزئيًا مع mountCompatibleBlogManager المضاف محليًا في r21). سبب محتمل: CDN caching قوي للملفات المنشورة، أو أن dist/public/admin.html المنشور من checkpoint الحالي ما زال قديمًا. يجب: (1) curl مباشر لرأس HTTP admin.html المنشور + cache headers (2) ربما CDN يحتفظ بـ 90 يومًا كما حدث سابقًا مع المدراء — الحل المجرّب سابقًا: إعادة تسمية html غير ممكنة، لكن يمكن تحديث?v= أو مسار مختلف. البديل: تغيير اسم ملف html (admin-r2.html) غير مفضل. الأجدى: فحص dist/public/admin.html محليًا (هل يحتوي r22؟) — إذا نعم فالنشر صحيح والمشكلة CDN حتمًا.

## 18:15 (تشخيص نهائي): النشر لم يلتقط dist/admin.html الجديد
النتائج: dev server يعرض admin-app-r22.js ✓، dist/local يحتوي r22 ✓ (حدث 18:12 بعد checkpoint)، لكن الإنتاج المنشور ما زال last-modified 15:52 UTC ويعرض r21 — أي أن النشر الآلي (Deployment successful جاء بعد checkpoint) نشر dist قديمًا أو لم يعد بناء dist قبل النشر. ملاحظة: checkpoint auto-publish ربما ينشر من dist مولّد عند حفظ checkpoint، لكن dev server قد يكون أعاد البناء لاحقًا. الحل: إعادة بناء dist يدويًا pnpm build ثم checkpoint جديد لإعادة النشر.

## 18:18 (تشخيص): المسار "/" المنشور يخدم SPA React (site-DTatVoNx.js) وليس client/public/index.html (موقع الزائر)
المنشور في / عرض /assets/site-DTatVoNx.js (SPA قالب) — لكن لقطة الزائر السابقة (في بداية الجلسة المدمجة) أظهرت الموقع الأصلي يعمل على "/"! ملاحظة: client/public/index.html (موقع الزائر الثابت مع site-app-r14.js) يُخدم من مساره الصريح /index.html في المنشور (369806 بايت، يحتوي site-app-r14 ✓ وloadSiteBlog ✓). يجب فحص كيفية توجيه "/" في الخادم: ربما server/_core vite proxy يحول "/" إلى React SPA في dev، لكن في النشر يُخدم public/index.html مباشرة على /؟ في لقطة سابقة كان "/" يعرض الموقع الثابت. الأرجح: في الإنتاج "/" = public/index.html (حسب snapshot المستخدم الأخير)، لكن md5 مختلف لأن dist انبنى محليًا 18:15 بعد النشر الذي حصل 18:13 — أي أن المنشور هو dist من 18:12 (بلا loadSiteBlog؟ لا — تم التحقق 0 loadSiteBlog في المنشور!). يجب التحقق محليًا: هل dist/public/index.html من 18:15 يحتوي loadSiteBlog؟ (فحص سابق أعاد 0 — أي index الزائر لا يحتوي loadSiteBlog نصًا؛ هو في site-app-r14.js نفسه). إذن الموقع يعمل: site-app-r14.js يُحمّل داخل index، وloadSiteBlog دالة داخله. لا مشكلة فعلًا! فقط التأكد من عرض المدونة في "/" منشورًا.

## 18:25 (تشخيص r14): الموقع الثابت يعمل المنشور، لكن r14 لم يُنفَّذ؟
النتائج: /api/trpc/site.blog.publicList يعمل منشورًا (يعيد 6 تصنيفات + مقالات). لكن في صفحة /public/index.html#/blog لم تُعرض أي صفحة — window.render غير معرّف رغم تحميل r14.js (200). السبب المرجح: r14 هو module script، والتحقق من window.render قبل اكتمال التنفيذ. في الإنتاج السابق كان يعمل (لقطة البداية). يجب إعادة فحص الصفحة بعد انتظار، وربما المشكلة أن "#" hash لم يُفعّل render لأن Promise.all ينتظر ثم render فقط لصفحات #/downloads أو #/blog — سطر 840 يعمل. الأجدى: انتظار ثم إعادة فحص.

## 18:25 ✓: صفحة الزائر #/blog المنشورة تعرض المدونة الديناميكية
التصنيفات من قاعدة البيانات ظاهرة (الكل، البحث العلمي، الدراسة، التعليم، مهارات الطلاب...) مع بحث وتنسيق pill. window.render غير معرّف لأن r14 module (محاكاة SPA) لكن الصفحة تُعرض بشكل صحيح. متبقٍ: التحقق من صفحة مقال منفرد #/blog/article/:slug وأزرار المشاركة، ثم اختبار إنشاء مقال جديد من الإدارة بصورة، ثم حذف بيانات الاختبار.

## 18:25 (خلل): صفحة المقال المنفرد #/blog/article/... تعرض 404 من SPA React
#/blog/article/:slug في المنشور يعرض «404 Page Not Found / Did you forget to add the page to the router?» — أي أن المسار يُحوَّل إلى SPA React قالب client/src/pages (Home.tsx) وليس إلى public/index.html الثابت. السبب: في الإنتاج، المسارات الفرعية على /public/index.html قد لا تُحمَّل لأن الخادم لا يخدم /public/ بشكل مباشر، أو لأن hash بعد #/blog/article يُعالج أولًا في SPA. ملاحظة: صفحة /#/blog نفسها عملت من /public/index.html#/blog. الفرق هنا أن الرمز العربي المرمّز في URL قد يُفسَّر بشكل مختلف. يجب فحص: هل slug العربي encoded يُكسر؟ وهل blogArticlePage في r14 يتطابق مع هذا النمط؟ أولًا: فحص regex في r14 لـ blog/article/:slug.

## 18:26 (تشخيص): slugs لاتينية محفوظة في DB
المقالات المنشورة 5 (مقال "مقال جديد" مخفي أو محذوف من الاختبار السابق؟ عدّاد 5): slugs = kyfya-ktaba-albhth-alalmy، trq-tnzym-wqt-aldrasa، nsaeh-lltfwq-aldrasy، kyfya-akhtyar-mshrwa-altkhrj، mharat-albhth-alalmy. اختبار #/blog/article/1 نجح: عنوان «كيفية كتابة البحث العلمي»، meta «المقال | المدونة الأكاديمية | واجبات بلس»، أزرار مشاركة موجودة. صفحة المقال بـ slug عربي مشفر في URL السابق (كيفية-كتابة-البحث-العلمي) لم تكن موجودة أصلًا → 404 صحيح (لا يوجد مقال بهذا الـ slug). صفحة المقال تعمل تمامًا. متبقٍ: اختبار slug لاتيني واحد، اختبار أزرار المشاركة، ثم اختبار إنشاء مقال جديد + صورة في لوحة الإدارة (مدير المدونة يجب فتحه الآن بعد نشر r22)، ثم حذف بيانات الاختبار.

## 18:26 ✓: صفحة المقال المنفرد المنشورة تعمل بالكامل
#/blog/article/kyfya-ktaba-albhth-alalmy في الإنتاج: عنوان «كيفية كتابة البحث العلمي»، التاريخ والتوصيف، نص المقال، أزرار مشاركة (تويتر/واتساب/تيليجرام/نسخ الرابط) مع روابط صحيحة wa.me وt.me/share، وزر «العودة للمدونة». كل ما سبق: صفحة قائمة المدونة تعمل + صفحة المقال تعمل + API منشور يعمل. متبقٍ: اختبار لوحة الإدارة (إنشاء مقال + صورة مرفوعة) ثم حذف بيانات الاختبار وتسليم.

## 18:27 (خلل): تسجيل الدخول في الإنتاج المنشور فشل «بيانات الدخول غير صحيحة»
نفس البيانات عملت سابقًا من dev (localhost:3000) بنجاح. الآن في المنشور تُرفض. السبب المرشح: adminSession.ts يتحقق من ENV ADMIN_EMAIL/ADMIN_PASSWORD، لكن ENV في الإنتاج ربما لم يُحدّث بعد طلب webdev_request_secrets الأخير (لم يُؤكَّد من المستخدم!). قبل ذلك تم إرسال بطاقة طلب السرينات ADMIN_EMAIL/ADMIN_PASSWORD لكن لا يوجد تأكيد. يجب: إعادة محاولة curl على المنشور مع adminAuth.login لمعرفة رسالة الخطأ الدقيقة، ثم إعادة إرسال بطاقة السرينات.

## 18:28 (مفاجأة): curl على المنشور adminAuth.login بنجاح (success:true)! لكن المتصفح يرفض
الـ curl من المنشور يعيد success:true = الحساب في DB صحيح (bdalslamanwralajsh@gmail.com / abd77312). إذن لماذا فشل المتصفح؟ فرضية: الـ cookies: curl أرسل طلبًا بدون جلوس مسبق. المتصفح: ربما جلسة قديمة revoked (sessionVersion) أو أن رسالة «بيانات الدخول غير صحيحة» جاءت من كود المتصفح عند فشل cookie (المنشور في iframe؟). أو أن المستخدم سجّل الدخول سابقًا بـ «البريد» في حقل type=text وأدخل البريد بشكل مختلف؟ لا — curl نجح. الأهم: جلسة curl لا تختبر كامل السلسلة. يجب إعادة المحاولة في المتصفح (ربما خطأ مؤقت) مع فتح الكونسول لرؤية الخطأ الفعلي.

## 18:28 (حالة اللحظة): نموذج الدخول ظهر في المنشور (admin.html?r=2)
العناصر: 1=input البريد (type=text)، 2=input كلمة المرور (type=password)، 4=زر تسجيل الدخول.
خطة: تعبئة bdalslamanwralajsh@gmail.com + abd77312 ثم نقر الزر 4. Curl أثبت أن الخادم يقبل البيانات (success:true). المحاولات السابقة فشلت برسالة «بيانات الدخول غير صحيحة» — قد يكون السبب أن حقل البريد type=text يقبل النص لكن fill_form ربما لا يطلق أحداث input/blur نفسها التي يتتبعها react-like manager (الإدارة JS عادية لذا يجب أن تعمل). يجب النقر أولاً داخل الحقول أو استخدام click على الـ index. إذا فشل مرة أخرى: استخدام console_exec مع setter صريح + dispatch events ثم click على الزر 4.
الهدف بعدها: فتح قسم المدونة في الإدارة، إنشاء مقال تجريبي «اختبار مدونة - مسح لاحقًا» مع رفع صورة حقيقية، التحقق من ظهوره في صفحة الزائر #/blog وصفحة المقال، ثم حذف المقال والصور الاختبارية، ثم تسليم.

## 18:33 تشخيص حاسم: ADMIN_EMAIL تحتوي حرفي LRM مخفيين (U+200F = 8207) في الموضعين 0 و29
القيمة الفعلية: ‏bdalslamanwralajsh@gmail.com‏ (30 حرف بدل 28) — أحرف تنسيق يسار-يمين خفية. عندما يدخل المالك البريد من لوحة الإدارة يتحقق normalizedEmail بالـ email الحقيقي في DB (bdalslamanwralajsh@gmail.com بدون LRM) فيفشل المقارنة secureEqual → «بيانات الدخول غير صحيحة».
الحل: تنظيف ENV ADMIN_EMAIL من الحروف غير المرئية. الـ curl نجح سابقًا لأن DB كان يحتوي hashًا صحيحًا لكن... لا، curl نجح أيضًا! curl نجح لأن DB يحتوي حسابًا صحيحًا والـ curl يمر عبر getOrSeedOwnerAccount (الحساب موجود). لكن المتصفح فشل؟! يجب أن يكون نفس المسار... إلا إذا: curl تم قبل تحديث السرينات بـ LRM — لا، السرينات لم تتغير وقتها.
الاحتمال الأرجح حاليًا: فشل المتصفح كان بسبب نسخة قديمة مخبأة أو جلسة. الآن بعد تحديث السرينات النقية وإعادة hash، يجب اختبار تسجيل الدخول مجددًا في المتصفح المنشور.

## 18:38 المستخدم رفض بطاقة إدخال ADMIN_EMAIL الثانية
القيمة الجديدة تحتوي أحرف LRM خفية أيضًا (30 حرف). الحل الجذري المستقل عن المستخدم: تعديل normalizedEmail في adminSession.ts ليحذف أحرف التحكم/التنسيق غير المرئية (LRM U+200F، RLM U+200E...) قبل المقارنة، وبذلك يعمل الدخول بغض النظر عن السرينات. هذا لا يغيّر أي تصميم. يجب: تعديل server/adminSession.ts → اختبار → curl على المنشور؟ (لا يعمل إلا بعد publish). سيعمل في dev. للتأكد من المنشور: يجب checkpoint جديد.

## 18:39: إصلاح normalize نجح جزئيًا
- بعد حذف أحرف LRM في normalizedEmail في server/adminSession.ts: اختباران من 3 نجحا (login + protected appearance).
- المتبقي فشل logout: السطر 56 في الاختبار يتوقع account.email === ENV.ADMIN_EMAIL، لكن الحساب في DB هو bdalslamanwralajsh@gmail.com والـ ENV الجديدة قد تحتوي أحرف LRM (30 حرف) فيصبحا غير متطابقين.
- الحل: يجب أن يكون email في DB (بعد normalize من جهة الخادم) مطابقًا. DB يحتوي حساب id=1 بإيميل نظيف. السبب الحالي لفشل logout: بعد تسجيل الدخول بنجاح، account() يعيد الحساب من DB (نظيف). المشكلة على الأرجح في السطر 56: test يقارن بـ ENV (مع LRM) فيفشل. أو أن الخادم بعد seed يقارن... 
- ملاحظة: login نجح الآن! يعني الخادم قارن بشكل صحيح. فشل logout = الاختبار يقارن بـ ENV الملوثة. الحل الأفضل: تنظيف ENV في dev server غير ممكن بدون بطاقة، لكن يمكن تعديل ENV runtime عبر dotenv? لا —ENV تُحقن من النظام.
- بديل: تعديل adminSession.ts ليكتب email النظيف في الـ session/account بحيث يظهر نظيفًا، ولأن ENV ملوثة بالـ LRM، يجب إزالة LRM عند استهلاك ENV.adminEmail أيضًا (getOrSeed/updateAdminCredentials يستخدمان normalizedEmail(ENV.adminEmail) = نظيف بالفعل، لكن السطر 79 في validateAdminCredentials fallback يستخدم normalizedEmail أيضًا = نظيف). إذن لماذا فشل logout؟ لأن الاختبار يتوقع email === process.env.ADMIN_EMAIL (الملوثة). الحل: تعديل الاختبار ليقارن بعد normalize (بدل ENV الخام). هذا اختبار داخلي خاص بي، لا بأس.

## الروابط النهائية (لا تتغير)
- الزائر: https://uploadplus-47dkogbk.manus.space/public/index.html
- الإدارة: https://uploadplus-47dkogbk.manus.space/admin.html

## 18:41 فشل الدخول في المنشور رغم إصلاح normalize
سبب محتمل: الخادم المنشور في الإنتاج هو النسخة الأقدم (قبل normalize fix). checkpoint 82120328 حُفظ — هل نُشر تلقائيًا (auto-publish مفعل)؟ يجب التحقق من curl على المنشور بعد checkpoint. ملاحظة مهمة: فشل المنشور قد يكون أيضًا لأن الـ ENV المنشورة ما زالت ملوثة بـ LRM — لكن الخادم الجديد normalize يحذفها! إذن الفشل سببه أن الخادم المنشور لا يحتوي التعديل. تحقق: curl على https://uploadplus-47dkogbk.manus.space بعد نشر 82120328.

## 18:42 فشل الدخول من المتصفح في الإنتاج رغم نجاح curl (success:true)
curl إلى المنشور يعطي success:true مع نفس البيانات، لكن المتصفح في نفس الصفحة يظهر «بيانات الدخول غير صحيحة». فرضية: المتصفح يرسل البريد بطريقة مختلفة (normalizer عميل؟) أو أن الرمز المنشور يستخدم جلسة قديمة محظورة؟ الأرجح: المتصفح يستخدم normalizeLoginEmail عميل ويضيف شيًا؟ أو أن صفحة admin المنشورة لم تُحدَّث؟ لكن admin.html يعرض admin-app-r22 (من screenshot). الفرضية الأقوى: خطأ "بيانات الدخول غير صحيحة" يظهر عند فشل API، لكن curl من نفس الشبكة نجح — الفرق الوحيد: المتصفح لا يرسل superjson json؟ يجب فحص network log أو استكشاف الكونسول مباشرة بإرسال login عبر fetch مثلما يرسل الكود الفعلي.

## 18:44 تشخيص كامل
curl: login يعطي success + كوكي wajbat_admin_session + account بعدها يعمل ويعيد البريد الصحيح. إذن الخادم المنشور (100%) سليم. المتصفح ينجح mutate (fetch مع credentials:same-origin يحفظ الكوكي تلقائيًا) لكن بعدها refresh يرمي خطأ «بيانات الدخول غير صحيحة». ملاحظة غريبة: في المتصفح errorBox يعرض «بيانات الدخول غير صحيحة» وهو state.loginSettings?.invalidCredentialsText الافتراضي. يعني catch التقط خطأ من mutate أو refresh. لكن fetch مع credentials:same-origin في صفحة uploadplus-47dkogbk.manus.space يجب أن يحفظ الكوكي (HttpOnly; Secure; SameSite=Lax) — يجب أن يعمل!
فرضية جديدة: ربما الخادم المنشور autoscale يوجَّه requests لعدة نسخ غير متزامنة؟ أو أن JWT verify يفشل بسبب... لا. الأرجح: fetch نجح لكن الـ cookies لم تُخزَّن (sandbox browser بدون نفس الأصل؟ لا — الصفحة على نفس الدومين).
الاختبار الحاسم: من داخل صفحة المتصفح، نفذ login ثم account متتاليًا وأخبرني بالنتيجة. إن نجح account → المشكلة في query آخر داخل refresh (مثل admin.passkeys يرمي خطأ غير مرتبط بالدخول؟ لكنه protected — بدون كوكي يعطي 401 → messageOf يعيد «بيانات الدخول غير صحيحة»؟ لا، messageOf(401)...). تحقق من messageOf.

## 18:45 النتيجة الحاسمة
كل خطوة fetch من داخل صفحة المتصفح تنجح (login, account, collections, passkeys كلها 200). إذن الخادم سليم والكوكي يُخزَّن. لكن الضغط على زر تسجيل الدخول في UI ما زال يعرض «بيانات الدخول غير صحيحة». الفرضية: المتصفح استخدم كوكي قديمًا/جلسة منسوخة؟ لا — نفس الصفحة. الأرجح: عند النقر في UI، الـ fetch يرسل الكوكي لكن الـ browser profile يرفض تخزين كوكي HttpOnly؟ لا — account نجح مباشرة بعد login في نفس الكونسول.
فرضية أقوى: ربما صفحة admin المنشورة في المتصفح استُخدمت من قبل بجلسة فاشلة، وفي هذه الجلسة السابقة mutate رمى، و«بيانات الدخول غير صحيحة» ظهرت... لكننا رأينا النص يظهر مباشرة بعد النقر الأخير. ربما زر الدخول في UI يرسل normalizeLoginEmail بشكل صحيح...
احتمال مهم: التوقيت — عند النقر على الزر، هل حدثت إعادة تحميل/redirect قبل اكتمال fetch؟ لا.
الخطة: أعد تحميل الصفحة وأعد اختبار النقر مع hook على console.error وperformance (fetch failures) لالتقاط الخطأ الفعلي.

## 18:46 اكتشاف جوهري
الـ hook سجل: account=200, ownerLoginSettings=200, passkeys=200، وكلها في نفس الطلبات التي ينفذها UI. إذن refresh نجح كله! لكن الخطأ «بيانات الدخول غير صحيحة» ظهر. كيف؟ إذاً الخطأ يأتي من mutate login نفسه؟ لكن hook لم يسجل login كفشل (الشرط يستثني login). إذن login أعاد 200... لكن ربما payload login كان خطأ؟ لا.
انتظر: السجل لا يحتوي login. الشرط: s>=400. إذاً login كان 200. إذاً كل شيء 200، لكن UI يعرض الخطأ! أين يُعرض errorBox؟ فقط في submitLogin catch. كيف قفز إلى catch إذا لم يُرمَ شيء؟
فرضية: await refresh() لا يوجد فيه await داخل Promise.all على fetchات غير محفوظة الكوكي؟ لا...
فرضية جديدة: النقر على الزر نفذ submitLogin من سكريبت قديم (cache) الذي لم يتضمن إصلاحات؟ لكن r22 محدث والبصمة blog-r1 واضحة. أو: النموذج يحتوي حقلين بنفس name وأحدهما من نسخة قديمة؟
فحص مباشر: استعن بـ hook أشمل — سجّل كل fetch بلا شرط وأرَ ما حدث بالترتيب الزمني الدقيق أثناء النقر.

## 18:46.5 محاكاة submitLogin كاملة من الكونسول نجحت تمامًا
نفس المنطق الحرفي: login success + 9 طلبات كلها 200. لكن النقر على الزر عبر عنصر index يعرض «بيانات الدخول غير صحيحة».
فرضية حاسمة: عند النقر بـ index (tool) ربما الحدث يمر بمعالجة مختلفة، أو أن fill_form أعاد تعيين القيم لكن form.querySelector('#login-error')... لا.
فرضية أقوى: fill_form يملأ الحقول لكن button index 4 قد يكون زرًا من نموذج مخفي آخر (#login-form قديم أو نسخة مكررة)، أو أن الكود الذي استمع عليه addEventListener('submit') موجود على نموذج مختلف عن النموذج الذي مُنع default عليه. أو أن النقر على الزر يسبب إعادة تحميل الصفحة (form.submit default غير مُعطَّل) لأن submitLogin رمى قبل preventDefault؟ لا — preventDefault أول سطر.
الاختبار: افحص كم عدد عناصر #login-form في الصفحة، وهل هناك form مكرر، واستدعِ submitLogin الفعلية عبر dispatchEvent مع تتبع.

## 18:46.7 اكتشاف مهم جدًا
dispatchEvent('submit') على #login-form: كل الـ fetchات 200، success:true، لكن errorBox يعرض «بيانات الدخول غير صحيحة» ولوحة الإدارة لم تظهر!
إذن بعد refresh() لا توجد dashboard() عرض، أو أن dashboard() رمى خطأ لاحقًا... لكن الخطأ في errorBox — يعني catch التقط خطأ. مع أن كل fetch نجح!
الاحتمال الوحيد المتبقي: خطأ حدث في dashboard() أو بعده داخل submitLogin؟ لا، catch فقط حول await mutate + await refresh، وrefresh رمى؟
انتظر — refresh() رمى بالفعل! كيف؟ Promise.all على 9 طلبات: كل واحد fetch ثم r.status. إذا كان أحدها رمى (r.text() أو json()...) لكن status كلها 200.
أوه! هناك catch داخل query: `if (!response.ok) throw ...; return payload?.result?.data?.json ?? payload?.result?.data;` — ماذا لو أن أحد الطلبات أعاد 200 لكن payload.result.data.json undefined؟ لا، كل الأجسام سليمة.
فحص جديد: ربما dashboard() رمى وsubmitLogin ليس catch عليه. الخطأ يظهر من... أين يُكتب errorBox؟ فقط في submitLogin catch وsubmitPasskey؟ تحقق: ابحث عن "login-error" في السكريبت — ربما معالج آخر (مثل bindEvents عام) يعرض هذا النص عند فشل أي شيء؟ أو أن نص errorBox ثابت في HTML من البداية ولم يُمسَح لأنه في submitLogin يبدأ بمسح textContent لكن حدث النقر هذا لم يمر بـ submitLogin؟
الحاسم: استخرج من السكريبت كل مكان يكتب على #login-error وكل مكان يعرض النص «بيانات الدخول».

## 18:47 تحليل أعمق
errorBox موجود داخل login-form نفسه. submitLogin يمسحه أولًا ثم عند catch يعيد «بيانات الدخول غير صحيحة» (loginDefaults.invalidCredentialsText). إذن catch التُقط فعلًا أثناء mutate أو refresh رغم أن كل fetch أعاد 200 في سجل hook!
تنبيه: في تجربتي الأخيرة (dispatchEvent) نص errorBox «بيانات الدخول غير صحيحة»... لكن هل هو من هذه التجربة أم بقي من تجربة النقر السابقة (index 4) التي عرضت النص قبل أن أشغّل الـ hook الجديد؟ نعم محتمل! الـ hook الجديد رُكّب بعد أن بقي النص.
الاختبار الحاسم: امسح errorBox يدويًا ثم أعد dispatchEvent وراقب هل يظهر النص من جديد. إن بقي فارغًا → النقر السابق هو المصدر، والآن نجح فعلًا.

## 18:47.3 خطأ مؤكد داخل refresh() رغم نجاح fetch
errText «بيانات الدخول غير صحيحة» ظهر مجددًا بعد مسح وإعادة submit. login-card ما زال ظاهرًا (لم تنجح dashboard). إذن refresh رمى فعلًا. كل الـ 9 fetch نجحت (200). إذن الخطأ يأتي من بعد الاستجابات: من معالجة response.json() أو من dashboard()...
تذكّر: query() داخل refresh: `const payload = await response.json().catch(() => null); if (!response.ok) throw ...; return payload?.result?.data?.json ?? payload?.result?.data;`
إذا كان response.ok=200 وpayload.result.data.json موجود — لا خطأ. لكن ماذا إذا json() رمى خطأ parsing غير ملتقط؟ ملتقط بـ catch(() => null) ثم payload=null → payload?.result?.data?.json = undefined → لا رمي.
فحص مباشر: أعِد تعريف refresh() في الكونسول مع console.log لكل خطوة ثم استدعِه لرؤية أين الخطأ بالضبط.

## 18:48 refresh سليم
refresh = Promise.all على 9 query ثم أسناد state ثم dashboard(). لا يمكن أن يرمي إلا: query رمى، أو dashboard() رمى. dashboard() مُعرّف قبل refresh. الخطأ يُلتقط في submitLogin catch... انتظر، submitLogin catch: `errorBox.textContent = state.loginSettings?.invalidCredentialsText || messageOf(error)` — إذا رمى dashboard() بعد login (خارج try submitLogin؟ لا — refresh() داخل try).
فحص حاسم: طبّق query('adminAuth.passkeys') وquery('admin.collections') مباشرة عبر eval واستخرج الاستثناء الحقيقي.

## 18:48.7 لحظة! الفرق الحاسم
عندما نجح الكونسول سابقًا، كنا قد أنشأنا بالفعل كوكي جلسة صالحًا من fetch السابق! بعد إعادة تحميل الصفحة، الكوكي القديم انتهت صلاحيته أو لم يعد صالحًا، والـ login الجديد يحتاج إرسال... انتظر login لا يحتاج كوكي!
لكن: submitLogin يرسل login (200 success) ثم refresh. سجل الكونسول السابق (dispatchEvent) أظهر login=200 + الـ 9 طلبات كلها 200. إذن كل شيء 200 رغم أن errorBox ظهر! كيف؟
ملاحظة: في اختبار الـ dispatchEvent السابق، نص errorBox كان ظاهرًا قبل التشغيل (بقي من اختبار index 4). مسحناه ثم أعَدْنا — ظهر مجددًا. لكن... هل يمكن أن الـ login نجح لكن refresh رمى من dashboard()؟ dashboard() قد ترمي خطأ إذا state.collections الخ... لا يرمي عادة.
الاختبار الحاسم الأخير: عدّل loginDefaults.invalidCredentialsText مؤقتًا لقيمة مميزة عبر JS ثم انقر الزر: إذا ظهر النص المميز → الخطأ من catch submitLogin الحقيقي (أي من mutate أو refresh فعليًا يرمي). إن لم يظهر → نص errorBox يُكتب من مكان آخر (مثل dashboard عند فشل شيء) أو أن النص المميز ظهر عبر messageOf(error)؟ messageOf يعيد الرسالة من error.message وليس من invalidCredentialsText. إذن إذا ظهر النص المميز = catch حقيقي.

## 18:49 تأكيد: catch حقيقي
mutations أظهرت مسح ثم كتابة النص — من submitLogin catch. إذن mutate أو refresh رمى فعلًا. لكن سجل الـ hook السابق (نفس الصفحة، نفس النقر) أظهر كل شيء 200! التفسير الوحيد المتسق: الكود يرمي من مكان لا يسجله hook — وهو json parsing في query؟ ملتقط.
تذكّر: refresh ينادي dashboard() بعد await Promise.all. dashboard() ليس async — إذا رمى sync، يُلتقط في catch submitLogin (نعم، catch على await refresh يلتقط أخطاء dashboard أيضًا). dashboard() يعتمد على state وHTML. هل dashboard() رمى؟
احتمال كبير: في الكود المنشور، loginVisual أو renderLogin... انتظر، قبل dashboard(): bindSidebarNavigation()؟ لا.
فحص: اعرض dashboard() من السكريبت المنشور وابحث عن رمي أخطاء.

## 18:49.5 ملخص تشخيص شامل (قبل ضغط السياق)
المشكلة: في الإنتاج (https://uploadplus-47dkogbk.manus.space/admin.html) بعد إدخال البريد bdalslamanwralajsh@gmail.com / abd77312 والنقر على تسجيل الدخول، يظهر «بيانات الدخول غير صحيحة» رغم أن:
- curl من نفس الشبكة: login=success + كوكي wajbat_admin_session + account بعدها يعمل (200، يعيد البريد الصحيح).
- من كونسول المتصفح: كل fetch مباشرة (login, 9 طلبات refresh) = 200 + success:true.
- MutationObserver على #login-error أكد أن النص يُكتب من submitLogin catch (مسح ثم كتابة).

الحقائق المؤكدة:
1. السكريبت المنشور: /assets/js/admin-app-r22.js?v=blog-r1
2. submitLogin: await mutate('adminAuth.login',{email,password}) ثم await refresh()، catch يكتب errorBox.
3. refresh: Promise.all على query('admin.collections','admin.stats','admin.requests','admin.messages','admin.submittedReviews','admin.media','adminAuth.account','adminAuth.ownerLoginSettings','adminAuth.passkeys') ثم أسناد state ثم dashboard() غير async.
4. mutate وquery: fetch `/api/trpc/${procedure}` مع {credentials:'same-origin'}، throw إذا !response.ok، وإلا payload?.result?.data?.json ?? payload?.result?.data.
5. dashboard() يعتمد على state.navOpen وsidebar() — لا يبدو أنه يرمي.
6. loginDefaults.invalidCredentialsText = 'بيانات الدخول غير صحيحة' (سطر 7717 في r22).

نقطة غامضة: رغم أن كل fetch أُظهر 200 عبر hook، catch التقط خطأ. الفرضيات المتبقية:
أ) ربما catch يلتقط خطأ من await refresh() لأن dashboard() رمى خطأ sync (مثل document.querySelector('#admin-root')؟ موجود. أو sidebar() استخدمت state.passkeys بشكل خاطئ؟).
ب) ربما أحد الطلبات في Promise.all رمى من json() قبل الالتقاط الداخلي — لكن query يلتقط json failure ويحول null ثم يعيد undefined — لا رمي.
ج) ربما credentials:'same-origin' لا يرسل الكوكي في هذا السياق فlogin نجح لكن الـ 9 طلبات فشلت... لكن hook أظهر 200 لكلها!
د) ربما هناك نسخة ثانية من السكريبت قديمة تعمل (cache) — البصمة v=blog-r1 واضحة لكن قد يكون هناك سكريبت آخر داخل index.

الخطوة التالية المقترحة:
- أعِد بناء dashboard/refresh في scope الصفحة عبر new Function مع async wrapper صحيح (new Function body كـ string داخل setTimeout async) مع console.log لكل سطر، أو أعد استدعاء refresh عبر: scriptElement جديد يُحمل بنسخة معدلة؟ أو: استخدم eval module عبر Blob URL type=module.
- أو الأسهل: افحص الخادم المنشور logs عبر manus-webdev-logs لمعرفة إن كان هناك رمي في login بعد success (مثل فشل set-cookie؟ لا).

## 18:49.7 اكتشاف جديد: [Auth] Missing session cookie في الإنتاج
سجلات الإنتاج تعج بـ "[Auth] Missing session cookie" أثناء كل عملياتنا. هذه تظهر من الـ 9 طلبات refresh (كلها عبر الترميز المشفر protectedProcedure؟ لا — بعضها public لكن context يتحقق دائمًا).
سؤال: إذا كانت الـ 9 طلبات تعيد "Missing session cookie" كخطأ HTTP... لكن hook أظهر status=200!
أوه!!! status=200 لكن body هو {"error":{...}} لأن tRPC يعيد 200 للخطأ؟ لا — TRPCError رمى → status 401. لكن curl سابقًا أظهر: adminAuth.login success ثم account بـ 200 مع الكوكي المرسَل.
لكن المتصفح: login نجح (success) — login يمنح كوكي set-cookie. ثم refresh... هل الكوكي لُعب بشكل صحيح؟
فحص من منشور curl: عند login، header set-cookie: wajbat_admin_session=...; HttpOnly. المتصفح قد يرفضه إذا Secure+SameSite مع سياق iframe/preview؟ نحن على النطاق الحقيقي uploadplus-47dkogbk.manus.space مباشرة — يجب أن يعمل.
لكن! سجل الإنتاج يظهر Missing session cookie في 18:49:10 (مجموعة من 9 = refresh كاملة!). إذن الـ 9 طلبات في المتصفح لم يرسلوا الكوكي أو الخادم المنشور رفضه!
الحل/الفحص: هل كوكي الجلسة من login فشل في الإرسال بسبب SameSite? افحص headers login response من الكونسول (getEntries أو تسجيل response headers).

## 18:50.2 login + account ناجحان في المتصفح على المنشور (200 + البريد الصحيح)
إذن كوكي الجلسة يعمل. سجلات "[Auth] Missing session cookie" قد تكون من صفحة التحميل الأولية أو passkeys؟ على أي حال: الطلبات الموثّقة كلها 200 سليمة.
بعد ذلك كل طلبات refresh التسعة 200 (موثقة سابقًا). لكن catch يعرض الخطأ!
الاحتمال الوحيد الذي لم نفحصه: dashboard() رمى sync داخل refresh بعد state. أو... انتظر: في submitLogin الكود:
```
try { await mutate(...); await refresh(); dashboard(); } catch(e) { errorBox.textContent = ... }
```
هل dashboard() مكررة بعد refresh() الذي يناديها داخليًا؟ هذا لا يسبب رميًا.
فحص dashboard(): `${sidebar()}...` — sidebar() تستخدم state + navCount + esc + fmtDate. esc وfmtDate معرفان؟ نعم موجودان في السكريبت (يستخدمان في كل مكان). لكن ماذا لو sidebar() نادى navCount(state.stats) ثم state.passkeys... كل شيء آمن.
فرضية جديدة: loginDefaults.invalidCredentialsText يُقرأ من state.loginSettings?.invalidCredentialsText || messageOf(error). إذا messageOf(error) أعاد النص — لكن النص «بيانات الدخول غير صحيحة» هو من loginDefaults فقط... إلا إذا error.message نفسه هذا!
من أين يأتي error.message بهذا النص؟ من login router في الخادم: إذا كانت كلمات المرور خاطئة → throw TRPCError('Invalid credentials')؟ لا، النص عربي. بحث: أين يعرف الخادم هذا النص؟ أو client: messageOf؟
فحص الخادم: routers.ts login: ما هي الرسالة عند الفشل؟

## 18:51 ownerProcedure
كل إجراءات refresh (admin.collections وغيرها وownerLoginSettings/passkeys) هي ownerProcedure تتطلب جلسة (الكوكي). login ينشئ الجلسة وset-cookie. سجل الإنتاج يظهر "Missing session cookie" — هذا من الـ 9 طلبات refresh لأن الكوكي لم يُستقبل في الخادم المنشور!
لكن hook أظهر 200... انتظر: ownerProcedure: إذا لا جلسة → throw UNAUTHORIZED → status 401. لكن hook أظهر 200!
فحص: admin.collections في curl المنشور (قبل) أعاد 200 مع body سليم [collections] عندما أُرسل كوكي. في المتصفح بعد login: hook أظهر 200 لكل الطلبات. لكن سجل الإنتاج Missing session cookie في نفس التوقيت!
التناقض يُحَل فقط إذا: الخادم المنشور يعمل على عدة_instances_ أو أن سجل المنشور من طلبات أخرى (نفسنا، لكن من صفحة التحميل الأولية قبل login). توقيت 18:49:10 و18:48:40 و18:48:38 = مجموعات refresh تجريبية. لكن hook قال status=200!
احتمال مهم: hook سجل status من استجابات مختلفة — 9 في مجموعة refresh × عدة تجارب.
الخلاصة: لا يمكن التوفيق بين "200 في hook" و"Missing session cookie في الخادم" إلا إذا الكوكي أرسل لكن الخادم رفضه (signature فشل!) — عندها يرمي 401 لا 200.
حل نهائي: جرب refresh من الكونسول مع ملاحظة حالة كل استجابة body لا status فقط — ربما body يحتوي error.

## 18:51.5 استنتاج حاسم محتمل
كل fetchات الكونسول (login+refresh) = 200 وسليمة تمامًا. لكن dispatchEvent/btn.click() يعرض الخطأ!
الفرق الوحيد: dispatchEvent/btn.click() يعملان في نفس الصفحة! وhook سجل الـ 200 أيضًا في تجربة الـ dispatchEvent السابقة. لكن الخطأ ظهر!
كيف يمكن أن كل fetchات refresh 200 سليمة ثم catch؟ الاحتمالات المتبقية صفر تقريبًا إلا:
1) dashboard() رمى داخل refresh بعد await. لكن الكونسول نفسه لا ينفذ dashboard().
2) هناك كود بين refresh والدالة التالية رمى... لا.
3) أحد طلبات refresh في UI (عبر fn mutate) استخدم body مختلف/مقطع... لا.
4) MutationObserver أظهر أن errorBox كتب مرتين: مسح ثم «بيانات الدخول». لكن هل من الممكن أن النقر (btn.click) نفّذ submit مرتين (نموذجان أو معالجان: addEventListener على form + onclick على button)؟
الفحص: عدّ event listeners على الـ form والـ button. هل يوجد اثنان؟ إذا استُدعي submitLogin مرتين بالتسلسل، الأولى تنجح، الثانية... الكوكي موجود، login ينجح مجددًا... لا خطأ.
5) أو المعالج الثاني: submitPasskey الذي قد يرمي؟
6) أو أن الخطأ ليس من submitLogin أصلًا! MutationObserver رصد تغيير النص. لكن من سجل الـ stack في console.log... كان أنونيماً.
حل نهائي مباشر: أعد تعريف submitLogin في console مع console.trace داخل catch. كيف أنفذ؟ عبر eval على السكريبت مع تعديل اسم الدالة لا يؤثر على الـ UI. لكن UI يشير إلى الدالة الأصلية.
الحل: أعتَرِض على Promise.prototype.catch؟ لا. الأفضل: عدّل الخطأ عبر إضافة log في query/mutate عبر Object.defineProperty على console.error... فعلنا ولم يظهر شيء.
جرب: أعِد تحميل الصفحة، ثم قبل أي شيء أعد تعريف window.addEventListener('error') وunhandledrejection، ثم انقر الزر الحقيقي عبر tool، ثم افحص.

## 18:52.2 النقر الحقيقي عبر tool أظهر الخطأ مجددًا
تم تثبيت window.__errs + MutationObserver مع stack قبل النقر الحقيقي (index 4). الخطأ ظهر في markdown («بيانات الدخول غير صحيحة»). الخطوة التالية: قراءة window.__errs لمعرفة المصدر الحقيقي.

## 18:52.5 لا أخطاء sync/unhandled — الخطأ من catch داخل submitLogin نفسه
التالي: هل كود الخادم المنشور (dist) مختلف عن المحلي؟ curl على المنشور نجح login... إذن الخادم المنشور سليم (login نجح من الكونسول والـ curl).
نقطة مهمة جدًا: الـ curl السابق عبر الشبكة... هل كان من نفس sandbox إلى المنشور؟ نعم من sandbox. إذن منشور الإنتاج: login=200، account=200، collections=200 (عبر curl مع كوكي).
من الكونسول: login+refresh تسعة = كلها 200 سليمة.
من tool-click (نفس الصفحة): الخطأ يظهر!
الفرق الوحيد المنطقي: الـ tool click يستهدف الزر عبر index على صفحة «محدثة جزئيًا»؟ لا، نفس الصفحة.
أو: النقر أُرسل بينما الصفحة في حالة «جار التحقق من صلاحية الوصول» — صفحة الدخول تحتوي طبقتين: شاشة «جار التحقق» + النموذج. هل الـ click ضرب زرًا في شاشة أخرى أو form قديم؟
أو: السكريبت يعيد رسم النموذج أثناء النقر (re-render) فيبطل الحدث؟
أو: هناك نسختان من السكريبت: module في index.html يستورد أيضًا؟ admin-app-r21 + r22 معًا — r21 يحتوي دالة login قديمة تُسمع على نفس الـ form! نعم! احتمال قوي: admin-app-r21.js (القديم) لا يزال مُحمّلًا في HTML المنشور أو module loader يحمل الاثنين، وr21 submitLogin يرمي الخطأ!
الفحص: عدّ كل السكريبتات في الصفحة + عدّ event listeners على الزر/الفورم.

## 18:53 فحص السكريبتات
زر واحد وفورم واحد، ولكن هناك 15+ سكريبتات إدارية! أي منها قد يستمع لـ submit ويكتب الخطأ؟
مرشح رئيسي: admin-owner-login-security-r6.js أو admin-owner-login-enhancements-r14.js — قد تحتوي كود تسجيل دخول خاصًا يتعارض.
وأيضًا: هل admin-app-r22.js يستورد/يعيد تعريف؟ السكريبتات الـ 15 كلاسيكية (script src) — ترتيب التحميل! admin-app-r22.js module يُنفذ... هل السكريبتات الأخرى تعمل على نفس الـ DOM؟
يجب فحص: من أين يأتي نص «بيانات الدخول غير صحيحة» في كل السكريبتات المنشورة (grep على ملفات CDN).

## 18:53.3 security-r6 وenhancements-r14 ليسا المصدر
- security-r6 يستمع submit على [data-owner-login-credentials] (فورم تغيير البريد/كلمة المرور في لوحة الإدارة).
- enhancements-r14 يستمع على [data-owner-login-settings] capture=true (فورم الإعدادات).
فورم الدخول الرئيسي يجب فحص selector الخاص به في r22: هل هو [data-owner-login]؟ وما هو اسم الدالة التي تستمع له؟ وهل توجد نسختان مستمعتان؟

## 18:54 تحليل bindLoginForm
- سطر 144: bindLoginForm: form.addEventListener("submit", submitLogin) — بدون capture، بدون stopImmediatePropagation.
- سطر 149: click listener capture=true على document — لا preventDefault لنص "تسجيل الدخول" العادي (لا يملك data-owner-login-*). إذن button.type=submit يولد حدث submit طبيعي.
- refresh في r22 المنشور: ماذا يحتوي refresh()؟ هل admin.blog؟ لا — blog manager منفصل (mountCompatibleBlogManager من admin-blog-manager-r1.js).
الاحتمال الأخير الأقوى: passkeys API! في refresh أو login قد يستدعي الكود navigator.credentials.get() الذي في Sandbox browser يعود بـ DOMException "The operation either timed out or was not allowed"? لكن هذا سيكون في fetch monitor...
فحص refresh() المنشور كاملًا.

## 18:54.5 الكود نظيف — الفرضية النهائية المتبقية
- S142: normalizeLoginEmail يحذف LRM/RLM بالفعل (تم في إصلاح سابق).
- query/mutate سليمان. refresh = Promise.all + state + dashboard().
الطريقة الحاسمة: أدرج نسخة instrumented من refresh داخل الصفحة عبر new Function من نص السكريبت المنشور مع console.log، وأستدعيها بدل الأصلية، ثم أنقر الزر عبر tool... لكن UI يستخدم الأصلية.
حل أسرع وأضمن: أعدل r22 مؤقتًا ليكتب console.trace في catch ويكشف الخطأ الفعلي. لكن النشر يتطلب checkpoint! البديل: يمكنني إضافة index.html تعديل بسيط؟ لا — auto-publish.
الحل الأذكى: استخدام MutationObserver مع أداء submitLogin نفسه — أعرف أنه يُنفذ (النص يتغير). هل يمكن أن الخطأ من messageOf(error) حيث error ليس Error بل response؟ لا.
انتظر... هناك احتمال لم يُفحص: هل السكرتين r22 module يتعارض مع admin-app قديم (inline) في index؟ يوجد INLINE×3 في scripts! ما محتوى الـ inline scripts في HTML المنشور؟

## 18:54.9 أسئلة مفتوحة
التسلسل في admin.html: r22 → media-binding → structured-editor → homepage → services → visitor-links → downloads → contact → blog.
لكن الصفحات المنفصلة (admin-owner-login-security-r6, admin-owner-login-enhancements-r14, admin-design-studio-r2, admin-security-controls, admin-list-controls*) من أين تُحمّل؟ يجب أن تكون referenced في HTML أيضًا أو من r22 نفسه. فحص HTML المنشور لبقية السكريبتات.

## 18:55.2 خلاصة HTML: لا تعارض تحميل
كل السكريبتات تُحمّل عبر append سليم وdefer. لا يوجد script مكرر.
التشخيص المنطقي المتبقي (احتمالان فقط):
1) catch في submitLogin يُلتقط خطأ حقيقي — لكن hook على fetch سجل كل شيء 200. إلا أن error قد لا يكون network: query() قد يرمي إذا payload null... لكن hook سجل النجاح.
2) السكريبت r22 في /tmp/pub_r22.js قد يكون نسخة قديمة رغم wc متطابق مع المحلي (لأن المحلي نفسه لم يتغير!) — هل التعديل (normalizeEmail حذف LRM) موجود في r22؟ نعم محليًا S142، لكن هل في المنشور؟ يجب diff: r22 محلي = r22 منشور؟ wc كان 83729 للطرفين. لكن هل التعديل الجديد (إصلاح login) كان داخل r22 أم routers.ts؟ الرامي هنا هو client، وr22 لم يتغير منذ إصلاح normalizeEmail (كان التعديل في adminSession.ts فقط). إذن r22 المنشور سليم.
نظرية نهائية: الـ fetch في UI يعمل تمامًا، لكن refresh() من UI يُنفذ على state فارغ ثم dashboard() يرمي خطأ غير caught؟ dashboard() داخل submitLogin محمي؟ لا — refresh() داخل try/catch في submitLogin! نعم: try { await login; await refresh(); } catch { errorBox... } — refresh() كاملة محمية.
يجب أن الخطأ real. سأضيف كود تتبع دائم في admin.html: أدرج سكريبت inline صغير يلفّ fetch ويسجل كل response غير 200 وكل throw من login... ثم checkpoint + نشر، ثم نقر. هذا هو الطريق الأمثل.
لكن أسهل طريقة: في admin.html أضيف inline script قبل تحميل r22 يلتقط: window.addEventListener('unhandledrejection', log)، ويعيد تعريف console.error، ويسجل performance entries. وأتركه في النشر.

## 18:57.1 اكتشاف جوهري: traceType = undefined في الإنتاج!
النسخة المنشورة من admin.html لا تحتوي سكريبت التتبع رغم checkpoint b57f1715! يعني: النسخة المنشورة قديمة (ربما من قبل إصلاح normalize أو حتى أقدم). النقر نفذ (errorBox كتب النص) لكن الصفحة تعمل بكود قديم.
الأسئلة: هل البادئة manuscdn تعيد نشر القديم؟ هل هناك استثنائية في النشر؟
الخطوات: curl مباشرة على https://uploadplus-47dkogbk.manus.space/admin.html وفحص وجود __loginTrace. إن كان غائبًا = النشر لا يلتقط أحدث checkpoint. الحل: فحص آلية النشر + ربما إعادة النشر يدويًا عبر dashboard أو انتظار.

## 18:57.3 تأكيد: المنشور عالق عند آخر-تعديل 18:41:16Z
آخر نشر حقيقي للموقع المنشور كان عند 18:41 (ربما عند بداية هذا الجلسة أو قبلها). checkpoints من 18:41 إلى 18:56 (b57f1715 وغيرها) لم تُطبّق على النشر المنشور رغم أن الأداة قالت نجاح. ملاحظة: last-modified 18:41 قد يكون تاريخ آخر deploys ناجح. يجب إعادة checkpoint الآن ومراقبة النشر مرة أخرى. احتمال: auto-publish نشر فعليًا لكن CDN cache stale رغم cache-control no-cache (قد تكون CDN تطبق edge cache). الحل: تغيير اسم الملف admin.html → admin-r2.html في admin-app؟ لا — الأخطر: يجب التحقق هل r22 المنشور يحتوي normalizeEmail الجديد! curl على r22 المنشور للتحقق.

## 18:58 نشر جديد وصل! (Deployment successful notification)
إشعار النشر الرسمي وصل. يعني checkpoint b57f1715 (مع __loginTrace) يجب أن يكون منشورًا الآن. re-test: curl على admin.html المنشور للتحقق من وجود __loginTrace ثم إعادة اختبار تسجيل الدخول عبر المتصفح.

## 19:00 اكتشاف حاسم من __loginTrace (نسخة منشورة جديدة 18:57)
كل طلب tRPC أعاد 200 دون أي error في body. لا يوجد "Failed to fetch" على أي طلب tRPC. لا unhandled rejection في السجل.
ومع ذلك errorBox كتب «بيانات الدخول غير صحيحة».
استنتاج نهائي: messageOf(error) في catch يُستدعى بـ error ليس من الشبكة بل من كود mutate/client-side throw. لكن كيف يُرمى إذا body سليم؟
فرضية جديدة دقيقة: في refresh()، ربما يُقرأ state.loginSettings?.invalidCredentialsText أو هناك رمز في loginDefaults... لا، errorBox يُكتب فقط في catch.
فرضية أقوى: fetch wrapper في الرقابة أعاد res سليم، لكن كود tRPC client أو mutate يقرأ res.json() نفسه (clone) وقد يفشل أحدهما أو response مستهلك؟ No—clone مستقل.
احتمال نهائي واقعي: login نجح (200 + success)، لكن refresh() رمى خطأ من أحد طلباتها رغم 200؟ إذا response 200 فلا يرمي tRPC client.
هل refresh() ترمي من كود غير fetch (مثل JSON parse يدوي أو localStorage)؟
الخطة: في refresh() المحلية، لف كل await بtry حولها عبر console.error مخصص: أضيف hook على window.__errs عبر performance؟ الأفضل: أعد قراءة refresh() المنشور كاملًا من الكونسول وأفحص أي throw ممكن.
ملاحظة أخرى: الطلبات في refresh تشمل admin.submittedReviews/admin.requests/adminAuth.passkeys/... كلها 200 في التتبع. لا body errors.
قد يكون الخطأ من query(): mutate ثم refresh — mutate قد يرمي إذا كانت الاستجابة بها result error! bodySnippet فارغ لأنه من statusText. لم أفحص body error! tRPC خطأ يعيد HTTP 200 مع body {error:...}. يجب إعادة hook لقراءة p.error!
حقيقةً: hook كان يقرأ p.error.json.message لكن tRPC شكل error مختلف: p.error.json.message صحيح (tRPC v11). يجب إعادة فحص bodies بدقة.

## 19:00.2 كل API سليم في هذه الجلسة (جلسة محفوظة من قبل — لذلك account=200)
التتبع السابق أظهر login POST = 200 أيضًا. الاستنتاج المؤكد الآن:
- UI يرسل login → 200 (نجاح)
- UI يرسل refresh → كل طلباته 200 بلا errors
- ومع ذلك catch كتب «بيانات الدخول غير صحيحة»
الاحتمال الوحيد المتبقي: refresh() رمى خطأًا غير fetch: مثلاً JSON.parse من localStorage، أو JSON.parse لـ response يدوي، أو window.location = ... رمى، أو هناك await على undefined.
يجب استخراج refresh() المنشور كاملًا وفحصه سطرًا سطرًا. أو: تعديل client ليلتقط الخطأ ويسجله في __loginTrace (stack كامل) — هذا أدق! سأعدّل r22 أو inline في admin.html: أغلف mutate/refresh بعرض الخطأ داخل errorBox كنص مطول في dev mode؟ الأأنظف: في admin.html inline script بعد تحميل r22 (عبر MutationObserver على errorBox) يسجل err box text + آخر throw.
أبسط: أضيف في inline script موجود (موجود أصلًا في admin.html؟) أو أعدل r22 مباشرة: قبل errorBox.textContent = ... أضيف: errorBox.setAttribute("data-err", String(error)); console.error(error) — console.error يُسجل في الكونسول وأنا أراه.
سأضيف console.error(error) في catch — لكن catch موجود في r22 ويُنفذ في module؛ console.error يظهر في browser console — سأراه عبر console view بعد النقر!
الحل: سكريبت inline قبل r22 يعيد تعريف console.error ويخزن في __loginTrace: done-ish (غير موجود حاليًا). أضيفه الآن.
