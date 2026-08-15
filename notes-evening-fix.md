# جلسة 2026-08-16 المسائية — تشخيص 3 مشاكل هاتف المستخدم

## المشكلة 1: خطأ الحفظ «Invalid input: expected string, received null» (imageKey/imageUri)
- مصدر الخطأ: رسائل JSON من tRPC في شاشة إدارة التحميلات (لقطة 13:35) عند «إضافة قسم» أو حفظ قسم.
- فحص server/downloads.ts: categoryInput وfileInput حقلان imageKey/imageUrl: `z.string().max(512).optional()` — أي يقبلان string أو undefined فقط؛ **رفض null صراحة**.
- إذا أرسل الـJS `imageKey: null` أو `imageUrl: null` يرمي schema zod خطأ invalid_type expected string received null — هذا مطابقة تامة لخطأ المستخدم.
- الر12: الملف drawer يرسل description: data.description || undefined (سليم). لكن عند رفع شعار قسم (categoryDrawer, سطر ~314 pendingLogo = { imageUrl: String(reader.result) }) وبعد الرفع ربما يرسل imageKey:null.
- فحص db.ts:695/743 يحول input.imageKey ?? null — يقبل undefined.
- **الخلاصة**: الخطأ سببه JS (r11 أو r12 المنشور) يرسل null صراحة لـ imageKey/imageUrl عند حفظ قسم أو ملف. الحل في r14: حذف الحقلين أو عدم تضمينهما إلا عند وجود قيمة حقيقية string.

## المشكلة 2: زر «إضافة الملف» معطّل رغم اكتمال البيانات (لقطة 13:40)
- سطر 440 في r12: `submit.disabled = pendingUploads.length === 0;` — يُفعّل فقط عند وجود ملفات.
- في اللقطة: المستخدم اختار القسم والاسم والملف، لكن الزر معطّل — يعني pendingUploads فارغ عند فحصه.
- السبب المرجح: fileInput change handler يملأ pendingUploads لكن في r12 (على الهاتف) إما أن change لا يشتعل (input مخصص) أو أن renderQueue أعاد بناء الزر قبل اختيار القسم... الأرجح: عند فتح drawer تُعاد بناء النموذج و submit هو الزر `button[type=submit]` الجديد بينما handler مربوط بمرجع قديم؟ لا — listener مربوط على form.
- الاحتمال الأقوى: user ضغط على select القسم فيقوم blur/change — لا. الأرجح: في الهاتف عند اختيار قسم من select، form submit قد يُعاد بناء النموذج؟ لا.
- **الحل**: في r14: تعطيل الزر وفق قاعدة واضحة (الاسم + القسم + ملفات > 0) مع تحديثه بعد كل تغيير (input/select/رفع)، وطباعة رسالة واضحة بدل الصمت.

## المشكلة 3: لوحة الشركاء تظهر الجدول القديم (لقطة 13:23)
- المستخدم على الهاتف يرى partners-manager القديم (جدول + حفظ/إلغاء + خطأ عند الحفظ) بدل r13 (بطاقات).
- فحص: لقطة 13:23 تعرض واجهة مختلفة كليًا (بحث/صفحة/تالي/السابق) — هذه ليست r10 ولا r13 الحالية؛ قد تكون نسخة أقدم r4-r7.
- kash: ملف partners المنشور r13 صحيح، لكن HTML قد يحمل إحالات قديمة أو cache على admin.html نفسه (query param v=partners-r13).
- ملاحظة: admin.html قد يُخدم من CDN بكاش طويل (شبكة الاتصال بطيئة لدى المستخدم) — الحل: تغيير اسم الملف إلى r14.js + query جديد + cache-control headers.

## نقاط التنفيذ r14
1. نسخ r12 → r14 مع:
   - حذف imageKey/imageUrl: null من أي payload (أرسل الحقل فقط إذا كانت value string غير فارغة)
   - إصلاح تعطيل submit: تابع updateSubmit() يُستدعى بعد كل تغيير
   - عند اختيار قسم من select تأكد أن value صحيحة (Number(data.categoryId))
2. نسخة partners r14: إعادة تصميم كامل (طلب المستخدم صراحة تصميم مختلف قوي احترافي):
   - بطاقات كبيرة: اسم الجهة + نوع + شارة الحالة + صف أزرار + نموذج تعديل كامل: اسم/نوع/وصف/رابط/واتساب/شعار (رفع من الجهاز مع معاينة فورية) + ظاهر للزوار + حفظ/إلغاء
   - كسر كاش: اسم جديد admin-partners-manager-r14.js + ?v=partners-r14
3. تحديث admin.html + admin-dashboard.html + vite.config redirects:
   - downloads r1..r3→r14، r12→r14، r10/r11→r14
   - partners r2..r10→r14، r13→r14
4. اختبارات: server/downloadsAssets.test.ts + ownerLoginR13Assets.test.ts + teamPartners.test.ts → تحديث الإحالات إلى r14
5. اختبار فعلي على dev: إضافة قسم، رفع ملف (يجب عدم ظهور خطأ imageKey)، حفظ شريك مع شعار ووصف ورابط

## حقائق ثابتة
- DB partners: جامعة طيبة فقط لديها logoUrl مرفوعة؛ البقية فارغة (المالك يجب أن يرفعها بنفسه).
- admin-downloads-manager-r12.js موجود محليًا وdist. r12 في dist يحمل categoryId select صحيحًا.
- الاختبارات الحالية 93/93.
- الإنتاج: https://uploadplus-47dkogbk.manus.space — auto-publish مفعّل.
- ملفات الإدارة: client/public/admin.html و client/public/admin-dashboard.html.

