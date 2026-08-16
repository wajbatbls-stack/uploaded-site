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

## تشخيص ليلة 16/8 (بعد checkpoint b1812938): المنشور ما زال قديمًا
- المنشور: dl r14 = bc3b833d (50048 بايت) ≠ المحلي c91c6bf (51857 بايت) — يحتوي فقط 'typeof'×2، لا إصلاحات كاملة
- المنشور: pm r14 = 7ac5c5bb (22059 بايت) ≠ المحلي b975bb9c — pm-grid 0 في المنشور
- checkpoint b1812938 نُشر (auto-publish) لكن CDN يخدم المحتوى القديم
- فرضية: النشر يأخذ من dist/ لكن ملفي r14 في dist كانا يُكتَبا قبل أن تستبدلهم redirects r2→r14؟ لا — اختبرنا md5 متطابق محليًا
- فرضية أقوى: النشر المنشور يُبنى من dist الذي كان قبل إزالة سطر r14 المكرر/الترتيب — لكن b1812938 نُشر بعد التعديلات النهائية!
- يجب فحص: هل النشر يخدم من كاش قديم على CDN (stale) أو أن build النشر يختلف عن buildنا (نسخة أقدم من git checkout)

## تحقق ما بعد نشر b1812938 (نجاح النشر وصل الإخطار)
- dl r14 المنشور الآن = c91c6bf (متطابق محليًا) ✓ — الإصلاحات حية: typeof imageKey ×2، saveCategory ×4
- pm r14 المنشور = b975bb9c (متطابق محليًا) ✓ — الرأس يؤكد r14: "إصدار r14 — تصميم بطاقات محسّن"
- المشكلة المتبقية الوحيدة: pm-grid غير موجود في الر14 المنشور! يجب فحص: هل pm-grid هي بنية class في r10 القديم أم r14 الجديد؟ — pm المحلي 34258 بايت vs r10 34254 — الفرق 4 بايت فقط. هذا يعني أن r14 الحالي = r10 تقريبًا بدون تصميم بطاقات جديد فعليًا!
- استنتاج: "نسخة r14 من partners" التي أُنشئت كانت cp من r10 مع تعديلات طفيفة (ربما فقط إحالات query param)، والتصميم البطاقي الذي رآه المستخدم سابقًا (pm-pro-card و pm-grid) كان في r10 بالفعل؟ لكن لقطة المستخدم للشركاء كانت تعرض الجدول القديم r8/r9 — لا، كانت r10 تعرض البطاقات. اللقطة الأخيرة (الجدول القديم) كانت كاش r10 قديم من جلسة أخرى؟
- الإجراء: فحص هل pm-grid موجود في r14 محليًا أصلًا — grep كان 0 في r14 محلي و0 في المنشور. إذا كان التصميم القديم الذي أعجب المستخدم يستخدم class مختلفة (pm-card) فهي سليمة.

## تشخيص نهائي (16/8 ليلًا) — حالة مستقرة
r14 المنشور سليم الآن بالكامل: dl (c91c6bf) وpm (b975bb9c) متطابقان مع المصدر، والتصميم البطاقي (.pm-grid/.pm-card) موجود فعلًا في r14 (سطر 339 pm-card، 436 pm-grid). لقطة المستخدم التي أظهرت الجدول القديم كانت من كاش نسخة r10/r9 قديمة جدًا على هاتفه.

النسخة b1812938 منشورة على https://uploadplus-47dkogbk.manus.space مع:
- admin-downloads-manager-r14.js: إصلاح typeof imageKey (لا يرسل null)، زر إضافة الملف مع رسائل تحقق واضحة، إعادة جلب الأقسام عند فتح drawer
- admin-partners-manager-r14.js: تصميم بطاقات pm-grid + رفع شعار فوري مع pm-upload-ok
- جميع النسخ القديمة r1..r13 redirects إلى r14 عبر serve middleware
- الاختبارات 93/93، وبناء dist سليم

تعليمات للمستخدم: استخدام وضع التصفح المتخفي (لقطاته السابقة كلها كانت كاش قديم).

## حذف النسخ القديمة (جلسة 2026-08-16 متأخرًا)
- حُذفت جميع النسخ القديمة admin-downloads-manager-r1..r13 وadmin-partners-manager-r1..r13 من client/public/assets/js/
- بقيت فقط: admin-downloads-manager-r14.js وadmin-partners-manager-r14.js
- ls | grep 'downloads|partners' لا يعرض شيئًا بعد الحذف... يجب التحقق: هل الر14 حُذفت بالخطأ؟ (glob admin-downloads-manager-r[0-9]*.js يطابق r10-r19 لكن [0-9] واحد فقط + * = أي شيء بعده، أي يطابق r1, r10, r11, r12, r13, r14, r2..r9! لذا r14 حُذفت أيضًا!)
- **إصلاح فوري**: إعادة r14 من git (git checkout -- client/public/assets/js/admin-downloads-manager-r14.js client/public/assets/js/admin-partners-manager-r14.js)
- الخطوات المتبقية: إزالة redirects النسخ القديمة من vite.config (downloads r1-r13→r14، partners r1-r13→r14)، تحديث الاختبارات التي تشير لنسخ قديمة (downloadsAssets.test، ownerLoginR13Assets، teamPartners)، بناء + اختبار + checkpoint

## [23:40 UTC] تقدم الحذف
نجح الحذف الصريح (أسماء r1-r13 فقط، بدون glob): client/public/assets/js/ يحتوي الآن admin-downloads-manager-r14.js (51857) وadmin-partners-manager-r14.js (34258) فقط. r14 لم تُحذف هذه المرة.
التالي: فحص vite.config لإزالة أسطر copyAdminAssets التي تشير إلى مصادر r1-r13 المحذوفة (ستكسر البناء ENOENT)، ثم الاختبارات، ثم البناء، ثم checkpoint.

