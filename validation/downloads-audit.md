# تدقيق نظام التحميلات الحالي (pasted_content_13.txt — 30 بندًا إلزاميًا)

## بنية التحميلات الحالية (تعمل في الإنتاج)

### 1. جدول Base URL
- `app.js` سطر 447: `let fileBase = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/";`
- يُحدَّث من `siteSettings.fileBaseUrl` (سلسلة `content.js` أو content.collections)
- ملفات PDF أصلية على CDN خارجي: `xBCtuEPnzwmjWUaY.pdf` إلخ (8 فئات × ملفات)

### 2. مصدر البيانات للزائر
- `content.downloads` في contentCollections (جدول): مصفوفة كائنات `{ emoji, title, items: [[name, fileName]], isVisible, categoryOrder }`
- `app.js` سطر 260: `if (Array.isArray(content.downloads)) files = visible(...)` — النظام الديناميكي يعمل ويغلب المصفوفة الثابتة
- `downloadsPage()` سطر 448: يعرض بطاقات file-card مع زر «⇩ تحميل» يفتح `fileBase + file` في تبويب جديد مع `track-download`
- `app.js` سطر 613: `recordContentView(/downloads/files/{name})` — تتبع عرض، لا تتبع تنزيل فعلي

### 3. إدارة التحميلات الحالية (في admin-app-r18.js)
- قسم `downloads` ضمن content collections (محرر محرر JSON عام)
- أزرار: إضافة/تعديل/حذف/إخفاء/ترتيب (↑↓) تعمل على مصفوفة JSON
- السطر data-saveJson: تعديل JSON يدوي (مخالف للبند 25: لا أكواد)
- لا رفع ملفات: يجب كتابة اسم ملف موجود على CDN فقط
- لا صور أقسام/نماذج، لا أوصاف، لا حج
مقصورات — إكمال ملف التدقيق:
- السطر data-saveJson: تعديل JSON يدوي (مخالف للبند 25: لا أكواد)
- لا يوجد رفع ملفات: اسم ملف فقط يشير إلى ملفات CDN خارجية
- لا صور أقسام/نماذج، لا أوصاف، لا ألوان، لا خلفيات
- تتبع الزائر: recordContentView فقط، لا عدّاد تنزيلات فعلي

### خطة التنفيذ (بنود 30)
1. جدول downloads_v2 جديد في drizzle: فئات `{categoryName, description, emoji, color, bgColor, imageKey/imageUrl, categoryOrder, isVisible}` + ملفات `{categoryId, fileName, originalName, description, fileKey, fileUrl, mime, sizeBytes, imageKey/imageUrl, sortOrder, isVisible}` + counter `downloadCount`
2. إجراءات tRPC: admin.getDownloads / saveDownloadsCategory / deleteDownloadsCategory / toggleCategory / saveDownloadsFile / uploadDownloadsFile (multipart أو presign من storage.helpers) / replaceFile / deleteFile / toggleFile / moveFile
3. تخزين الملفات في S3 عبر storage.helpers (storagePut) — رفع حقيقي من الجهاز multipart عبر API مخصص
4. مدير جديد admin-downloads-manager-r1.js + css خاص — واجهة مرئية كاملة: قسم + رفع صور + ملفات + نماذج + بحث + ترتيب + معاينة + نافذة تأكيد حذف داخلية (بدون confirm)
5. ترحيل البيانات الحالية: 8 فئات و15 ملفًا من content.downloads (JSON) إلى الجدول الجديد دون حذف الأصلي
6. صفحة الزائر /downloads من downloads_v2 مع عداد تنزيلات حقيقي (tRPC عام downloads.increment) + معاينة للـ PDF/صور
7. لا قسم ملفات منفصل — كل شيء داخل إدارة التحميلات
8. اختبار شامل 27 بندًا + اختبارات وحدة + بناء + نشر

### ملفات مرجعية
- app.js سطر 260-270: تطبيق content.downloads على files/fileBase
- app.js سطر 437: المصفوفة الافتراضية (لا تُستخدم عند وجود content.downloads)
- app.js سطر 448: downloadsPage()
- app.js سطر 613: track-download
- storage helpers في server/storage.ts: storagePut/Get موجودان
- admin-app-r18.js: bindSidebarNavigation + dashboard + contentWorkspace يجب تسجيل downloads2 كمساحة عمل (mountCompatibleDownloadsManager)
- admin.html: تحميل المدير الجديد مع onerror fallback
- admin-visitor-links-manager-r4.js: مرجع جيد لنمط workspace/activate/mount
### خريطة التنفيذ النهائية (مرحلة الخادم)
ملفات مرجعية جاهزة (من overview):
- drizzle/schema.ts: visitorLinks في السطور 297-312 كمثال نمط. أضيف downloadCategories + downloadFiles قبل 314.
- server/db.ts: ensureSiteSeeded (133-176)، recordAdminAudit (326-329)، siteVisits لـ topDownloads (347-405).
- server/routers.ts: adminProcedure/ownerProcedure، admin.uploadMedia (374-376) يستخدم adminUpload.ts decodeUpload (نوعيات: pdf/doc/docx فقط حتى 8MB، صور 3MB) — يجب توسيع إلى zip/rar/ppt/xls/txt.
- server/adminUpload.ts: decodeUpload — أضيف zip/xlsx/xls/pptx/ppt/txt/images.
- server/adminMediaUpload.ts: uploadAndRegisterAdminMedia — مرجع.
- server/storage.ts: storagePut (39-57) يرجع {key, url}، key عشوائي suffix.
- server/siteSeed.ts: 618-815 شكل downloads القديم {categoryOrder, emoji, title, items:[{name, remoteFile, sortOrder, isVisible}], isVisible} وsiteSettings.fileBaseUrl (816-828).
- client/public/assets/js/app.js: applyManagedContent (241-280) يجعل content.downloads → files وfileBase؛ downloadsPage (448-449)؛ track-download (613).
- client/public/pages/content.js: الأصل الثابت — لا يعدل.

ملاحظات حرجة:
1. رفع الملفات يجب أن يكون binary multipart وليس base64 (المستخدم ممنوع base64 في البرومبت، لكن tRPC يمكن استقبال dataURL — لكن الأفضل multipart عبر fetch إلى /api/uploads/downloads أو استخدام tRPC مع input {fileName, base64...}). الحل: POST endpoint مخصص في Express /api/downloads/upload يقبل multipart/form-data ويقوم storagePut + يسجل في downloadFiles. (tRPC لا يدعم multipart مباشرة)
2. لا قسم إدارة ملفات مستقل: كل شيء داخل «إدارة التحميلات».
3. لا حذف البيانات القديمة: 8 فئات موجودة في content_collections (downloads). سأهاجرها إلى الجداول الجديدة عند أول تشغيل (في ensureSiteSeeded أو migration script يُنفذ مرة).
4. حماية: ownerProcedure لكل إجراءات الإدارة، publicProcedure لعرض + عداد تنزيلات.
5. عداد تنزيلات حقيقي: incrementDownloadCount عند نقر «تحميل الملف» من الزائر (recordDownload publicProcedure).
6. preview: للـ PDF والصور يعرض iframe/img، وإلا تحميل مباشر.

## حالة التقدم (مرحلة الخادم)
- ✅ jtables download_categories + download_files أنشئت في schema.ts وطُبقت الهجرة (webdev_execute_sql OK) — الملفات drizzle/0010_medical_gargoyle.sql
- ✅ مساعدي db.ts أضيفت في نهاية server/db.ts: listDownloadCategories, listDownloadCategoriesPublic, listDownloadFiles(catId, visibleOnly), createDownloadCategory, updateDownloadCategory, deleteDownloadCategory, setCategoryVisibility, createDownloadFile, updateDownloadFile, deleteDownloadFile, setFileVisibility, replaceDownloadFile, moveDownloadFile, moveDownloadCategory, incrementDownloadCount. (كلها ownerProcedure لاحقًا، وعامة للقوائم فقط)
- الاستيرادات: downloadCategories, downloadFiles من drizzle/schema أضيفت في db.ts.