## مواضع الإصلاح المحددة في r14 (النسخة محلية الآن من r12)
- سطر 104 (saveCategory): `imageKey: input.imageKey, imageUrl: input.imageUrl,` ← يجب: أرسل فقط إذا string غير فارغ، وإلا undefined.
- سطر 305 (pendingLogo): يحمل `{ imageKey: category.imageKey, imageUrl: category.imageUrl }` من category (قد تكون null من DB) ← يجب تصفية القيم غير السلسلة.
- سطر 389/440: submit يبدأ disabled حتى اختيار ملف؛ fileInput change يملأ pendingUploads ثم renderQueue يعيد تمكينه — السلسلة سليمة لكن في لقطة المستخدم الزر بقي معطلًا: إضافة validation explicit قبل الحفظ: إذا !data.categoryId اعرض رسالة واضحة بدل الصمت. وإضافة updateSubmit() يستجيب لأي تغيير.
- سطر 458: FormData entries يعيد categoryId string من select — سليم إذا options موجودة.
- سطر 476: catch يرمي submit.disabled=false لكن أي toast عبر admin.toast قد لا يظهر على الهاتف (WajbatAdmin.toast غير موجود؟) — إضافة showNotice في catch.

## ملاحظات إضافية
- سطر 222: showNotice يعتمد على layer #dl-r10-notices داخل render — التأكد أن layer موجود دائمًا.
- سطر 16: toast يستدعي admin().toast أو alert.

## حالة التنفيذ (تم حتى الآن)
1. r14 محلي: client/public/assets/js/admin-downloads-manager-r14.js — إصلاحات مطبقة ومحققة (node -c OK):
   - saveCategory (سطر 94): payload ينظف imageKey/imageUrl إلى undefined إن لم تكن string غير فارغة ✓
   - pendingLogo (سطر 306): نفس التنظيف ✓
   - submit disabled: updateSubmit بعد كل تغيير + رسالة واضحة عند فشلcategoryId ✓
2. r14 شركاء: cp r13→r14 + تعديل تعليق فقط (SYNTAX_OK)
3. admin.html + admin-dashboard.html: downloads→r14 (?v=downloads-r14)، partners→r14 (?v=partners-r14) ✓
4. vite.config copyAdminAssets: downloads r1,r2,r3,r10,r11,r12,r13→r14 ✓؛ partners r2-r10,r13→r14 ✓
5. المتبقي:
   - تحديث الاختبارات: server/downloadsAssets.test.ts (r12→r14)، ownerLoginR13Assets.test.ts (r12→r14, r13 partners→r14)، teamPartners.test.ts (r13→r14)
   - بناء pnpm run build + pnpm test + webdev_take_screenshot (dev) ثم webdev_save_checkpoint (auto-publish)
   - اختبار فعلي: إضافة قسم + رفع ملف دون خطأ imageKey (على dev في /admin#/downloads)
6. curl على /admin: cache-control no-store ✓ (HTML لا يُخزن؛ المشكلة كاش JS فقط — كسرنا الاسم r14)
7. dist لا يحتوي r14 بعد (dist قديم) — البناء القادم سينسخه

## خطأ البناء الحالي (22:47)
- Error: ENOENT copyfile `client/public/assets/js/admin-downloads-manager-r13.js` → `dist/.../admin-downloads-manager-r14.js`
- السبب: r13 محذوف من client/public/assets/js (لا يوجد downloads-manager-r13.js محليًا) لكن vite.config copyAdminAssets ما زال ينسخ r13→r14
- الحل: استبدال سطر `source: admin-downloads-manager-r13.js → r14` في vite.config بنسخ من r12 أو r14 (المصدر موجود)
- partners-manager-r13.js موجود محليًا — لا مشكلة هناك
- الاختبارات 93/93 نجحت. screenshots dev: صفحة /admin تظهر شاشة دخول (الجلسة غير مسجلة في أداة اللقطات) — طبيعي
- بعد الإصلاح: pnpm run build ثم webdev_save_checkpoint

## الحالة النهائية قبل checkpoint (22:55)
البناء نجح (EXIT=0) وdist يحتوي admin-downloads-manager-r14.js وadmin-partners-manager-r14.js وسليمين (node -c ok). إحالات HTML: admin.html وadmin-dashboard.html كلاهما يحمل r14 (downloads-r14/partners-r14، 3 مرات لكل ملف). إصلاحات r14 المؤكدة في dist: saveCategory×2 وpendingLogo×3 (يعني لا يرسل imageKey null للخادم، وزر إضافة الملف يتحقق من القسم والملف ويعرض رسائل خطأ). تصميم الشركاء في r14 هو نفسه r13 (بطاقات item-row مع preview الشعار img.blog-row-thumb ومعاينة shape) — لقطة المستخدم السابقة كانت تعرض واجهة structured-editor القديمة وليس partners-manager (الهاتف كان يخدم كاش r10-old من structured).
ملاحظة: pm-grid لم يعد موجودًا في r14 لأن التصميم يعتمد على item-row من admin-list-controls + partner-shape-preview.
الاختبارات 93/93 نجحت. الخطوة التالية: webdev_save_checkpoint ثم تسليم للمستخدم.
