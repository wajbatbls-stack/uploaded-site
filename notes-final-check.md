

## جلسة 2026-08-15 مساءً: حسم واتساب + إعادة تصميم لوحة الشركاء

### التشخيصات الحاسمة (من المتصفح الحقيقي على الإنتاج)
1. البطاقات موجودة في DOM (partner-grid-pro) والأنماط style-r8 تحمَّل من index.html — عرضها سليم.
2. مصدر رابط wa.me المشوه الذي رآه المستخدم: حقل `whatsapp` في siteSettings (جدول content_collections) كان يحتوي سلسة ملتصقة «966542699518        /     966567680470» — waNumber القديمة كانت تجزئها بشكل خاطئ فتلتصق بالرقم.
3. نظفنا الحقل في DB: `UPDATE content_collections SET keyData=...` (whatsapp صار رقمًا واحدًا «966567680470» — تحقق).
4. waNumber في site-app-r29 (منسوخ من r28): تجزئ `raw.split(/[^0-9]+/)`, تحول 0→966, تلتقط أول رقم صالح فقط, تُخرج wa.me/966... — تم فحصها يدويًا ودمج split.
5. بطاقة الشريك (r28/r29): لا يوجد partner-pro-btn-wa إطلاقًا؛ الزر الوحيد «🌐 زيارة موقع الجامعة» عبر rawLink، البطاقة بلا رابط = partner-pro-card-nolink + onclick="return false" + "لم يتوفر رابط الموقع بعد" + hasDescription/partner-pro-desc (الوصف).
6. رفع بصمة كاملة: site-app-r29.js (من r28) + style-r9.css (نسخة من r8 مع?v=9) في client/public/index.html وclient/index.html + copyAdminAssets في vite.config + alias الموديول في vite.config (كان مكررًا r17 — أُصلح).
7. index.html يحمل r29 عبر loader module script: `appModule.src = "/assets/js/site-app-r29.js"`.

### الاختبارات
- 92/92 ناجحة (أضفنا اختبارين لتجزئة waNumber الملتصقة في server/teamPartners.test.ts).
- تم تحديث ownerLoginR13Assets/ downloadsAssets إلى r29.

### إعادة تصميم لوحة الشركاء (المرحلة 3 الحالية)
- الملف الحالي: client/public/assets/js/admin-partners-manager-r7.js (374 سطر).
- هيكله: manager = {state: {partners, loaded, loading, editing}, container}؛ دوال: activate, request, mutate, esc, toast, messageOf, load, refresh, fileToDataUrl, uploadLogo, emptyForm, startNew, cancel, startEdit, deletePartner, confirmDelete, toggleVisibility, move, uploadPartnerLogo, save, updateShapePreview, bindProps, confirmDialog, render, partnerRow.
- save: يتحقق من NULL ويرفضه، update/delete/create... toast رسائل حفظ.
- الخطة: نسخ r7 → r8 بنسخة معاد تصميمها: بطاقات شبكة (grid) بدل item-list مكدس، معاينة شعار مباشر في النموذج، أزرار واضحة كبيرة، خطوات مرقمة (1 رفع شعار ← 2 بيانات ← 3 حفظ)، حالة «تم الرفع» واضحة.
- يجب تحديث الإحالات admin-partners-manager-r8.js في admin.html وadmin-dashboard.html.
- بعد الانتهاء: pnpm test + build + curl للتحقق من الإنتاج + checkpoint + تسليم.

### ملفات CSS إدارية موجودة
admin-r14.css (160 سطر) — الأنماط العامة للعمل؛ سنضيف أنماط جديدة في ملف css جديد admin-partners-manager-r1.css مع تحديث الإحالات؟ لا — الأفضل إبقاء الأنماط inline داخل الملف أو append style tag لتفادي بناء CSS آخر.


