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


## اختبار الإنتاج الحي 2026-08-15 23:00 UTC (sandbox browser على uploadplus-47dkogbk.manus.space/admin)
الجلسة مسجّلة دخول كمالك؛ صفحة /admin#/downloads تحمّل r14 كاملًا وتعمل: 8 أقسام، 22 ملف، كل الأزرار ظاهرة (رفع ملف جديد، رفع عدة ملفات، تعديل/إخفاء/حذف لكل ملف، تعديل/إخفاء/حذف القسم). **المتبقي**: فتح «رفع ملف جديد» (زر 39) واختبار الإضافة فعليًا على الإنتاج، ثم حفظ شريك (القسم 13)، للتأكد من عدم ظهور خطأ imageKey على الإنتاج. سجل الإنتاج manus-webdev-logs لا يحوي أخطاء من نشاطاتي الأخيرة؛ آخر أخطاء production من 9:38م سابقة.


## ملاحظة 23:00 — drawer مفتوح على الإنتاج
- النموذج «ملف جديد» مفتوح: اسم (60)، قسم select (61) بـ5 خيارات ظاهرة فقط (نماذج بحوث..بوربوينت — options 5-7 غير ظاهرة في القائمة المقتطعة لكنها option#0..4 مذكورة فقط!)
- **انتبه**: markdown يعرض option#0..option#4 فقط (5 خيارات) بينما DB فيها 8 أقسام. هل select يحمل 8 options فعلًا؟ فحص بـconsole.
- زر إضافة الملف (65) ظاهر — الحالة: معطّل حتى اختيار ملف (السلوك الصحيح).
- التالي: اختيار قسم عبر console select، إرفاق ملف، فحص disabled، ثم submit عبر console أو click.


## تشخيص 23:05 UTC — schema سليم
schema في server/downloads.ts سليم (imageKey optional في كليهما). رسالة خطأ المستخدم الزرقاء «Invalid input: expected string, received null» path imageKey — يعني **نسخة قديمة** (r10/r11 كانت ترسل imageKey: null). في r14 أرسلنا undefined عند الفراغ — لكن المستخدم ما زال يخدم r11 أو r12 (المشكلة مستمرة في المتصفح الخفي!).
نقطة حاسمة: سجل الإنتاج لا يحوي أي أخطاء downloads حديثة — أي أن محاولاته الأخيرة ربما لم تصل للخادم أصلًا (JS قديم يسكت الخطأ) أو تصل وتُرفض قبل الترحيل.
الأهم الآن: **التحقق من أي نسخة يخدمها الإنتاج فعلًا**: curl https://uploadplus-47dkogbk.manus.space/admin ثم فحص رابط JS المضمّن وv=downloads-rXX.


## اكتشاف حاسم 23:10 — سبب استمرار المشكلة في المتصفح الخفي
- curl للإنتاج: dist/public/assets/js/admin-downloads-manager-r14.js كان بحجم/محتوى r12 القديم (md5 مختلف، 823 سطر، لا يحوي إصلاح typeof imageKey).
- السبب الجذري: في vite.config copyAdminAssets كانت أسطر r1..r12 تُنسخ فوق r14 في dist **بعد** أن يُنسخ r14 الصحيح — أي أن آخر عملية نسخ كتبت r12 القديم فوق r14.
- الإصلاح: إضافة أسطر `source: r14.js → destination: r14.js` و`source: r13.js → r14` **بعد** أسطر النسخ القديمة (في نهاية القائمة) بحيث تُكتب النسخة الصحيحة أخيرًا. (أُضيفت لـdownloads S196-197 والشركاء S227.)
- نفس المنطق يجب التحقق منه للشركاء: dist كان يحمل r13 القديم؟ تم أيضًا إضافة r14→r14 بعد أسطر النسخ القديمة.
- المتبقي: pnpm run build → md5 dist == md5 client/public → التحقق curl من الإنتاج بعد checkpoint (auto-publish) → اختبار الإنتاج حي (إضافة قسم + رفع ملف + شريك) → checkpoint + تسليم.
- تنبيه: auto-publish مفعّل، كل checkpoint ينشر فورًا على https://uploadplus-47dkogbk.manus.space
- الاختبارات 93/93 نجحت سابقًا قبل آخر تعديل config (إضافة سطرين فقط copy — لا تؤثر على الاختبارات).


## تشخيص mismatch شركاء r14 في dist (23:15)
dist r14 size=20810 بينما المصدر 32635 وr13=32633 — dist ليس r13! سبب غريب: copyAdminAssets لا ينسخ الملفات بالترتيب الظاهري فقط. الاحتمال: r14.js في المصدر لم يكن موجودًا في client/public **عند بدء البناء السابق** أو أن هناك آلية أخرى: vite ينسخ publicDir أولًا (بما فيها r14)، ثم copyAdminAssets... لكن r14→r14 يقرأ المصدر في نفس اللحظة. الأرجح: copyFileSync من r14→r14 نجح ثم سطر لاحق كتب فوقه؟ لا توجد أسطر أخرى تستهدف r14 بعد سطر r14→r14 (r8/r7/r6 كلها →r14 وتأتي بعده!). نعم: r8→r14 وr7→r14 وr6→r14 تُكتب **بعد** r14→r14، وآخر واحد يفوز = r6 (20810 بايت). الحل: نقل سطر r14→r14 إلى **نهاية** كتلة الشركاء (بعد r6).
نفس المنطق ينطبق على downloads: سطر r14→r14 وضعته قبل r11→r14 سابقًا؟ لا — في downloads سطر r14→r14 سطر 196 وآخر أسطر r11→r14 سطر 195 وr12→r14 سطر 193 وr10→r14 سطر 192، وr3 S191 — الترتيب صحيح (r14 في النهاية) وmd5 downloads متطابق ✓.
الشركاء فقط يحتاجون إصلاح: نقل `{ source: r14.js, destination: r14.js }` بعد سطر r6→r14.


## لغز dist لا يتغير (23:20)
بعد تعديل vite.config لنقل سطر partners r14→r14 بعد r6→r14 (وأصبح r2→r14 في النهاية عمديًا لا — سطر r2 أصبح سطر 229 بعد نقل r14)، dist/public/assets/js/admin-partners-manager-r14.js ما زال 3e22e02730a3588102c5950f84f94980 = r2 القديم (20632 بايت)!
التفسير الوحيد المتبقي: **هناك build cache أو أن dist/public يُملأ أولًا عبر vite publicDir copy الذي يخدم من client/public مباشرة** — vite ينسخ client/public إلى dist/public في خطوة منفصلة، لكن copyAdminAssets يعمل في closeBundle ويكتب بعده... إلا إذا كان plugin `publishVersionedEntryAssets` أو آخر ينفذ **بعد** closeBundle ويعيد الكتابة، أو أن fs.copyFileSync يُتخطى لأن الملف موجود ولا يُكتب over (مستحيل).
فحص: هل يوجد closeBundle آخر أو plugin ينفذ بعده؟ سطر 285 في vite.config فيه closeBundle آخر (plugin آخر). يجب قراءته — ربما `publishVersionedEntryAssets` يكتب من dist قديم أو يعيد بناء dist.
ملاحظة: downloads r14 md5 متطابق في dist رغم نفس البنية → يعني آلية النسخ تعمل لـdownloads! الفرق: partners r14 في dist = r2. هل في copyAdminAssets سطر آخر يكتب partners-r14.js؟ بحثت: لا. هل `publishVersionedEntryAssets` (سطر 285) يملك closeBundle يعالج partners؟ يجب فحص.
الأهم: حل أبسط وآمن — **حذف** أسطر partners القديمة من list التي تسبب الغموض (r2..r13 التي →r14) والإبقاء على سطر واحد r14→r14 فقط، مع تحويل redirects (r2..r13)→r14 عبر serve middleware. لكن المشكلة الأساسية: لماذا dist لا ينسخ؟ ربما build قديم محفوظ — pnpm يقرأ vite.config عبر tsx وts-node cache... جربت build5 (EXIT=0) جديد.
ملاحظة إضافية: r13 في dist (7984db4f) مطابق r10 (7984db4f) — إذن redirects تُنفذ على الملفات الموجودة مسبقًا في dist من vite publicDir copy... والأهم: md5 المحلي r13 = r10 أيضًا (34254)! إذن r13 هو نسخة من r10.


## السبب الحقيقي للغز (23:05)
في copyAdminAssets (vite.config.ts)، قائمة أسطر partners كانت: r3→r14, r4→r14, r5→r14, r10→r14, r13→r14, r9→r14, **r14→r14 (سطر 225)**، r8→r14, r7→r14, r6→r14, **r2→r14 (سطر 229 - بعد سطر r14 الحقيقي!)**. أي أن سطر r2→r14 **التالي** كان يستبدل r14 الصحيح بالمحتوى القديم r2 في dist. downloads نجا لأن أسطر r10→r14 وr12→r14 كانت **قبل** سطر r14→r14 هناك.
الحل المطبق: حذف أسطر r2..r13→r14 من القائمة (سكربت python) والإبقاء على r14→r14 + r1→r1 فقط. بقي تكرار سطر r14→r14 مرتين (219, 220) — غير ضار لكن سأوحّده. redirects r2..r13→r14 تبقى في serve middleware سليمة.
ملاحظة: partners في dist قبل هذا: 3e22e0 = محتوى r2. يجب البناء والتحقق من md5 b975bb.
حالة المشروع: todo.md محدث (بنود الليلية مكتملة جزئيًا)، الاختبارات تمر، r14 downloads سليم في dist. الإنتاج: uploadplus-47dkogbk.manus.space


## الحالة النهائية بعد إصلاح copyAdminAssets (23:06)
- المشكلة الجذرية: في vite.config copyAdminAssets، سطر r2→r14 كان **بعد** سطر r14→r14 فيعيد الكتابة بـr2 القديم (21858 بايت) في dist. أُزيلت أسطر r2..r13→r14 وإبقيت r14→r14 + r1→r1 (والتكرار الثاني).
- downloads: 8 أسطر r1..r3/r10..r14→r14 وr14 الحقيقي (سطر 196) هو الأخير ✓ md5 متطابق c91c6bf.
- partners: md5 متطابق b975bb ✓.
- اختبارات 93/93 تمر. بناء آخر سليم.
- admin.html يحمّل managers عبر window managers (admin-app-r30 يستوردهم عبر script src مع v param) — إحالات HTML لـr14 تحققت سابقًا (v=downloads-r14, v=partners-r14).
- المتبقي: webdev_save_checkpoint + تسليم للمستخدم مع تأكيد curl من الإنتاج أن md5 الصحيح يصل.
- الإنتاج: https://uploadplus-47dkogbk.manus.space | لوحة الإدارة: /admin


## mismatch المنشور (23:06 UTC)
- admin.html المنشور ✓ يشير إلى r14 (v=downloads-r14, v=partners-r14) + &reload=
- لكن GET للملف المنشور يعيد **50048 بايت = محتوى r11 القديم** (md5 مختلف عن dist المحلي 51857 c91c6bf و34258 b975bb)
- dist محلي صحيح (c91c6bf/b975bb)
- الاستنتاج: النسخة المنشورة على الإنتاج ما زالت نسخة checkpoint قديمة (قبل إصلاح copyAdminAssets) أو CDN يخدم كاش. checkpoint 1e4ab855 حُفظ — قد يكون لم يكتمل النشر بعد.
- curl المنشور: `bc3b833d` (50048 بايت) — r11 القديم!
- الإجراء التالي: التحقق من logs النشر، انتظار، إعادة curl مع bypass، إن بقي: فحص ما إذا كان auto-publish يعمل وcp dist في مكان آخر.


## تشخيص mismatch (23:07 UTC)
- site-app-r32 المنشور ✓ متطابق مع المحلي/المصدر (57d8bd3، 107321 بايت). النشر يعمل للملفات الأخرى.
- لكن admin-downloads-manager-r14 المنشور = 50048 بايت = محتوى r11 القديم (bc3b833d)، بينما dist المحلي 51857 = c91c6bf صحيح.
- Partners r14 المنشور = 22059 = محتوى r6 القديم (b975bb محلي = 34258).
- الاستنتاج: dist المنشور على الإنتاج بُني قبل تعديلات النسخ الأخيرة في closeBundle، أو أن closeBundle في build النشر لا يعمل. لكن site-app متطابق... يعني البناء المنشور حديث (نفس الوقت) لكن r14 لم يدخله!
- فحص محتمل: vite.config في commit 1e4ab85 (المنشور) قد يكون أحدث من 22:45؟ dist محلي من 23:03.
- الإجراء: إعادة بناء محلي والتأكد copyAdminAssets يعمل في كلتا الحالتين، ثم حفظ checkpoint جديد (auto-publish) ليتبع نشر جديد من dist المبنية.
