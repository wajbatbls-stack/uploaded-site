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