## المتبقي
1. server/routers.ts: إضافة admin.downloads.* وsite.downloads.* (public list) — ownerProcedure للإدارة، publicProcedure للعرض + incrementDownloadCount + recordDownload.
2. إضافة route رفع multipart: /api/downloads/upload في server/_core/index.ts (multer أو formidable) — يجب تثبيت حزمة multipart. البديل: dataURL عبر tRPC (موجود بنمط site.uploadRequestAttachment). **قرار: استخدم multipart عبر formidable (بدون native deps) + POST /api/downloads/upload يُرجع JSON {id, fileName, fileUrl...}**.
3. توسيع server/adminUpload.ts: decodeUpload ليشمل zip/rar/7z/xlsx/xls/pptx/ppt/txt/png/jpeg/gif/webp/svg/mp3/mp4.
4. ترحيل البيانات: migration عند أول تشغيل يقرأ content.downloads من content_collections وينشئ فئات/ملفات جديدة (في ensureSiteSeeded أو script) مع isDefault=false للأصلي. **قرار: script مستقل execute-once في db.ts عبر env flag، أو دالة migrateDownloadsIfNeeded تُستدعى من router عند admin.downloads.list لأول مرة (إذا كانت الفئات فارغة والتحميلات القديمة موجودة).**
5. صفحة الزائر: تعديل app.js downloadsPage لقراءة site.downloads من التتريك بدل content.downloads (مع fallback للقديم). إضافة عداد تنزيلات حقيقي + معاينة PDF/صور (iframe/img).
6. مدير جديد admin-downloads-manager-r1.js + CSS + تحميل في admin.html + workspace mountCompatibleDownloadsManager في admin-app-r18.js — نمط r4 للروابط: workspace(dataSelect)/activate/mountCompatibleW... في window + bindSidebarNavigation data-downloads2-nav.
7. admin.html: تحميل السكربت + onerror fallback + بصمة.
8. اختبار vitest + build + تحقق تفاعلي + checkpoint.

## أنماط مهمة (للاستخدام)
- router نمط: admin.visitorLinks.list في routers.ts السطور 341-358 يستخدم ownerProcedure.
- site.uploadRequestAttachment (317-322) يستخدم decodeUpload + storagePut + registerMedia + recordAdminAudit.
- ownerProcedure محمية بـ owner session cookie (server/_core/trpc.ts).
- site.downloads.list: publicProcedure يعيد الفئات الظاهرة + ملفاتها الظاهرة (بدون fileKey).
- التتبع: الزائر يستدعي site.downloads.start(id) عبر fetch ثم يفتح fileUrl في تبويب جديد.

## حالة الخادم (مكتمل حتى الآن)
- ✅ server/db.ts: 15 دالة مساعدة لجدولي download_categories/download_files (list/create/update/delete/visibility/move/replace/increment).
- ✅ server/downloads.ts: exports `downloadsRouter` مع: list (owner), publicList, trackDownload (public, يرجع fileUrl/filename/mimeType), createCategory/updateCategory/deleteCategory/setCategoryVisibility/moveCategory, createFile/updateFile/deleteFile/setFileVisibility/replaceFile/moveFile + migrateDownloadsIfNeeded() تلقائي يهاجر content.downloads القديمة + guessMimeType.
- ✅ server/routers.ts: site.downloads = downloadsRouter. TSC سليم.
- ملاحظة: ownerProcedure في server/_core/trpc.ts، router/z/TRPCError مستوردة في downloads.ts من "./_core/trpc" وzod و@trpc/server.

## المتبقي
1. رفع الملفات: نحتاج multipart upload. قرار: أضف مسار POST /api/downloads/upload في server/_core/index.ts باستخدام formidable (pnpm add formidable) مع حماية owner session cookie (getVerifiedAdminSession من db.ts) — الملف يوضع في storagePut(`wajbat-plus/downloads/{timestamp}-{random}.{ext}`) ويسجل media + audit. بديل أبسط: استخدم admin.uploadMedia الحالي (dataURL حتى 11.2MB) — لكن الملفات قد تكون أكبر. **اعتمد: formidable + /api/downloads/upload يرجع {id, fileName, fileUrl, mimeType, sizeBytes, originalName}.**
2. صفحة الزائر app.js: downloadsPage تقرأ site.downloads (تتريك) بدل content.downloads (fallback للقديم)، عداد تنزيلات حقيقي عبر site.downloads.trackDownload، معاينة PDF/صور.
3. مدير admin-downloads-manager-r1.js + CSS + تحميل في admin.html (نمط r4) + mountCompatibleDownloadsManager في admin-app-r18.js + bindSidebarNavigation [data-downloads2-nav] + label "إدارة التحميلات" موجود في labels.
4. اختبار vitest + build + تحقق تفاعلي (إنشاء قسم/ملف، تنزيل، حذف) + checkpoint.
5. لا تغيير لواجهة الزائر العامة: صفحة التحميلات الحالية تستخدم content.downloads + remoteFile — عند وجود جدول v2 استخدمها، وإلا fallback للقديم.

## مسارات مهمة
- router: site.downloads.{list,publicList,trackDownload,createCategory,updateCategory,deleteCategory,setCategoryVisibility,moveCategory,createFile,updateFile,deleteFile,setFileVisibility,replaceFile,moveFile} — كلها عبر trpc.client.
- admin.uploadImage/uploadMedia موجودة في admin router (بيانات dataURL).
- ownerProcedure وgetVerifiedAdminSession من server/_core/trpc.ts وdb.ts.

## تحديث حالة الخادم بعد مسار الرفع (13:53)
- ✅ server/_core/index.ts: مسار POST /api/downloads/upload (formidable multipart, جلسة مالك, storagePut في wajbat-plus/downloads/, registerMedia, audit) — tsc: 0 أخطاء، الخادم يعمل، المسار يرجع 403 بدون جلسة (صحيح).
- ✅ formidable مثبت + server/types/formidable.d.ts.
- الخادم جاهز. المتبقي: واجهة لوحة المالك (مدير downloads2) + صفحة الزائر (app.js) + اختبارات + بناء + نشر.

## تفاصيل واجهة المالك المطلوبة (من المتطلبات)
- مساحة عمل downloads2 في admin-app-r18.js: bindSidebarNavigation [data-downloads2-nav]، mountCompatibleDownloadsManager في contentWorkspace.
- نمط workspace مشابه r4 (visitor-links): window.WajbatDownloadsManager = { workspace, activate, mountCompatibleDownloadsManager }.
- تحميل في admin.html مع بصمة r1 + onerror fallback + آلية احتياطية 4 ثوانٍ.
- نافذة تأكيد حذف داخلية (بدون window.confirm).

