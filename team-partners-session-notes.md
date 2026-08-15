# ملاحظات جلسة: إكمال مديري الفريق الإداري وشركاء النجاح

## الحالة حتى الآن (مكتمل)
- الهجرة من content_collections إلى الجداول الجديدة: تمت بنجاح (4 أعضاء فريق، 33 شريكًا). السكربت نُفذ وحُذف.
- `server/team.ts` — روتر كامل: listAll (owner), listPublic, create, update, delete, uploadPhoto (يحفظ photoUrl بعد الرفع), setVisibility, move. يعتمد دوال db.ts: createTeamMember/updateTeamMember/deleteTeamMember/moveTeamMember/listTeamMembers/recordAdminAudit. الصورة تُحفظ في S3 بمفتاح `wajbat-plus/team/{id}.{ext}`.
- `server/partners.ts` — روتر كامل بنفس النمط: `wajbat-plus/partners/{id}.{ext}`، procedures: listAll/listPublic/create/update/delete/uploadLogo/setVisibility/move.
- `server/routers.ts` — تم تسجيلهما: publicRouter + adminRouter. tsc نظيف (0 أخطاء).
- `client/public/assets/js/admin-team-manager-r1.js` — مدير فريق كامل (window.WajbatTeamManager): CRUD، رفع صورة، ترتيب، إخفاء/إظهار، معاينة form.
- `client/public/assets/js/admin-partners-manager-r1.js` — مدير شركاء كامل (window.WajbatPartnersManager): CRUD، رفع شعار، نوع الجهة (جامعة/معهد/جهة تعليمية)، مدينة، رابط.
- `client/public/admin.html` — تم إضافة تحميل السكربتين بعد contactManager (في المسارين main وonerror) + fallback بعد 4 ثوانٍ.
- ملاحظة: admin-dashboard.html لم يُعدَّل بعد — نفس التعديلات مطلوبة (نفس البنية المتداخلة بعد contactManager).

## المتبقي
1. تعديل admin-dashboard.html بنفس نمط admin.html (تحميل team/partners managers + fallback).
2. إضافة mountCompatibleTeamManager وmountCompatiblePartnersManager في admin-app-r26.js + إدراجهما في contentWorkspace() بعد فحص blog. أنماط موجودة:
   - mountCompatibleBlogManager: checks window.WajbatBlogManager && state.selected === "blog", then queueMicrotask -> manager.container = document.querySelector("[data-blog-workspace]"); manager.refresh(); return `<section class="workspace side-workspace" data-blog-workspace>...`.
   - نفس النمط بـ data-team-workspace / data-partners-workspace.
   - labels وnavSections موجودة بالفعل: labels.team = ["♙","فريق الإدارة","أعضاء الفريق وصورهم"], labels.partners موجود. navSections: about/team في "التعريف والإدارة"، partners في "المحتوى".
3. فحص vite.config.ts plugin copy-wajbat-admin-assets — التأكد أن ملفات admin-team-manager-r1.js وadmin-partners-manager-r1.js وadmin-dashboard.html وadmin-app-r26.js ضمن قائمة نسخ البناء (أضفها لو غائبة).
4. صفحة الزائر site-app-r14.js: فحص قسم about/team وpartners — إذا كانت تقرأ من content_collections، يجب التبديل لجلب team.listPublic وpartners.listPublic (publicProcedure موجودة). أعمدة: members: name/role/description/photoUrl (old fields في collection: title,body,... يجب فحص الأعمدة الفعلية المستخدمة في site-app-r14.js قبل التغيير!)
5. اختبار end-to-end: tRPC queries، إضافة/تعديل/حذف، رفع صورة، visibility.
6. تحديث todo.md (بنود [ ] لمديري team/partners) وتسجيل checkpoint — النشر تلقائي (auto-publish enabled).
7. تسليم: رابط الزائر https://uploadplus-47dkogbk.manus.space + لوحة الإدارة /admin-dashboard.html

## بيانات مهمة
- ترقية قالب كاملة تمت (db/server/user). admin credentials: ADMIN_EMAIL=bdalslamanwralajsh@gmail.com / ADMIN_PASSWORD=abd77312 (عبر env / server/adminSession).
- جلسات admin تستخدم cookie ADMIN_SESSION_COOKIE؛ ownerProcedure للحماية.
- نمط request/mutate في المديرات: superjson unwrapped تلقائيًا (الكود داخل manager).
- أعمدة team_members: id, name, role, description, photoUrl, photoMediaId, isVisible, sortOrder, createdAt, updatedAt.
- أعمدة partners: id, name, city, description, kind(enum: جامعة/معهد/جهة تعليمية), logoUrl, logoMediaId, link, isVisible, sortOrder, createdAt, updatedAt.


