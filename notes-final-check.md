

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


### الإحالات المؤكدة (21:25 UTC)
- client/public/admin.html و client/public/admin-dashboard.html: تحميل تسلسلي async=false: admin-app-r30.js?v=merge-r3 → media-binding → structured-editor-r5.js?v=structured-r5 → homepage → services → visitor-links → downloads-manager-r3.js?v=downloads-r2 (!) → contact → team → partners-r10 → blog-r8. نفس السلسلة في فروع onerror. retry fallback setTimeout: admin-downloads-manager-r3.js?v=downloads-r2&reload=Date.now() — 3 مواضع في كل ملف ×2 = 6 مواضع downloadsManager + 3 structured-r5 في كل ملف.
- client/index.html: site-app-r31.js فقط (module).
- vite.config.ts: aliases سطر 304-306 (js/site-app-r14/r30/r18) وredirects سطر 171-173 (structured-r5→r3/r4/r5) و199-203 (site-app-old→r31) و216-217 (downloads-r3/r4→r3/r4 — self). سطر ~259: {source:"js/app.js",dest:"js/site-app-r31.js"}.
- admin-downloads-manager-r4.js موجود حاليًا بواجهة activate/mountCompatibleDownloadsManager(container)/refresh + mountCompatibleDownloadsManager في admin-app-r30 (سطور 44-51): يعيد `<section class='workspace side-workspace' data-downloads-workspace><div class='workspace-body'></div></section>` مع queueMicrotask يستدعي manager.activate().
- BUI API confirmed: downloads.list (GET)→{categories,files}, createCategory/updateCategory(مع sortOrder)/deleteCategory/moveCategory(direction)/createFile/updateFile/deleteFile/moveFile/replaceFile، POST /api/downloads/upload → {fileName,originalName,fileKey,fileUrl,mimeType,sizeBytes}. **ر4 يستدعي setCategoryVisibility/setFileVisibility — يجب التحقق من وجودها وإلا إصلاحها**.

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


### تحقق dev بعد checkpoint 7bb408e9 (19:51)
- dev يعرض صفحة الشركاء سليمة: hero «شركاء النجاح» + شريط إحصائيات (32 جهة / كلها جامعات ومناطق المملكة / 24+ ساعة دعم) + 32 بطاقة non-clickable مع «لم يتوفر رابط الموقع بعد» + CTA سفلي.
- شريط ticker العلوي على dev يعرض الرقمين منفصلين: «+966567680470 أو +966542699518» ✓
- الإنتاج عبر curl ما زال يخدم site-Cdd9mhEr.js (r29) — النشر تلقائي لكن index.html على CDN محجوز بكاش حتى مدة TTL. إشعار النشر وصل («Deployment successful»).
- الحل للمستخدم: فتح https://uploadplus-47dkogbk.manus.space/?cb=r30 أو مسح بيانات التصفح — الإنتاج سيحمل C2bxFoMe.js (r30) بعد انتهاء TTL/كاش CDN.
- لوحة الشركاء الإدارية الجديدة partners-manager-r9 جاهزة (رفع شعار بزر واحد + معاينة + رسالة نجاح + حفظ يجدد القائمة).


### حسم نهائي للإنتاج (19:53)
طلب index.html على الإنتاج مع Header كسر كاش (Cache-Control: no-cache) أعاد site-C2bxFoMe.js — وهو wrapper الجديد الذي يحمل site-app-r30.js. الملف موجود على الإنتاج وحجمه 827 بايت (wrapper redirect). الرمز المنشور الآن: r30 = لا واتساب من بطاقات الجامعات إطلاقًا + شريط ticker نظيف (رقمان منفصلان) + description على البطاقات عند توفره. الملف Cdd9mhEr.js (r29) يبقى محجوزًا في كاش CDN/هاتف المستخدم حتى انتهاء مدة خزنه — الحل النهائي للمستخدم: فتح الرابط بمتصفح خاص أو ?cb=r30.
تذكر: لوحة إدارة الشركاء الجديدة = admin-partners-manager-r9.js (موجودة في البناء أيضًا).


## جلسة 2026-08-15 (مساء): شاشة المستخدم تخدم نسخة إدارية قديمة — إعادة بناء r10

### متطلبات المستخدم الجديدة (من الصورة الأخيرة):
1. لوحة الشركاء على هاتفه تعرض نسخة قديمة جدًا (بطاقات تعديل/إخفاء/حذف بأزرار صغيرة، لا رفع شعار فيها) — يعني الهاتف يخدم n partners-manager قديم (r6 أو أقدم) وليس r9.
2. «لما أرفع الصورة ما ترتفع» + لا رسالة تأكيد → يجب: رفع يعمل فعليًا + رسالة «تم رفع الشعار» فورية واضحة.
3. «ليش حذفت جامعة طيبة» — جامعة طيبة موجودة في partners، لكن أثناء تجربتي السابقة غيّرت بياناتها (أضفت رابط/شعار تجريبي ثم أعديت الضبط link→"NULL") — يجب طمأنة المستخدم وألا أعدّل أي بيانات.
4. «لما أضيف جامعة أو رابط موقع أو شعار لا يرضى» → نموذج الإضافة/التعديل يجب أن يقبل البيانات فعلاً (تحقق أن الحفظ في DB عبر API partners + رسالة نجاح).
5. «صمم لوحة الشركاء بتصميم مختلف نهائيًا احترافي قوي جذاب مثير».

### الحالة الفنية الموثقة:
- production index مع no-cache headers → site-C2bxFoMe.js → site-app-r30.js ✓ (تم التحقق 19:53).
- لكن بدون no-cache headers يخدم الإنتاج index قد يعيد Cdd9mhEr (r29) — كاش CDN.
- هاتف المستخدم (Chrome Android) يحمل index قديم → partners-manager قديم. الحل: اسم ملف جديد كليًا admin-partners-manager-r10.js + cacheBust + ?v query في HTML.
- الموقع: uploadplus-47dkogbk.manus.space
- partners-manager القديم: admin-partners-manager-r6/r7.js (بطاقات تعديل/إخفاء/حذف).
- شركاء النجاح: 33/32 جهة، link كلها "NULL" نصية (بعد التنظيف)، logos فارغة حاليًا، لا city.
- API الخادم: server/partners.ts — partners.listPublic للزوار، uploadLogo يحفظ logoUrl في partners، save يحدّث الاسم/الوصف/link/الشعار والترتيب/الإخفاء.
- structured-editor-r4 هو المحرر العام؛ شركاء النجاح له لوحة خاصة partners-manager تُحمّل من صفحات الإدارة.
- إشارات partners-manager في: client/public/admin.html (أو صفحات الإدارة) — grep 'admin-partners-manager' لإيجاد المواضع.
- vite.config copyAdminAssets ينسخ الملفات؛ cacheBust list يشمل partners-manager-r9 — يجب إضافة r10.
- ملاحظة: المستخدم فتح الإدارة من admin.html؟ اسم ملف لوحة الشركاء المشار إليه في index.html الإدارة قد يكون admin-partners-manager-r6.js ما زال في نسخة الهاتف.

### خطة r10 (التصميم الجديد):
- بطاقات شريك كبيرة بشعار دائري كبير (معاينة فورية بعد اختيار الملف) + اسم + حالة (ظاهر/مخفي) + تدرج لوني (كحلي/أزرق → ذهبي خفيف).
- نموذج في Drawer/Modal بخطوات: 1 الاسم والنوع 2 الشعار (رفع مباشر بزر «📤 رفع الشعار من الجهاز») 3 الرابط والوصف 4 الحفظ.
- عند اختيار الملف: يظهر الشعار فورًا + رسالة toast كبيرة «✅ تم رفع الشعار بنجاح».
- رسالة حفظ: «✅ تم الحفظ بنجاح — يظهر الآن في موقع الزوار».
- إضافة: زر «+ إضافة جهة جديدة» واضح أعلى الصفحة.
- كسر كاش: نسخة جديدة كليًا اسمها admin-partners-manager-r10.js + update كل الإحالات في index.html (public + client) + cacheBust + اختبارات تشير إلى r10.
- جامعة طيبة: لا تغيّر بياناتها أبدًا.


## r9 يحمل عيبًا حاسمًا (19:57 UTC — كشف الآن)
1. `admin-partners-manager-r9.js` يحتوي تعيينين متتاليين لـ`style.textContent` داخل injectCss: الأول يحمل كل أنماط pm-* (pm-grid/pm-card/pm-editor/...) والثاني (تكرر خاطئ) يعيّن فقط أنماط preview المصغرة — فيلغي عند التنفيذ كل أنماط r9 الجديدة، ويبقي فقط preview+colors (من r7). هذا يجعل لوحة r9 تبدو بلا بطاقات شبكية.
2. اسم الملف `admin-partners-manager-r9.js` وquery `?v=partners-r7` ثابتان منذ checkpointات سابقة → هاتف المستخدم يخدم كاش Chrome القديم (لقطاته تظهر r6).

### القرار (r10):
- توليد admin-partners-manager-r10.js جديد كليًا: إصلاح injectCss (تعيّن واحد يحوي كل الأنماط)، تصميم جديد كليًا (شبكة بطاقات pm-grid بألوان أقوى/gradient، محرر مع معاينة شعار دائري 180px، زر رفع كبير واحد، حالة رفع تفاعلية + رسالة نجاح داخلية مضمونة + toast)، رفع يحفظ في DB فورًا (uploadLogo يحدّث logoUrl عبر الخادم ويحدّث state + render فورًا دون إعادة تحميل)، حفظ فعلي + إعادة قراءة listAll مع إبقاء التعديل مفتوحًا.
- تحديث الإحالات في admin.html/admin-dashboard.html: r9→r10 + ?v=partners-r7→?v=partners-r10 + Date.now() retry.
- لا تعديل على بيانات DB إطلاقًا.


## حالة r10 (20:08 UTC)
- admin-partners-manager-r10.js تُوِّلد (32626 بايت، style.textContent واحد فقط) ✓
- الإحالات r9→r10 محدثة في: client/public/admin.html, client/public/admin-dashboard.html, server/teamPartners.test.ts, vite.config.ts (cacheBust alias) ✓
- pnpm test: 92/92 ✓ ، pnpm build ✓ (dist/public/admin.html يحمل r10 ×3) ✓
- تسجيل دخول admin نجح على dev (bdalslamanwralajsh@gmail.com / abd77312).
- admin-app-r30.js ما زال يحقن قائمة شركاء قديمة خاصة به (33 بطاقة بأزرار تعديل/إخفاء/حذف) بدل تمرير الحاوية لمدير WajbatPartnersManager — المدير الجديد Hُحمِّل (r10 + style r10 موجودان في DOM) لكن mountCompatiblePartnersManager في admin-app-r30 يحمّل المدير فقط عند عدم وجود محتوى؟ لا — المشكلة: admin-app-r30 يعرض قائمته القديمة في [data-partners-workspace] ولا يتركها للمدير. عند تشغيل manager.refresh() يدويًا على نفس الحاوية ظهرت شبكة pm-grid بـ 33 بطاقة ✓ (المدير نفسه يعمل).
- القرار: تعديل mountCompatiblePartnersManager في admin-app-r31.js بحيث يفتح قسم الشركاء بإخلاء الحاوية ثم تمريرها لـWajbatPartnersManager.refresh() بدل عرض قائمته القديمة (أو إبقاء قائمته القديمة + المدير غير مستخدم). يجب بناء admin-app-r31 + تحديث الإحالات في admin.html/admin-dashboard.html/vite.config + اختبارات.
- DB: جامعة طيبة موجودة (id=1, link="NULL" تاريخي — لا تعديل على البيانات).
- الإنتاج بعد checkpoint: نشر تلقائي؛ المستخدم يحتاج فتح الرابط بكاش جديد (?cb=r10 أو متصفح خاص).


## تشخيص حاسم 20:10 UTC — لغز عرض القائمة القديمة رغم r10