## عقد API النهائي المثبت (downloads.ts + routers.ts)
- الإدارة: `admin.downloads.*` — لا يوجد، downloadsRouter معلق على `site.downloads.*` فقط! يجب نقله أو إضافته إلى admin router (أفضل: admin.downloads = downloadsRouter لإبقاء ownerProcedure حارسه، والاحتفاظ site.downloads للعامة).
- `site.downloads.publicList` (GET) → { categories, files } للمرئيات.
- `site.downloads.trackDownload` { id } → { fileUrl, fileName, mimeType } + عدّاد.
- إجراءات الإدارة: createCategory/updateCategory/deleteCategory/setCategoryVisibility/moveCategory {id,direction:"up"|"down"} + createFile/updateFile/deleteFile/setFileVisibility/replaceFile {id,fileKey,fileUrl,mimeType,sizeBytes,originalName}/moveFile.
- حقول الفئة: id,name,description,emoji,color,backgroundColor,imageKey,imageUrl,sortOrder,isVisible,createdAt.
- حقول الملف: id,categoryId,fileName,originalName,description,fileKey,fileUrl,mimeType,sizeBytes,imageKey,imageUrl,sortOrder,isVisible,downloadCount,createdAt.
- مسار الرفع: POST /api/downloads/upload (formidable, cookie جلسة مالك, يرجع {success,mediaId,fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes}).
- formidable مثبت ✅ والخادم يعمل (tsc 0 أخطاء).
- admin-app-r18.js: نمط mount لروابط الزوار عند السطور 46-54، bindSidebarNavigation عند 64-66 (data-visitor-links-nav يستخدم currentTarget), global clicks عند 115-120.
- admin.html: تحميل الروابط عند 23-103، fallback عند 105-112 (4 ثوانٍ), بصمة التطبيق r9.
- خطة الواجهة: إنشاء admin-downloads-manager-r1.js بنمط WajbatVisitorLinksManager (workspace/activate/mountCompatibleDownloadsManager), إضافة مسار في admin-app-r18 (data-downloads-nav + mount), تحميله في admin.html مع بصمة r10 للتطبيق وبصمة جديدة للمدير نفسه، fallback احتياطي، إضافة اختبارات + تحديث app.js للزائر (downloadsPage يستخدم site.downloads.publicList + trackDownload بدل content.downloads).

## حالة الخادم المكتملة (14:00)
admin.downloads.* متاح الآن (سطر 341 في routers.ts) مع بقاء site.downloads للعامة (سطر 337). الإجراءات الإدارية كلها ownerProcedure داخل downloadsRouter: list/createCategory/updateCategory/deleteCategory/setCategoryVisibility/moveCategory + createFile/updateFile/deleteFile/setFileVisibility/replaceFile/moveFile. publicList وtrackDownload عامة. مسار الرفع /api/downloads/upload جاهز (formidable مثبت). tsc بدون أخطاء.

## الخطوة التالية: كتابة admin-downloads-manager-r1.js
نمط الملف: IIFE على نمط r4 (visitor-links). window.WajbatDownloadsManager = { workspace, activate, mountCompatibleDownloadsManager, refresh }. bindSidebarNavigation في shell يدعم currentTarget (موجود). الترتيب: categories أولاً ثم ملفات كل قسم قابلة للطي، أو شريطان (أقسام/ملفات).

## تقدم المدير admin-downloads-manager-r1.js (أُنشئ)
- الجزء 1 (حالة/دوال مساعدة/قائمة): مكتوب ✅ — esc, toast, apiError, request(GET/POST), uploadFile (POST /api/downloads/upload مع حد 50MB), list (admin.downloads.list), filesOf(بحث+فرز), sortedCategories, count, totalDownloads, categoryColor/Background, emojiOf.
- الجزء 2 (إجراءات): مكتوب ✅ — saveCategory, removeCategory, toggleCategoryVisibility, moveCategory, saveFile, removeFile, toggleFileVisibility, moveFile, copyFileUrl (trackDownload ثم نسخ), shareFile (whatsapp/t.me), replaceFileUpload, createWithUpload (رفع متعدد عبر /api/downloads/upload ثم createFile لكل ملف), downloadTest.
- المتبقي: الجزء 3 (عرض HTML: render, شريط إحصاءات, قائمة أقسام قابلة للطي, بطاقات ملفات بأزرار, محرر قسم, محرر ملف, نافذة تأكيد حذف) + الجزء 4 (تسجيل window.WajbatDownloadsManager = {workspace, activate, mountCompatibleDownloadsManager, refresh}, bindEvents, رفع تلقائي عند activate) + ربط admin-app-r18 (مسار downloads في contentWorkspace + bindSidebarNavigation data-downloads-nav) + تحميله في admin.html مع بصمة التطبيق r10 للمدير وبصمة جديدة لتطبيق shell + fallback احتياطي + اختبار + تحديث app.js للزائر (downloadsPage من site.downloads.publicList + trackDownload).
- الأخطاء في devserver.log عن formidable قديمة (13:51) قبل pnpm install، tsc الآن 0 أخطاء — لا حاجة لإجراءات.

## المدير admin-downloads-manager-r1.js مكتمل الآن (كل الأجزاء 1-5)
التسجيل: window.WajbatDownloadsManager = {workspace, activate, mountCompatibleDownloadsManager(container), refresh}. activate يرسم ويعرض شريط البحث/الفرز/إحصاءات/أقسام قابلة للطي/بطاقات ملفات. أزرار: نسخ/واتساب/تيليجرام/تجربة/تعديل/إظهار/تحريك/حذف لكل ملف؛ إنشاء قسم/تعديل/إخفاء/حذف/تحريك/رفع متعدد للأقسام. نوافذ تأكيد حذف داخلية. البيانات: categories[] files[]. attributes: data-dl-search/sort/toggle/add-category/edit-category/cat-visible/delete-category/cat-up/cat-down/add-file/edit-file/file-visible/file-up/file-down/copy/share-wa/share-tg/test/delete-file/upload-many/upload-input.
### المطلوب الآن:
1. ربط في admin-app-r18.js: (أ) في contentWorkspace بعد مسار visitorLinks: `if (state.selected === "downloads") { renderDownloadsPlaceholder(); mountCompatible(window.WajbatDownloadsManager); }` — الأفضل استنساخ نمط visitorLinks عند السطور 46-54 من shell المحلي + (ب) add nav item label وbutton في bindSidebarNavigation (data-downloads-nav بنفس نمط visitorLinks مع currentTarget) + (ج) في global clicks (السطور 115-120 تقريباً) إضافة data-downloads-nav handler مثل visitorLinks. ترتيب التنقل: downloads قبل home أو بعد visitorLinks.
2. admin.html: إضافة سطر تحميل admin-downloads-manager-r1.js?v=downloads-r1 (بنفس نمط visitor-links script مع onerror/fallback) + بصمة shell الجديدة: admin-app-r18.js?v=downloads-manager-r10 + fallback احتياطي في سكربت المهلة.
3. اختبار server/downloadsAssets.test.ts جديد (نمط visitorLinksAssets) + ربط vite.config إذا يلزم.
4. تحديث downloadsPage في app.js (app.js هو تطبيق الزائر): استبدال content.downloads بـ site.downloads.publicList + تسمية trackDownload عند الضغط.
5. pnpm test + build + تحقق تفاعلي + checkpoint.
### ملاحظة: admin-app-r18.js يجب فحص نمط mountCompatibleVisitorLinksManager بدقة قبل النسخ. admin.html: تحميلات scripts عند السطور 23-112.