### حالة العمل الحالية (2026-08-15 مساءً)
- اكتمل الإصلاح الجذري: site-app-r29.js + style-r9.css + تنظيف DB (whatsapp وحيد 966567680470) + اختبارات 92/92. لم يُحفظ checkpoint بعد لكل هذا (آخر checkpoint f9b11437).
- سكربت توليد admin-partners-manager-r8.js مكتوب في /home/ubuntu/build-r8-manager.py (نسخة معاد تصميمها: pm-grid بطاقات، 3 خطوات، معاينة شعار 180px، رسائل ✔، pm-btn-edit على البطاقة + نقر البطاقة كاملة يفتح التعديل، uploadPartnerLogo يحدث state.partners فورًا، loadFresh بعد الحفظ يبقي نموذج التعديل مفتوحًا ويحدثه).
- الخطوة التالية:
  1. python3 /home/ubuntu/build-r8-manager.py
  2. sed تحديث الإحالات admin-partners-manager-r7→r8 في: client/public/admin.html, client/public/admin-dashboard.html (فحص grep أولاً), vite.config cacheBust aliases/aliases, client/index.html, server/teamPartners.test.ts (file() إحالة r7)
  3. pnpm test ثم pnpm build
  4. curl فحص الإنتاج: هل wrapper يحمل site-app-r29؟ إن لم يكن → checkpoint ثم انتظار إشعار النشر ثم تحقق مجدد
  5. webdev_take_screenshot للصفحة /#/partners
  6. webdev_save_checkpoint + تسليم


### تحديث (بعد توليد r8)
- admin-partners-manager-r8.js تُوِّلد بنجاح (30656 بايت): شبكة بطاقات pm-grid، محرر 3 خطوات، معاينة شعار 180px، رسائل ✔، نقر البطاقة يفتح التعديل، loadFresh بعد الحفظ، uploadPartnerLogo يحدث state.partners فورًا.
- كل الإحالات محدثة r7→r8 (client/public/admin.html, admin-dashboard.html, client/index.html, vite.config.ts, server/teamPartners.test.ts) — CLEAN.
- يتبقى: pnpm test → pnpm build → التحقق من نسخ r8/r9/r29 في dist → فحص الإنتاج curl (هل wrapper يحمل r29؟ إن لا: checkpoint ثم انتظار إشعار النشر ثم إعادة الفحص) → webdev_take_screenshot /#/partners + لوحة الإدارة → checkpoint → تسليم.
- ملاحظة: vite.config cacheBust يجب أن يشمل site-app-r29.js وadmin-partners-manager-r8.js وstyle-r9.css.
- المستخدم يشتكي من: 1) الزر يفتح واتساب (محلول في r29 — الرمز المحلي والنسخة المنشورة f9b11437 تحمل r28؛ الجديد r29 لم يُنشر بعد)، 2) إعادة تصميم لوحة الشركاء (r8 جاهز)، 3) الشعار لا يظهر بعد الرفع (محلول: تحديث state فورًا + رفع preview).


### تشخيص حاسم (19:42 UTC) على الإنتاج بعد checkpoint 42fb662f
الصفحة المنشورة ما زالت تحمل الرمز القديم جزئيًا: زر واتساب الرئيسي في الهيدر يعرض رابط `wa.me/966542699518966567680470` — سلسلة رقمية ملتصقة. هذا يعني أن الإنتاج لم يلتقط r29 بعد (أو أن cleanup لقاعدة البيانات في الجلسة السابقة لم يُطبَّق بالكامل على حقل whatsapp). بطاقات الشركاء أصبحت صحيحة (غير قابلة للنقر، «لم يتوفر رابط الموقع بعد») — جزء r28 يعمل.
المطلوب: 1) التحقق من قيم whatsapp الفعلية في DB (siteSettings) وتعيينها إلى رقم واحد صحيح 542699518. 2) الانتظار حتى يلتقط الإنتاج r29 ثم إعادة الفحص. 3) ملاحظة: المستخدم يرى اللقطة بنفس الخلل (شريط أخبار صحيح لكن زر واتساب ملتصق) — نفس المشكلة.
بطاقات 32 شريك بلا روابط الآن — كلها غير قابلة للنقر (سلوك صحيح). لا يوجد wa.me في بطاقات الجامعات.


### تشخيص حاسم 2 (19:45 UTC): الإنتاج يحمل site-app-r29 لكن wa.me ما زال ملتصقًا
الإنتاج الآن يخدم site-Cdd9mhEr.js → site-app-r29 (تم التحقق بـcurl). ومع ذلك رابط زر واتساب في الهيدر ما زال `wa.me/966542699518966567680470`. بما أن DB يحتوي phone="+966 56 768 0470" وtickerText يحتوي الرقمين صحيحين، فالخلل على الأرجح في منطق waNumber داخل r29 نفسه أو أن الزر يقرأ حقلًا آخر ملتصقًا (مثلاً whatsappNumber أو value من settings يحتوي الأرقام ملتصقة من قبل). يجب البحث في r29 عن كل بناء wa.me وفحص المدخلات التي تُمرر له.