## حالة محدثة (بعد التعديلات الأخيرة)
- ✅ admin.html: تحميل team/partners managers بعد contactManager (المساران) + fallback r1/r1.
- ✅ admin-dashboard.html: نفس التعديلات (المساران) + fallback.
- ✅ admin-app-r26.js: أُضيف mountCompatibleTeamManager + mountCompatiblePartnersManager + هوكات في contentWorkspace (key==="team"/"partners"). labels.team وlabels.partners موجودة. navSections تحتوي about/team وpartners.
- ✅ site-app-r14.js: loadSiteTeamPartners() يحمّل site.team.listPublic وsite.partners.listPublic؛ aboutPage يعرض managedManagedTeam مع photo/description؛ partnersPage يعرض dynamicPartners (شعار + مدينة + kind + وصف + رابط) وإلا fallback القوائم الثابتة UNIVERSITIES/INSTITUTES/OTHERS. bootSite يستدعيها وrender عند #/about|#/partners.
- ✅ CSS (style.css + style-r2.css): .team-avatar img، .partner-logo، .partner-link أُضيفت بعد .team-avatar.
- ✅ vite.config.ts: أُضيف admin-team-manager-r1.js وadmin-partners-manager-r1.js لقائمة النسخ.
- ملاحظة مهمة: روتر partner/partners في db.ts يعيد كل الصفوف، وlistPublic يفلتر isVisible. لا دالة sortBy sortOrder في query عام (DB returns orderBy sortOrder asc).
- ملاحظة: partnersPage السابق لم يكن يعرض شعار — إضافة partner-logo CSS تحافظ على التوافق.

## المتبقي
1. تشغيل pnpm test (اختبارات موجودة ~77) + tsc.
2. فحص أن teamRouter/partnersRouter مسجلة public+admin في routers.ts (نفذت سابقًا - تحقق).
3. رفع site-app إلى r15 (نسخة جديدة client/public/assets/js/site-app-r15.js وتحديث client/index.html للإشارة إليها؟ تحقق من نمط الإشارة).
4. اختبار End-to-end: dev server port 3000 — test: site.team.listPublic وadmin.team.listAll (يتطلب admin cookie: ADMIN_EMAIL=bdalslamanwralajsh@gmail.com ADMIN_PASSWORD=abd77312 — عبر /api/admin/login?). تحقق من endpoint تسجيل دخول الإدارة في admin-app-r26.js.
5. Checkpoint + تسليم: الزائر https://uploadplus-47dkogbk.manus.space ، الإدارة /admin-dashboard.html


## ملاحظات التصحيح (20:50)
- server/team.ts وpartners.ts: procedures أسماءها listAll/create/update/delete/move/setVisibility/uploadPhoto/listPublic — لا يوجد نص "admin.team." داخل الملفين.
- routers.ts: يحتوي 'team: teamRouter' و'partners: partnersRouter' (تحت site وadmin). لا يحتوي "listPublic" (الموجود في team.ts/partners.ts).
- db.ts: listTeamMembers/listPartners + CRUD.
- تعديل الاختبار: استبدال admin.team. بـ listAll في team.ts، admin.partners. بـ listAll في partners.ts، وإضافة expect على team.ts/partners.ts لـ listPublic.


## تشخيص مشكلة النشر القديم (20:54 UTC)

**الأعراض:** production admin.html عند https://uploadplus-47dkogbk.manus.space/admin.html يعرض نسخة قديمة (Last-Modified: 20:16:42 GMT) قبل checkpoint e67b8e7 (20:51:37 UTC). لا يحتوي على admin-team-manager-r1.js / admin-partners-manager-r1.js، رغم أن assets المنفردة ترجع 200. dev preview سليم.

**ما جُرِّب:** curl مع cache-busting query — ما زال قديمًا. vite build محلي سليم (dist/public/admin.html 20:53 يحتوي المديريَن). git origin/main عند e67b8e7.

**خطة الحل المقترحة (من debug agent):** نسخ admin.html وadmin-dashboard.html إلى أسماء ملفات مُصدرة (versioned filenames) مثل admin-r27.html / admin-dashboard-r27.html بحيث تعامل CDN الملفات الجديدة كأهداف جديدة لا تُكاش، مع تحديث أي مراجع (بما فيها /admin redirect إن وُجد).

**ملاحظة مهمة:** checkpoint auto-publish يعمل غالبًا لكنه يبدو أنه لم يحدّث ملفات HTML الجذرية القديمة (أو كاش CDN للجذر). إنشاء checkpoint جديد سيحاول نشرها مجددًا، لكن الحل الأنسب: إنشاء admin-dashboard-r27.html جديد كملف مختلف كليًا.


## تشخيص حرج: موقع الزائر معطل في الإنتاج بسبب البناء (21:00 UTC)