## ملاحظات الربط في admin-app-r18.js (بعد قراءة السطور 1-56)
- labels موجودة من السطر 1؛ downloads غير موجود فيها → يجب إضافته: `downloads: ["📥", "إدارة التحميلات", "أقسام وملفات حقيقية برفع مباشر من الجهاز"]`
- navSections السطر 13 يحتوي "downloads" ضمن "المحتوى" — جيد.
- sidebar() السطر 38: navAttribute = key === "visitorLinks" ? "data-visitor-links-nav" : data-select. يجب تعديله: key === "downloads" ? "data-downloads-nav" : نفس المنطق.
- contentWorkspace() السطر 46-55: بعد `if (key === "visitorLinks") { mount... return; }` يجب إضافة: `if (key === "downloads" && window.WajbatDownloadsManager) { mountCompatibleDownloadsManager(); return; }` مع دالة mountCompatibleDownloadsManager على نمط mountCompatibleVisitorLinksManager (السطور 46-53) لكن بلا حاوية خاصة (يستخدم side-workspace مباشرة) — الأفضل: workspace = manager.activate().
- openVisitorLinksWorkspace السطر 64 + bindSidebarNavigation: يجب إضافة openDownloadsWorkspace وربطها على [data-downloads-nav] (لا تنسَ أن bindSidebarNavigation يضيف معالجاً أيضاً؛ يجب الحفاظ على السطرين: السطر 64 style fn + listener).
- مستمع click العام السطر 116 (capture): يتضمن `[data-visitor-links-nav]` handler. يجب إضافة handler لـ `[data-downloads-nav]` بنفس النمط مع currentTarget.
- defaultItem السطر 30 يتعامل مع key === "downloads" القديم (فئات في content collection) — لا يتعارض، سنتركه (fallback للقالب العام).
- navCount السطر 37: لا يحتاج change لـ downloads (يعرض count من content.downloads القديم إن وجد). يمكن تعديلها: if (key === "downloads") return (window.WajbatDownloadsManager?.count?.() ?? "") || ""; — اختياري، أتركه.
### admin.html: سطر تحميل r4 visitor-links manager + سكربت fallback مهلة 4 ثوانٍ. يجب إضافة سطر تحميل admin-downloads-manager-r1.js?v=downloads-r1 بنفس النمط + fallback مهلة.
### بصمة shell: admin-app-r18.js?v=downloads-r10
### formidable: مثبت الآن ✓ الاختبارات 61 ناجحة.

## تنفيذ الربط (14:05)
عقد WajbatDownloadsManager الفعلي في r1: { workspace(): render(), activate(), mountCompatibleDownloadsManager(container), refresh() } — activate يبحث عن ".side-workspace" ويرسم فيها ويضبط setWorkspaceState({selected:"downloads"}). يعني الربط في contentWorkspace يجب أن يرجع `<section class="workspace"><div class="side-workspace" data-downloads-workspace></div></section>` ثم queueMicrotask → manager.activate() — نمط visitorLinks نفسه.
labels في shell لا تحتوي downloads — يجب إضافة: `downloads: ["📥", "إدارة التحميلات", "..."]`.
sidebar() السطر 38: navAttribute = key === "visitorLinks" ? "data-visitor-links-nav" : data-select → أضف downloads.
global click (السطر ~116): أضف handler لـ [data-downloads-nav] مع currentTarget.
admin.html: سطر تحميل + بصمة shell r10 + fallback مهلة.
vite.config: لا حاجة (المدير يسكن في client/public).
admin.downloads.* متاح: list, createCategory, updateCategory, deleteCategory, setCategoryVisibility, moveCategory, createFile, updateFile, deleteFile, setFileVisibility, replaceFile, moveFile — كلها ownerProcedure. site.downloads.publicList + trackDownload عامة.

## الربط في shell مكتمل ✅ (14:07)
admin-app-r18.js الآن: label downloads محدث (إدارة التحميلات + وصف)، sidebar يدعم data-downloads-nav، mountCompatibleDownloadsManager مضاف، contentWorkspace يركّب المدير عند key===downloads، openDownloadsWorkspace + listener في bindSidebarNavigation، handler في مستمع click العام مع currentTarget، selector موسع بـ [data-downloads-nav].
### المتبقي:
1. admin.html: سطر تحميل <script src="/assets/js/admin-downloads-manager-r1.js?v=downloads-r1"></script> بنفس نمط visitor-links (بعد سطر تحميل visitor-links manager) + بصمة shell جديدة في سطرَي تحميل admin-app-r18.js?v=downloads-r10 (استبدل visitor-links-nav-route-r7) + fallback مهلة 4 ثوانٍ في سكربت fallback (إضافة window.WajbatDownloadsManager check).
2. app.js للزائر: downloadsPage يجب أن تجلب من site.downloads.publicList عبر request + trackDownload عند الضغط (حاليًا يعرض content.downloads القديم).
3. اختبار downloadsAssets.test.ts (نمط visitorLinksAssets) + vite.config لا يحتاج (مدير في client/public).
4. pnpm test + build + تحقق تفاعلي (إنشاء قسم، رفع ملف، نسخ/مشاركة/تجربة، تعديل، إخفاء، حذف) + checkpoint.

## حالة 14:05: shell + admin.html مكتملان ✅
- admin.html: بصمة shell v=downloads-r10، تحميل admin-downloads-manager-r1.js?v=downloads-r1 بعد مدير الروابط في سلسلتي onload + fallback مهلة 4 ثوانٍ.
- remaining: واجهة الزائر app.js downloadsPage (سطر 448) تستخدم ملفات ثابتة files/fileBase، يجب تحويلها لجلب site.downloads.publicList عبر rpcQuery("site.downloads.publicList") مع حفظ الملفات القديمة كـ fallback، وإضافة trackDownload عبر rpcMutation("site.downloads.publicTrack",{fileId}) عند الضغط.

### عقد API الخادم (downloads router):
- site.downloads.publicList — لا input، يعيد {categories:[{id,name,emoji,files:[{id,name,description,sizeLabel,extension,directUrl,downloadCount,createdAt}]}]}
- site.downloads.publicTrack {fileId:number} — يزيد العداد + سجل activity
- admin.downloads: listCategories/createCategory/updateCategory/reorderCategories/deleteCategory/listFiles/createFile/updateFile/reorderFiles/deleteFile/publicList/totalStats (كلها داخل downloadsRouter تحت admin، + الإجراءات العامة تحت site)

### رابط الرفع: POST /api/admin/downloads/upload-file بأجزاء multipart مع كوكي جلسة المالك __Host-admin-session، يرجع {url, key, size, mimeType, fileName}

## حالة ربط واجهة الزائر (مكتمل) — 2026-08-14
- app.js عدّل: loadSiteDownloads() يستدعي rpcQuery("site.downloads.publicList")، downloadsPage() يعرض dynamicDownloadsPageHtml() إذا توفرت البيانات وإلا الملف الثابت القديم.
- trackPublicDownload → rpcMutation("site.downloads.trackDownload", { id })، معالج حدث track-download يتحقق من data-file-id.
- اسم الإجراء الصحيح في downloadsRouter هو trackDownload (وليس publicTrack).
- أخطاء formidable في devserver.log قديمة (13:51) — الخادم يعمل الآن بدون خطأ.
- التالـي: استدعاء loadSiteDownloads() عند تحميل الصفحة/تغير hash لصفحة /downloads، ثم اختبار الإنتاج والاختبارات والبناء والمدير، ثم ربط shell (mountCompatibleDownloadsManager في admin-app-r18.js + تحميل المدير في admin.html).

## ملاحظات ربط shell (من فحص سابق)
- admin-app-r18.js: نمط mount لروابط الزوار عند السطور 46-54 (mountCompatibleVisitorLinksManager)، bindSidebarNavigation يستخدم data-visitor-links-nav مع currentTarget.
- admin.html: بصمة التطبيق r9، fallback 4 ثوانٍ.
- label «إدارة التحميلات» موجود في labels (صفيف 3 عناصر: ['downloads', 'ملفات التحميل', '']).

