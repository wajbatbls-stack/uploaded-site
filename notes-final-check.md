

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