**الحقيقة المؤكدة:**
- dev preview (/ 3000) يخدم client/public/index.html (موقع الزائر vanilla بسكربت site-app-r15.js) — يعمل.
- vite build يكتب dist/public/index.html من **client/index.html** (React SPA فارغ "Example Page") — يستبدل موقع الزائر!
- الإنتاج https://uploadplus-47dkogbk.manus.space/ يخدم هذا SPA الفارغ حاليًا (grep "Example Page" = 7).
- client/public/index.html (موقع الزائر) ليس جزءًا من build graph، لا يصل للإنتاج عبر بناء Vite.
- admin.html وadmin-dashboard.html وصلتا للإنتاج بعد نشر e67b8e7 (PROD NOW OK). assets/js/site-app-r15.js موجود 200 في الإنتاج لكن لا أحد يشير إليه لأن index.html المنشور SPA فارغ.
- كيف كان الموقع يعمل قبل؟ نشر سابق ربما كان ينسخ client/public مباشرة أو كان هناك آلية أخرى (ربما قبل الترقية web-db-user كان المشروع static يخدم client/public). بعد الترقية، البناء يكسر موقع الزائر.

**الحل المختار (الأقل تدخلًا):**
1. في client/index.html: استبدل title بالعنوان العربي، dir="rtl"، وخطوط، وCSS الموقع، وأضف سكربت module يحمّل /assets/js/site-app-r15.js (بنفس نمط client/public/index.html) مع div#app بجانب div#root.
2. ملاحظة: div#root لـ React SPA يُحفظ لكن SPA Home يعرض "Example Page" فقط — يجب إخفاؤه أو جعل Home يعرض div#app للموقع. الأسهل: App.tsx: Route "/" renders <div id="app"></div> (بدل Home) ليعمل site-app على div#app.
3. التحقق: build محلي ثم curl localhost:3000 بعد بناء (أو فحص dist) للتأكد أن / يعرض الموقع قبل checkpoint جديد.
4. تذكير: dist/public/pages/ تحتوي صفحات فرعية (about.html...) مع README — الصفحات الفرعية قد تكون معطلة أيضًا في الإنتاج (server/index.ts يخدم index.html لكل المسارات *). الصفحات الفرعية في site-app تعمل بـ hash routing داخل SPA واحد، لذا /#/about يكفي — لا حاجة لملفات pages/ في الإنتاج.

**حالة مهمة فريق الإدارة:** مكتملة (جدول + روترات + مدراء + اختبار 85/85) وتم نشرها ونجح نشر admin.html (20:55).


## حالة إصلاح موقع الزائر في البناء (21:10 UTC) — نجاح جزئي

**ما تم:**
1. عدّلت client/index.html: html dir=rtl + عنوان عربي + meta + خطوط + CSS الموقع + سكربت module يحمّل /assets/js/site-app-r15.js داخل div#app (بجانب div#root).
2. عدّلت client/src/pages/Home.tsx: div#app مع site-home-root بدل "Example Page" (لا يظهر مثال إلا عند isAuthenticated).
3. نتيجة vite build محلي: dist/public/index.html (368KB) الآن يحتوي: title عربي، div id="app" واحد، div#root، div#toast-region، سكريبت site-app-r15.js module، main.tsx. grep count: div#app=1, site-home-root=0 في dist (لأن React inline)، Example Page=0. ✅
4. tsc نظيف، البناء نجح.

**متبقي:**
- ملاحظة: div#app يظهر في dist/index.html لكن Home.tsx render يعيد div#app أيضًا — React سيرسمه ثانية عند hydration؟ لا، Home.tsx يُعرض داخل #root، و#app مستقل — لا تكرار إلا إذا React أزاله (React يعرض فقط داخل #root، لذا #app يبقى). آمنة.
- يجب: pnpm test، ثم checkpoint جديد (auto-publish)، ثم curl للإنتاج والتأكد أن / يعرض الموقع ("منصتك الذكية للتعلم وا")، ثم فحص صفحات #/services و#/about تعمل (site-app routing داخلي).
- تذكير: assets موجودة في dist/public/assets/js/site-app-r15.js عبر copy-wajbat-admin-assets plugin (موجودة في build log).
- رابط الإنتاج: https://uploadplus-47dkogbk.manus.space — لوحة الإدارة: /admin-dashboard.html (تعمل الآن).


## تحقق نهائي 2026-08-14 بعد checkpoint 33b7789d
الإنتاج نشط الآن: bundle assets/site-BlfSTIiT.js يحمل "/assets/js/site-app-r15.js" والملف site-app-r15.js يعيد HTTP 200 ويحتوي loadSiteTeamPartners. admin-dashboard.html في الإنتاج 200 ويحمّل admin-team-manager-r1.js وadmin-partners-manager-r1.js. لقطات dev: الرئيسية سليمة (Hero + فوتر)، صفحة من نحن تعرض فريق الإدارة بأعضائه الأربعة، صفحة الشركاء تعرض بطاقات الجامعات والمؤسسات من الجداول الجديدة. شاشة الدخول /admin و/admin-dashboard.html تعرض قالب الدخول المخصص بسليم.