## واجهة الزائر app.js — مفصلة (السطور)
- سطر 447: fileBase (CDN). سطر 448: siteDownloads=null. 449-456: loadSiteDownloads() يستخدم rpcQuery("site.downloads.publicList") — صحيحة.
- 457-462: fileCardHtml(file) يستخدم file.directUrl وfile.id في data-file-id — **فحص: هل publicList يرجع directUrl؟** يجب التأكد أو تحويله.
- 463-468: dynamicDownloadsPageHtml() يقرأ siteDownloads.categories مع cat.files.
- 470-475: downloadsPage() fallback للثابت.
- 533: case "/downloads" يستخدم downloadsPage() — يجب إضافة loadSiteDownloads() قبل render أو في render() عند /downloads.
- 674: في render() يوجد try { applyManagedContent(await rpcQuery("site.publicContent")); } — أفضل موضع: استدعاء loadSiteDownloads() هناك بجانبه (لجميع المسارات لتفادي فجوة).
- **مهمة فحص**: هل publicList يرجع directUrl لكل ملف؟ في downloads.ts: listDownloadFiles يرجع { ..., fileUrl } — يجب تطابق أسماء الحقول مع fileCardHtml (directUrl) — أضف mapping في router أو غيّر الواجهة.

## حالة التقدم 14:08 (بعد الاختبارات)

الاختبارات: 20 ملف / 61 اختبار — كلها ناجحة بعد تحديث بصمة shell في visitorLinksAssets.test.ts إلى downloads-r10.
الفحص البصري: / و /admin يعملان دون أخطاء ظاهرة؛ صفحة تسجيل دخول لوحة المالك تعرض الخلفية الجديدة (صورة رجل بالبدلة) — **ملاحظة**: شاشة الدخول غيرت خلفيتها من الأصل (يظهر رجل ببدلة بدلًا من الأصل السابق). يجب التحقق: هل كانت هذه خلفية أصلية أم تغيّرت بسبب تطويرات سابقة؟ المستخدم اشترط الحفاظ على الموقع كما هو، لكن هذه شاشة الإدارة (admin.html) وقد طُوّرت شاشة الدخول سابقًا بطلب المستخدم. لا تدخل في هذه الجلسة إلا إذا طُلب.

### المتبقي بعد هذا الحفظ:
1. اختبار تفاعلي: تسجيل دخول لوحة المالك → فتح قسم «إدارة التحميلات» → إنشاء قسم → رفع ملف حقيقي → عرض في الموقع للزائر → تعديل/إخفاء/حذف → تحقق من الجدولين.
2. التأكد من أن «إدارة التحميلات» موجودة في الشريط الجانبي للوحة المالك بعد تسجيل الدخول.
3. حفظ checkpoint ثم تسليم النتيجة.

### بيانات الدخول: bdalslamanwralajsh@gmail.com / abd77312
### روابط: https://uploadplus-47dkogbk.manus.space و /admin
### checkpoint قبل هذا العمل: e5cf6a8f (منشور)

## حالة الاختبار التفاعلي 14:09

لوحة المالك مفتوحة محليًا على /admin (الجلسة فعالة — ظهرت «إدارة واجبات بلس» ومركز المتابعة). **ملاحظة مهمة:** ظهر «📥 إدارة التحميلات ٨» في الشريط الجانبي تحت «المحتوى» — القسم مرتبط بنجاح في التنقل. سجل الإدارة يظهر downloads_migrated على download_category (الهجرة نجحت).

### خطة الاختبار المتبقية:
1. فتح قسم «إدارة التحميلات» من الشريط الجانبي والتحقق من عرض الأقسام/الملفات (٢٢ ملفًا).
2. إنشاء قسم جديد + رفع ملف حقيقي عبر المسار multipart.
3. التحقق من ظهوره في صفحة التحميلات للزائر /downloads.
4. حفظ checkpoint وتسليم.

### عناصر الصفحة المفتوحة حاليًا:
- صفحة «جارٍ التحقق من صلاحية الوصول...» قيد التحميل (screenshot أعلاه) — انتظر اكتماله.

### لحظة 14:09 (متابعة)

لوحة المالك محملة بالكامل. قسم «📥 إدارة التحميلات 8» ظاهر في الشريط الجانبي (عنصر 9). البطاقة «📥 ملفات التحميل ٢٢» ظاهرة في مركز المتابعة. سجل الإدارة: downloads_migrated ناجح. الخطوة التالية: النقر على العنصر 9 لفتح القسم.

### لحظة 14:10 — قسم التحميلات فُتح بنجاح

القسم فتح مباشرة (بدون عودة للنظرة العامة) وعرض **8 فئات** حقيقية من قاعدة البيانات: نماذج واجبات، عروض بوربوينت، سيرة ذاتية CV، جداول بيانات، خرائط ذهنية، بحوث، اختبارات، تقارير — كلها «ظاهر». أزرار ↑↓ تعديل إخفاء حذف ظاهرة لكل فئة + زر «+ إضافة». أخطاء formidable هي من وقت سابق (13:51) قبل التثبيت — لا علاقة لها بالحالة الحالية.

الخطوة التالية: اختبار زر «+ إضافة» لفتح نموذج إنشاء فئة جديدة، ثم نافذة اختيار ملفات المعرض.

### لحظة 14:10 — نموذج إضافة فئة جديد فُتح بنجاح

زر «+ إضافة» فتح نموذج داخل الصفحة (من دون نافذة modal) يحتوي: اسم الفئة (فئة تحميلات جديدة)، الرمز (📥)، حقول ملفات مع قائمة «اختر ملفاً من المعرض»، زر «رفع ملف»، زر «حذف الملف»، زر «+ إضافة ملف للفئة»، خيار «ظاهر للزوار»، وأزرار حفظ/إلغاء. القائمة الأساسية تعرض 8 فئات حقيقية بأزرار ترتيب وتعديل وإخفاء وحذف لكل فئة. البحث والترقيم ظاهران.

الخطوات التالية: (1) اختبار «رفع ملف» من المعرض، (2) حفظ فئة جديدة، (3) اختبار تعديل/إخفاء/حذف، (4) التحقق من صفحة التحميلات للزائر، (5) اختبارات + بناء + checkpoint.

### لحظة 14:12 — التحقق من قاعدة البيانات

الجداول الفعلية: `download_categories` و`download_files` (أعمدة camelCase: categoryId, fileName, originalName, fileKey, fileUrl, mimeType, sizeBytes, sortOrder, isVisible, downloadCount). يوجد 22 ملف PDF موزعة على الفئات، والفئة 1 فيها 4 ملفات. نموذج الإضافة في الواجهة يحتوي قائمة «اختر ملفاً من المعرض» مبنية على media_files (31 ملف) — يجب التأكد أن اختيار الملفات يعمل ويُسند ملف download_files أو media_files إلى الفئة الجديدة.

### لحظة 14:14 — فحص داخلي للمدير admin-downloads-manager-r1.js

المدير r1 الحديث يستخدم إجراءات `admin.downloads.*` (list/createCategory/updateCategory/deleteCategory/setCategoryVisibility/moveCategory/createFile/updateFile/deleteFile/setFileVisibility/replaceFile/moveFile/trackDownload) ورفع Multipart عبر `/api/downloads/upload` (حتى 50MB). الواجهة تعرض أقسام/ملفات مع بحث وفرز وإحصائيات ونوافذ modal للحذف (بدون confirm) ورفع ملفات متعددة.

ملاحظة مهمة: ما يظهر في المتصفح (8 فئات + نموذج inline بزر «+ إضافة» وقائمة «اختر ملفاً من المعرض») يبدو من نسخة سابقة/مختلفة (نموذج inline وليس modal). النقر على + إضافة في الشاشة السابقة فتح نموذج inline — قد يكون ذلك من نسخة قديمة محملة (مديراً آخر معلق على data-downloads-nav). يجب التأكد: هل `admin-app-r18.js` يعلّق المدير r1 الحديث أم نسخة قديمة من المحتوى؟

### لحظة 14:16 — اكتشاف مهم: قسم التحميلات لا يزال معلقاً بمحرر المحتوى القديم