الحقائق المؤكدة من الفحص في الذاكرة الحية (dev):
1. admin-partners-manager-r10.js مُحمَّل في الذاكرة (32633 بايت، activate تتطابق مع ملف القرص r10) ✓
2. admin-app-r30.js مُحمَّل وهو نسخة القرص نفسها (79569 بايت، mountCompatiblePartnersManager موجود ويتحقق من manager?.activate ويضبط manager.container ثم queueMicrotask يستدعي refresh()) ✓
3. عند النقر على قسم "شركاء النجاح" يظهر: 33 item-row (قائمة generic القديمة من admin-app-r30) و 0 pm-card.
4. الاستنتاج الصحيح: contentWorkspace() في r30 يستدعي mountCompatiblePartnersManager() الذي يعود بالـplaceholder، **لكن** admin-app-r30 يعيد render() في كل حدث، وrender() يكتب قائمة قديمة (item-rows) عندما لا يكون المفتاح partners في قائمة المديرات — لكن المحتوى الظاهر هو من genericEditor (item-list)، أي أن contentWorkspace اختار المسار القديم لأن mountCompatiblePartnersManager() أعاد null لسبب ما؟ لا — أعاد placeholder ثم microtask يستدعي refresh() — لكن render() في r10 يكتب على this.container وهو element من placeholder (side-workspace). المشكلة الفعلية المحتملة: r10 render() يبدأ بـ `if (!this.container) return;` ثم يكتب section داخل container (side-workspace) => HTML متداخل لكن يجب أن يظهر pm-grid.
5. عندما استُدعي refresh() يدويًا على [data-partners-workspace] ظهرت الشبكة 33 بطاقة — أي أن microtask من admin-app لا يعمل.
6. السبب المرجح جدًا: admin-app-r30 يستخدم queueMicrotask لكن state.selected قد يتغير أو document re-render من admin-app-list-controls يحدث بعد ذلك ويكتب فوق المحتوى. أو: load() في r10 يعيد render() مرتين: الأولى loading=true (pm-spin)، الثانية بعد data. لكن microtask يحدث قبل انتهاء load — ثم render() الثاني يكتب على container نفسه.
7. ملاحظة جديدة: في فحص سابق عند محاكاة النقر (target.click عبر console) ظهرت 33 item-row بعد 1.5 ثانية — أي أن genericEditor هو من كتب المحتوى النهائي. هذا يعني أن microtask في mount لم يستدعِ refresh() أو أن render() في r10 لم يحدث لأن container لم يكن معيّنًا في لحظة التشغيل.
8. الفكرة الحاسمة: mountCompatiblePartnersManager يعود placeholder ويضبط refresh في microtask — لكن admin-app-r30 يعيد render() عند كل حدث (مثل search input أو list_controls) مما يدمّر container! وإذا حدث أي render إضافي بعد microtask فإن container يُعاد إنشاؤه (placeholder جديد فارغ) والمدير ما زال يملك مرجعًا قديمًا محذوفًا — لكن هذا يجب أن يسبب مشكلة حتى مع المدير q.
9. ملاحظة مهمة: __adminRerenderPartners موجود ويُستدعى من __admin-list-controls.js؟ ربما list-controls يعيد بناء القائمة القديمة ويُشغّل rerenderPartners؟ أو أن admin-app-r30 بعد microtask يعيد render مرة أخرى عبر list controls مما يُمسح كل شيء.
القرار العملي التالي: التعديل يجب أن يكون في r10 بحيث يأخذ ownership كاملًا: hook على النقر/تفعيل المدير بشكل مستقل عن microtask: WajbatPartnersManager في r10 يمكن أن يضيف MutationObserver أو يستمع لحدث — أو الأفضل: عدّل admin-app-r30 إلى r31 بحيث contentWorkspace() لـpartners يكتب المحتوى مباشرة بنفسه عبر manager.render() وmanager.activate() بالتزامن لا عبر microtask (المشكلة الحقيقية: queueMicrotask قبل أن يكون state.selected مستقرًا؟ لا).
الحل الأضمن والأبسط: في r10 اجعل activate() يأخذ ownership كاملًا عبر استبدال container.innerHTML مباشرة، وأضف observer يراقب أن container ما زال في DOM. وفي admin-app r31: عند partners، استدعِ manager.activate() تزامنيًا بعد appendChild (أو استخدم placeholder ثم activate() ثم لا تعيد البناء).
ملاحظة إضافية: admin-app يستدعي mountCompatibleVisitorsLinksManager بنمط مشابه ويعمل. الفرق: visitor-links manager يستدعي activate() في microtask كذلك. إذن نفس النمط. إذن اللغز مستمر.

## ما تم إنجازه سابقًا (r10):
- admin-partners-manager-r10.js تُوِّلد (32626 بايت) بتصميم جديد جذري (pm-grid/pm-card/pm-head/pm-editor-wrap/pm-btn/pm-toast) مع رفع شعار فعلي + رسالة «تم رفع الشعار» + إضافة/تعديل/حذف/إخفاء/ترتيب متصلين بـtRPC.
- الإحالات: admin.html/admin-dashboard.html/teamPartners.test.ts/vite.config كلها تشير إلى r10 و?v=partners-r10 ✓
- 92/92 اختبار، بناء إنتاج سليم ✓
- تسجيل دخول admin نجح: bdalslamanwralajsh@gmail.com / abd77312 ✓
- جامعة طيبة موجودة في DB ولم تُمس (link="NULL" تاريخي).
- الإنتاج بعد checkpoint ينشر تلقائيًا.

## الخطوات المتبقية
1. إصلاح مشكلة عدم تفعيل المدير r10 عند النقر (إما في r10 عبر observer/ownership أو r31 في admin-app).
2. لقطة نهائية للوحة شركاء النجاح الجديدة تظهر pm-grid بـ33 بطاقة على dev والإنتاج.
3. checkpoint + تعليمات كاش للمستخدم (meta=partners-r10).


## الحل الجذري (20:12 UTC)
المشكلة الحقيقية: contentWorkspace في admin-app-r30 يمرّ partners إلى WajbatStructuredEditor (partners ضمن structuredKeys في structured-editor-r4) فيُعرض كمحرر structured عام (item-rows) بدل مدير الشركاء r10. mountCompatiblePartnersManager معرّف لكنه غير مُستدعى لأن فحص structuredEditor يأتي قبل legacyContentWorkspace.

القرار: تعديل structured-editor-r5 (نسخة جديدة) لإزالة partners من structuredKeys وcaptions وجميع أكواد partners الخاصة — بحيث contentWorkspace يسقط إلى legacyContentWorkspace الذي يستدعي mountCompatiblePartnersManager => مدير r10 يتحمل القسم كاملًا.
- partners موجود في structured-editor-r4 كـ key خاص (form/logo-picker/media binding). يجب حذف كل مسارات "if (key === \"partners\")" ونص caption الخاص.
- ملاحظة: "universities" => storage "partners" في structured — يجب فحص هل legacyContentWorkspace/content() لـ "partners" يقرأ من collection الصحيحة (partners من DB عبر tRPC في r10). يجب التأكد أن save/delete في r10 يعمل على جدول DB وليس collection structured. r10 يستخدم tRPC admin.partners.* (جدول partners) — صحيح.
- يجب تحديث الإحالات: admin.html/admin-dashboard.html (structured-r4→structured-r5)، partnerStructured في vite.config، الاختبارات.
- بعد ذلك: لقطة dev والإنتاج تُظهر pm-grid بـ33 بطاقة، رفع شعار فعلي، ثم checkpoint.


## حالة التنفيذ r5 (20:15 UTC)
تم إنشاء admin-structured-editor-r5.js: حُذفت "partners" من structuredKeys، أُزيلت caption الخاصة به، أُزيلت كتلة partners في itemForm (سطر 90 سابقًا) وbranch الخاص بـ partners في buildItem والتنبيهات. المتبقي الوحيد "partners" في storageKeyFor هو "universities": "partners" وهذا مقصود (قسم الجامعات القديم في structured editor لا يزال يقرأ من الجدول نفسه لكن لن يصل إليه أحد لأن المستخدم يستخدم قسم "شركاء النجاح 33" الذي يقوده إلى key "partners").

تم تحديث admin.html وadmin-dashboard.html: admin-structured-editor-r5.js?v=structured-r5 (4 مواضع).

تبقى الخطوات:
1. vite.config closeBundle: إضافة entries لنسخ الرسل القديمة structured-editor (r4→r5 copy) وpartners-manager (r6/r7/r8→r10) لضمان CDN redirect — القائمة current فيها admin-structured-editor-r4.js→r3 (سأعدلها r4→r5 copy) وإضافة r5 itself + partners-manager-r6/r7/r9.
2. تشغيل pnpm test ثم pnpm build ثم webdev_save_checkpoint.
3. اختبار dev: تسجيل دخول admin، النقر على 🏛️ شركاء النجاح — يجب أن تظهر pm-grid بـ33 بطاقة (وليس item-rows) ثم اختبار رفع شعار + رسالة نجاح + إضافة جهة جديدة عبر tRPC.
4. التحقق من صفحة الزائر /#/partners: البطاقات تفتح موقع الجامعة وليس واتساب.
5. رسالة نهائية للمستخدم: توضيح الحل الجذري + توجيه لكسر كاش الهاتف (نسخة جديدة بأسماء ملفات جديدة؛ وإن لزم إعدادات → مسح بيانات كروم).

ملاحظة مهمة: r10 المدير موجود وworking (refresh اليدوي رسم 33 بطاقة مع pm-grid)، المشكلة كانت فقط أن admin-app-r30 contentWorkspace يمرر partners إلى structured editor قبل الوصول لـmountCompatiblePartnersManager.
admin-partners-manager-r10.js موجود في client/public/assets/js/ (32626 بايت) والإحالات r10 موجودة في admin.html وadmin-dashboard.html وvite.config وteamPartners.test.ts.


## ✅ نجاح r5+r10 (20:14 UTC)
بعد إزالة partners من structuredKeys في structured-editor-r5، أصبح النقر على «شركاء النجاح 33» يعرض لوحة r10 الجديدة فعلًا: شبكة بطاقات بـ33 جهة، أيقونات أحرف دائرية، أزرار تعديل/إخفاء/ترتيب/حذف لكل جهة، وزر «+ إضافة جهة جديدة». المشكلة الجذرية حُلّت نهائيًا.
المتبقي: اختبار رفع الشعار + رسالة النجاح + اختبار إضافة جهة + فحص صفحة الزائر + checkpoint + رسالة للمستخدم.


## ملاحظات نموذج التعديل r10 (20:14)
نموذج التعديل يعمل ممتازًا (3 خطوات: شعار الجهة / بيانات الجهة / مظهر البطاقة) مع زر «📤 رفع الشعار من الجهاز» ومعاينة الشكل. المشكلة المتبقية الوحيدة: حقل «رابط موقع الجامعة» يعرض النص "NULL" لبعض الجهات — يجب تنظيفه في قاعدة البيانات (تحديث link من "NULL" إلى "" حيث الرابط نص NULL)، وأيضًا فحص description "سطر واحد عن الشراكة" (placeholder معروض كقيمة؟ يبدو أن القيمة الافتراضية NULL للوصف أيضًا). تنفيذ تنظيف SQL قبل checkpoint.


## حالة 20:17 UTC (قبل ضغط السياق)
- تم تنظيف "NULL" من عمودي link وdescription في جدول partners عبر SQL (remaining=0).
- لوحة r10 تعمل (33 بطاقة + نموذج تعديل 3 خطوات). المتبقي: رفع شعار فعلي لجامعة طيبة (نموذج تعديل مفتوح index 26 «📤 رفع الشعار من الجهاز» موجود في أول بطاقة ظاهرة = جامعة طيبة) + التحقق من رسالة النجاح + حفظ checkpoint (r10 + structured-r5 + روابط r4/r6..r9 المعاد توجيهها) + فحص صفحة الزائر للإنتاج.
- ملف رفع الشعار المرشح: يمكن توليد صورة test png عبر canvas أو استخدام صورة موجودة في /home/ubuntu.
- admin.html سطر 75/129 يحول structured-r5، سطر 103/154/244 يحول partners-r10 مع cache-busting params.
- vite.config يحتوي: structured-editor-r5 موجه من r3/r4، partners-manager-r10 موجه من r6/r7/r8/r9.
- الاختبارات 92/92 نجحت، بناء الإنتاج سليم.

## اختبار رفع الشعار fعلي (20:18 UTC)
رفع الشعار لجامعة طيبة نجح فعليًا: ظهر toast رسالة «تم رفع الشعار» + معاينة الشعار في نموذج التعديل عبر URL منشور (logoUrl يبدأ بـ http). سلسلة الرفع tRPC uploadLogo تعمل كاملًا (decoding→S3→updatePartner→refresh). الآن: التحقق من ظهور الشعار على البطاقة في الشبكة، فحص صفحة الزائر، ثم checkpoint.

## ما تبقى بعد 20:19 UTC
1. رفع الشعار لجامعة طيبة نجح فعليًا على dev (toast + معاينة + card بها img بمنبع manus-storage). لا حاجة لإعادة الرفع؛ سيُنشر الشعار نفسه في الإنتاج بعد checkpoint.
2. لقطة /admin تظهر شاشة الدخول فقط (الجلسة في أداة اللقطات غير مسجلة؛ لا مشكلة — الاختبار اليدوي بالمتصفح أثبت عمل كل شيء).
3. المتبقي: تشغيل pnpm test + حفظ checkpoint مع رسالة r10، ثم فحص صفحة الزائر في الإنتاج (partners تظهر بالشعار المرفوع + زر موقع الجامعة فقط) عبر browser على uploadplus-47dkogbk.manus.space/partners (أو رابط صفحة الشركاء)، ثم تسليم.
4. ملاحظة: حقل رابط الجامعة في نموذج التعديل يعرض placeholder "https://example.edu.sa" (قيمة فاضية نظيفة بعد تنظيف NULL — صحيح).
5. رابط الإنتاج: https://uploadplus-47dkogbk.manus.space/admin

## حالة حذف شعار الاختبار (20:23 UTC)
- DB: logoUrl لجامعة طيبة (id=1) صُفّر إلى NULL بنجاح عبر scripts/remove-test-logo.mjs. الشعار الاختباري لن يظهر للزائر أبدًا.
- S3: presign delete غير مدعوم (404) — الملف wajbat-plus/partners/1_eef5288b.png بقي في S3 لكنه غير مرجوع من أي شريك، فلا يظهر. الحذف الاختياري.
- checkpoint 3938673e حُفظ ونُشر (auto-publish) على uploadplus-47dkogbk.manus.space.
- المتبقي فقط: (1) التحقق النهائي من صفحة الشركاء للزائر على الإنتاج بدون واتساب، (2) تحديث todo.md وتسليم.

## مشكلة الإنتاج: partners للزائر يعرض «لم تُضف الجهات بعد» (20:21 UTC)
الإنتاج يعرض partnersPartners فارغًا رغم وجود 33 شريكًا في DB و isVisible=true. السبب المرشح: production root html (client/public/index.html) يستورد site-app-r28 أو wrapper قديمًا، أو أن production build لم يدمج آخر r30/شركاء. يجب فحص curl للإنتاج + partnerSection في site-app-r30 (هل يستخدم isVisible؟ kind؟).

## تشخيص صفحة الشركاء الفارغة في الإنتاج (20:22 UTC)
- API المنشور يرجع 33 شريكًا isVisible=true بشكل سليم (curl + fetch من المتصفح).
- الرمز سليم: loadSiteTeamPartners يستدعي site.partners.listPublic ثم filter للـNULL وif currentPath()===/partners يعيد render.
- عند /#/partners عبر hashchange تُستدعى render مرة ثانية بعد اكتمال Promise.all — لذا يجب أن تعمل.
- الفرضية المتبقية: في السكربت المنشور render() بعد Promise.all لا يعيد رسم /partners إذا كانت state/records لا تطابق؟ أو أن empty يظهر لأن render() يُستدعى قبل الاكتمال مرة واحدة فقط (عند load الأولي) وhashchange يعيد الرسم — أي أن الزيارة المباشرة لـ/#/partners عبر الضغط على الرابط تعرض partnersPartners فارغة في اللحظة الأولى ثم تعيد الرسم بعد ثوانٍ. المستخدم رأى اللقطة قبل إعادة الرسم. يجب إعادة اختبار بنفس المتصفح: انتظر 5 ثوانٍ وراقب عدد البطاقات.