### تحقق بصري dev (بعد r30 + partners-manager-r9)
- /#/partners على dev: شريط ticker ما زال يظهر «966542699518 أو966567680470» ملتصقًا — إما أن DB لم يُنظف نهائيًا أو أن النمط ticker-num غير مطبق على dev (dev يخدم r30 مع?v=30). **يجب التحقق من قيمة DB لـwhatsapp وtickerText الآن**.
- البطاقات تظهر بأحرف أولية (لا شعارات) — سلوك صحيح حتى يرفع المالك شعارًا.
- admin.html: شاشة الدخول سليمة.
- state: اختبارات 92/92 ناجحة، build يدمج r30 + partners-manager-r9. يتبقى: التحقق DB → إصلاح ticker إن لزم → checkpoint → نشر → تسليم.


### نتيجة فحص DB (after r30)
- `whatsapp` = "966567680470" (بدون +) — نظيف الآن.
- `tickerText` = "مرحباً بكم في واجبات بلس ⭐ نقدم أفضل الخدمات الأكاديمية ⭐ تواصل معنا على واتساب: +966567680470 أو +966542699518" — نظيف وصحيح.
- `phone` = "+966 56 768 0470" (بمسافات — يحتاج تنظيف؟ waNumber يعالجه).
- إذن السلسلة الملتصقة التي رآها المستخدم "966542699518 أو966567680470" في الشاشة كانت **قبل** تنظيف DB الأخير، أو من كاش قديم. يجب التحقق البصري على dev بعد إعادة تحميل: tickerText نظيف الآن + waNumber في r30 يستخرج آخر رقم 13 خانة صالح.
- الخطوة: إعادة تحميل dev والتحقق البصري، ثم checkpoint نهائي + نشر + تسليم.


### تحقق dev بعد r30 — المشكلة ما زالت ظاهرة
لقطة dev تعكس: الشريط العلوي يظهر «...وواتساب: +966542699518 أو+966567680470» — الأرقام ملتصقة و«أو+» بدون مسافات. DB نظيف (tickerText يحوي مسافات صحيحة) ولكن العرض يلتصق. **السبب الجذري الحقيقي: RTL + bidi — الأرقام اللاتينية داخل نص عربي RTL تلتصق ببعضها.** الحل في r30 (ticker-num/إدراج أرقام داخل span dir=ltr مع non-breaking space « أو ») لم يُطبَّق على هذه اللقطة؟ يجب فحص: هل index.html في dev يحمل r30 أم نسخة أقدم؟ (dev يخدم r30 مع ?v=30). فحص renderTickerText الفعلي في r30.


### كشف حاسم (html-proxy index=0)
- dev server: `/@id/__x00__/index.html?html-proxy&index=0.js` يحمل **site-app-r27** رغم أن index.html يحمل r30.
- هذا الـscript module loader يُولَّد من index.html نفسه (inline module script) — كاش vite stale: html proxy مولّد من نسخة قديمة من index.html (نسخة dev لم تُحدَّث).
- الحل: إعادة تشغيل dev server (webdev_restart_server) لتوليد proxy جديد من index.html الحالي (r30)، أو مسح كاش vite.
- اللقطة السابقة (بما فيها عرض ticker الملتصق) كانت تُحمَّل من الكاش القديم — بعد restart يجب إعادة التحقق.
- **ملاحظة مهمة للإنتاج:** الإنتاج لا يستخدم هذا الكاش (يخدم dist المبني) لكن يجب التأكد أن dist/public/index.html يحمل r30.


### بعد restart — التحقق ناجح (dev)
صفحة الشركاء على dev الآن تعرض: الشريط العلوي نظيف «+966567680470 أو +966567680470» (رقمان منفصلان)، 32 بطاقة جامعات كلها غير قابلة للنقر مع «لم يتوفر رابط الموقع بعد»، لا أي زر واتساب، وCTA سفلي «تواصل معنا الآن». لا شعارات ظاهرة لأن الإدارة لم ترفع شعارات بعد (السلوك الصحيح — لا أيقونات افتراضية).
المتبقي: بناء الإنتاج والتحقق من dist/public/index.html يحمل r30 + لوحة الشركاء الإدارية الجديدة (r9) تعمل، ثم checkpoint.