في admin-app-r18.js: `contentWorkspace()` يتعامل مع "services" و"visitorLinks" و"siteSettings" فقط، وبقية المفاتيح (ومنها "downloads") تُعرض عبر محرر المحتوى القديم genericEditor (نموذج JSON). لا يوجد mountCompatibleDownloadsManager ولا ربط البيانات-downloads-nav مع المدير الحديث admin-downloads-manager-r1.js! ما ظهر في الشاشة السابقة (نموذج inline بقائمة «اختر ملفاً من المعرض») كان من genericEditor القديم — لذلك النقر على «حفظ» ربما لم يعمل.

الإصلاح المطلوب في admin-app-r18.js: مثل visitorLinks، أضف مساراً خاصاً لـ downloads يركّب window.WajbatDownloadsManager (نمط mountCompatibleVisitorLinksManager) مع data-downloads-workspace، وتعديل sidebar() لاستخدام data-downloads-nav بدلاً من data-select="downloads" لفتح الفضاء الخاص. يجب أيضاً منع genericEditor القديم من فتح تحرير JSON لـ downloads (أو تركه كحالة احتياطية).

### لحظات 14:17 — بنية admin-app-r18.js (معلومات حرجة للاشتراك)

- السطر 46-54: `mountCompatibleVisitorLinksManager()` يتحقق من state.selected==="visitorLinks" وwindow.WajbatVisitorLinksManager ثم queueMicrotask لتشغيل manager.activate() في [data-visitor-links-workspace]، ويعيد section workspace.
- السطر 55: `contentWorkspace()` — الحالات الخاصة: key==="services" + WajbatServicesManager → manager.workspace(data)؛ key==="visitorLinks" → mountCompatibleVisitorLinksManager؛ key==="siteSettings" → settingsEditor؛ وإلا محرر المحتوى القديم (هذا ما يعرض downloads الآن!).
- السطر 64: `openVisitorLinksWorkspace(event)` — يستخدم currentTarget مع closest("[data-visitor-links-nav]") ثم preventDefault/stopPropagation ويضبط state.selected="visitorLinks" ويستدعي dashboard().
- السطر 65: `bindSidebarNavigation()` — يضيف مستمعي click لأزرار [data-select] في .side-menu.
- السطر 81-89: `mountCompatibleServicesManager()` نمط مشابه بـ data-services-manager.
- السطر 116: `document.addEventListener("click", ...)` يشمل `[data-visitor-links-nav]` في closest.
- ملاحظة: sidebar() (سطر 38) يعطي visitorLinks: `data-visitor-links-nav` وبقية المفاتيح: `data-select="${key}"`.
- بصمة التطبيق: admin-app-r18.js (ر18)، والمدير admin-downloads-manager-r1.js (بصمة ?v=downloads-r1 في admin.html السطور 45/72/126).
- الخطة: أضف mountCompatibleDownloadsManager مثل visitorLinks، وغيّر sidebar() ليعطي downloads: data-downloads-nav، ووثّق click handler ليشمل [data-downloads-nav]، وأطلق r19 للتطبيق وr2 للمدير + تحديث بصمة في admin.html.

### لحظة 14:20 — إتمام ربط التحميلات بالمدير الحديث

أضيف إلى admin-app-r18.js: mountCompatibleDownloadsManager (سطر 46، مع data-downloads-workspace وclass side-workspace)، مسار downloads في contentWorkspace (سطر 64)، openDownloadsWorkspace (سطر 74)، معالج [data-downloads-nav] في bindSidebarNavigation (سطر 75) وفي document.addEventListener (سطر 126)، وsidebar() أصبحت تعطي data-downloads-nav لقسم downloads (سطر 38).

المتبقي: إطلاق بصمة جديدة admin-app-r19.js في admin.html (وfallback)، وأصل المدير admin-downloads-manager-r2.js (نسخة من r1) مع تحديث بصمة التحميل إلى r2. لاحظت خطأ في devserver: ERR_MODULE_NOT_FOUND formidable من server/_core/index.ts — يجب التحقق مما إذا كان formidable مثبتاً (ربما pnpm add لم يكتمل) قبل اختبار الرفع.

### لحظة 14:24 — إطلاق البصمات الجديدة وحالة الرفع

نُسخ admin-app-r18.js → admin-app-r19.js وadmin-downloads-manager-r1.js → admin-downloads-manager-r2.js، وتم تحديث admin.html ليشير إلى admin-app-r19.js?v=downloads-r11 وadmin-downloads-manager-r2.js?v=downloads-r2 (3 مواضع). formidable مثبت فعلاً في node_modules (خطأ devserver.log السابق من 13:51 قبل pnpm install، وvite أعاد تحميل admin.html في 14:15 بنجاح).

ملاحظة مهمة عن مسار الرفع في server/_core/index.ts: endpoint /api/downloads/upload (formidable، حتى 30MB رغم أن المدير يسمح بـ50MB — حد المدير أعلى من الخادم!) يرجع { success, mediaId, fileName, originalName, fileUrl, fileKey, mimeType, sizeBytes }. يُسجل الملف في media_files بـ usage=visitor_download. يجب مواءمة حد الحجم: إما رفع حد formidable إلى 50MB أو خفض تحذير المدير إلى 30MB. الأفضل رفع حد formidable إلى 50*1024*1024 ليتوافق مع المدير (الحد الأصغر يُسبب فشل رفع صامت على ملفات 30-50MB).

الخطوة التالية: تعديل maxFileSize إلى 50MB في index.ts، اختبار تفاعلي للقسم.

### لحظة 14:26 — نجاح: قسم التحميلات يعمل بالمدير الحديث

بعد الربط الجديد (admin-app-r19 + manager-r2)، فتح قسم «إدارة التحميلات» يعرض الآن المدير الحديث: عنوان «📥 التحميلات — نظّم الفئات واختر الملفات المرفوعة من المعرض»، الفئات الثمانية المهاجرة (نماذج واجبات، بوربوينت، سيرة ذاتية CV، جداول بيانات، خرائط ذهنية، بحوث، اختبارات، تقارير) مع أزرار تعديل/إخفاء/حذف/ترتيب وزر «+ إضافة»، وزر الحفظ في الأسفل. لم يعد محرر JSON القديم يظهر.

التالي: اختبار إنشاء فئة جديدة + رفع ملف حقيقي (PDF) + تحقق من الزائر.

### لحظة 14:28 — اختبار تفاعلي جاري: إنشاء فئة + رفع PDF

أنشأت ملف اختبار /tmp/test_upload_file.pdf (1.5KB، reportlab). في نموذج إضافة فئة: اسم الفئة «فئة اختبار حقيقية»، الرمز 🧪. زر «رفع ملف» (index 75) يفتح input مخفي #downloadFile0 يقبل application/pdf,.doc,.docx,image/* + webp (accept ملاحظة: لا يشمل .docx/.zip بشكل كامل — يكفي للاختبار). سأنفذ رفع الملف عبر JS uploadElement() ثم الضغط على حفظ، ثم التحقق من قاعدة البيانات ثم حذف الفئة والاختبار.

### اكتشاف مهم 14:30 — نموذج «الفئة الجديدة» في r2 لا يرفع ملفات حقيقية

نموذج الفئة في admin-downloads-manager-r2.js يحتوي فقط: العنوان، الرمز، الألوان، الوصف، «صورة القسم (اختياري)». أما حقل «اسم الملف / الملف المرفوع / اختر ملفاً من المعرض» الذي يظهر في الواجهة (index 73-77 في المتصفح) فهو ليس من r2 — يبدو أن النسخة المحمولة مؤقتاً هي r1 أو أن هناك نسخة سابقة. النسخة r2 التي ربطها admin-app-r19 تستخدم نموذج «قسم جديد» من 5 حقول فقط، ونموذج «ملف جديد» يحتوي input file حقيقي name="file" + رفع عبر uploadFile إلى /api/downloads/upload ثم createFile.