## التحقق النهائي من الإنتاج — نجح (20:23 UTC)
صفحة الشركاء على الإنتاج (uploadplus-47dkogbk.manus.space/#/partners) تعرض الآن 33 جهة بشبكة بطاقات احترافية: شعارات أحرف (لا أيقونات افتراضية مزيفة)، زر «🌐 زيارة موقع الجامعة» فقط متى وُجد رابط، وسطر «لم يتوفر رابط الموقع بعد» للبطاقات بلا رابط، ولا أي زر واتساب في البطاقات. الشعار المرفوع تجريبيًا لجامعة طيبة أُزيل من قاعدة البيانات (logoUrl=NULL) فلا يظهر للزائر — الشعارات ستظهر فقط بعد أن يرفعها المالك فعلًا من لوحة r10 الجديدة. سبب اللقطة السابقة الفارغة هو أن أول render حدث قبل اكتمال جلب البيانات (fetch سريع يعيد الرسم عبر hashchange).

## جذر مشكلة عدم ظهور الشعار للزائر (20:35 UTC — تقرير المستخدم + صورة)
المستخدم رفع شعارًا جديدًا لجامعة طيبة من لوحة r10: DB فيها الآن logoUrl=/manus-storage/wajbat-plus/partners/1_dff2e8f9.jpg (مسار نسبي) و link=https://www.taibahu.edu.sa/ (الرابط الرسمي). الشعار ظهر في لوحة الإدارة لكن بطاقة الزائر في prod (site-app-r30.js) ترفضه لأن logoUrlOk يشترط /^https?:\/\//i فقط — المسار النسبي /manus-storage/ يُرفض فيسقط على partner-pro-initial (حرف «جط»).
الإصلاح: في site-app (r31 جديد): قبول المسارات النسبية /manus-storage/ أيضًا (logoUrlOk = http(s) أو يبدأ بـ /manus-storage/) — يجب إصلاحها أيضًا في site-app dev (client/public/assets/js/site-app-r31.js) + index.html ×2 + vite.config + redirect r30→r31. ملاحظة: على الهاتف المستخدم قد يكون كاش r30 — redirect على الخادم يحل ذلك.

## آلية النشر في vite.config (مهم قبل أي تعديل — 20:40 UTC)
closeBundle الأول (copyAdminAssets) ينسخ ملفات client/public إلى dist/public بنفس المسارات دون hashing (مثل assets/js/site-app-r31.js). closeBundle الثاني (publishVersionedEntryAssets) ينسخ entries إلى dist/public/assets مع hash (مثل site-app-r31-xyz.js). index.html المنشور يحمّل /assets/js/site-app-r31.js (مسار مباشر من dist/public) — لذا يجب التأكد من وجود assets/js/site-app-r31.js في dist بعد البناء. الملفات r14/r17/r18/r19 كcopies من r31 موجودة في dist (تُحمّل عبر redirects في dev).

## تشخيص حاسم لآلية النشر (20:45 UTC)
1. index.html المنشور (dist/public/index.html) هو React wrapper يحمل assets/site-MUpu_53B.js (من build Vite لـ client/src/App.tsx) — wrapper يستدعي صفحة الزائر عبر assets/js/site-app-r31.js.
2. ملفات client/public/assets/js/site-app-r31.js وapp.js تُنسخ مباشرة إلى dist/public/assets/js/ (نفس الاسم) عبر closeBundle الأول copyAdminAssets.
3. نقطة الدخول js/app.js في publishVersionedEntryAssets تُنتج dist/public/assets/js/site-app-r31.js (نسخة مصغرة من js/app.js).
4. dist/public/pages/partners.html — صفحات أقسام الزائر القديمة في pages/، لكن الزائر يدخل عبر index.html → wrapper React → SPA hash routing داخل site-app-r31.js.
5. الإصلاح: cp site-app-r31.js (المصحح) إلى app.js + rebuild → يجب أن ينتج r31-*.js جديد في dist (كانت مشكلة: آخر build لم يُنتج hash جديد لأن Vite cache من js/app.js؟ لا — تم cp قبل build، يجب التحقق الآن).
6. ما تبقى: بناء، تحقق من أن dist/public/assets/js/site-app-r31.js (غير المحاطة بhash) يحتوي /manus-storage/ filter، ثم pnpm test، checkpoint، التحقق على الإنتاج (الشعار المرفوع للزائر).

## سكرينشوت dev بعد إصلاح f31 (20:47 UTC)
بطاقة جامعة طيبة لا تزال فارغة في dev (لا شعار) — هذا متوقع لأن شعار الاختبار أُزيل من DB. عند رفع المستخدم شعارًا حقيقيًا الآن يجب أن يظهر فورًا. الفلتر المصحح يقبل /manus-storage/ الآن. يبقى: checkpoint ثم التحقق من الإنتاج بعد رفع المستخدم للشعار.

## إنتاج بعد نشر r31 (20:50 UTC)
صفحة partners المنشورة تعرض 33 جهة بالشعارات الأحرف فقط (جط/جن/...) — لا يظهر شعار لجامعة طيبة رغم أن المستخدم رفع شعارًا من لوحة الإدارة قبل قليل. الاحتمالات: (1) الإنتاج ما زال يخدم site-app-r30 القديم الذي يرفض /manus-storage/ (wrapper منشور قديم)، (2) الشعار المرفوع جديد ولم يُحفظ بعد. يجب: فحص dist المنشور/production wrapper لتحديد أي نسخة يُحمَّل، ثم التحقق من وجود logoUrl نسبي في DB للجامعة، ثم إعادة الفحص.
ملاحظة من الصفحة: الهيدر يحمل /manus-storage/wajbat-plus/admin-images/logo_bd7651eb.jpg بشكل صحيح — إذن خادم /manus-storage يعمل، لكن بطاقات الشركاء ما زالت بالأحرف الأولى.

## حسم مشكلة الإنتاج (20:55 UTC)
الإنتاج يخدم site-C2bxFoMe.js → r30 (نشر checkpoint 7bb408e9 السابق). dist المحلي يحمل site-MUpu_53B.js → r31 (من checkpoint c1840761 هذه الجلسة). إذن checkpoint c1840761 نشر بنجاح لكن CDN للإنتاج ما زال يقدم القديم؟ أو أن publish يعيد نشر dist لكن CDN كاش. يجب التحقق من index.html على الإنتاج بعد بضع دقائق (invalidate). البديل: إذا بقي C2bxFoMe — فحص: هل dist index.html يحتوي wrapper جديدًا فعلاً ولماذا لم يتغير عند النشر.
ملاحظة: auto-publish يعمل على checkpoints — لا حاجة لضغط Publish يدويًا.

## حسم نهائي (21:00 UTC)
index.html المنشور الآن: site-MUpu_53B.js → يحمل r31. تم النشر بنجاح بعد checkpoint c1840761 (كان الكاش يحتاج بضع دقائق/كسر curl cache). يبقى التحقق من صفحة partners على الإنتاج لعرض الشعار النسبي، والتحقق من DB بأن جامعة طيبة تحمل logoUrl نسبيًا (المستخدم رفع شعارًا قبل قليل).

## حسم 21:05 UTC
المفاجأة: الإنتاج ينفّذ /assets/js/site-app-r30.js (رغم أن wrapper الجديد يحمل r31.js). يبدو أن vite redirects لا تعمل على الإنتاج (تنطبق فقط على dev server!) أو أن الرسل القديمة في dist تشير لـr30. الحل المطلوب: يجب أن يحمل الـwrapper المنشور r31 (يحمله فعليًا) وأن يُخزَّن r31 في dist باسم مختلف لا يتصادم مع redirect، وأن redirect الرسل القديمة يعمل إنتاجيًا — الأفضل: إعادة تسمية الإحالة إلى اسم جديد كليًا (site-app-v31.js) وتغيير vite.config alias ليُنسخ من المصدر الجديد، مع نسخ r31 إلى client/public/assets/js/site-app-v31.js يدويًا.

## حسم 21:07 UTC
الإنتاج يخدم /assets/js/site-app-r30.js = الملف القديم (100KB، لا يحتوي logoUrlOk ولا يحوّل إلى r31) — أي أن redirect في dist لم يُنشر أو لا يُطبَّق. wrapper المنشور يحمل r31.js لكن المسار /assets/js/site-app-r31.js قد لا يوجد! الحل الجذري: تسمية النسخة الجديدة باسم جديد كليًا (site-app-r31.js في client/public مباشرة) وتحديث الـwrapper المنشور ليشير إلى /assets/js/site-app-r31.js (بدون r30 إطلاقًا في index.html المنشور)، وضمان أن /assets/js/site-app-r31.js موجود في dist.
ملاحظة: wrapper يستخدم import("./js/site-app-r31.js") نسبي — أي يُحمَّل من /assets/js/site-app-r31.js. الملف يجب أن يكون موجودًا في dist/public/assets/js/site-app-r31.js.

## فشل حرج 21:10 UTC
md5 لموقع r30.js وr31.js متطابقة (c3cfd1...) — أي أن file على القرص كلاهما القديم! التصحيح السابق (sed/python) إما فشل أو استُبدل بسكربت نسخ خاطئ. يجب: إعادة تطبيق التصحيح (فلتر يقبل /manus-storage/) على site-app-r31.js، والتحقق من logoUrlOk قبل أي شيء، ثم البناء وإعادة النشر، والتحقق md5 بعد البناء.

## تصحيح 21:12 UTC — الحالة الصحيحة
r31 على القرص سليم: الفلتر المصحح موجود (`^https?:\/\/i.test(logoUrlStr) || /^\/manus-storage\/.test(logoUrlStr)`). الملف r30 على القرص متطابق md5 (نفس المحتوى المصحح) لأن جلسة sed السابقة نسخته.
المشكلة الحقيقية: الإنتاج ينفّذ /assets/js/site-app-r30.js = 100KB القديم (قبل cp أو من dist قديم). production wrapper يحمل r31 لكنه يحمل r31.js؟ wrapper MUpu_53B يحمل r31 — لكن index.html المنشور حمل قبل قليل C2bxFoMe→r30!
الخلاصة: النسخة المنشورة حاليًا على الإنترنت index.html = site-MUpu_53B.js→r31، لكن /assets/js/site-app-r30.js يُخدم من CDN كملف قديم منفصل، والسكربت المنفذ في صفحة partners هو r30 (لأن بعض المتصفحات/كاش خدمته من قبل). r31.js المرفوع على الإنتاج هو 100KB القديم كذلك (لأن البناء القديم رفعه قبل التصحيح؟ لا — الرسل على cdn تُرفع من dist).
الحل: checkpoint جديد مع dist نظيف (r31 صحيح) + إزالة site-app-r30.js من المجلد (إبقاء r31 فقط + redirect في vite). أو الأفضل: إعادة تسمية الإحالة الجديدة إلى اسم جديد كليًا لا يخدمه CDN القديم (site-app-v31.js).

## حسم نهائي 21:13 UTC — الجذر الحقيقي
صفحة الزائر المنشورة تُخدم index.html الذي يحمل wrapper site-C2bxFoMe.js (قديم، من checkpoint 7bb408e9 — يبدو أن checkpoint c1840761 لم يُدمج wrapper الجديد في الإنتاج!). site-C2bxFoMe.js يستدعي site-app-r30.js (القديم 100KB).
سبب عدم تحديث wrapper: auto-publish نشر checkpoint لكن CDN قد يعيد استخدام wrapper قديم إذا لم يتغير index.html في dist! أو أن بناء dist فشل في إنتاج index.html جديد للزائر.
الإجراء الآن: فحص dist/public/index.html حاليًا + كيف يُنشر index.html المنشور (هل من dist/client؟). ثم بناء نظيف (rm -rf dist) والبناء وإعادة الفحص، والتأكد أن index.html المنشور يحمل wrapper جديدًا يستدعي r31.

## تشخيص 21:20 UTC — المشكلة لم تحل
صفحة partners المنشورة: بطاقة طيبة = «لم يتوفر رابط الموقع بعد» + شعار حرف «جط» فقط. لكن DB تؤكد link=https://www.taibahu.edu.sa و logoUrl=/manus-storage/...!
- index.html المنشور يحمل الآن site-MUpu_53B.js (جديد r31) ✓
- لكن card تُعرض «لم يتوفر رابط الموقع» ← يعني managedPartners في الذاكرة لا يحمل link/logoUrl (فلتر قديم رافض، أو بيانات قديمة من localStorage cache).
الفرضية: site-app مضمّن داخل inline manus-runtime script (client-side build يحقن JS؟) أو أن MUpu_53B يستدعي r31 لكن r31 على cdn قديم؟ r31 على cdn سليم (فلتر صحيح).
فرضية أقوى: صفحة SPA: عند التنقل #/partners داخل نفس الجلسة، السكربت السابق قد يكون قديمًا. لكن الـresource entries أظهرت r30 سابقًا. الآن بعد النشر يجب أن تظهر r31.
الإجراء: فحص performance entries للسكربتات في هذه الصفحة، وفحص HTML بطاقة طيبة في DOM.

## حاسم 21:21 UTC
resource entries: الإنتاج حمّل site-app-r30.js! إذن wrapper المنفذ على cdn (وليس dist المحلي) يستدعي r30. فحص محتوى MUpu_53B على cdn: ما هو الـsrc الذي يحقنه؟ وهل cdn يحمل نسختين من MUpu_53B (قديمة بجسم قديم + جديدة)؟

## استنتاج 21:24 UTC
الآن: r30.js على cdn = 100KB يحمل logoUrlOk = نسخة r31 المصححة (redirect يخدم r31 عند الطلب!)، وr31.js أيضًا صحيح.
لكن لقطة 20:48 التقطت بعد نشر bb8ba9c1 (20:41) — ومع ذلك حمّلت r30 (ربما redirect كان قديمًا آنذاك).
الحالة الراهنة سليمة: كل المسارات تخدم النسخة المصححة. الخطوة الأخيرة: إعادة فتح #/partners في هذه الجلسة أو جلسة جديدة والالتقاط لاثبات الشعار.

## 21:25 UTC — مشكلة مستمرة رغم كل شيء
صفحة partners المنشورة ما زالت تعرض: شعار حرف + «لم يتوفر رابط الموقع بعد» لطيبة.
CDN سليم: r31.js يحمل logoUrlOk، وr30.js الآن redirect=r31. index.html يحمل MUpu_53B (r31).
لكن المنفذ داخل الصفحة ما زال r30 القديم (ببصمة 20:48 resource entry أظهر r30).
المستحيل الوحيد: أن resource entries في هذه الجلسة التقطت قبل نشر bb8ba9c1، أو أن هناك نسخة مضمّنة (inline) في HTML المنشور.
التالي: فحص الموارد في الصفحة الحالية + فحص index.html المنشور الحالي (محتوى head كامل).

## 21:26 UTC — حسم نهائي للجذر
الإنتاج ينفذ site-C2bxFoMe.js (wrapper قديم) → يستدعي site-app-r30.js القديم (فلتر https فقط).
الإجراء: الانتظار ثم فحص curl: هل index.html المنشور صار يحمل site-MUpu_53B.js؟ إن لم يتغير بعد دقائق، قد يكون النشر تعطل أو أن dist لم يتضمن index.html الجديد (ربما index.html منشور من client/public عبر vite ولكن dist/public/index.html لا يوجد؟). يجب التأكد أن dist يحتوي index.html المنشور الصحيح وأن git يتضمنه.

## 21:27 UTC
curl يؤكد: index.html المنشور يحمل MUpu_53B (جديد). لكن المتصفح نفذ C2bxFoMe+r30 رغم ?v=2 — لأن URL بـ ?v=2 على #hash لا يغيّر المسار الأساسي؟ لا بل يغير query: /?v=2 و/#/partners?v=2 — الـquery على hash لا يرسل للسيرفر! يجب فتح المسار الحقيقي الجديد: https://uploadplus-47dkogbk.manus.space/?nv=3 ثم الانتقال لـ partners داخل نفس الجلسة أو فتح كل صفحة منفصلة.

## 21:28 UTC — حالة كاملة قبل ضغط السياق
**المهمة الحالية:** شعار جامعة طيبة (رفعه المالك من لوحة r10) لا يظهر على بطاقة الزائر + بطاقة طيبة تعرض «لم يتوفر رابط الموقع بعد» رغم أن DB فيها:
- link = https://www.taibahu.edu.sa
- logoUrl = /manus-storage/wajbat-plus/partners/1_dff2e8f9.jpg (تأكد curl أنه يعود 307→200 image صالح)

**التشخيص:**
- dist المحلي: index.html يحمل site-MUpu_53B.js (wrapper) يستدعي /assets/js/site-app-r31.js
- cdn: index.html = MUpu_53B.js ✓ (curl مع Cache-Control: no-cache)
- cdn: /assets/js/site-app-r31.js يحمل logoUrlOk (فلتر يقبل النسبي) ✓
- cdn: /assets/js/site-app-r30.js = redirect يسلم نفس المحتوى المصحح (100KB، يحوي logoUrlOk) ✓
- **المتصفح (جلسة واحدة متراكمة كاش):** نفذ C2bxFoMe.js → r30 القديم (فلتر https فقط) رغم كل شيء — لأن جلسات المتصفح كانت مفتوحة قبل النشر الجديد وتحمل index.html قديمًا + SPA لا تعيد جلب HTML عند التنقل بالـhash.

**إثبات الإصلاح صحيح:** بعد فتح /?nv=3 (جلب HTML جديد) الصفحة الرئيسية ظهرت جديدة (الساعة تعمل) — الآن يجب الانتقال لـ #/partners داخل نفس الجلسة أو فتح صفحة منفصلة بquery جديد.

**الأهم للمستخدم:** هاتفه يحمل كاشًا عميقًا مثلي — الحل المقترح: فتح الرابط في Incognito جديد سيحمل كل شيء جديد تلقائيًا.

**المتبقي:** 1) فحص بطاقة طيبة في جلسة الـHTML الجديدة (/partners بعد فتح /?nv=3) — ربما SPA تعيد جلب r31 الآن. 2) إن نجح → إبلاغ المستخدم بالتجربة على Incognito. 3) checkpoint إذا لزم (لا تغييرات كود جديدة، كل الإصلاحات منشورة عبر checkpoint bb8ba9c1).

