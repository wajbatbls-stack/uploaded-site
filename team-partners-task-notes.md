# ملاحظات مهمة لتنفيذ: إدارة فريق الإدارة + إدارة شركاء النجاح

## بيانات الزائر الحالية (client/public/assets/js/site-app-r14.js)
- فريق الإدارة ثابت حاليًا (سطر 639): [["أحمد عبدالله","المدير التنفيذي"],["سارة محمد","مدير الشؤون الأكاديمية"],["محمد فهد","مدير التقنية"],["نورة خالد","مدير خدمة العملاء"]]
- يوجد support DB: managedTeamMembers (سطر 25 في r14) من content.teamMembers مع visible+sortOrder، وmanagedAboutPage (سطر 818-821) fallback للثابت أعلاه. صفحة about في route "/about" استخدم managedAboutPage.
- partnersPage في r14 (سطر 643): يعرض UNIVERSITIES/INSTITUTES/OTHERS من ثوابت أو من content.partners (سطر 256-260):
  content.partners → كل عنصر {name, kind:"جامعة|معهد|جهة تعليمية", visible?, sortOrder}. ملاحظة: لا يوجد description/link/شعار في التنسيق الحالي! بطاقتها: name فقط (split " - " للأيقونة فقط). partner-card class مع partner-icon.
- partnersPage لا يعرض شعار/رابط/مدينة/وصف حاليًا — يجب تحديث العرض ليشملها دون كسر التصميم.

## قاعدة البيانات (content_collections)
- collectionKey موجود: services(1), plans(2), reviews(3), articles(4), faqs(5), partners(6), downloads(7), siteSettings(8), aboutContent(30001), teamMembers(30002)
- سكوبما contentCollections: id, collectionKey, label, content(longtext JSON), createdAt, updatedAt

## المطلوب من المستخدم (pasted_content.txt)
- قسم «👥 إدارة فريق الإدارة»: بطاقات (صورة/اسم/منصب/وصف/حالة/ترتيب) + أزرار تعديل/حذف(بتأكيد)/إظهار/إخفاء/أعلى/أسفل + إضافة عضو (حقل الصورة زر رفع من الجهاز JPG/JPEG/PNG/WEBP مع معاينة) + معاينة
- قسم «🤝 إدارة شركاء النجاح»: بطاقات (شعار/اسم جامعة/مدينة/وصف/رابط/حالة/ترتيب) + نفس الأزرار + رابط اختياري + معاينة
- رفع الصور داخل القسم (S3) بدون كود، حفظ دائم DB
- الانعكاس الفوري في موقع الزائر: من نحن (فريق)، شركاء النجاح
- لا حذف للبيانات الحالية، لا قسم ملفات مستقل

## خطة التنفيذ
1. schema: team_members (id,name,role,description,photoUrl,visible,sortOrder) + partners_table (id,name,city,description,logoUrl,link,kind,visible,sortOrder)
2. db.ts: helpers + site router: site.teamMembers.list (visible only, sorted) + site.partners.list
3. admin router: admin.teamMembers.*, admin.partners.* CRUD + visible + reorder
4. admin UI: admin-dashboard.html قسمان جديدان داخل sidebar (نمط المديريات السابقة — انظر admin-app-r26.js + admin-blog-manager-r8.js كنمط)
5. site-app: ربط aboutPage/partnersPage بالجداول
6. نسخ المحتوى الحالي (partners id=6, teamMembers id=30002) إلى الجداول الجديدة (هجرة) قبل تبديل العرض
7. بصمات جديدة r9/r10 + vite.config copy list + اختبارات + checkpoint

## نمط المديريات السابقة (مهم)
- ملفات admin: client/public/assets/js/admin-app-r26.js (بصمة blog-r9 في admin-dashboard.html)، admin-blog-manager-r8.js (blog-r11)
- نمط mountCompatibleBlogManager: refresh بعد الفتح، request/mutate يعيد data.json مباشرة (superjson طبقة واحدة)
- admin-dashboard.html يشير إلى admin-app-r26.js?v=blog-r9 و admin-blog-manager-r8.js?v=blog-r11
- vite.config copy plugin ينسخ الملفات إلى dist/public

## تقدم الجلسة (محدّث الآن)
- schema.ts: أُضيف جدولا team_members وpartners (نفس حقول الملاحظة مع photoMediaId/logoMediaId وkind enum) ✅
- Migration 0013 مولّد وطُبّق ✅
- db.ts: دوال list/create/update/delete/move للفريق والشركاء أُلحقت نهاية الملف، مع import teamMembers/partners ✅
- تبقى: روترات server/team.ts وserver/partners.ts وتسجيلها في routers.ts، هجرة البيانات من contentCollections إلى الجداول، واجهتا الإدارة، ربط صفحات الزائر (about/partners) بالجداول، بصمات واختبارات وcheckpoint