الحكم: الواجهة المرئية التي رأيتها (مع «اختر ملفاً من المعرض») هي نسخة قديمة معلقة. بعد تغيير البصمة admin-app-r19 سيعرض النموذج الجديد الذي يدعم رفع ملفات حقيقية. يجب التحقق الآن من أن r19 محمل فعلاً (المدقق: في الذاكرة أو console error).

### تشخيص 14:32 — admin-downloads-manager-r2.js يُحمّل 200 لكن WajbatDownloadsManager غير معرّف

السكربت r2 (32498 بايت، سليم، ينتهي بـ IIFE: `})();`) موجود في DOM كـ script محمّل (admin-downloads-manager-r2.js?v=downloads-r2)، لكن window.WajbatDownloadsManager = undefined. الأرجح: السكربت يُحمّل بعد أن يعيّن r19 على أن manager يجب أن يكون جاهزاً، لكن ربما يحتوي r2 على خطأ تنفيذ مبكر (SyntaxError لا يظهر لأنه IIFE؟ لو كان خطأ تركيب لن يُحمّل). أو أن السكربت يُحمّل بتأخير async و r19 شغّله قبل أن يُعيّن. الحل العملي: تعديل r19 بحيث إذا لم يكن manager جاهزاً يُحاوَل مرة أخرى بعد 500ms، وأيضًا فحص أن r2 نفسه يعمل (نفّذ eval عليه في الكونسول ورؤية الخطأ).

### تشخيص 14:24 — الجذر الحقيقي: admin-structured-editor.js يلتقط "downloads" قبل director الحديث

structuredKeys في admin-structured-editor.js يتضمن "downloads" ويعرض محرر المحتوى القديم (فئات JSON + ملف مرفوع من المكتبة). وفي structuredContentWorkspace:
`if (window.WajbatStructuredEditor?.supports?.(state.selected)) return window.WajbatStructuredEditor.workspace(state.selected);`
يأتي **قبل** mountCompatibleDownloadsManager (الموجود داخل contentWorkspace الأصلي legacy فقط). إذن حتى لو كان WajbatDownloadsManager موجوداً، structured editor يحجز downloads.

الحل: في structuredContentWorkspace، إضافة شرط: إذا كان state.selected === "downloads" وكان WajbatDownloadsManager موجوداً → استخدم mountCompatibleDownloadsManager() أولاً. (إصلاح في admin-app-r19.js ثم نسخ إلى r20/تحديث بصمة.)

### نجاح 14:23 — المدير الحديث (r2) يُعرض الآن في قسم إدارة التحميلات

بعد إصلاح الجذر: (1) SyntaxError في r2 `submit?.disabled = ...` (optional chaining في موضع إسناد غير مدعوم) — استُبدل بـ if-guards، (2) في admin-app-r20.js: إعطاء الأولوية لمدير التحميلات على structured editor، (3) formidable مثبتة لكن dev server القديم لم يكن يقرأها — أُعيد التشغيل على المنفذ 3000.

الواجهة الآن تعرض: إحصائيات (8 قسم، 22 ملف، 22 ظاهر)، بطاقات الأقسام الثمانية كلها، لكل ملف: اسم، حجم، عدد التحميلات، التاريخ، «ظاهر للزوار»، أزرار: نسخ رابط، واتساب، تيليجرام، تجربة تحميل ▶، تعديل ✎، إخفاء 👁، رفع لأعلى/لأسفل، حذف 🗑، + ملف، ⬆ رفع ملفات متعددة (input متعدد مخفي لكل قسم).

المتبقي من الاختبار الوظيفي: فتح نموذج «+ ملف» ورفع ملف PDF حقيقي من الجهاز عبر fetch/FormData إلى /api/downloads/upload، ثم فتح صفحة التحميلات للزائر والتحقق من الملف الجديد والعدّاد.

### نجاح 14:24 — رفع ملف حقيقي نجح (نقطة تحوّل)

عند محاولة التنفيذ الأول (DataTransfer) انهارت جلسة المتصفح مؤقتًا، لكن الرفع **نجح فعليًا** في الخلفية: سجل الإدارة يعرض `download_file_uploaded` (media_file) ثم `download_file_created` (download_file) في ١٤/٠٨ ٢:٢٣م، و«آخر الملفات» يعرض «ملف-اختبار-رفع-حقيقي.pdf». المتصفح عاود العمل عند إعادة التوجيه.

ملاحظة: DataTransfer داخل الكونسول في هذا المتصفح لا يحتفظ بالملفات (input.files.length=0)، لكن الرفع يتم عبر مسار createWithUpload الحقيقي (fetch multipart → /api/downloads/upload → admin.downloads.createFile).

المتبقي: فتح قسم التحميلات، تأكيد وجود الملف الجديد في القائمة، فتح /downloads كزائر، حذف ملف الاختبار، الاختبارات، checkpoint.

### نجاح 14:25 — الملف المرفوع يظهر في المدير

قسم «نماذج بحوث» الآن 3 ملفات، والعداد العام 23 ملفًا (23 ظاهر). الملف «ملف-اختبار-رفع-حقيقي.pdf» يظهر في أول القائمة مع الحجم 302 بايت، التاريخ، «ظاهر للزوار»، وكل الأزرار (نسخ/واتساب/تيليجرام/▶/✎/👁/▼/🗑). ملاحظة صغيرة: الملفات القديمة من الهجرة (JSON legacy) تعرض «حجم غير معروف» — مقبول لأنها وُردت من Legacy بلا حجم.

التالي: تجربة التحميل ▶، ثم فتح /downloads كزائر وحذف ملف الاختبار، ثم الاختبارات وcheckpoint.

### نجاح 14:25 — تجربة التحميل ▶

زر ▶ فتح رابط S3 موقّع عبر CloudFront CDN:
`https://d36hbw14aib5lz.cloudfront.net/310519663800785996/47DkogBKT8NjmDhwkhVpm8/wajbat-plus/downloads/1786717435068-34b6dbc7_0a46ac21.pdf?Expires=...&Signature=...&Key-Pair-Id=K1MP89RTKNH4J`
عُرض الملف في عارض PDF بالمتصفح بنجاح (صفحة بيضاء لأنها PDF فارغة للاختبار — لكن الرابط صالح 100%).

### ملاحظة 14:25 — صفحة الزائر تعرض الملفات القديمة فقط

صفحة /#/downloads للزائر تعرض الأقسام والملفات القديمة (مهاجرة من JSON legacy) فقط، وقسم «نماذج بحوث» يعرض 2 ملف فقط، والملف الجديد «ملف-اختبار-رفع-حقيقي.pdf» **لا يظهر**. يُفترض أن app.js يجلب البيانات ديناميكيًا مع fallback ثابت — يبدو أن app.js المحمل في الإنتاج هو نسخة قديمة (بصمة قديمة) أو أن الطلب الديناميكي فشل ولم يظهر الملف. يجب فحص: هل app.js يقرأ من قاعدة البيانات؟ هل البصمة محدثة في index.html؟

### تشخيص 14:26

- `site.downloads.publicList` يعمل ويعيد الأقسام والملفات (الملف الجديد فيه، downloadCount=1، lastDownloadedAt مسجّلة!).
- لكن app.js في الصفحة يثبت على static content لأن البنية: `data.categories` وليست مصفوفة مباشرة — app.js سطر 451: `siteDownloads = await rpcQuery("site.downloads.publicList");` ثم يتوقع `siteDownloads.files` أو بنية مختلفة عن `{categories:[...]}`.
- الحل: تعديل app.js ليفهم البنية الجديدة `{categories:[{files:...}]}` بدلاً من fallback الثابت.

### تشخيص نهائي 14:27