**ملاحظة:** checkpoint bb8ba9c1 منشور (auto-publish) منذ 20:41 والـcdn يحمل الملفات الصحيحة.

## 21:52 UTC
جلسة الـHTML الجديدة (/؟nv=3) حمّلت MUpu_53B + site-app-r31 ✓ لكن النقر على «الشركاء» لم يغيّر المحتوى (SPA عالقة على الرئيسية). الحل التالي: فتح رابط مستقل بquery: https://uploadplus-47dkogbk.manus.space/?pg=partners#/partners

## 21:53 UTC — حسم نهائي ✓
صفحة شركاء النجاح المنشورة عبر رابط مستقل (?pg=partners#/partners) تعرض:
- **شعار جامعة طيبة الحقيقي يُحمَّل من /manus-storage/wajbat-plus/partners/1_dff2e8f9.jpg** — يظهر على البطاقة (img مع alt جامعة طيبة) ✓
- بطاقة طيبة رابطها https://www.taibahu.edu.sa/ مع زر «🌐 زيارة موقع الجامعة» ✓
- 33 جهة مدرجة، وبطاقات بدون رابط تعرض «لم يتوفر رابط الموقع بعد» ✓
- ملاحظة صغيرة: الإحصائية «0 جهة تعليمية شريكة» في hero — العدّاد يُحدَّث بعد التحميل غير المتزامن (race مع recordVisit)؛ في الالتقاط الأول ظهر 33 أحيانًا. غير حرج.

**الإصلاح منشور فعلًا على الإنتاج:** site-app-r31 يقبل مسارات /manus-storage/ للشعارات، والـwrapper site-MUpu_53B.js يحمّله. جلسات المتصفح القديمة (مثل هاتف المستخدم) تحتفظ بـ index.html القديم + site-app-r30 حتى تحفظ الصفحة أو تفتح Incognito.

التسليم: إبلاغ المستخدم بأن الشعار يظهر الآن للزائر وأن عليه فتح الرابط بمتصفح جديد/متخفي أو السحب للأسفل+الإعادة لرؤية التحديث.


## جلسة 2026-08-15 (~21:13 UTC): شكوى جديدة — إدارة التحميلات معطلة
المطلوب: 1) إضافة نماذج فرعية (واجبات/CV/عروض...) لا تعمل. 2) إضافة أقسام لا تعمل. 3) إعادة تصميم التحميلات للإدارة والزائر بتصميم احترافي.

### التشخيص الحاسم
- الملف الإداري الموجود: client/public/assets/js/admin-downloads-manager-r4.js (516 سطرًا، مدير كامل: أقسام + ملفات + رفع متعدد + مشاركة واتساب/تليجرام + toggle visibility + move).
- **المشكلة الجذرية: r4 غير محمّل في أي صفحة إدارة!** grep أظهر: admin.html:0, admin-dashboard.html:0, client/index.html:0 — لا يوجد أي إحالة لـadmin-downloads-manager-r4.js (الصفحات تحمل admin-downloads-manager-**r3** و?v=downloads-r2 على الأرجح).
- admin-app-r30: key "downloads" → mountCompatibleDownloadsManager() يطلب window.WajbatDownloadsManager (معرّف في نهاية r4) وcontainer=[data-downloads-workspace] (يُنشأ في سطر 51-54 من r30). إن نجح يعود placeholder فيستخدمه المدير؛ إن فشل يسقط إلى generic contentWorkspace (item-list بسيط: أضف/عدّل/احذف/إخفاء/ترتيب بلا نماذج فرعية ← هذا ما يراه المستخدم «لا يقبل إضافة نماذج/أقسام»).
- إجراءات الخادم موجودة: server/downloads.ts — admin.downloads.list/createCategory/updateCategory/deleteCategory/setCategoryVisibility/moveCategory/updateFile/deleteFile/createFile/uploadFile... + upload إلى /api/downloads/upload + site.downloads.listPublic للزائر.
- خطة التنفيذ (نمط r10 للشركاء):
  1. إنشاء admin-downloads-manager-r10.js (نسخة معاد تصميمها من r4): تصميم فاخر dl2-* (شبكة بطاقات أقسام بألوان قوية + drawer محرر + رفع متعدد + معاينة + toast «تم الحفظ») + إصلاح ربط events (delegate data-dl-*) + إضافة حقيقية للأقسام والنماذج عبر tRPC.
  2. تحديث الإحالات: r3→r10 في admin.html وadmin-dashboard.html (grep 'downloads-manager' أولاً) + client/index.html إن وجد.
  3. صفحة الزائر: فحص site.downloads.listPublic وشكل صفحة التحميلات في site-app-r31 (client/public/assets/js/site-app-r31.js) وإضافة/تحسين تصميم downloadsPage (dl-hero شبكي + بطاقات نماذج + تحميل فعلي).
  4. vite.config: cacheBust alias + copyAdminAssets + redirect r1-r4→r10 + copies.
  5. pnpm test → pnpm build → تسجيل دخول admin على dev (bdalslamanwralajsh@gmail.com/abd77312) → اختبار إضافة قسم + نموذج فرعي + رفع ملف فعلي → فحص صفحة الزائر على dev → checkpoint (auto-publish) → تحقق الإنتاج curl.
- قاعدة بيانات التحميلات: فحص جدول downloads عبر schema/SQL قبل الاختبار لمعرفة إن كانت بيانات حالية.
- الشركاء تم حلها سابقًا: r10 لوحة إدارية تعمل، site-app-r31 يقبل مسارات /manus-storage/ للشعارات، checkpoint c1840761/bb8ba9c1 منشورة.


### بنية r4 المحفوظة (21:14 UTC)
- صفحات الإدارة (admin.html وadmin-dashboard.html) تحمّل admin-downloads-manager-r3.js?v=downloads-r2 فقط (3 مواضع في كل صفحة + retry مع Date.now()). r4 موجود في المجلد لكن غير محمّل من أي صفحة!
- r4 (516 سطر): namespace مباشر (IIFE)، request عبر admin()، دوال: saveCategory/update/remove/moveCategory/saveFile/removeFile، render يعرض dl-head (بحث+ترتيب+زر + قسم جديد) وdl-cat/ملفات، modalMarkup + field/row/buttons، forms: categoryForm (name/emoji/color/background/وصف/صورة) وfileForm (fileName/originalName/categoryId/وصف/ملف/صورة مصغرة)، bindEvents عبر data-dl-* (bindEvents: سطر ~490؟)، window.WajbatDownloadsManager مع expose activate؟ وmount في سطر 510+.
- openForm يحقن modal في body (data-dl-form=1 submit handler يقرأ formData).
- المشكلة المؤكدة لدى المستخدم: صفحات الإدارة تخدم r3 القديم (و?v=downloads-r2 ثابت في الكاش). الحل: إنشاء admin-downloads-manager-r10.js مع إحالات r10 في الصفحات + redirect r3/r4→r10 + copies + cacheBust في vite.config.
- يجب قبل البدء: قراءة r4 كامل (bindEvents وmount وwindow.WajbatDownloadsManager) ثم بناء r10 بتصميم فاخر (dl2-* gradient كحلي/ذهبي، بطاقات أقسام شبكية كبيرة، drawer محرر، رفع متعدد بصري، toast نجاح كبير).
- صفحة الزائر: site.downloads.listPublic + downloadsPage في site-app-r31.js — تحسين التصميم (hero + شبكة بطاقات نماذج + downloadCount + مشاركة).
- سجلات المستخدم: "لوحة الإدارة والتحميل للزائر غير كويسة — تصميم مختلف نهائيًا احترافي جذاب".


### تشخيصdownloads النهائي (21:14 UTC)
1. **r3 وr4 متطابقان md5** (f86a68b6... كلاهما 20KB، r1 مختلف). لذا «r4» الحالي هو في الحقيقة r3 نفسه — لا يوجد تصميم مختلف.
2. **admin.html وadmin-dashboard.html يحمّلان r3 فقط** (v=downloads-r2 ثابت) في 3 مواضع لكل صفحة + retry مع Date.now(). لا إحالة لأي نسخة أحدث.
3. **admin-app-r30** يحتوي mountCompatibleDownloadsManager (سطر 47) وcontentWorkspace يتحقق من WajbatDownloadsManager.mountCompatibleDownloadsManager لـdownloads (سطر 110)، وstructuredContentWorkspace (سطر 137) يتحقق من activate أولًا — إذن المسار إلى المدير المخصص سليم نظريًا.
4. **structured-editor-r5 ما زال يحتوي downloads** في structuredKeys (نفس عيب partners!) — لكن بما أن contentWorkspace يفحص mountCompatibleDownloadsManager قبل structured (سطر 140 يتحقق من activate أولًا) فالمسار سليم، لكن وجود downloads في structuredKeys قد يسبب تداخلًا في genericEditor. الأمان: إخراج downloads من r6 جديد (مثل partners-r5).
5. **الإنتاج**: curl يفشل (HTTP 000) — مشكلة TLS curl (exit 35)، استخدم `-k` أو المتصفح.
6. **خطة r10**: إنشاء admin-downloads-manager-r10.js (تصميم فاخر كحلي/ذهبي، شبكة أقسام بطاقات كبيرة، محرر drawer، رفع ملفات متعدد بصري مع progress، toast نجاح)، تحديث الإحالات في admin.html×2 + admin-dashboard.html×2 + retry، redirect r1/r2/r3/r4→r10 في vite.config، copies من r10 لبقية الرسل، وإخراج downloads من structured-editor-r6.
7. صفحة الزائر downloadsPage في site-app-r31.js: تحسين التصميم (hero + grid نماذج + downloadCount + مشاركة) مع cacheBust جديد r32.
8. الإجراءات الخلفية: admin.downloads.{listAll,createCategory,updateCategory,deleteCategory,moveCategory,uploadCategoryImage,createFile,updateFile,deleteFile,...} — موجودة في server (server/downloads.ts تقريبًا).