ملاحظة بصرية متبقية: صور أعضاء الفريق في صفحة من نحن تظهر أيقونة افتراضية بدل الصورة — فحص CSS .team-avatar img وphotoUrl في site-app-r15 (هل الصفوف القديمة من migration تحتوي photoUrl؟).

## التحقق النهائي (بعد تصحيح NULL — checkpoint 350d66cd)
صفحة "من نحن" تعرض الرؤيا والرسالة والأهداف الاستراتيجية وسجل الفريق من قاعدة البيانات (أيقونة افتراضية لأن البيانات الأصلية لم تكن تحمل صورًا). صفحة "شركاء النجاح" تعرض الجامعات من جدول partners عبر publicList مع المدن. شاشة دخول الإدارة تعمل (Passkey ظاهر). جميع بنود todo.md مكتملة، 85/85 اختبار. checkpoint منشور تلقائيًا: https://uploadplus-47dkogbk.manus.space

## مهمة النسخة الاحتياطية الشاملة (2026-08-15) — طلب المستخدم
- المستخدم يريد حفظ نسخة كاملة عنده: كود + قاعدة بيانات + صور (خوفه من فقدان حساب Manus أو مسح بالخطأ).
- المرحلة 1 (SQL): تم ✅ — سكربت /home/ubuntu/full-backup/export_db.mjs صدّر 31 جدول / ~2223 صف إلى /home/ubuntu/full-backup/wajbatplus_database.sql
- المرحلة 2: تصدير الصور من S3 — يجب استخدام storageGet/list (server/storage.ts helpers) لجلب كل الصور المدرجة في الجداول (media/mediaUrls في content_collections، photoUrl في team_members، logoUrl في partners، postImage في blog...) + تنزيلها عبر presigned URLs
- المرحلة 3: ZIP شامل في /home/ubuntu/full-backup/wajbatplus-full-backup.zip = كود المشروع (git archive أو tar client/server/drizzle/shared/package.json/vite.config...) + sql + media/ + ملف إرشادات restore-guide.md (بالعربي)
- المرحلة 4: تسليم الملف للمستخدم (message result مع attachment)
- ملاحظة: DATABASE_URL في env: tidbcloud.com:4000/47DkogBKT8NjmDhwkhVpm8 (mysql2/promise، ssl rejectUnauthorized true)
- جداول فيها روابط صور S3: content_collections (محتوى media)، team_members (photoUrl)، partners (logoUrl)، blog (postImage)، media table إن وجدت

## حذف النشرة البريدية (2026-08-15)
- حُذف نموذج النشرة البريدية من فوتر site-app + handler النشرة (4 أسطر في handleForm) من r15
- تم إنشاء site-app-r16.js وتحديث client/index.html + client/public/index.html + vite.config.ts (copy + rollupOptions)
- التحقق: newsletter=0 في r16، node --check OK، build OK، لقطة شاشة الهاتف تؤكد اختفاء قسم الاشتراك والفوتر سليم
- متبقٍ: checkpoint + نشر تلقائي + تحديث todo.md


## مهمة حذف قسَمَي «الروابط السريعة» و«خدماتنا» من الفوتر (2026-08-15)
- طلب المستخدم: حذف قسَمَي «روابط سريعة» و«خدماتنا» الموجودين أسفل كل صفحة من موقع الزائر مع إبقاء الحقوق
- الإنجاز: حُذفا السطران من footer() في client/public/assets/js/site-app-r16.js، وتوازن الأقواس سليم (1314/205/673/337 متوازن)، وconst quick/services ما زالت في الكود (غير مستخدمة — غير ضارة)
- الفوتر الآن: العمود الأول (العلامة/الهاتف) + copyright فقط
- المتبقي: (1) رفع بصمة إلى r17 + تحديث client/public/index.html وclient/index.html وvite.config (r16→r17 في قائمة النسخ وrollupOptions)، (2) pnpm test + تحقق بصري، (3) checkpoint (auto-publish) + إعلام المستخدم
- رابط موقع الزائر: https://uploadplus-47dkogbk.manus.space — لوحة الإدارة: https://uploadplus-47dkogbk.manus.space/admin-dashboard.html
- سكربت الحذف: /home/ubuntu/remove_footer_cols.py (مرة واحدة على r16)
- ملف النسخة الاحتياطية أُنجز وسُلِّم: /home/ubuntu/full-backup/wajbatplus-full-backup.zip