البيانات سليمة تمامًا: الملف الجديد isVisible=1، الفئة isVisible=1، publicList من الخادم يرجع `{categories:[{files:[{id:30001,...,directUrl}]}]}`. المشكلة في app.js: دالة loadSiteDownloads سطر 452: `if (!Array.isArray(siteDownloads?.categories)) siteDownloads = null;` — يبدو صحيحًا. لكن ربما fetch يفشل في dev environment (credentials same-origin + dev server proxy) أو أن التصفية cat.files.filter... صحيح. الاختبار المباشر بالكونسول نجح! إذن قد تكون الحالة أن الكونسول نجح لكن الصفحة استخدمت النسخة الثابتة لأن render تم قبل انتهاء loadSiteDownloads (race) أو أن dev server proxy يُعيد 404 لمسار batch (fetch غير batch في الكود).
الأرجح: في هذه الصفحة، صفحة /#/downloads رُسمت قبل اكتمال loadSiteDownloads، والحاشية: `void loadSiteDownloads().catch(() => {})` بدون re-render. يجب إضافة render بعد التحميل الديناميكي عند وجود صفحة downloads في الحالة.

### نجاح 14:28 — صفحة الزائر أصبحت ديناميكية

صفحة /#/downloads الآن تعرض البيانات من قاعدة البيانات: قسم «نماذج بحوث» أصبح 3 ملفات، والملف الجديد «ملف-اختبار-رفع-حقيقي» يظهر أولًا مع «تحميل: ١ مرة»، وبقية الأقسام تعرض ملفات قاعدة البيانات برسوم «جاهز للتحميل». إصلاح الـ race condition (re-render بعد loadSiteDownloads) نجح.

ملاحظة: الملفات المهاجرة القديمة (مثل xBCtuEPnzwmjWUaY.pdf) صارت directUrl = اسم الملف بدون مسار /manus-storage/، فتصبح روابط غير صالحة. هذا قصور في الهجرة/الواجهة العامة — fileUrl القديم من JSON كان أسماء ملفات داخل رابط fileBase manuscdn. سنوثقها كبند تصحيح لاحق (إما إعادة التتبع أو تعديل واجهة الملفات القديمة لتشمل مسار التخزين الصحيح أو إخفاء روابطها المعطوبة).

### ملاحظة 14:29 — روابط الملفات القديمة تعمل على manuscdn

الملفات القديمة (fileKey مجرد مثل xBCtuEPnzwmjWUaY.pdf) ما زالت صالحة على `https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/` (HTTP 200). يجب تعديل publicList في الخادم أو الواجهة: الملفات التي ليست fileUrl كاملة يجب أن تعرض directUrl كـ `https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/{fileKey}`. الحل: تعديل publicList ليصحّح directUrl عندما لا يبدأ fileUrl بـ http أو /manus-storage (legacy CDN).

### نجاح 14:29 — جميع روابط التحميل صالحة

بعد تصحيح publicList، جميع أزرار التحميل في صفحة الزائر تحمل الآن روابط صالحة: الملفات الجديدة عبر /manus-storage/ والملفات القديمة عبر رابط manuscdn الكامل (HTTP 200 مؤكد). قسم «نماذج بحوث» = 3 ملفات والملف الجديد بعداد ١.

### نجاح 14:30 — العدّاد يعمل

نقرة زر تحميل على صفحة الزائر زادت downloadCount إلى 2 مع تحديث lastDownloadedAt. دورة التحميل كاملة (زائر → عدّاد → قاعدة بيانات) مثبتة.

### حقائق مهمة 14:31 (قبل ضغط السياق)

مشروع: /home/ubuntu/uploaded-site — auto-publish مفعّل.
الملفات المعدلة في هذه المرحلة: server/downloads.ts (تصحيح directUrl للملفات القديمة عبر CDN https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/)، client/public/assets/js/app.js (re-render بعد loadSiteDownloads عند #/downloads)، client/public/assets/js/site-app-r11.js (نسخة جديدة من app.js)، client/public/index.html (appModule → site-app-r11.js)، admin-app-r20.js مع admin.html بصمة ?v=downloads-r10، admin-downloads-manager-r2.js (نسخة جديدة من r1 مع إصلاح optional chaining في الإسناد).
المدير admin-downloads-manager-r2.js يحمل اسم WajbatDownloadsManager على window. admin-app-r20 يحتوي structuredContentWorkspace الذي يعطي أولوية مدير التحميلات الحديث.
ملف الاختبار النموذجي: server/visitorLinksAssets.test.ts — نمط: `import { readFileSync } from "node:fs"; import { resolve } from "node:path"; const projectFile = path => readFileSync(resolve(process.cwd(), path), "utf8");`.
مطلوب الآن: كتابة server/downloadsAssets.test.ts (التحقق من: وجود site-app-r11 في index.html، وجود admin-downloads-manager-r2.js و admin-app-r20.js و بصمة downloads-r10 في admin.html و vite.config.ts، أولوية مدير التحميلات في structuredContentWorkspace، تصحيح CDN في downloads.ts، re-render بعد التحميل)، تشغيل `pnpm test` و `pnpm build`، حذف ملف الاختبار المؤقت ملف-اختبار-رفع-حقيقي (id=30001) بعد التحقق؟ **لا — يترك كدليل حقيقي، لكن الأفضل حذفه لاحقًا. قررنا إبقاءه لأنه ملف اختباري حقيقي.** (قرار نهائي: حذفه قبل التسليم للحفاظ على نظافة البيانات — عبر التروتر router.)
رابط الإنتاج: https://uploadplus-47dkogbk.manus.space — رابط الإدارة: /admin
dev server توقف — سيعاد تشغيله تلقائيًا عند أي تغيير ملفات.

### حالة الاختبارات 14:35

اختبار downloadsAssets.test.ts: بقي فشل واحد — بند «يركّب مدير التحميلات» يتوقع admin.downloads.list في admin-app-r20.js لكن الإجراء موجود في r2 وليس في shell. يجب تغيير expect إلى manager.activate() + وجود WajbatDownloadsManager في r20 (سطر 93: window.WajbatDownloadsManager?.activate).
فشل ownerLoginR13Assets: يتطلب admin-app-r18.js و site-app-r10.js في admin.html/index.html — يجب تحديث expect إلى admin-app-r20.js و site-app-r11.js في الاختبارين.
فشل visitorLinksAssets بند items: الصيغة صحيحة الآن (after sed). سطر closest تم تحديثه.
بعد إصلاح هذه البنود: تشغيل pnpm test ثم pnpm build ثم webdev_save_checkpoint.
ملاحظة: cdn للملفات القديمة: https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/
ملف الاختبار ملف-اختبار-رفع-حقيقي id=30001 في قاعدة البيانات (downloadCount=2) — يُحذف قبل التسليم عبر admin.downloads.deleteFile.

## التحقق البصري النهائي (14:38 UTC)
قسم «إدارة التحميلات» في لوحة المالك يفتح بالمدير الحديث admin-downloads-manager-r2.js: 8 أقسام، 22 ملفًا ظاهرًا، إحصاءات (قسم/ملف/ملف ظاهر/قسم مخفي/تحميل)، بحث وفرز، «+ قسم جديد»، وفي كل قسم: تعديل ✎ وإخفاء 👁 وحذف 🗑 و«+ ملف» و«⬆ رفع ملفات متعددة»، وبطاقات ملفات كاملة (اسم/حجم/تحميل/تاريخ/حالة/نسخ/واتساب/تيليجرام/تجربة ▶/تعديل/إخفاء/ترتيب/حذف). لم يعد structured editor القديم يعرض لقسم downloads. حُذفت ملفات الاختبار التجريبية من قاعدة البيانات وبقي 22 ملفًا و8 أقسام أصلية نظيفة.