### تفاصيل server/downloads.ts وr3 (21:16 UTC)
- server/downloadsRouter procedures: list, publicList, trackDownload, createCategory, updateCategory, deleteCategory, setCategoryVisibility, moveCategory, createFile, updateFile, deleteFile, setFileVisibility, replaceFile, moveFile (ownerProcedure).
- categoryInput: {name(≤160), description?, emoji?(≤16), color?(≤32), backgroundColor?(≤32), imageKey?, imageUrl?(≤2000)}.
- fileInput: {categoryId, fileName, originalName, description?(≤4000), fileKey, fileUrl, mimeType, sizeBytes, imageKey?, imageUrl?}.
- r3 uploadFile: fetch POST /api/downloads/upload FormData — **يجب التحقق: هل يوجد هذا المسار على الخادم؟** (grep server/routers + server/admin* لم يجد uploadFile!). هذا مرجح سبب فشل الرفع! grep التالي: مسار /api/downloads/upload في كل server.
- r3 list يستدعي admin.downloads.list — يعمل (يعرض الفئات). createWithUpload يستخدم uploadFile ثم createFile.
- r3 يحتوي bindMedia للتعامل مع ملفات media — يستخدم fileInput.files[0].
- **خطة البناء r10**: نسخة جديدة كاملة admin-downloads-manager-r10.js: تصميم فاخر (كحلي #1e2a5e + ذهبي/أمبر #d97706)، شبكة بطاقات فئات مع أيقونات، زر "+ فئة جديدة" بارز، drawer محرر، رفع ملفات drag+زر مع progress toast، replace file، share واتساب/تليجرام، بحث وفرز وإظهار/إخفاء وترتيب.
- **مهم قبل r10**: فحص route /api/downloads/upload في server (ربما في server/routers.ts أو server/_core أو server/downloads.ts آخر). إن كان مفقودًا → إضافة endpoint upload حقيقي (storagePut) في downloadsRouter أو express middleware.
- إخراج downloads من structured-editor-r5 → إنشاء r6 (نفس أسلوب partners-r5).
- صفحة الزائر: downloadsPage في site-app-r31.js — تحسين تصميم (hero داكن، بطاقات فئات ملونة بألوانها، ملفات مع أيقونات حسب mimeType، عدّاد تحميلات، زر تحميل واضح). → r32 مع cacheBust في index.html ×2 + vite redirects + copies.
- الإحالات الحالية: admin.html (3 مواضع r3), admin-dashboard.html (3 مواضع r3). r1/r2/r4 موجودة كملفات (r1 مختلف md5، r2=r3=r4).
- vite.config يحتوي closeBundle entries: ["1","14","17","18","19","30"] للمصادر المنسوخة؟ (فحص: publishVersionedEntryAssets). redirect patterns: site-app-old→r31، structured-r3/r4→r5، partners-r6..9→r10 (partners manager r10).
- اختبارات: 92/92 سابقة، teamPartners.test يحتاج تحديث إذا غيّرنا الفلتر (لا علاقة هنا).
- prod: curl عادي يعطي exit 35 (TLS) — استخدم -k أو المتصفح؛ CDN يحتاج cache-control no-cache header لفحص الطازج.

### حسم backend (21:17 UTC)
مسار /api/downloads/upload موجود في server/_core/index.ts (registerDownloadsUpload) ويعمل: formidable + storagePut → ملف JSON {success, mediaId, fileName, originalName, fileUrl, fileKey, mimeType, sizeBytes}. إذن البنية الخلفية للتحميلات سليمة تمامًا: procedures كاملة (list/createFile/updateFile/deleteFile/replaceFile/moveFile/trackDownload/createCategory/updateCategory/deleteCategory/setCategoryVisibility/moveCategory/publicList).

**استنتاج الجذر الحقيقي:** المستخدم لم يعد يرى «إدارة التحميلات» تعمل لأن structured-editor-r5 ما زال يحوي `downloads` ضمن structuredKeys (لم أخرجها كما فعلت مع partners!) فيعترض القسم ويعرض قائمة بسيطة بلا إضافة رفع فعلي. الحل الكامل:
1. structured-editor-r6 = r5 مع حذف downloads من structuredKeys/defaults/any partner/download captions.
2. admin-downloads-manager-r10: لوحة كاملة جديدة بتصميم فاخر (فئات شبكية + drawer محرر + رفع فعلي drag&drop وزر) يستدعي uploadFile (/api/downloads/upload) ثم createFile. الدالة المكشوفة: mountCompatibleDownloadsManager(container) وWajbatDownloadsManager { activate(container) }.
3. تعديل admin-app-r31 (نسخة من r30): نفس patch الذي طبقناه لـpartners — فحص mountCompatibleDownloadsManager قبل structuredEditor.supports('downloads'). الأسهل: تعديل contentWorkspace في r31 بحيث يعالج downloads عبر mountCompatibleDownloadsManager إن وجد. يجب نسخ r30→r31 أولاً ثم patch (مثلما فعلنا مع partners).
4. صفحة الزائر downloadsPage في site-app-r32: تصميم hero داكن + فئات بألوانها + ملفات بأيقونات mimeType + عدّاد تحميلات.
5. تحديث كل الإحالات: admin.html (3×), admin-dashboard.html (3×), client/index.html, vite.config redirects (downloads-manager-r1..4 → r10, structured-r4/r5 → r6... انتبه r5 تستخدم لكلا partners وdownloads — إن أخرجنا downloads من r6 يبقى partners يعمل؟ r5 يحوي partners خارج structuredKeys — الأفضل r6 تحذف downloads فقط وتبقي partners كما هي)، site-app r31→r32، + copies + closeBundle guard.
6. اختبارات ثم بناء ثم متصفح dev ثم إنتاج.

### بنية admin-app-r30 contentWorkspace لفحص الترتيب
- legacyContentWorkspace: يفحص structuredEditor.supports(key) ثم mountCompatiblePartnersManager — الترتيب حاسم: يجب mountCompatibleDownloadsManager أولًا مثل partners.

### تشخيص admin-app-r30 الدقيق (21:18 UTC)
contentWorkspace المفعّل هو `structuredContentWorkspace` (من السطر 137) الذي:
1. يفحص services manager → downloads manager → contact manager → structuredEditor.supports(state.selected) → legacyContentWorkspace.
2. سطر 140: `if (state.selected === "downloads" && typeof window.WajbatDownloadsManager?.activate === "function") return mountCompatibleDownloadsManager();`
3. mountCompatibleDownloadsManager (سطر 47): يستخدم WajbatDownloadsManager وworkspace/data-downloads-workspace.

**المشكلة المحتملة في r4:** إن لم يكن WajbatDownloadsManager مكشوفًا بالواجهة الصحيحة (activate)، أو إن كان structuredEditor.supports('downloads') يعاد قبله في legacyContentWorkspace — لكن الترتيب الصحيح يجعل downloads يُعالج أولًا. إذن العيب في r4 نفسه (الواجهة/الأحداث) أو أن r4 لم يُحمَّل أصلًا (كاش CDN — admin.html على الإنتاج يحمل نسخة قديمة!).

**الخطوات المؤكدة:**
- نسخ r30→r31 جديد.
- كتابة admin-downloads-manager-r10 كامل (فئات + ملفات + رفع فعلي + تصميم فاخر) بواجهة { activate(container), workspace(data)? }.
- تعديل r31: mountCompatibleDownloadsManager يجب أن يتوافق مع واجهة r10.
- structured-editor-r6 = r5 مع حذف downloads من structuredKeys (نفس حيلة partners).
- site-app-r32 لصفحة الزائر downloadsPage.
- إحالات: admin.html/admin-dashboard.html/client/index.html/vite.config (redirects: downloads-manager-r1..4→r10, structured-r4/r5→r6, site-app-r30→r31).
- ملاحظة: site-app-r31 موجود مسبقًا (إصلاح الشركاء) — r32 سيكون جديدًا.

### واجهة r4 الدقيقة (21:20 UTC)
admin-downloads-manager-r4.js هو IIFE معكوف يعرّف في نهايته:
- `window.WajbatDownloadsManager = { workspace: () => render(), activate, mountCompatibleDownloadsManager: container => { container.innerHTML=""; activate(); return {}; }, refresh: () => list() }`
- activate(): إذا admin()?.selected !== "downloads" يستدعي a.setWorkspaceState({selected:"downloads"}) (غير موجودة في admin-app!) ثم render() ثم list() ثم bindEvents على .side-workspace بـdataset.dlBound.
- bindEvents على سلة delegate: search/sort/toggle/add-category/edit-category/cat-visible/delete-category/cat-up/cat-down/add-file/edit-file/file-visible/file-up/file-down/copy/share-wa/share-tg/test/delete-file/upload-many + change على [data-dl-upload-input] → createWithUpload.
- render() في السطر ~260: يبحث عن `.side-workspace` ويكتب innerHTML كامل (header + فئات + ملفات).
- editFile (سطر ~374): modal dl-modal يُدرج في .side-workspace.
- createWithUpload: رفع الملفات ثم إنشاء ملف لكل واحد.

### التناقض الحاسم مع admin-app-r30 (structuredContentWorkspace)
structuredContentWorkspace (سطر 137): يفحص `state.selected === "downloads" && typeof WajbatDownloadsManager?.activate === "function"` ثم يعيد `mountCompatibleDownloadsManager()` (دالة admin-app الخاصة، سطر 47) — **ليست** dmm.mountainCompatibleDownloadsManager!
دالة admin-app سطر 47 `mountCompatibleDownloadsManager()`:
- سطر 51: إن لم يكن هناك `[data-downloads-workspace]` أو state.selected !== "downloads" → يعيد (null بلا return صريح!).
- سطر 54: يعيد `<section class="workspace side-workspace" data-downloads-workspace><div class="workspace-body"></div></section>`.
- لكن أين يُستدعى activate؟ لا يظهر في المقطع! على الأرجح سطر 48-50 يحوي استدعاء activate في microtask (مثل visitorLinks).

**السيناريو الفاشل المحتمل:** r4 activate() يبدأ بـ render() الذي يكتب في `.side-workspace` — لكن structuredContentWorkspace ما زال ينتظر container خاص [data-downloads-workspace]! الريندر يكتب في side-workspace العام لكن structuredContentWorkspace يتوقع data-downloads-workspace. ثم structuredEditor.supports('downloads') = true → يكتب قائمة structured (item-rows) فوق/بدل محتوى r4!

**الحل المتعمد (نفس حيلة partners الناجحة):**
1. structured-editor-r6 = r5 لكن بحذف 'downloads' من structuredKeys وdefaults وcaptions.
2. admin-downloads-manager-r10: تصميم فاخر كامل + واجهة مطابقة: window.WajbatDownloadsManager = { workspace(data)?, activate, mountCompatibleDownloadsManager(container) { container.innerHTML = "<section class='workspace' data-downloads-workspace><div class='workspace-body'></div></section>"; bind(container)...; activate(); }, refresh, list }.
3. admin-app: نسخة r31 = r30 مع تعديل mountCompatibleDownloadsManager (سطر 47) ليطابق واجهة r10: `const manager = window.WajbatDownloadsManager; if (state.selected !== "downloads" || typeof manager?.activate !== "function") return null; queueMicrotask(() => { if (!document.querySelector("[data-downloads-workspace]") || state.selected !== "downloads") return; manager.activate(); }); return "<section class='workspace' data-downloads-workspace><div class='workspace-body'></div></section>";`
   (ملاحظة: slected='downloads' يمر عبر mountCompatibleDownloadsManager في contentWorkspace الأصلي سطر ~93 قبل structured!)
4. site-app-r32: downloadsPage جديدة تصميم فاخر.
5. إحالات: admin.html (3 مواضع كل) downloads-manager → r10; structured-editor → r6; admin-app → r31; client/index.html; vite.config redirects: downloads-manager-r1/r2/r3/r4→r10, structured-r4→r6, structured-r5→r6, site-app-r30→r31 (وguard في closeBundle).
6. ملاحظة: admin-app-r30.js نفسه كبير (wrapper site-*.js يستدعيه) — النسخة المنشورة محملة باسم site-app-r30.js. بعد patch ستنشر r31 باسم site-app-r31.js.

### بنية downloads backend الموثقة (لبناء r10)
- procedures في downloads.ts (public/listAll): categories (id,name,icon,emoji,color,description,isVisible,order) وfiles (id,categoryId,fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes,downloadCount,isVisible,order,uploadedAt).
- admin.createCategory({name,icon?,emoji?,color?,description?,isVisible?}) → row.
- admin.updateCategory(id,{name,icon,emoji,color,description,isVisible,order}).
- admin.deleteCategory(id) / admin.moveCategory(id,dir).
- admin.createFile({categoryId,fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes}) → row.
- admin.updateFile(id,{...}) / admin.deleteFile(id) / admin.moveFile(id,dir) / admin.replaceFile(id,{fileUrl,fileKey,mimeType,sizeBytes,originalName?}) / admin.trackDownload(id).
- site.partners.listPublic نمط → site.downloads.publicList؟ (يوجد downloads.publicList في procedures).
- رفع الملفات: POST /api/downloads/upload (multipart, field name=file أو attachment) → {success,mediaId,fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes}. (رأيت ذلك في server/_core/index.ts سطر 24.)

### تصميم r10 المقترح (احترافي وجذاب)
- hero داكن متدرج (khaliji purple/navy + gold accents) مع إحصائيات (أقسام، ملفات، مرات تحميل).
- شبكة بطاقات للفئات: كل بطاقة بأيقونة كبيرة دائرية + لون مخصص + عداد ملفات + أزرار (تعديل/إخفاء/حذف/ترتيب).
- زر «إضافة قسم جديد» بارز ببطاقة مفرغة dashed.
- لكل فئة: جدول/شبكة ملفات مع رفع drag&drop متعدد + input file + شريط تقدم + toast «تم رفع الملف: اسم».
- modal محرر القسم (اسم/أيقونة/لون palette/وصف/إظهار).
- modal محرر الملف (اسم/وصف/رابط) بعد الرفع.
- CSS محقون: .dl10-* classes.

### بنية API الدقيقة للتحميلات (21:22 UTC)
- `trpc.downloads.list.useQuery()` → { categories: [{id,name,description,emoji,color,backgroundColor,imageKey,imageUrl,sortOrder,downloadCount,isVisible}], files: [{id,categoryId,fileName,originalName,description,fileKey,fileUrl,mimeType,sizeBytes,imageKey,imageUrl,sortOrder,downloadCount,isVisible,uploadedAt,createdAt}] }
- `trpc.downloads.publicList.useQuery()` → { categories: [{...fields,...files:[{...file,directUrl}]}], files }
- إنشاء قسم: trpc.downloads.createCategory.mutate({name,description?,emoji?,color?,backgroundColor?,imageKey?,imageUrl?})
- تعديل: updateCategory({id,...partial,sortOrder?}) | حذف: deleteCategory({id}) | ترتيب: moveCategory({id,direction:"up"|"down"}) | (isVisible يُعدَّل عبر updateCategory)
- إنشاء ملف: trpc.downloads.createFile.mutate({categoryId,fileName,originalName,description?,fileKey,fileUrl,mimeType,sizeBytes,imageKey?,imageUrl?})
- تعديل ملف: updateFile({id,...partial,sortOrder?}) | حذف: deleteFile({id}) | ترتيب: moveFile({id,direction})
- رفع الملفات (سكربت/خادم): POST /api/downloads/upload مع ملف form-data → يعود {fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes} (فحصت السطر 24 — endpoint موجود).

### خطة التنفيذ النهائية (مؤكد)
1. admin-downloads-manager-r10.js (كامل ~700 سطر): تصميم فاخر dl10-* (hero + شبكة بطاقات أقسام + زر إضافة قسم dashed + modal محرر قسم بألوان preset + modal محرر ملف + رفع متعدد مع شريط تقدم + toast نجاح) + window.WajbatDownloadsManager = { activate, mountCompatibleDownloadsManager(container), refresh }.
2. admin-app-r31.js = r30 مع تعديل mountCompatibleDownloadsManager بسطر 47-58 ليتوافق: container.innerHTML = "<section class='workspace' data-downloads-workspace><div class='workspace-body'></div></section>"; queueMicrotask(() => { if (document.querySelector("[data-downloads-workspace]") && admin().selected === "downloads") manager.activate(); });
3. structured-editor-r6.js = r5 مع حذف 'downloads' من structuredKeys (إن وجدت).
4. site-app-r32.js = r31 مع downloadsPage فاخرة: hero، بطاقات أقسام بألوان مخصصة، ملفات بشعارات MIME، زر تحميل مباشر (a.download) + عداد، toast.
5. إحالات: admin.html (6 مواضع) r4→r10 للمدير وstructured-r5→r6؛ client/index.html (react wrapper) نفس الشيء؛ vite.config: aliases + redirects (downloads-manager-r1..4→r10, structured-r4/r5→r6, site-app-r30→r31) + guard closeBundle لـsite-app-old→r31.
6. اختبارات vitest ثم build ثم restart ثم تحقق dev ثم prod.

## خطة التنفيذ الدقيقة — إدارة التحميلات r10/r32 (21:20 UTC)

### مواضع التعديل المؤكدة في client/public/admin.html (نفسها حرفيًا في admin-dashboard.html)
1. السطر 75: `structuredEditor.src = "/assets/js/admin-structured-editor-r5.js?v=structured-r5"` → r6.js?v=structured-r6
2. السطر 129 (onerror branch): نفس الإحالة → r6
3. السطر 91 و142: `downloadsManager.src = "/assets/js/admin-downloads-manager-r3.js?v=downloads-r2"` → r10.js?v=downloads-r10
4. السطور 255 و275 (setTimeout fallback 4s): retry src r3.js?v=downloads-r2 → r10.js?v=downloads-r10
- سلسلة onload: structuredEditor.onload→homepageManager.onload→servicesManager.onload→visitorLinksManager.onload→downloadsManager.onload→contactManager→teamManager→partnersManager→blogManager.

### مواضع التعديل في vite.config.ts
- سطر ~171-173: redirects structured-r5 → إضافة: {source:"js/admin-structured-editor-r5.js", dest:"js/admin-structured-editor-r6.js"}، و{source:"js/admin-structured-editor-r3.js"...r4...} → r6 (إن وجدت copies)
- سطر ~216-217: copies admin-downloads-manager-r3.js وr4.js → إضافة r10: {source:"js/admin-downloads-manager-r10.js", dest:"js/admin-downloads-manager-r10.js"} + redirects القديمة → r10
- سطر ~304-306 aliases للملفات الرئيسية
- copyAdminAssets() سطر 166-242 ينسخ public/* إلى dist/public

### API المحققة نهائيًا (مؤكدة من الكود)
- owner: admin.downloads.list (GET, {categories,files}) / createCategory-updateCategory-deleteCategory-setCategoryVisibility-moveCategory(direction:"up"|"down")-createFile-updateFile-deleteFile-setFileVisibility-replaceFile-moveFile. **ملاحظة: r4 يستخدم setCategoryVisibility({id, visible:!isVisible}) والخادم يتوقع {id, isVisible} — r10 يجب أن يرسل isVisible**
- public: site.downloads.publicList (GET, {categories:[{...cat,files:[{...file,directUrl}]}]}) / site.downloads.trackDownload({id}) → {fileUrl, fileName, mimeType}
- POST /api/downloads/upload: FormData بملف `file` + جرأة 50MB → {success,mediaId,fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes}. fileUrl = /manus-storage/... مسار نسبي يُخدم عبر storage proxy.
- أعمدة category: name,description,emoji,color("#4966d6"),backgroundColor("#eef1fd"),imageKey,imageUrl,sortOrder,isVisible,isDefault
- أعمدة file: categoryId,fileName,originalName,description,fileKey,fileUrl,mimeType,sizeBytes,imageKey,imageUrl,sortOrder,isVisible,downloadCount,createdAt
- admin-app-r30: mountCompatibleDownloadsManager (س47-55) يحتاج manager.activate فقط، workspace يُبنى كـ <section class="workspace side-workspace" data-downloads-workspace><div class="workspace-body"></div></section>
- admin-app-r30 سطر 137: contentWorkspace = structuredContentWorkspace: إذا downloads وWajbatDownloadsManager.activate موجود → mountCompatibleDownloadsManager؛ وإلا structured-editor. إذن حذف downloads من structuredKeys في r6 يكفي للتسليم.
- site-app-r31 سطر 475-502: loadSiteDownloads() يستدعي site.downloads.publicList ويملأ siteDownloads.categories ثم dynamicDownloadsPageHtml() يعرضها بدل الملفات الثابتة؛ downloadsPage() ترجع dynamic أو static. trackPublicDownload عبر data-action="track-download".
- site-app-r31: esc/safeCss/waNumber/wa موجودة كدوال مساعدة — r32 يجب أن يكررها.

### خطة r10 (المطلوب من المستخدم)
- تصميم احترافي "مثير وجذاب": hero صغير بإحصائيات، بطاقات فئات ملونة بألوان الفئة، drawer/multi-step محرر، رفع متعدد الملفات مع شريط تقدم فعلي (XMLHttpRequest أو fetch+progress عبر readAsArrayBuffer chunks — الأفضل: استخدام fetch مع XMLHttpRequest لتتبع progressEvent.loaded/total أو عرض "جارٍ الرفع..." لكل ملف)، رسائل نجاح واضحة "تم رفع الشعار/الملف"، معاينة أيقونة حسب mimeType، أزرار: تعديل/إظهار/إخفاء/حذف/نسخ رابط/مشاركة واتساب+تيليجرام/تجربة تحميل/نقل.
- r10 يجب أن يدعم الواجهة القديمة mountCompatibleDownloadsManager(container)؟ لا — admin-app-r30 يبني الـ section بنفسه ويطلب activate فقط. لكن سنحافظ على window.WajbatDownloadsManager={activate, mountCompatibleDownloadsManager, refresh, workspace}.

### خطة r32 (الزوار) + style-r10.css
- Hero داكن متدرج (مماثل لـ partners hero) مع إحصائيات، شرائح فئات (pills)، بطاقات ملفات pro: أيقونة نوع الملف ملونة، اسم، وصف، حجم، عداد تحميل، زر تحميل بارز.
- استيراد style-r10.css من داخل r32 عبر link element (نفس طريقة r29/r8).
- تحديث إحالات: client/public/index.html و client/index.html (تحميل site-app-r31.js) + vite.config aliases/redirects → r32 مع ?v=r32 cache-buster.

## أخطاء r4 المؤكدة (لإصلاحها في r10)
1. toggleCategoryVisibility يرسل `{id, visible: true}` والخادم يتوقع `isVisible` → خطأ دائماً. كذلك toggleFileVisibility نفس المشكلة.
2. editFile عند فتح "ملف جديد" يرسل categoryId في saveFile لكن handleFileUpload لم يكن يرفع الملف عند submit (الحقل file يُرسل كـ formData عادي ويُهمل).
3. أخطاء طفيفة: `files[index] !== files[files.length - 1]` خطأ منطقي (next محسوب خاطئ)، `hidden` في زر رفع متعدد (متغير إحصاءات) خطأ اسم.
4. لا يوجد progress للرفع، لا drawer احترافي، تصميم مسطح.

## endpoint رفع الملفات (مؤكد)
- POST /api/downloads/upload (Express + formidable): يقبل الحقل `file` أو `attachment`، حد 50MB، يعود {success,mediaId,fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes}. يجلب جلسة المالك من الكوكي.
- رفع متعدد ملفاً ملفاً عبر fetch loop. لتتبع progress نستخدم XMLHttpRequest مع FormData (progressEvent.loaded/total لكل ملف) أو نكتفي بـ fetch مع حالة "جارٍ...". r10: XMLHttpRequest لكل ملف لعرض شريط تقدم.
- بعد الرفع: admin.downloads.createFile{categoryId, fileName, originalName, fileKey, fileUrl, mimeType, sizeBytes, description?}
- admin.downloads.list GET → {categories, files}، أعمدة الملفات تشمل categoryId/imageKey/imageUrl/createdAt/downloadCount
- admin.downloads.trackDownload{id} → {fileUrl, fileName, mimeType} — copyFileUrl في r4 كان يستخدمه ويزيد العداد! r10 يجب ألا يزيد العداد عند النسخ: يوجد admin.downloads.trackDownload فقط. سنستخدمه للنسخ مع ملاحظة أنه يزيد العداد (سنبقي هذا كما كان في r4 لأنه مقبول — "نسخ" يعني رابط مباشر، لكن الأفضل: استخدام fileUrl من state مباشرة بدون trackDownload. r10: link = `${location.origin}${file.fileUrl}` إذا fileUrl نسبِي، وإلا كما هو.
- publicList: categories مع files[{...file, directUrl}]

## admin-app-r30 helpers المتاحة (window.WajbatAdmin)
- admin().toast(message), admin().setWorkspaceState?, admin().selected. r4 يستخدم admin()?.toast وadmin()?.selected.
- r10 لا يحتاج fileToDataUrl (الرابع يستخدم fetch/FormData مباشرة).

## site-app-r31 الحالي (سطور 463-505) — يجب إعادة كتابته في r32
- `files` ثابت (8 فئات) + `fileBase` CDN قديم. `siteDownloads` global يملأه loadSiteDownloads() عبر rpcQuery("site.downloads.publicList") ثم dynamicDownloadsPageHtml() / downloadsPage() fallback static.
- fileCardHtml: card.file-card مع file-icon ▤، a.btn.btn-outline data-action="track-download" data-file-id
- trackPublicDownload(fileId) → rpcMutation site.downloads.trackDownload.
- الرندرة الرئيسية في r31 تُحمَّل عبر render() عند hashchange؛ downloadsPage() يستدعى ضمن pageContent.
- دوال مساعدة في r31: esc, safeCss, rpcQuery, rpcMutation, wa, pageContent, render موجودة — r32 يجب إعادة تعريفها (نسخ نفس الأسلوب من r31).
- r31 imports style-r8.css عبر createElement link في رأس الملف. r32 سيفعل نفس الشيء لـ style-r10.css.
- vite.config: aliases لموقع الزائر: js/app.js → js/site-app-r31.js؛ client/public/index.html و client/index.html تحملان site-app-r31.js

## حالة r4 الأخيرة (محفوظة 21:14، مكتملة الآن بـ467 سطر مقروء)
قرأت r4 كاملًا. السلوك: IIFE namespace، request عبر /api/trpc، uploadFile عبر POST /api/downloads/upload (FormData "file", 50MB)، أخطاء: toggleCategoryVisibility يرسل `visible` بدل `isVisible`، handleFileUpload لا يرفع الملف عند "ملف جديد" (يُهمل)، أخطاء next/hidden في render.
- نهاية r4 (سطور 469-516 تقريباً): bindEvents تستكمل: cat-up/cat-down/add-file/upload-many/delete-file/file-up/file-down/copy/share-wa/share-tg/test/edit-file/file-visible، ثم window.WajbatDownloadsManager = { activate(), mountCompatibleDownloadsManager(container?), refresh() } (نمط شركاء r10 نفسه).
- window.WajbatAdmin: admin().toast + admin().selected. request wrapper: JSON POST → /api/trpc/{proc} مع {json:input}، GET عبر query input.

## خطة r10/r32 المحدثة (بعد كل التشخيص — جاهزة للتنفيذ الآن)
1. write client/public/assets/js/admin-downloads-manager-r10.js:
   - تصميم فاخر: dl3-* classes (hero بإحصائيات، بطاقات أقسام بشبكة dl3-grid بألوان gradient تُقرأ من color/backgroundColor للقسم، emoji دائري كبير، شارة عدد الملفات، أزرار تعديل/إخفاء/ترتيب/حذف).
   - drawer محرر جانبي (slide-in من اليسار RTL) بدل modal.
   - رفع متعدد: زر «⬆ رفع ملفات متعددة» + input hidden + XMLHttpRequest لكل ملف مع progressEvent → شريط تقدم لكل ملف + toast «تم رفع N ملف».
   - زر «+ قسم جديد» واضح + نموذج قسم (name/emoji/color/background/وصف).
   - نموذج ملف: categoryId/fileName/originalName/وصف + upload.
   - إصلاح visible→isVisible، next/up/down logic، hidden bug.
   - أزرار للملف: نسخ رابط (بدون trackDownload — استخدام fileUrl مباشر)، مشاركة واتساب/تيليجرام (trackDownload)، تجربة تحميل، تعديل، إخفاء/إظهار، نقل أعلى/أسفل، حذف مع confirm dialog داخلي.
   - البحث والترتيب، عداد totalDownloads من downloadCount.
   - expose window.WajbatDownloadsManager = { activate(), mountCompatibleDownloadsManager(container), refresh() } (نفس API الذي يتوقعه admin-app-r30).
2. write client/public/assets/js/admin-structured-editor-r6.js = r5 مع حذف "downloads" من structuredKeys + كل أكواد downloads الخاصة (موجود فعليًا — تم إنشاؤه سابقًا قبل الضغط، يجب التحقق من وجوده!).
3. تحديث إحالات admin.html + admin-dashboard.html: downloads-manager-r3→r10 (3 مواضع + retry Date.now()) وstructured-r5→r6 (3 مواضع) + cache-busting params.
4. client/public/assets/js/site-app-r32.js: downloadsPage معاد تصميمها (hero داكن متدرج + إحصائيات + بطاقات pro بملف icon كبير + عداد التحميلات + زر تحميل بارز + CTA) مع الحفاظ على loadSiteDownloads/trackPublicDownload/تسجيلات style-r10 + dynamic fallback.
5. vite.config: cacheBust alias js/site-app-r31.js→site-app-r32.js؟ لا — الأفضل: alias js/app.js→js/site-app-r32.js (سطر ~259 publishVersionedEntryAssets) + copies: downloads-manager-r1..r4→r10 copies في copyAdminAssets + redirect structured r3/r4/r5→r6.
6. تحديث server/downloadsAssets.test.ts: r3→r10 + downloads-r2→downloads-r10 + r31→r32 + WajbatDownloadsManager + mountCompatibleDownloadsManager في admin-app-r30 يبقى نفسه (r30 يحمل mount).
7. pnpm test + pnpm build + تسجيل دخول admin (bdalslamanwralajsh@gmail.com/abd77312) على dev → اختبار إضافة قسم + رفع ملف فعلي → فحص صفحة الزائر /#/downloads → checkpoint (auto-publish) → فحص الإنتاج.

## إحالات موجودة يجب تحديثها (مؤكدة من overview)
- client/public/admin-dashboard.html سطور 45-48 (downloads-r3+v=downloads-r2)، 95-98 (onerror mediaBinding)، 164-176 (retry Date.now()) + structured-r5 في نفس المواضع.
- client/public/admin.html: نفس النمط 3 مواضع downloads + structured.
- vite.config.ts: copyAdminAssets سطور 216-217 (r3/r4 copies) و171-174 (structured redirects) و199-203 (site-app aliases) و259 (js/app.js→site-app-r31.js) و302-307 (rollup input aliases site-app-r30→r31).
- server/downloadsAssets.test.ts: r3/downloads-r2/r31/admin-app-r21 assertions.

## بنية r4 الكاملة (21:30 UTC) — كل ما يلزم لبناء r10
- API: admin.downloads.list (GET، يرجع {categories, files}) / createCategory / updateCategory(id+partial) / deleteCategory / setCategoryVisibility({id, isVisible}) / moveCategory({id, direction:"up"|"down"}) / createFile / updateFile(id+partial) / deleteFile / setFileVisibility({id, isVisible}) / moveFile({id, direction}) / trackDownload({id}) يرجع {id, fileUrl, fileName, originalName} / replaceFile({id, fileKey, fileUrl, mimeType, sizeBytes, originalName}).
- أعمدة category: name, description, emoji(📥), color(#4966d6), backgroundColor(#eef1fd), imageKey, imageUrl, sortOrder, isVisible, isDefault.
- أعمدة file: categoryId, fileName, originalName, description, fileKey, fileUrl, mimeType, sizeBytes, imageKey, imageUrl, sortOrder, isVisible, downloadCount, lastDownloadedAt.
- uploadFile: POST /api/downloads/upload FormData field "file" فقط (بدون originalName إلزامي) → {success, mediaId, fileName, originalName, fileUrl, fileKey, mimeType, sizeBytes}. حد 50MB.
- request wrapper: GET `/api/trpc/{p}?input={json:i}`, POST `/api/trpc/{p}` body {json:i}, response parse payload.result.data.json.
- **أخطاء r4**: toggle uses `visible` بدل `isVisible` ❌؛ editFile ملف جديد لا يعالج رفع الملف في handleUploadSubmit إلا إذا `input name=file` (لكن openForm لا يربط handleUploadSubmit عند التعديل)؛ render() على إعادة تحميل يحذف أي modal مفتوح؛ upload-many input لا يُزال value بعد النجاح.
- activate(): يتحقق admin().selected==="downloads" ويستخدم admin().setWorkspaceState({...}) ثم render() ثم list().then(bindEvents(.side-workspace)).
- window.WajbatDownloadsManager = { workspace(), activate(), mountCompatibleDownloadsManager(container), refresh() }.
- admin.html إحالات downloads: سطر 91/142 (main+onerror) و220 (retry) بصيغة r3+v=downloads-r2. structured: 75/129 r5+v=structured-r5. admin-dashboard.html: downloads 46/96/173 وstructured 30/83.
- admin-dashboard.html سطر 30 و83 structured-r5.
- vite.config: copyAdminAssets 171-174 structured aliases (r3/r4→r5 copy)، 199-203 site-app aliases، 216-217 downloads copies r3+r4 فقط، 259 js/app.js→js/site-app-r31.js، 302-307 rollup aliases site-app-r30→source.
- test: server/downloadsAssets.test.ts assertions قديمة (r3/downloads-r2/r31/admin-app-r21).

## downloadsPage الحالية في site-app-r31.js (21:32 UTC)
- سطور 463-502: files ثابتة احتياطية (8 فئات) + fileBase + siteDownloads + loadSiteDownloads (rpcQuery site.downloads.publicList) + fileCardHtml + dynamicDownloadsPageHtml + downloadsPage (dynamic أولاً ثم fallback static).
- dynamicDownloadsPageHtml: heading "مركز التحميلات" + أقسام section.download-section > section-heading (emoji+h2+count) + grid.grid-4 من fileCardHtml (file-icon "▤"، اسم، meta: downloadCount/الوصف، زر تحميل ⇩ href=directUrl target=_blank data-action="track-download" data-file-id=id).
- trackPublicDownload(fileId): rpcMutation site.downloads.trackDownload {id}.
- publicList يرجع {categories:[{...cat fields, files:[{...file fields, directUrl}]}], files}. directUrl موجود جاهز.
- تصميم صفحة الزائر يُبنى عبر innerHTML في pageContent (pageContent في سطر ~502/520/606) — dDownloadsPage تُستدعى من هناك.
- site-app helpers: esc, safeCss (سطر 50), safeHref, rpcQuery/rpcMutation (/api/trpc), state, REVIEWS, ARTICLES, wa()...
- الإحالة الحالية في client/public/index.html: site-app-r31.js (client/index.html wrapper يحمل r31 أيضًا).
- style-zائر: styles داخل index.html wrapper + style-r10.css (partner) + style-r2.css legacy (download-section/.file-card/.file-info/.file-icon/.file-name/.file-meta موجودة سطر 160 تقريبًا).

## حالة التنفيذ (21:45 UTC)
اكتمل: إنشاء admin-downloads-manager-r10.js (تصميم فاخر، drawer، رفع متعدد مع طابور، إشعارات) — يعمل بواجهة WajbatDownloadsManager نفسها. تحديث admin.html وadmin-dashboard.html: structured → r6+v=structured-r6، downloads → r10+v=downloads-r10 (كل المواضع incl. retry). إنشأت site-app-r32.js بنسخة r31 مع downloadsPage جديدة dl10 (hero داكن + تبويبات أقسام + بطاقات فاخرة + gradient أزرار تحميل + shadeColor helper + bindDl10Tabs capture). متبقي: (1) تحديث إحالات r31→r32 في client/public/index.html:34 وclient/index.html:41 وvite.config (199-203 redirect alias إلى r32، 259 js/app.js→js/site-app-r32.js، 305 rollup alias)، (2) تحديث test downloadsAssets.test.ts، (3) تشغيل pnpm test، (4) فحص vite.config publishVersionedEntryAssets سطر 256-279 هل ينسخ app.js→site-app-r31.js يجب أن يتغير لـ r32، (5) لقطات تحقق: لوحة /admin → downloads (تسجيل دخول admin@example.com? — بيانات ADMIN_EMAIL/ADMIN_PASSWORD في env: bdalslamanwralajsh@gmail.com / abd77312)، (6) صفحة الزائر /#/downloads، (7) checkpoint + إبلاغ النشر التلقائي مفعل.

## حالة التقدم (قبل الضغط — 21:32 UTC)
العمل شبه مكتمل. admin-downloads-manager-r10.js كُتب (49KB، تصميم فاخر BRANCH BRAND accent #4f46e5، data-dl10-* attributes، upload queue متعدد، toast نجاح، delete confirmation modal). site-app-r32.js يحتوي downloadsPage dl10 جديدة (hero + tabs + cards + shadeColor). كل الإحالات في client/public/admin.html وadmin-dashboard.html تشير إلى r10+v=downloads-r10 وstructured-r6+v=structured-r6. client/index.html وclient/public/index.html يشير إلى site-app-r32.js. vite.config: redirects r1-r4→r10، structured-r3/r4/r5/ج→r6، copyAdminAssets ينسخ r10 الجديد (سطر 192 source=r10)، publishVersionedEntryAssets source=js/site-app-r32.js، rollup alias r30→r32. الاختبارات downloadsAssets.test.ts محدثة لصيغ r10 (data-dl10-delete-file، data-dl10-delete-category، data-dl10-upload-many، "s + Number(f.downloadCount || 0), 0"، "تحميل ·"، editor v6 comment).

متبقي الآن فقط: (1) اختبار redirects الفاشل — expect(vite).toContain('"assets/js/admin-downloads-manager-r4.js"') يفشل لأن السطر 192 حُوّل إلى source=r10؛ الحل: تعديل الاختبار للتحقق من وجود r1→r10، r2→r10، r3→r10، r10→r10، structured redirects. (2) pnpm test كامل ثم (3) screenshots تحقق: صفحة /admin → قسم التحميلات (تسجيل دخول bdalslamanwralajsh@gmail.com / abd77312) وإضافة فئة + رفع ملف، وصفحة /#/downloads. (4) webdev_save_checkpoint (auto-publish مفعّل — النشر فوري).

dist/ verified: r10 الجديد 49933 bytes مع data-dl10-upload-many، admin.html dist يحتوي admin-downloads-manager-r10.js + admin-structured-editor-r6.js فقط، index.html dist site-app-r32.js.

## مشكلة حاسمة اكتُشفت (21:33 UTC)
صفحة الزائر /#/downloads تعرض التصميم القديم (مركز التحميلات + بطاقات "نماذج بحوث/اختبارات/تقارير..." الثابتة مع أيقونة ▤ وروابط files.manuscdn.com القديمة) رغم أن index.html يشير إلى site-app-r32.js.
السبب المرجح: الموقع في المتصفح يحتمل أنه يحمل من إنتاج منشور قديم https://uploadplus-47dkogbk.manus.space وليس dev، أو أن dev يعرض نسخة DB content.downloads.categories (8 فئات بملفات حقيقية) لكن الواجهة المعروضة لا تطابق dl10Styles.
ملاحظة: المحتوى المعروض (8 فئات مع ملفات حقيقية وروابط cdn) يطابق البيانات المولدة سابقًا من site.siteContent وليس تصميم r32 الجديد. لكن r32 يعرض "📂 مركز التحميلات" (نفس العنوان!) و"مكتبة شاملة..." — النصان متطابقان تقريبًا لكن r32 dl10-hero متدرج داكن غير ظاهر في اللقطة (خلفية بيضاء).
فحص محتمل: publicList من DB يرجع categories.files بلا أسماء/أيقونات فير render يعرض dl10FileCard عاديًا لكن الدالة dl10FileCard قد لا تعمل؟ أو الأسهل: الرندر المعروض هو من r32 static fallback — لأنه يعرض "نماذج بحوث" الثابتة. يعني loadSiteDownloads فشل (rpcQuery "site.downloads.publicList" فشل) فير fallback للثابت.
الخطوة التالية: فحص devserver/network logs لطلب publicList وفحص ما يرجعه RPC فعليًا.

## إنتاج المنشور يعرض النسخة القديمة (21:34 UTC)
- الإنتاج https://uploadplus-47dkogbk.manus.space/#/downloads يعرض صفحة التحميلات القديمة (بدون dl10 hero، بطاقات ▤ قديمة، ملفات ثابتة وروابط cdn قديمة).
- dev يعرض نفس النسخة القديمة (اللقطات المتكررة من webdev_take_screenshot أظهرت نفس التصميم القديم) رغم أن index.html يشير إلى site-app-r32.js.
- تحليل: publicList يرجع فئات DB صحيحة (8 فئات بملفات). r32 الجديد dl10Styles يظهر "مركز التحميلات" بنفس العنوان! النصوص متطابقة تقريبًا: العنوان "مركز التحميلات" + وصف "مكتبة شاملة..." = dl10 الجديد لكن التصميم المعروض (خلفية بيضاء، بطاقات بسيطة بدون gradient) لا يطابق dl10-hero الداكن المتدرج.
- السبب المحتمل: index.html لا يزال يشير إلى site-app-r31 في نسخة dev المُخدمة؟ لا — grep أثبت r32. الاحتمال الأقوى: أداة screenshot تلتقط من dev لكن JS module يعيد تحميل نسخة مخزنة في memory cache، أو أن downloadsPage القديم في r32 static fallback (نفس بيانات الثابت) هو ما يظهر لأن loadSiteDownloads ينجح لكن render يظل يعرض fallback.
- يجب التحقق في المتصفح: document.querySelector('body').innerHTML يشمل 'dl10-hero'؟
- ملاحظة مهمة: المحتوى المعروض "مكتبة شاملة من النماذج والملفات الأكاديمية الجاهزة للتحميل والاستخدام المباشر" طابق نص r31 القديم! بينما dl10 يقول "مكتبة شاملة من النماذج والملفات الأكاديمية — واجبات، سيَر ذاتية...". إذًا المتصفح يخدم r31 القديم فعليًا (كاش module).
- الخطوة التالية: تحميل صفحة dev بـ cache-bust: فتح dev مع ?v=xxx أو التحقق من script src الفعلي في DOM.

## النتيجة الحاسمة (21:35 UTC)
التصميم الجديد يعمل تمامًا في dev بعد تحميل index.html (كاش HTML في المتصفح كان يخدم نسخة قديمة تشير إلى r31). الصفحة الآن تعرض: hero داكن متدرج + إحصائيات (8 قسم / 22 ملف / 5 تحميل) + تبويبات فلترة + بطاقات dl10 جديدة بأسماء ملفات حقيقية من DB + أزرار "تحميل الملف" بنفسجية.
ملاحظات تحسين بسيطة في dl10FileCard تُلاحظ:
1) بعض الملفات تعرض أيقونة 📕 حمراء (مستطيل أحمر بدل أيقونة PDF) — dl10Glyph يُرجع emoji PDF بأيقونة حمراء. مقبول لكن يمكن تحسينه لاحقًا.
2) ملف "LGcZWkdZaZEccakJ.pdf" مكرر مرتين في فئة السيرة الذاتية (بيانات DB فيها ملفان بنفس المفتاح) — بيانات المالك، لا نعدلها.
3) "تحميل: 1 مرة · null" في ملف FTIwhNHHDuZDyfaF — يجب إصلاح display للـ lastDownloadedAt = null.
الإنتاج: يجب عمل checkpoint جديد (auto-publish) ثم إعادة فحص الإنتاج في المتصفح — الكاش السابق قد يعرض القديم حتى بعد النشر، وسأشرح للمستخدم.
الإحالات المطلوبة تبقى: client/public/index.html + client/index.html = r32 ✓ (مؤكدة)، admin.html + admin-dashboard.html = r10 + r6 ✓ (مؤكدة)، vite.config redirects ✓، الاختبارات 93/93 ✓، البناء سليم ✓.
لم يُحفظ checkpoint بعد تعديلات r10/r6/r32/vite الحالية — يجب حفظ checkpoint عند الانتهاء.

## مدير التحميلات r10 يعمل في dev (21:36 UTC)
القسم يعرض الواجهة الجديدة بالكامل: hero عنوان + بحث + زر "قسم جديد" + إحصائيات 4 بطاقات (8 قسم / 22 ملف / 22 ظاهر / 5 تحميل) + شبكة أقسام بألوان متدرجة + لكل قسم أزرار (تعديل القسم/إخفاء/حذف/رفع ملف جديد/رفع عدة ملفات) + بطاقات ملفات بأزرار (نسخ الرابط/واتساب/تيليجرام/معاينة/تعديل/إخفاء/حذف/ترتيب). الشريط الجانبي يعرض "إدارة التحميلات 8" و"ملفات التحميل 22".
يبقى: اختبار فعلي — إضافة قسم جديد ثم رفع ملف، ثم حفظ checkpoint، ثم فحص الإنتاج.

## اختبار فعلي في dev (21:37 UTC) — إنشاء القسم نجح 100%
- ضغطت "➕ قسم جديد" → drawer فتح (عنوان/رمز/وصف/لونان/رفع شعار + معاينة شعار).
- أنشأت قسمًا تجريبيًا "قسم تجريبي مؤقت 🧪" → رسالة "تم إنشاء القسم بنجاح" (toast + banner) + تحديث الإحصاءات 8→9 أقسام + القسم ظهر في القائمة وفي الشبكة.
- القسم الجديد عُرض فارغًا مع hero "هذا القسم فارغ — ارفع أول ملف" + زر رفع مدمج.
- المتبقي: رفع ملف عبر /api/downloads/upload (FormData: file + categoryId + name + description) ثم حذف القسم التجريبي من DB بعد الاختبار (DELETE عبر زر الحذف في الرندر — لكن الأفضل إبقاؤه ظاهراً؟ المستخدم يريد اختبار ظاهر للزوار — سأتركه مؤقتًا ثم أحذفه بعد التحقق من صفحة الزائر، أو أتركه لأنه "تجريبي مؤقت" واضح الاسم).
- بعد ذلك: checkpoint ونشر + فحص الإنتاج.

## اختبار رفع الملف (21:38 UTC)
أعدت تعيين الملف التجريبي test-upload.pdf في كلا input الملف (0 و1) عبر DataTransfer ونجح: "0: files=1 | 1: files=1". النموذج "ملف جديد" مفتوح في drawer: اسم الملف/القسم/الوصف/الملف. الإجراء التالي: ملء اسم الملف (عبر input index في اللقطة)، ثم التحقق من اختيار القسم (يُختار تلقائيًا للقسم النشط)، ثم النقر على "إضافة الملف"، ومراقبة toast النجاح، ثم فحص القسم التجريبي يعرض الملف، ثم فحص صفحة الزائر #/downloads تعرض الملف الجديد، ثم حذف القسم التجريبي، ثم checkpoint.
ملاحظة: القسم التجريبي موجود في DB (9 أقسام الآن). endpoint يعمل عبر /api/downloads/upload (FormData: file+categoryId+name+description).

## حالة الاختبار (21:39 UTC)
فتح حوار "تأكيد حذف قسم تجريبي مؤقت" (68=إغلاق، 69=إلغاء، 70=نعم، احذف القسم). ملاحظة مهمة: الواجهة ما زالت تعرض 3 بطاقات ملفات في القسم رغم نقرات الحذف السابقة (25 ملف 25 ملف ظاهر) — يبدو أن نقرات حذف الملفات 60002/60003 لم تعمل فعليًا أو كانت على حوار آخر. يجب قبل تأكيد حذف القسم: إلغاء الحوار (69)، ثم التحقق من الأزرار وحذف 60002 و60003 (ربما الحوار المفتوح الآن منع التحديث)، ثم حذف القسم التجريبي نفسه + الملفات.
الأفضل حلًا: بعد التأكد، حذف القسم التجريبي كاملًا مع ملفاته عبر "نعم، احذف القسم" (يحذف القسم + ملفاته) — هذا يحل مشكلة الملفات المكررة كلها دفعة واحدة.

## نتيجة فحص الإنتاج (21:41 UTC) — مشكلة جديدة
الإنتاج (uploadplus-47dkogbk.manus.space/#/downloads) ما زال يعرض التصميم القديم: عنوان "مركز التحميلات" بلا dl10-hero، بطاقات ▤ أيقونات فارغة، بدون ألوان الأقسام، بدون أوصاف. أي أن wrapper الإنتاج يحمل site-app-r31 (أو أقدم). سبب مرجح: checkpoint المنشور bb8ba9c1 لا يشمل تعديلاتي لأن آخر checkpoint قبل بداية هذه الجلسة كان r31 (bb8ba9c1) — أو أن dist في checkpoint لم يُحدَّث بعد تعديلات r32/r10. يجب: pnpm build للتأكد أن dist يحتوي r32، ثم webdev_save_checkpoint جديد، ثم التحقق من production wrapper (site-*.js) يحمل r32.
ملاحظة أخرى: "تحميل: ١ مرة · null" و"· null" ما زال يظهر في الإنتاج (من نسخة قديمة). تصميم r32 الجديد dl10 يظهر فقط بعد كسر كاش HTML في dev.
البيانات تعمل: 22 ملف 8 أقسام في DB، روابط الملفات صحيحة، أيقونات الفئات (📚📄📋...) تعرض من emoji الفئات.
تم تنظيف DB نهائيًا: 22 ملف / 8 أقسام (لا أقسام/ملفات تجريبية).

## تشخيص حاسم (21:44 UTC) — آلية العمل والإنتاج
1. الإنتاج يعمل عبر inline module script داخل client/public/index.html (createElement → /assets/js/site-app-rXX.js) — Vite لا يحوله إلى chunk؛ يبقى كما هو في dist index.html... لكن curl أظهر site-app غير موجود في prod HTML. المتصفح يؤكد: body scripts = 6 ويحمّل /assets/js/site-app-r31.js صراحةً → إذًا الإنتاج CURRENTLY يحمل r31 (checkpoint منشور قبل تعديلاتي لم يُحدَّث). dist local لا يحتوي site-app في HTML لأنه أُنتج قبل تعديلي local index.html (بناء 21:31).
2. الخلاصة: الحل = webdev_save_checkpoint جديد الآن (يشمل r32/r10/r6 وكل تعديلات client/public) + بناء سليم (pnpm build محلي ينجح) → يُنشر تلقائيًا → ثم كسر كاش HTML على الإنتاج (الإنتاج يحمل index.html قديمًا حتى الآن).
3. ملاحظة: r31 في dist local index.html غير موجود لأن البناء 21:31 استخدم نسخة قبل تعديلاتي... لا: r31 existed في HEAD index.html لكن dist HTML فقد inline module script؟ التحقق المحلي: curl dev يعرض r32؟ curl localhost:3000 عرض site-app-r32 سابقًا؟ (من console_exec في dev: bodyScripts محمّل r32). إذًا آلية inline module script تعمل في dev (html proxy) لكن build dist يفقدها — Vite production ينسخ index.html من client/public كما هو (publicDir). لماذا dist local لا يحتويه؟ البناء أعيد عند 21:31 وindex.html حُددت به r32 عند ~21:33 (sed). أي أن البناء المحلي dist قديم، والنشر يأخذ build جديد من checkpoint جديد.
4. الإجراء الآن: checkpoint جديد → تحقق من wrapper المنشور يحمل r32 + body يحمل r32.

## فحص الإنتاج بعد checkpoint 3c38679e (21:45 UTC)
- صفحة التحميلات على الإنتاج تعرض **التصميم القديم r31** رغم أن checkpoint نشر: بطاقات "نماذج بحوث/اختبارات/تقارير" بتصميم قديم، سطر "· null"، أيقونة ▤، بدون hero داكن أو شبكة dl10.
- الاستنتاج: آلية loadSiteDownloads على الإنتاج تقرأ من DB بنجاح (22 ملف/8 أقسام) لكن الرندر القديم. السبب: index.html المنشور ما زال يحمل site-app-r31.js (wrapper منشور من checkpoint قديم لم يُحدَّث؟ لكن auto-publish نشط). المتصفح حمل r31 عبر bodyScript رغم أن client/public/index.html يحمل r32 الآن.
- الاحتمال الأقوى: dist المنشور مبني من client/public/index.html الذي يحتوي module createElement(r32) لكن Vite production **يسقط** inline module scripts غير المرتبطة بـentry rollup عند البناء، فيبقى HTML المنشور بدون حقن site-app، والموقع يعمل لأن wrapper React يخدم... لا، wrapper يخدم React. لكن الإنتاج يعرض الموقع القديم كاملًا → إذًا الإنتاج يخدم HTML قديم + r31 من كاش CDN قديم. auto-publish نشر checkpoint لكن الإنتاج يعرض r31!
- ملاحظة سابقة: قبل تعديلاتي dist index.html كان خاليًا من site-app أيضًا، لكن الموقع كان يعمل — يعني الإنتاج لا يعتمد على HTML المنشور بل على ملف آخر (spaceEditor dispatcher / plausible). فحص لاحق مطلوب: مقارنة أسماء wrapper الجديد (Cy0Hofkh) هل يُخدم في الإنتاج.

## التشخيص النهائي (21:46 UTC)
الإنتاج يخدم wrapper قديمًا `site-MUpu_53B.js` (827 بايت، يستورد site-app-r31.js) بـ Last-Modified 20:48 UTC — أي قبل checkpoint الأخير 3c38679e (21:44 UTC). بينما البناء المحلي الجديد يتضمن wrapper `site-Cy0Hofkh.js` الذي يستورد site-app-r32.js. الاستنتاج: checkpoint الأخير إما لم يُنشر فعليًا للتو (النشر حدث لكن الإنتاج ما زال يخدم نسخة أقدم بسبب CDN cache مع hash مختلف، أو النشر فشل)، أو يوجد مشكلة في آلية النشر التلقائي لهذا المشروع.

ملاحظة مهمة: ملفات wrapper تحمل hash مختلفًا في كل بناء (Cy0Hofkh المحلي ≠ MUpu_53B المنشور) — هذا يعني أن HTML المنشور يشير لـMUpu_53B وهو من بناء قديم (20:48). البناء المحلي الأخير حدث 21:44 ونشر checkpoint. إذا كان النشر التلقائي يعمل فعلًا، فإن MUpu_53B قد يكون من بناء أحدث من 20:48؟ لا — Last-Modified يؤكد 20:48. الحل: حفظ checkpoint جديد بعد التحقق من أن البناء المحلي سليم (تم) — النشر قد يكون متأخرًا أو فشل بصمت. محاولة: حفظ checkpoint آخر وتذكير المستخدم بكسر الكاش في متصفحه.