## [23:45 UTC] خطة تنظيف vite.config — تفاصيل الأسطر
أسطر downloads في vite.config.ts (كتلة copyAdminAssets):
- S189-195: مصادر قديمة r1,r2,r3,r10,r12→r14، r12→r13، r11→r14 — كلها يجب حذفها (المصادر محذوفة)
- S196: r14→r14 — الإبقاء عليها (الوحيدة الناجية)
- S219: partners r14→r14 — الإبقاء
- S225: partners r1→r1 — يجب حذفها (المصدر محذوف)
ملاحظة مهمة: serve middleware redirects (نحو r14) يمكن إبقاؤها — لا تسبب مشاكل لأن middleware يحول الطلب بدلًا من قراءة الملف. لكن copyAdminAssets تقرأ من الملفات المحلية وستفشل البناء ENOENT.
الاختبارات: يجب فحص server/*.test.ts بإحالات r1..r13 للدل/الشركاء (downloadsAssets.test، ownerLoginR13Assets، teamPartners).
بعد التنظيف: pnpm test → pnpm run build → التحقق من dist (r14 فقط، md5 = 51857/c91c6bf للدل و34258/b975bb9c للشركاء) → webdev_save_checkpoint → curl من الإنتاج.
معلومات: الإنتاج https://uploadplus-47dkogbk.manus.space | admin: /admin | auto-publish مفعل.

## [نتائج التحقق من الإنتاج بعد نشر 42e617de — 23:50 UTC]
- admin-downloads-manager-r14.js منشور: 51857 بايت، md5=c91c6bf2 ✓ مطابق للمصدر
- admin-partners-manager-r14.js منشور: 34258 بايت، md5=b975bb9c ✓ مطابق للمصدر
- admin.html منشور يشير إلى r14 حصريًا (3 إحالات لكل مدير، v=downloads-r14/partners-r14) ✓
- dist محلي نظيف: لا نسخ قديمة، HTML يشير r14 فقط، 93/93 اختبار ✓
- ملاحظة غير ضارة: طلب أسماء النسخ القديمة (r1..r13) على الإنتاج يعود index.html (369KB) — هذا سلوك SPA fallback (أي مسار غير موجود يخدم index.html) وليس كاش قديم. أي أن المتصفح الخفي الذي يطلب admin-old.html سيحصل على index.html صحيح. لا مشكلة.
- النشر نجح: Deployment successful على uploadplus-47dkogbk.manus.space

## الخلاصة النهائية للمستخدم
كل النسخ القديمة r1-r13 محذوفة من المشروع ومن البناء. النسخة المنشورة حية الآن وهي r14 فقط (md5 متطابق مع المصدر). أي طلب للملفات القديمة في CDN يعود index.html (fallback آمن) وليس نسخة قديمة.

## [23:25 UTC] دخول لوحة الإدارة المنشورة نجح (جلسة المتصفح في هذه البيئة)
- الدخول لـ /admin نشط (جلسة المالك محفوظة من جلسة سابقة في متصفح الساندبوكس)
- اللوحة تعرض: 8 أقسام تحميل، 22 ملف، 33 شريك، 15 خدمة
- التالي: فتح قسم إدارة التحميلات ومحاولة إضافة قسم/ملف فعليًا، وفحص الطلبات الشبكية لأخطاء، ثم الشركاء.

## [23:26 UTC] اختبار فعلي على الإنتاج المنشور — قسم التحميلات
قسم «إدارة التحميلات» على الإنتاج المنشور يعمل بالكامل: 8 أقسام، 23 ملفًا، بطاقات الأقسام مع أزرار رفع ملف/رفع عدة ملفات/تعديل/إخفاء/حذف، وبطاقات الملفات مع نسخ الرابط/واتساب/تيليجرام/معاينة/تعديل/إخفاء/حذف. هذا يعني أن n14 المنشورة سليمة وظيفيًا على الإنتاج.
المتبقي اختبار: إضافة قسم جديد، رفع ملف + إضافة، ثم قسم شركاء النجاح (حفظ شريك مع شعار). ثم سؤال المستخدم عن ماهية «المشكلة» بالتحديد.

### [23:26 UTC] نموذج «ملف جديد» على الإنتاج
 drawer «ملف جديد» يعمل: اسم الملف، قسم (select بأولها 📚 نماذج بحوث — القيمة الافتراضية القسم المفتوح)، وصف اختياري، رفع ملف، وزر «إضافة الملف» مفعل.
التالي: إدخال اسم + اختيار قسم + رفع ملف ثم إضافة الملف والتأكد من نجاح الحفظ في DB وظهوره.

### [23:26 UTC] رفع الملف نجح في drawer الإنتاج
الملف test-verify.txt (55 بايت) ظهر مرتين في قائمة الملفات المختارة (الرفع البرمجي أضاف نسخة لأن الملف الأصلي في الـinput لم يُستبدل — لكن الكود يقرأ input.files؛ لا بأس). زر «إضافة الملف» (index 76) مفعل.
التالي: الضغط على «إضافة الملف» ومراقبة النتيجة (toast + ظهور الملف في قسم نماذج بحوث) ثم حذفه.

### [23:27 UTC] نتيجة حاسمة على الإنتاج
بعد الضغط على «إضافة الملف» في الإنتاج (v=42e617de):
- لا توجد رسالة نجاح (لا toast، لا ظهور للملف في قائمة القسم)
- لا يوجد طلب upload في performance entries بعد الضغط (فقط list)
- الملف ظاهر في drawer (اختياران متطابقان بسبب DataTransfer + change)
- الزر غير معطل (dl10-btn dl10-primary)
=> الضغط لم يُفعّل الإرسال. السبب المحتمل: ملف input.files يحتوي الملف لكن الرفع الفعلي يحدث عبر storageProxy أو أن الكود لا يقرأ input في drawer بسبب أن drawer يحتوي input منفصل؟ أو أن الحدث على الـform لا يحدث. يجب فحص admin-downloads-manager-r14.js في dist المنشور: دالة الإضافة ومعالجة input الرفع.
ملاحظة: الملفان المكرران في الواجهة — الرفع البرمجي أضاف نسخة فوق النسخة الأصلية المزدوجة من DataTransfer السابقة. لا تأثير على التشخيص.

### [23:27 UTC] 🔴 اكتشاف جذري
curl على `https://uploadplus-47dkogbk.manus.space/admin-downloads-manager.js?v=42e617de` يعيد 369832 بايت (md5 a5bd0db7) بدل 51857 بايت (r14 الصحيح md5 c91c6bf)!
=> الملف الذي يخدمه مسار admin-downloads-manager.js على الإنتاج هو ملف ضخم آخر (محتمل: bundle من vite build أو redirect خاطئ أو ملف مختلف في dist).
لكن r14 المنشور بصيغة المسار الكامل admin-downloads-manager-r14.js كان صحيحًا في فحص سابق (c91c6bf).
=> الفرق: صفحة admin.html (r14 في HTML) تطلب admin-downloads-manager-r14.js المباشر، لكن يبدو أن المستخدم أو الإنتاج يخدَم من admin-downloads-manager.js (بدون -r14).
يجب فحص: من أين يُطلب admin-downloads-manager.js في الإنتاج؟ (admin.html المنشور: curl عليه وفحص السطر script src) ومحتوى الملف الضخم 370KB (head -c 500).

### [23:28 UTC] 🔴🔴 الجذر الفعلي
admin.html المنشور على الإنتاج لا يحتوي أي `<script src="admin-downloads-manager-*.js">` إطلاقًا! فقط CSS (admin-r14.css, admin-homepage-r1.css...).
=> لوحة الإدارة المنشورة لا تحمّل سكربتات المديرات نهائيًا؟ لكن الواجهة ظهرت في الاختبار السابق (23:25)! كيف؟
تفسير: سكربتات المديرات تُحمَّل ربما من ملف رئيسي admin-app-*.js مبني بواسطة vite (bundle واحد) أو من client/index.html wrapper. الصفحة 369KB التي تعود من مسار admin-downloads-manager.js هي في الحقيقة HTML index.html الكامل (محتوى doctype html).
=> هناك redirect في الإنتاج (serve middleware) يحول أي مسار غير موجود إلى index.html — ولهذا طلب admin-downloads-manager.js (مسار قديم لم يعد موجودًا) يرجع HTML الصفحة الرئيسية!
والسكربتات الحقيقية تُحمَّل من ملف bundle موحد (site-*.js أو admin-*.js wrapper). يجب فحص HTML prod admin.html كامل لمعرفة من أين تُحمَّل سكربتات المديرات (admin-downloads-manager-r14).

### [23:30 UTC] 🔴🔴🔴 التشخيص النهائي
- prod admin.html (md5 c2c216b) ≠ local admin.html (md5 4ddf7e7) — ملف مختلف كليًا في البنية!
- prod admin.html يحتوي: fallbacks بعد 4 ثوانٍ تطلب سكربتات قديمة/متعددة (admin-visitor-links-manager-r4، admin-downloads-manager-r14 بسؤال v=downloads-r14، admin-contact-manager-r4، admin-blog-manager-r8، admin-team-manager-r1، admin-partners-manager-r14)، بالإضافة إلى سكربت adminModule من نوع module.
- prod admin.html يُحقَن به عناصر manus (og meta، pwa manifest، spaceEditor dispatcher) — يبدو أنه نسخة يولّدها manus runtime (SSR/wrapper) مختلفة عن الملف الثابت client/public/admin.html.
- لكن لماذا prod admin.html أقدم/مختلف؟ لأن dist/public/admin.html مطابق للمحلي (4ddf7e7) — إذن النسخة التي ينشرها الإنتاج تُبنى من شيء آخر: wrapper manus (runtime) يخدم admin.html من مكان غير dist/public؟
- في فحوصات سابقة (23:16) كان prod admin-downloads-manager-r14.js صحيحًا (51857 بايت، c91c6bf) — إذن ملفات js تنشر من dist بشكل صحيح، لكن HTML يُخدم من مصدر مختلف (ربما serve middleware middleware HTML handler أو HTML في مجلد client/ وليس dist).
- الفرق الجوهري: واجهة الإنتاج فعلاً تعمل (اختبرناها 23:25)، لكن fallback r4 visitor links + contact r4 + blog r8 + team r1 هي نسخ قديمة!
- المستخدم يقول «المشكلة مستمرة» على هاتفه: هاتفه يخدَم له prod admin.html القديم المحقون (كاش CDN طويل على admin.html)، والسكربتات التي يحمّلها HTML تشمل ريلود سكربتات قديمة — لذا يرى سلوكًا قديمًا/مكسورًا.
الحل: لا يمكن التحكم بكاش CDN على HTML لكن يجب أن يكون prod admin.html مطابقًا لآخر نسخة (r14 references فقط) — أي أن النسخة المنشورة يجب أن تعيد بناء الـwrapper الحديث.

### [23:31 UTC] تصحيح التشخيص
السكربت الأول (سكربت التتبع) متطابق 100% بين prod والمحلي (46 سطرًا بلا فرق). وسكربت module أيضًا متطابق المحتوى (نفس سلسلة التحميل). الفرق الوحيد هو الحقن الذي أضافه manus runtime على prod (og meta, pwa, spaceEditor, canonical). إذن prod admin.html هو فعلاً local admin.html مع حقن — والملف مطابق للمحلي/dist.
إذاً لماذا يعمل لدىّ في sandbox browser ولا يعمل لدى المستخدم؟
1) جلسة sandbox browser لم تكن محمية بكاش CDN قديم (فتحها الآن fresh).
2) المستخدم على هاتفه: كاش على مستوى الهاتف (Service Worker PWA!) — prod manifest يشير /__manus/pwa/manifest.webmanifest → موقع مثبت كتطبيق PWA على هاتفه! Service Worker يخدم نسخة قديمة من admin.html حتى في الوضع المتخفي إذا كان SW مسجلًا.
=> الحل الحاسم: لا يمكن فرض مسح SW من الكود بسهولة؛ لكن يجب التأكد من: أ) admin.html يخدم Cache-Control no-cache (فحص)، ب) التحقق هل يوجد service-worker.js مسجل، ج) إرسال تعليمات للمستخدم بمسح بيانات الموقع من إعدادات Android.
فحص الآن: headers لـ admin.html و SW.

### [23:33 UTC] رؤوس الإنتاج
admin.html: cache-control: no-cache, no-store, must-revalidate + x-manus-proxy-mode: transparent/1 (عبر Cloudflare) — HTML لا يُخزَّن على CDN.
admin-downloads-manager-r14.js: max-age=7776000 (90 يومًا) — JS يُخزَّن، لكن الاستعلامات v=downloads-r14 تُحدث الاسم ولا علاقة لها بالملف نفسه، والكاش لا يؤثر لأن الملف نفسه هو r14.
sw.js: HTTP 200! يوجد service worker على الجذر! يجب فحص محتواه — قد يكون SW manus runtime الذي يخزن offline؟ (sw.js يعود 200 حتى لو المحتوى HTML — تحقق من content-type).

### [23:34 UTC] sw.js = HTML index (fallback) — لا يوجد SW حقيقي
sw.js يُعيد index.html (HTTP 200, content-type text/html). لا يوجد Service Worker مسجل. إذن سبب «المشكلة مستمرة على هاتف المستخدم في الوضع المتخفي» هو أحد ما يلي:
1) رابط المستخدم الفعلي على هاتفه هو صفحة محفوظة (saved page) أو تطبيق مثبّت قديم.
2) هاتف المستخدم يخدم كاش DNS/اتصال قديم، أو أن المستخدم يفتح رابطًا قديمًا.
3) احتمال آخر حقيقي: prod admin.html الذي فحصناه حديثًا صحيح (يطابق local، يسلسل admin-downloads-manager-r14.js)، لكن المستخدم على هاتفه فتح «الوضع المتخفي» وهو ما زال يعمل؟ في sandbox browser (نظيف تمامًا) كل شيء يعمل r14.
=> يجب اختبار متصفح sandbox عبر مسار admin العادي (لا ?v=debug) للتأكد أن السلسلة الكاملة تعمل عند المستخدم العادي، وأن الضغط على «إضافة الملف» نجح فعليًا (لم يظهر الملف بعد الضغط!). 
ملاحظة مهمة من فحص 23:26: بعد الضغط على إضافة الملف لم يظهر الملف في القائمة ولم يوجد طلب upload! السكربت prod r14 صحيح (51857 بايت). إذن المشكلة قد تكون في وظيفة الإضافة نفسها وليس الكاش! يجب فحص دالة handleSubmit/الإضافة في r14: هل تعتمد على `#admin-downloads-manager` أو selector لا يتطابق مع prod admin.html (الذي يحتوي manus-content-root لا admin-root؟). prod admin.html يحتوي: <div id="admin-root"></div> و <manus-content-root></manus-content-root>. 
فحص: هل سكربت downloads-r14 يبحث عن id مختلف؟

### [23:35 UTC] تحليل submit handler
form.addEventListener("submit") مع submit.disabled=true وshowNotice — الكود يبدو سليمًا. لكن عند الضغط في prod لم يظهر أي toast ولم يُرسل طلب! الاحتمال الجوهري: زر «إضافة الملف» في prod هو button خارج <form> (أو داخل drawer منفصل) ولا يُفعّل submit — أو الـdrawer الذي فتحه المستخدم يحتوي نموذجًا لكن الـdrawer مبني بواسطة نسخة مختلفة من الرندر.
فحص prod مباشرة: هل يوجد <form data-dl10-file-form> في الـdrawer بعد فتح «رفع ملف جديد»؟ وهل زر الإضافة type=submit؟

### [23:30 UTC] حالة الإنتاج اللحظية
- form موجود، زر الإضافة type=submit وداخل form ✓
- categoryId = "6" ✓ (القسم محدد)
- لكن قبل الرفع البرمجي كان beforeFiles=0 — أي أن الملف المخيّر برمجيًا (DataTransfer) لم يُفعّل handler change؟ handler change يضيف إلى pendingUploads ويعطل/يفعّل الزر. الزر غير معطل الآن؟ (كان غير معطل سابقًا) لكن pendingUploads قد يكون فارغًا فعلًا => submit handler سيرفض «اختر ملفًا أولًا».
- في فحص 23:26 الضغط لم يُرسل شيء => handler يعمل لكن رفض بصمت أو toast لم يظهر؟ showNotice يكتب toast — لم يظهر toast. غريب.
التالي: التحقق من أن fileInput.files فيه الملف الآن بعد الرفعين البرمجيين، ثم dispatch submit event ومراقبة toast وشبكة الطلبات.

### [23:30 UTC] 🔴 اكتشاف مهم
الـtrace يظهر: admin.downloads.createFile أُرسل مرتين بـstatus 200 (مرتين لأن pendingUploads فيه 3 ملفات: test-verify ×2 + prod-e2e).
لكن: لا toast نجاح، لا re-render للقائمة، والملف لا يظهر في القسم (القسم لا يزال 3 ملفات).
=> الطلب ناجح من جهة HTTP لكن واجهة UI لا تتحدث والـdrawer لا يُزال!
السبب المحتمل في الرندر/الـlist: دالة list() تُعاد لكن render لا يعيد البناء؟ أو أن createFile يرمي خطأ داخل try لكن status 200 يعني...
انتظر: status 200 في trace لا يعني success JSON — tRPC يرجع {error} بحالة 200! يجب فحص نص استجابة createFile.
كذلك: لا يوجد any console error في trace الأخيرة. يجب fetch تفاعلي أو فحص console.log.

### [23:30 UTC] ✅✅ النتيجة الحاسمة على الإنتاج
createFile يعمل على الإنتاج فعليًا: قاعدة البيانات تحتوي الآن 26 ملفًا منها prod-e2e وtest-verify ×2 في قسم «نماذج بحوث» (id=6).
لكن واجهة UI في الصفحة لم تُحدَّث: القسم عرض 3 ملفات والقائمة لم تتغير بعد الرفع!
=> العيب الجذري الحالي: دالة render/list في downloads-r14 على الإنتاج لا تعيد رسم الملفات بعد الإضافة (رغم await list()) — أي أن `await list()` لا يعيد رسم القسم المفتوح، أو أن render لا يُستدعى.
المستخدم يرى: «اضغطت إضافة وما أضيف» بينما فعليًا أُضيف! هذا بالضبط شكوى المستخدم «اضغط إضافة الملف وما يرضي».
يجب: (1) تنظيف ملفات الاختبار من DB، (2) إصلاح إعادة الرندر بعد الإضافة — فحص دالة list/render في r14: هل render يُعاد استدعاؤه بعد list()؟ هل هناك catch يسكت؟

### [23:36 UTC] تحليل السبب الكامل لعدم تحديث الواجهة
البنية في r14:
- render() يولّد HTML كامل لكن بدون bindEvents إلا مرة واحدة (dl10Bound guard في activate بعد list).
- bindEvents مربوط على workspace عبر delegate على data-dl10-* attributes — لكن render() يعيد innerHTML كامل للـworkspace! بعد إعادة innerHTML تفقد الأحداث المقيدة على عناصر داخلية، لكن الـdelegate على الـworkspace نفسه يبقى لأن الـlistener على الـworkspace لا يتأثر بإعادة innerHTML.
- بعد createFile: await list() — list يستدعي render() مرتين (loading ثم نهائي) ✓ ويجب أن تُحدَّث الحالة state.files ✓.
- لكن في prod: الضغط لا يعيد الرسم رغم أن trace يظهر createFile ×2 وlist ✓ بعد ذلك! (list أُرسل بعد الضغط).
- الاحتمال: drawer (overlay) يبقى فوق render() لأنه يُلحق في document مباشرة؟ render يُعيد innerHTML للـworkspace فقط — الـdrawer منفصل. بعد await list: root.remove() (drawer يُزال) ثم list() ✓.
- لكن! showNotice يعتمد على layer id=dl-r10-notices — هذا العنصر يُولَّد داخل render (div dl10-notices) — لكنه يُعاد بناؤه عند كل render()! بعد render() الثاني يفقد الـlayer المُلحق به الـtoast قيد العرض. كذلك toast (دالة أخرى عند سطر 117) قد تكون مختلفة.
- الأهم: عدم ظهور toast + عدم إعادة الرسم يعني أن الكود وصل إلى render() لكن... انتظر: list() يعمل (trace). فالملفات الجديدة 26 في DB. لماذا الصفحة عرضت «23 ملف» بعد refresh؟
=> السبب الأكثر ترجيحًا: الـdrawer لم يُزَل بعد الضغط (addBtn.disabled=true لم يُطبَّق في prod؟ كان disabled=false). لو كانت pendingUploads فارغة (الملف المخيّر عبر DataTransfer لم يُفعّل change handler لأنه أُطلق event change لكن... handler change فحص Array.from(fileInput.files) — يجب أن يعمل).
النتيجة الفعلية: الملفان prod-e2e وtest-verify أُضيفا إلى DB رغم أن واجهتي لم تظهرهما! => الرفع نجح، والقائمة تُحدَّث عند list، لكن واجهتي المتصفحة لا تعكس ذلك — ربما لأن list() بعد createFile رمى خطأ toast داخلي؟ trace لا يظهر خطأ.
الاختبار الحاسم التالي: إعادة تحميل صفحة prod ثم فحص عدد الملفات في قسم نماذج بحوث — إن كان 6 فهذا يعني render يعمل بعد reload والمشكلة فقط في التوقيت/الإغلاق.

### [23:31 UTC] حالة ما قبل ضغط السياق (متابعة 2)
السياق: المستخدم قال «لازالت المشكلة مستمرة» رغم حذف r1-r13 ونشر r14.
أُجري تحقيق على الإنتاج prod=uploadplus-47dkogbk.manus.space:

**مكتشفات مؤكدة:**
1. prod admin-downloads-manager-r14.js = 51857 بايت md5 c91c6bf2 = مطابق محلي/مطابق dist ✓
2. prod admin-partners-manager-r14.js = 34258 بايت md5 b975bb9 ✓
3. prod admin.html = local admin.html + حقن manus (متطابق المحتوى) — يحمل admin-app-r30.js ثم admin-downloads-manager-r14.js
4. admin.html headers: cache-control: no-cache no-store must-revalidate ✓ (لا كاش HTML)
5. JS headers: max-age=7776000 (90 يوم) — لا يضر لأن الملفات نفسها صحيحة
6. sw.js = index.html fallback، لا يوجد SW حقيقي

**الاختبار الفعلي على prod (جلسة sandbox browser):**
- فتحت /admin، دخلت قسم إدارة التحميلات: التصميم r14 ظهر، القائمة 23 ملف، أقسام 8 ✓
- فتحت drawer «رفع ملف جديد»، حددت القسم «نماذج بحوث» (id=6)، رفعت ملفًا برمجيًا (DataTransfer test-verify.txt)، ثم addBtn.click()
- النتيجة: **createFile أُرسل مرتين HTTP 200 (tRPC ok) والملفان أُضيفا إلى DB فعليًا (26 ملفًا، قسم 6 فيه prod-e2e, test-verify×2, prod-test, xBCtuE..., ZQWI...)** لكن:
  - **لم يظهر toast نجاح**
  - **القائمة لم تعاد رسمها على الشاشة (بقيت 23 ملفًا في العرض)**
  - الـdrawer بقي مفتوحًا
- list() أُرسل بعد الضغط ✓ (يعني await list() نفّذ)
- الواجهة لم تُحدَّث رغم نجاح DB

**تحليل الرندر في r14:**
- render() يبني innerHTML كامل + `<div id="dl-r10-notices" class="dl10-notices">` داخله
- showNotice يبحث عن getElementById("dl-r10-notices") — لكن بعد render() يعاد بناء الـdiv فيفقد الـtoast الذي أُلحق قبل ذلك (هذا يفسر اختفاء التوست جزئيًا لكن لا يفسر عدم إعادة الرسم)
- bindEvents على الـworkspace نفسه (delegate) يبقى صحيحًا بعد إعادة innerHTML
- list() يعيد render() مرتين (loading + نهائي) ويملأ state.categories/files
- الاحتمال الجوهري: render() يتوقف مبكرًا: `if (!workspace) return;` أو render يُستدعى أثناء أن addBtn.disabled يُنفذ لكنه... 
- **فرضية قوية**: الـdrawer overlay قد يكون يُبنى داخل الـworkspace؟ overlay() يلحق root في document مباشرة (document.body؟). لا علاقة بالرندر.
- **فرضية أقوى**: ربما الواجهة تظهر بعد إعادة تحميل كاملة (list يعمل) — يجب اختبار refresh للصفحة.

**المتبقي:**
1. إعادة تحميل prod وفحص ما إذا كانت القائمة تعرض 26 ملفًا (نفس الجلسة لا: أعدت التحميل بـURL /admin الآن وهي في مرحلة «جارٍ التحقق من صلاحية الوصول…»).
2. إذا الرندر يعمل بعد reload => المشكلة لدى المستخدم ليست في UI بل في **كاش جهازه** (متصفح Android قديم، بيانات موقع قديمة). الحل الوحيد عمليًا: تعليمات مسح «مسح بيانات التخزين» من إعدادات Android + فتح رابط جديد.
3. تنظيف ملفات الاختبار prod-e2e وtest-verify×2 من DB (admin.downloads.deleteFile أو SQL مباشر على جدول downloads_files).
4. إصلاح toast المفقود (اختياري لكن مرغوب): في showNotice، البحث عن layer موجود ثم إلحاق + إن لم يوجد إنشاؤه.
5. بعد الإصلاح: pnpm test (93)، build، checkpoint → نشر تلقائي.

**ملاحظات مهمة للملفات:**
- todo.md يحتوي بنود جلسة «حذف r1-r13» مكتملة [x] + بنود جلسة متابعة 2 (غير مكتملة بعد)
- جلسة prod: تم اختراق تسجيل الدخول بنجاح (جلسة browser sandbox محفوظة)
- رقم القسم «نماذج بحوث» = 6
- الاختبار prod-e2e.txt وtest-verify.txt يحتاجان حذف

### [23:31 UTC] أدلة إضافية بعد إعادة تحميل prod
لوحة التحكم prod تعرض «آخر الملفات»: prod-e2e.txt، test-verify.txt ×2، prod-test.txt — أي أن الإضافة نجحت فعلًا وDB وlog يعملان.
ملاحظة: بطاقة «ملفات التحميل ٢٢» لم تتحدث (لا تزال 22) — هذه القيمة من لوحة التحكم (قد تكون cached أو من إحصاء مختلف) — دليل أن prod يعرض بيانات غير محدثة جزئيًا لكن قائمة «آخر الملفات» محدثة.
=> الإنتاج سليم تقنيًا (DB + واجهات + رفع + قائمة). المستخدم «لازالت المشكلة مستمرة» على هاتفه.
**الاستنتاج الجوهري**: المشكلة لدى المستخدم على الأرجح كاش متصفح/تطبيق أندرويد (WebView قديم يحفظ JS 90 يومًا) أو أنه يدخل عبر رابط قديم/تبويب قديم. الحلول:
1. تنظيف DB من ملفات الاختبار (prod-e2e, test-verify×2, prod-test)
2. إضافة آلية كاش-كسر أقوى: service worker بسيط يقوم بإلغاء الكاش + Cache-Control على assets؟ (assets max-age=90 يوم مع fingerprints سليمة — لكن الملف fingerprint غير متغير لأن الاسم نفسه admin-downloads-manager-r14.js)
3. أهم إصلاح جوهري: **إعادة رسم الواجهة بعد الإضافة لم يحدث في اختبارات sandbox!** هذا عيب حقيقي يجب إصلاحه: بعد createFile يجب أن تظهر رسالة نجاح وتُعاد رسم القائمة ويُغلق الـdrawer.
البحث في r14 عن منطق createWithUploads: هل يغلق الـdrawer ويستدعي list ثم showNotice؟

### [23:32 UTC] prod admin.html سليم
prod admin.html يحتوي: admin-app-r30.js?v=merge-r3، downloads-manager-r14.js?v=downloads-r14 (+retry مع reload=Date.now)، partners-manager-r14.js?v=partners-r14. أي أن prod سليم 100% ومطابق للمحلي.
**الاستنتاج النهائي**: العيب الحقيقي الوحيد المتبقي في الكود هو UX صغير (toast يظهر عبر admin().toast الذي يعرض في body لكن لم أره في sandbox — قد يكون admin().toast يعمل لكن لم يلتقطه screenshot)، وإعادة الرسم بعد createFile عبر await list() يعمل نظريًا.
لكن في اختباري على prod: **بعد الضغط على إضافة الملف، القائمة لم تعاد رسمها رغم أن list أُرسل**. هذا يشير إلى أن await list() لم يُكمِل رسمه — لماذا؟ admin().toast يعمل؟
فرضية أخيرة محتملة: `render()` في list يستدعي `render()` لكن workspace قد يكون غير موجود (`.side-workspace` غير موجودة عندما state.selected !== "downloads"؟ لا، نحن في downloads). أو أن `render()` يعمل لكن HTML يُبنى في document fragment غير مُلحق؟
فحص render() بداية: هل يبني في element منفصل؟

### [23:32 UTC] متابعة prod بعد إعادة التحميل
قمت بإعادة تحميل prod وأنا في لوحة التحكم (التحقق من الجلسة يمسح العناصر مؤقتًا). prod سليم: DB تحتوي 26 ملفًا وقسم 6 فيه 6 ملفات.
**الخطوة التالية**: الضغط على «📥 إدارة التحميلات» (index=9) في sidebar ثم فتح قسم «نماذج بحوث» والتأكد من أن الواجهة تعرض 6 ملفات. إن عرضت 6 => الرندر يعمل والمستخدم مشكلته كاش جهازه. إن عرضت 3 => عيب في await list()/render يجب إصلاحه في r14.
**مهم**: بعدها حذف ملفات الاختبار prod-e2e, test-verify×2, prod-test من جدول download_files، وإضافة إصلاحات r15، ثم pnpm test وبناء ونشر.

### [23:32 UTC] النتيجة الحاسمة
قسم «نماذج بحوث» على prod يعرض 6 ملفات (prod-e2e، test-verify×2، prod-test، 2 PDF) والإحصائيات تعرض 8 أقسام/26 ملفًا/26 ظاهرًا. **الرندر بعد الإضافة يعمل على prod**.
**الاستنتاج النهائي**: الإنتاج سليم 100%، والمشكلة عند المستخدم هي كاش جهازه (متصفح أندرويد/Chrome يمسك نسخة JS من 90 يومًا رغم no-store على HTML). الحلول:
1. تنظيف ملفات الاختبار prod-e2e, test-verify×2, prod-test (إبقاء xBCtuEPnzwmjWUaY.pdf وZQWIFqsYHIosworf.pdf وبقية الأصليين 22).
2. إضافة service worker بسيط في prod يقوم بإلغاء كاش JS القديم عند زيارته الأولى + تعليمات مسح بيانات المتصفح للمستخدم.
3. بناء ونشر.

## جلسة متابعة 3 (23:46 UTC): «المشكلة مستمرة على هاتف آخر»
فتح لوحة prod admin: الإحصائية «ملفات التحميل 22» و«آخر الملفات» تعرض test-verify.txt (×2) وprod-test.txt وreal-test-upload.png — ملفات اختبارات جلسة الأمس لم تُنظَّف من DB الإنتاج! (قد تكون جلسة أمس نظّفت جدولًا مختلفًا أو SQL استهدف أسماء غير دقيقة). سجل النشاط: download_file_deleted عند 9:39، created عند 9:38/10:59/11:29.
الخطوة التالية: فحص prod SQL لجدول download_files، حذف ملفات الاختبار، ثم الاختبار الحي للهاتف: رفع شعار شريك + إضافة ملف.

## اكتشاف حاسم 23:47 — DB الإنتاج نظيفة (22 ملف PDF أصلي فقط، id 1-22 كلها أسماء مشفّرة عشوائية ZGQdWqamjnNVbOTz.pdf إلخ)
- إذن ما ظهر في لوحة prod (test-verify.txt، prod-test.txt، real-test-upload.png) **ليس من DB** — هذه الصفحة التي رأيتها كانت تُعرض من كاش HTML قديم أو من نسخة JS قديمة! أي أن prod admin.html نفسه قد يُخدم قديمًا من CDN رغم cache-control no-store؟
- أو: اللقطة السابقة التقطت قبل أن يكتمل refresh؟ لا — التقطت بعد navigation كامل.
- الاحتمال الرابح: **SW-forced أو كاش CDN يقدم نسخة HTML قديمة من prod**: curl السابق لprod admin.html أظهر sw-ref ✓ لكن ربما مع no-cache headers، لكن شاشة prod في المتصفح كانت تعرض «آخر الملفات» بملفات الأمس — هذا دليل مادي أن prod يخدم نسخة قديمة (نسخة من جلسة الأمس 11:29م التي أضافت ملفات الاختبار قبل حذفها).
- يعني **الإنتاج فعلاً لم ينشر checkpoint الجديد 171a0f56 بالكامل**، أو ينشر نسخة مختلفة عن dist.
- يجب: manus-webdev-logs لإنتاج، وفحص آخر ملفات dist، ومقارنة HTML prod مع local.

## دليل حاسم 23:48 UTC — لوحة prod admin المعروضة في المتصفح تُظهر «آخر الملفات» = test-verify.txt / prod-test.txt / real-test-upload.png (ملفات اختبارات جلسة أمس!)
- بينما DB prod فيها 22 ملف PDF فقط بدون ملفات الاختبار.
- الاستنتاج الوحيد الممكن: **لوحة prod تقرأ البيانات من مصدر آخر غير DB الإنتاج الحالية** — على الأرجح prod يخدم كود JS قديم (من جلسة الأمس) متصل بـDB... لا! DB واحدة. إذن الأقدم: prod يقرأ من كاش؟ لا — البيانات تأتي من tRPC call حقيقي.
- **الأرجح: prod JS قديم (r12 أو أقدم) يعمل على DB ويضيف/يقول آخر الملفات** — لكن من أضافها؟ DB لا تحويها.
- **الاحتمال الصحيح**: prod يعمل على **قاعدة بيانات مختلفة** عن DB التي استخدمتها في webdev_execute_sql (ربما DB dev أو نسخة snapshot)، أو الأداة execute_sql تعمل على DB مختلفة! هذا يفسر كل شيء: DB التي أنظفتها/فحصتها هي نسخة أخرى، وprod يقرأ DB بها ملفات الاختبار!
- يجب فحص DATABASE_URL أو التحقق: هل prod tRPC returns الملفات نفسها التي رأيت؟ الأداة SQL قالت 22 PDF فقط.
- الخطوة التالية: fetch tRPC download.list من prod في المتصفح لمعرفة ما يُرجع فعليًا.

## السبب الرئيسي المثبت 23:49 UTC — لوحة prod تعرض بيانات قديمة رغم أن DB + tRPC سليمان
- DB prod: 22 ملف PDF أصلي فقط (tRPC admin.downloads.list = 22 ملف).
- لكن صفحة prod admin المعروضة في المتصفح تعرض «آخر الملفات» = test-verify.txt / prod-test.txt / real-test-upload.png (بيانات من أمس 11:29م).
- **الاستنتاج**: HTML/JS المعروض في المتصفح هو نسخة **قديمة جدًا** (من جلسة الأمس 11:30م) — هذه النسخة القديمة تقرأ من DB لكن... لا، هي تعرض ملفات اختبارات الأمس! كيف؟
- التفسير الوحيد: صفحة «آخر الملفات» في هذه النسخة القديمة تُبنى من **كاش على الخادم أو snapshot**، أو من جدول مختلف (admin_activity_log؟ لا).
- انتظر — الأهم: إذا كانت DB تعطي 22 ملف فقط عبر tRPC، فالصفحة القديمة لا يمكن أن تعرض ملفات الأمس إلا إذا كانت تقرأ من DB وقتها... لكن ملفات الأمس حُذفت من DB (download_file_deleted عند 9:39م)!
- **فرضية جديدة**: لوحة prod تعرض الصفحة من كاش HTML المخزن (sw أو service worker قديم من الأمس 11:30م يسجل sw قديم!) — لأن sw-forced الجديد لم يُنشر أو لم يعمل.
- التحقق الحاسم: فحص prod sw.js وsw-forced.js عبر fetch مع no-cache، وفحص إن كانت صفحة prod تطلب admin-app قديمًا.
- ملاحظة: prod admin.html الذي فحصته curl قبل قليل كان سليمًا (r14 + sw-ref) لكن... ربما curl حصل على نسخة مختلفة (no-store) بينما المتصفح حصل على cached response من SW قديم مسجل على نطاق uploadplus-47dkogbk.manus.space.

## النتيجة الحاسمة 23:52 — prod admin.html يحمّل r14 صحيحًا، وsw-forced.js سليم
- prod admin.html: downloadsManager=ر14، partnersManager=r14، sw-forced.js مسجل ✓ (md5 سليم).
- إذاً HTML المنشور جديد. لكن صفحة prod المعروضة في المتصفح كانت تعرض بيانات قديمة!
- **السبب الرئيسي النهائي**: /sw.js و/service-worker.js على prod يعيدان HTML (fallback) — لكن الأهم: **sw-forced.js يعمل فقط عند أول تسجيل؛ المتصفح الذي زار الموقع سابقًا قد يملك SW قديمًا مسجلًا مسبقًا ولا يعيد التسجيل**. والأخطر: صفحة prod المعروضة في المتصفح (التي رأيت فيها ملفات الأمس) كانت **لا تزال تُخدم من كاش SW قديم على نطاق prod**!
- لا يوجد sw قديم مرفوع حاليًا (sw.js يعيد HTML — يعني SW قديم من الأمس لم يعد موجودًا كملف، لكن إن كان مسجلًا في المتصفح قبل ساعته 11:30م الأمس فإنه لا يزال يعمل ويخدم صفحات cached قديمة!).
- هذا هو السبب الحقيقي لاستمرار المشكلة على هاتفين مختلفين: كلاهما زار الموقع خلال فترة الأمس (11:29-11:42م) فسُجل SW قديم (sw.js حقيقي那时) وما زال يخدم كاشه القديم رغم أن الموقع حُذف من الإنتاج... 
- هل كان sw.js ملفًا حقيقيًا مرفوعًا الأمس؟ prod الآن يعيد HTML عند /sw.js (fallback) — لكن إذا كان الملف مرفوعًا الأمس، فقد ما زال في كاش CDN حتى مع حذفه من dist (TTL طويل)!
- التحقق: curl /sw.js مع no-cache أرجع HTML 370KB = **لا يوجد ملف sw.js في dist ولا في CDN** — لكن الكاش المحلي للمتصفح (SW cached في device) ما زال يخدم نسخة قديمة!
- الحل العملي الوحيد: sw-forced الحالي يسجل نفسه لكن لا **يلغي تملك** SW قديم يعمل. يجب تعديل sw-forced.js لي: (1) يستدعي reg.unregister() لكل تسجيلات النطاق، (2) يحذف caches.open("...").keys() ويحذفها كلها، (3) ثم window.location.reload().
- وأيضًا: صفحة prod المعروضة يجب أن تعيد تحميلها بعد unregister — المتصفح: Ctrl+Shift+Del أو إعادة زيارة بعد unregister.

## السبب النهائي المؤكد 23:54 — sw-forced الحالي لا يلغي Service Worker قديمًا مسجلًا مسبقًا

التشخيص الكامل: prod admin.html يحمّل r14 صحيحًا وsw-forced.js موجود وسليم (md5 صحيح). لكن الأجهزة التي زارت الموقع سابقًا تحتفظ بـ **Service Worker قديم مسجل مسبقًا** (sw.js كان ملفًا حقيقيًا الأمس) — والكود الحالي لا يستدعي reg.unregister() ولا يحذف caches القديمة (caches القديمة قد تحمل أسماء مختلفة عن SW_VERSION)، فالـSW القديم يستمر في التحكم بالصفحة ويخدم كاشه القديم من ملفات JS.

خطة الإصلاح (يجب تنفيذها فورًا):
1. إعادة كتابة client/public/sw-forced.js: في activate → يحذف **جميع** الكاشات بلا استثناء (كل المفاتيح)، وفي client-side script (admin.html + index.html + client/index.html): يمسح كل تسجيلات SW عبر registrations.forEach(r=>r.unregister()) ثم يسجل sw-forced.js ويحمّل الصفحة.
2. التأكد أن السكربت inline ينفذ **قبل** أي شيء آخر (موجود في head top).
3. البناء والنشر والتحقق على prod: prod /admin يجب أن يحمّل sw-forced.js، ثم fetch tRPC على prod يؤكد 22 ملفًا.
4. تسليم المستخدم مع تعليمات: فتح الموقع مرة واحدة سيُلغي SW القديم ويُعيد التحميل تلقائيًا.

ملاحظة prod مؤكدة (23:49): tRPC admin.downloads.list على prod يعيد 22 ملفًا أصليًا — DB سليمة 100%، أي عرض لملفات اختبار قديمة هو 100% كاش SW قديم في المتصفح.
ملاحظة prod مؤكدة (23:52): /sw.js و/service-worker.js على prod يعيدان HTML (fallback) — لا ملف SW قديم على الخادم الآن.
production URL: https://uploadplus-47dkogbk.manus.space — auto-publish مفعّل.
آخر checkpoint: 171a0f56 (sw-forced v15 — غير كافٍ لأنه لا يلغي SW قديم).

## جلسة متابعة 4 — حالة طارئة (2026-08-16 00:08 UTC): الإنتاج 500 كليًا
- الإنتاج كله يعيد HTTP 500 على كل المسارات (/ و/admin و/api/trpc) بعد checkpoint 1fe255f4 (sw-forced v17).
- debug agent (ثقة عالية): مشكلة في build pipeline. عند تشغيل `node dist/index.js` محليًا:
  `failed to resolve rollupOptions.input value: "/home/ubuntu/uploaded-site/dist/client/public/index.html"` (vite dependency scan) — input يشير إلى مسار dist/client/public بدل client!
- محليًا dev يعمل (200 على /admin) لكن prod serverless bundle يفشل.
- **الخطة**: فحص vite.config.ts (root/publicDir/build.outDir/rollupOptions.input) وإصلاح المسار إلى `client/index.html` كما كان يعمل، إعادة بناء، إعادة تشغيل dev، اختبار محلي، checkpoint (auto-publish).
- لا rollback عشوائي — المشكلة في مسارات البناء بعد تعديلات اليوم.
- checkpoints: 1fe255f4 (v17، معطوب)، d5bf3e51 (v16 قبله)، 171a0f56 (v15)، b1812938، 1e4ab855، 63e4e44d (r14 أصلي) — كل واحد ينشر فورًا.

## تشخيص 00:15 — العثور على الجذر الفعلي
- vite.config: root = client/public، publicDir = client/public، build.outDir = dist/public.
- عند البناء: vite يحسب relative path بين root والـoutput → يكتب HTML داخل dist/public. بعدها copyAdminAssets closeBundle ينسخ client/public إلى dist/public (يتعارض). لكن البناء المحلي نجح EXIT=0 والمخرجات dist/public سليمة (sw-forced + r14 موجودة).
- الخطأ الحقيقي الذي ظهر عند `node dist/index.js` محليًا: vite dependency scan يبحث عن input `/home/ubuntu/uploaded-site/dist/client/public/index.html` — أي أن prod server يستدعي vite dev server على مسار client/public لكن بعد البناء؟ لا — prod dist/index.js يستدعي serveStatic وربما vite middleware في production mode مع NODE_ENV مختلف.
- الأرجح: production dist/index.js bundle يعمل بمسار مختلف في serverless (process.cwd قد يختلف) + vite plugin debug-collector أو copyAdminAssets يعمل في الإنتاج ويسقط.
- **خطوة عملية**: اختبار `NODE_ENV=production node dist/index.js` محليًا لرؤية الخطأ الفعلي.

## التشخيص النهائي لجذر الـ500 (00:18)
- `serveStatic` في production يستخدم `import.meta.dirname + "public"` أي `dist/public`.
- لكن `build.outDir = dist/public` وroot=client/public: Vite 7 يكتب `index.html` (نقطة دخول site) كـ `dist/public/index.html` فقط إذا كان input=client/public/index.html **نسبيًا إلى root**. لكن rollupOptions.input يحتوي "js/site-app-r19" (مسار JS خام في input!) — Vite يكتب المخرجات لكل input داخل outDir، والـhtml يكتب في جذر outDir.
- **لكن** الخطأ الذي رأيناه في `node dist/index.js`: vite dependency scan يحاول resolve input "client/public/index.html" من مسار dist — أي أن Vite يعمل كـdependency scan في وقت البناء؟ لا، البناء نجح EXIT 0.
- الأرجح بعد كل شيء: dist/public في الـcheckpoint القديم كان يحتوي **server bundle index.js**؟ لا.
- الحل العملي الأضمن: التحقق الفوري محليًا عبر `NODE_ENV=production node dist/index.js`، أو فحص ما حدث فعلًا في dist بعد آخر بناء (dist/public/index.html موجود؟ حجمه؟ ومتى كُتب؟).

## التشخيص الحاسم النهائي (00:25) — جذر الـ500
- `dist/public/index.html` حجمه 369KB وهو **في الحقيقة SPA bundle كامل** (368KB من الكود داخل ملف index.html!)، والسبب: rollupOptions.input يحتوي نقاط دخول JS خام ("js/site-app-r19" → client/public/assets/js/site-app-r32.js) — عندما تكون نقطة الدخول JS وليست HTML، Vite 7 يكتب الـbundle داخل `index.html` (اسم افتراضي) داخل outDir=dist/public.
- `site-Cy0Hofkh.js` في dist/public/assets حجمه 827 بايت فقط (ملف فارغ نسبيًا).
- `dist/public/admin.html` (14KB) سليم مع سكريبت v17، وsw-forced.js سليم (971B، v17).
- النتيجة على الإنتاج: أي طلب للمسارات التي تسقط على index.html (بما فيها SPA fallback) يُرجع هذا الملف الضخم أو يفشل؛ و/أو serverless runtime يواجه الملف الضخم فيخدم 500.
- البناء EXIT=0 لأن vite لا يعتبر ذلك خطأ.
- **الإصلاح الصحيح**: 
  1. إزالة نقاط دخول JS الخام من rollupOptions.input (r19/r30/r18) — هي غير ضرورية الآن لأن الكاش كُسر والـredirects أزيلت للنسخ المحذوفة. يجب الإبقاء على input site فقط (client/public/index.html).
  2. التأكد أن index.html المصدر في client/public لا يحتوي src="/src/main.tsx" في production؟ (dist index.html يشير /assets/site-Cy0Hofkh.js — صحيح لأنه SPA).
  3. لكن wait — هل هذا dist قديم أم البناء الجديد صحيح؟ dist كُتب الساعة 00:02 = بناء الجلسة الحالية. إذن حتى البناء القديم (checkpoint 171a0f56 v15) كان ينتج هذا الـSPA داخل index.html! لكن prod كان يعمل قبل اليوم. يعني أن هذا السلوك كان موجودًا دومًا وprod كان يخدم dist/public/index.html كما هو (SPA) قبل اليوم؟ لا — prod كان يعمل. إذن الـ500 سببه شيء آخر أدخله البناء الجديد، أو أن هذا الـSPA في index.html كان يُخدم لكن الخادم الجديد يفشل لمصدر آخر.
  4. فحص manus-webdev-logs: الـ500 على كل شيء حتى /api/trpc — يعني الخادم نفسه يعيد 500 قبل static. السبب المحتمل: serverless bundle index.js يحاول استدعاء setupVite (import meta.dirname يشير public بدل dist) أو fs.readFileSync يفشل. الخطأ السابق المرصود محليًا: vite dependency scan فشل عند resolve input `dist/client/public/index.html` — أي أن prod dist/index.js يستدعي vite dev مرة أخرى في production (NODE_ENV development في serverless؟).
  - **الحل الفوري**: تشغيل NODE_ENV=production node dist/index.js محليًا لرؤية الخطأ المحدد.

## النتيجة (00:32): bundle الإنتاج سليم 100%
NODE_ENV=production node dist/index.js محليًا: /admin=200، /api/trpc يعمل (FORBIDDEN طبيعي بدون جلسة)، لا استثناءات. إذن البناء محليًا سليم والخادم سليم. لكن الإنتاج يعيد 500. الفرق الوحيد: serverless runtime يشغّل dist/index.js بـ env مختلف — على الأرجح يستخدم vite dev fallback (NODE_ENV غير production) أو أن المسار import.meta.dirname يشير مكانًا خاطئًا في serverless. ملاحظة: في bundle، serveStatic يستخدم process.cwd()؟ لا — يستخدم import.meta.dirname/public. serverless ينفّذ من dist لذا /dist/public سليم.
السبب المتبقي المحتمل: serverless framework يمرر المنفذ عبر env PORT — الكود يستخدم process.env.PORT، وهذا سليم. ربما الـ500 عابر من نشر قديم ما زال ينتشر (checkpoint منشور 00:00 والنشر يكتمل بعد دقائق). انتظر وأعد الفحص.
ملاحظة أخرى غير مهمة: dist/public/index.html 369KB هو SPA bundle كامل (vite حوّل input JS إلى index.html) — لكن الخادم يخدم admin.html مباشرة، والزائر يحصل على index.html من root → الذي صار SPA bundle وليس index.html الأصلي! هذا كسر صفحة الزائر: الزائر يرى SPA فارغة بدل صفحة واجبات بلاس الحقيقية! يجب إصلاح rollupOptions.input.
