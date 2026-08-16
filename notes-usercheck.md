# فحص حي 01:46 UTC على https://uploadplus-47dkogbk.manus.space/admin
- المتصفح (Sandbox browser، جلسة جديدة نظيفة): صفحة /admin فُتحت مباشرة إلى لوحة المالك (بدون شاشة "جاري التحقق من صلاحية الوصول" إلا لحظية) — الجلسة مسجلة في هذا المتصفح مسبقًا (الكوكيز محفوظة من فحوصات سابقة في هذه البيئة).
- لوحة المالك تعمل: إحصاءات حقيقية (زوار 1155، تحميلات 22، شركاء 33، مدونة 9 مقالات)، آخر النشاطات تظهر حتى 01:28.
- ملاحظة: لوحة المالك المعروضة هنا هي تصميم "لوحة المالك" الجديد (بطاقات ملونة + sidebar أزرق) وليست التصميم القديم.
- لقطة محفوظة: /home/ubuntu/screenshots/uploadplus-47dkogbk__2026-08-16_01-45-44_1940.webp
- المتبقي: فتح "📥 إدارة التحميلات" و"🏛️ شركاء النجاح" والتقاط لقطات للتأكد من ظهور r16 الفخم، ثم تسليم لقطة للمستخدم كدليل.
- الخلاصة المتوقعة: على الأجهزة النظيفة (مثل sandbox) النسخ الجديدة تظهر؛ المشكلة عند المستخدم هي كاش SW/JS على أجهزته (90 يومًا) + SW قديم. v18+purgex يمسحها مرة واحدة. لكن المستخدم يقول المشكلة مستمرة رغم ذلك — فحص إضافي: هل هناك SW قديم آخر غير sw-forced.js مسجل؟ فحص client/index.html وadmin.html: هل التسجيل يشترط !sessionStorage.__sw18 فقط بعد تثبيت SW ناجح؟ هل على الهاتف (WebView داخل تطبيق Manus؟) الـSW لا يعمل أصلًا (WebViews القديمة لا تدعم service workers) → على هاتف المستخدم قد لا تعمل آلية التنظيف أصلًا!
- حل مقترح حاسم: لا يعتمد على SW إطلاقًا في HTML — حقن script في أعلى admin.html/index.html يقوم فورًا بحذف كل caches القديمة (caches.keys + delete + unregister all SW) بلا أي شرط sessionStorage ثم يضيف localStorage flag. يعمل في معظم الهواتف (Service Worker API مدعوم في Chrome Android منذ 2014 — WebViews القديمة قد لا تدعمه لكن حينها الـSW القديم غير موجود أصلًا فلا كاش SW).
- أيضاً: إضافة cache-buster query جديد على ملفات JS في HTML: ?r=18 أو إعادة تسمية؟ r16 كافية + html no-cache. الأهم: SW قديم على جهاز المستخدم يخدم الصفحة حتى مع no-cache لأنه يخزن الاستجابة في cache API. التنظيف يجب أن يعمل من أول زيارة.

## تشخيص الجذر (01:48 UTC)
الكود المنشور سليم 100% على الإنتاج: HTML بلا كاش (no-cache)، r16+r30+v18 مطابقة md5. المشكلة عند المستخدم = SW قديم مسجل على جهازه يخدم كل شيء من cache API حتى لو HTML نفسه no-cache (SW يلتقط الطلب قبل الشبكة). آلية v18 الحالية تفشل على جهازه لسببين محتملين: (أ) SW قديم لا يلتقط رسالة sw-kill-me قبل تفعيله؟ (ب) الأهم: تسجيل v18 مشروط بـ !sessionStorage.__sw18 — مرة واحدة لكل جلسة — لكن إذا فشل register نفسه (شبكة ضعيفة/WebView) لا يحدث شيء. (ج) في iPhone Safari أحيانًا SW قديم لا يُفعل skipWaiting للـregister الجديد فيبقى controller القديم.
الحل الحاسم الجديد (لا يعتمد على register/activate/controllerevents إطلاقًا):
1. سكربت inline في أعلى <body> في admin.html + index.html (client/public) + client/index.html: يحذف caches.keys/delete + navigator.serviceWorker.getRegistrations().then(unregister لكل واحد) مباشرة وبشكل متزامن قدر الإمكان — بلا شرط sessionStorage وبلا register. يعمل فقط على الصفحات الحقيقية.
2. SW جديد sw-purgex-v19.js بمسار جديد كليًا (sw-forced.js نفسه قديم على جهازه!) — skipWaiting + onactivate يمسح كل الكاشات + يستمع لرسالة sw-kill-me. نسجله من الـinline script بعد التنظيف مع اسم مسار مختلف ?u=v19.
3. إلغاء شاشة «جارٍ التحقق…» الفورية؟ لا يمكن حذفها بسهولة — تبقى 500ms فقط. acceptable.
4. في admin.html: كتلتا v17 وv18 المكررتان تُستبدلان بسكربت واحد v19 inline + التسجيل.
5. إضافة localStorage.__wp_purge=1 عند التنفيذ فيكتفي التنفيذ لكل جلسة (وليس كل تبويب).
التحقق من المسارات على prod: /assets/js/admin-downloads-manager-r16.js و/admin-partners-manager-r16.js و/admin-app-r30.js و/sw-forced.js كلها 200 مع محتوى صحيح (md5 مطابق).

## تشخيص حاسم 02:00 UTC
كل محتوى prod مطابق للمصدر محليًا md5 (admin-app-r30, dl-r16, pm-r16, site-r32) — أي أن الموقع المنشور سليم 100%. prod admin.html لا يزال يحمل v17/v18 فقط (لا v19 بعد، checkpoint لم يُحفظ).
نقطة التحول: إذا كان prod مطابقًا تمامًا للمصدر، والمستخدم على 5 أجهزة يرى تصميمًا قديمًا، فهذا يعني على الأرجح أن المستخدم يفتتح رابطًا مختلفًا أو أن هناك صفحة SPA تخدم مسارًا قديمًا. لكن الأرجح: prod يعيد HTML بـ no-cache لكن JS الكاش له max-age=90d. ومع ذلك dl-r16 غير موجود أصلًا في كاش أي جهاز (اسم جديد) — إلا إذا: **JS الكاش يخدم spa fallback للطلبات غير الموجودة؟** لا — md5 على prod مطابق! r16 يعمل على prod!
الاستنتاج الوحيد المنطقي المتبقي: المستخدم يفتح صفحة admin-old أو أن متصفحاته تخدم sw-forced.js v15 القديم (max-age 4h) الذي يخدم كل شيء من كاش v15 القديم (cache API يحتوي أسماء قديمة r10-r14). SW قديم controller لا يستقبل kill-me لأنه لم يفعّل بعد أو أن register v18 يفشل على WebView.
-> الحل v19 inline يقطع الطريق: يمسح caches/registrations من الصفحة نفسها بلا أي اعتماد على SW. + تغيير الدومين يقضي نهائيًا على أي cached SW/controller القديم لأن النطاق الجديد لا يحتوي أي SW أصلًا!
خطوات: 1) إضافة sw-purgex-v19.js للنسخ في vite.config 2) checkpoint ونشر 3) تغيير prefix الدومين من إعدادات الموقع (uploadplus-47dkogbk → اسم جديد) أو شراء/توليد نطاق جديد.

# 2026-08-16: مشكلة حرجة في البناء — أسطر نسخ تعيد الكتابة فوق r16/r32
- بعد rollback إلى 3667e982 (استعادة الرابط السابق uploadplus-47dkogbk.manus.space الذي يعمل)، البناء dist يعيد نسخ نسخ قديمة فوق الجديدة في vite.config.ts:
  - سطر 190: r14 → admin-downloads-manager-r16.js (يكتب فوق محتوى r16 الحقيقي في dist)
  - سطر 214: r14 → admin-partners-manager-r16.js (نفس المشكلة)
  - سطور 204-208: r14/r17/r18/r19/r30 → site-app-r32.js (الآخر فائز r30 — الأحدث، لكن هذا تعقيد غير ضروري)
- الحل: حذف أسطر النسخ المكررة (190، 214، 204-207) — المصادر الحقيقية موجودة: client/public/assets/js/admin-downloads-manager-r16.js + partners-r16 + site-app-r32.js
- اختبار server/r15UploadUI.test.ts:33 يفحص src !== dist → فشل بسبب السطر 190
- إصلاح الرفع المطبق سابقًا في client/public/assets/js/admin-downloads-manager-r16.js (git diff موجود وغير ملتزم): اسم الموديل = اسم الملف عند إدخال واحد + منع إغلاق النافذة عند فشل الرفع + عرض القسم المختار
- md5 المصدر r16 بعد إصلاح الرفع: efae9de7bb44554de35452ba9396ac81 (قبل الإصلاح كان r16 أصلي 680e7967)
- prod حالي: الرابط السابق 200 (رُبط بعد rollback). الدومين الجديد wajplus.manus.space بقي غير مربوط.
- طلب المستخدم التالي: إعادة تصميم قسم الخدمات (أقوى/أكثر احترافية وجاذبية) مع الحفاظ على المحتوى + إكمال اختبار رفع الملفات ثم التسليم.

# 2026-08-16: حالة بعد نشر efdcc3bd
- checkpoint efdcc3bd نُشر: إصلاح بناء vite.config (حذف أسطر نسخ مكررة تعيد الكتابة فوق r16/r32) + إصلاح حفظ نموذج التحميلات في admin-downloads-manager-r16.js.
- اختبارات 98/98. بناء dist: md5 r16=efae9de7, partners16=b975bb9c, site-app-r32=57d8bd35 (كلها مطابقة للمصدر).
- الرابط السابق يعمل: https://uploadplus-47dkogbk.manus.space (لقطة المستخدم تؤكد الصفحة الرئيسية سليمة: الساعة، الشعار، الأزرار).
- الدومين الجديد wajplus.manus.space تركناه (غير مربوط، المستخدم طلب العودة للرابط السابق).
- المهمة الحالية: إعادة تصميم قسم الخدمات (#/services) بتصميم أقوى وأكثر احترافية وجاذبية مع الحفاظ على كامل المحتوى والخدمات.
- قسم الخدمات يُخدم من client/public/assets/js/site-app-r32.js (دالة servicesPage) مع style-r9.css على الأرجح. يجب فحص: كيف تُعرض الخدمات (بطاقات، أيقونات)، الألوان الحالية، ثم إعادة تصميم CSS/HTML داخل JS مع نفس البيانات من API (tRPC أو endpoints الخدمات).
- تحذير مهم: المستخدم منع سابقًا تغيير المحتوى/حذف خدمات — يجب تغيير التصميم فقط مع الحفاظ على المحتوى والأرقام والروابط كما هي.
- بعد التصميم: اختبار على سطح المكتب + الهاتف، نشر checkpoint، التحقق الحي، وتسليم لقطات.

## خطة إعادة تصميم قسم الخدمات (sv20) — 2026-08-16
المستخدم: "التصميم السابق غير مناسب — أريد تصميم أقوى وأفضل واحترافي وجذاب ومثير".
المحتوى يجب أن يبقى كما هو (لا حذف أي خدمة/قسم) — فقط التصميم.

### الحالة الفعلية للقسم
- دالة `servicesPage()` في `client/public/assets/js/site-app-r32.js` (تبدأ سطر 445، ~630KB minified)
- تبني قسمين: شبكة الأقسام (`.services-page-managed` + `.service-managed-grid` + بطاقات `.service-card` + أزرار `button.service-card`) وصفحة التفاصيل (`.services-detail-managed` + `.service-item` + زر `.service-order-button`)
- الأنماط يولّدها المالك من لوحة الإدارة (servicesStyle متغيرات --service-*: أعمدة/فجوات/إطار/خلفية/templates/sub-templates/animations) + `assets/css/services-manager-r2.css` (~3KB)
- القرار: لا يمكن إعادة بناء الملف بالكامل بسهولة (630KB) — سننشئ نسخة جديدة site-app-r33.js (نفس منهجية r-versions): نسخ r32 ثم تعديل دالة servicesPage + CSS داخلها. تحديث vite.config redirect ليوجه كل site-app-r* إلى r33.
- لا تغيير في بيانات SERVICES ولا API — فقط HTML/CSS الناتج.

## تقدم sv20 (حالة لحظية قبل ضغط السياق)
- ر33 أُنشئت: client/public/assets/js/site-app-r33.js (نسخة غير ملتزمة من r32، لم يُعدَّل محتواها بعد)
- المطلوب: تعديل دالة servicesPage داخل r33 بتصميم جديد (بطاقات فاخرة: تدرج، ظلال، أيقونات، hover) مع بقاء الأقسام والبيانات كما هي
- ثم: تحديث الإحالات من r32 إلى r33:
  - client/public/index.html سطر 55: appModule.src = "/assets/js/site-app-r32.js" → r33
  - client/index.html سطر 62: src="/assets/js/site-app-r32.js" → r33
  - vite.config.ts سطر 203 (redirect source site-app-r32.js→r32) → r33 + سطر 249 → r33 + سطر 295 (site-app-r30→r32) → r33
- بعدها: pnpm test (98/98 متوقع) + build + md5 تحقق + checkpoint + نشر (auto-publish) + تحقق حي prod
- اختبار servicesStyle: المستخدم أنشأ أنماط من لوحة الإدارة (servicesStyle متغيرات --service-*) — يجب دمج هذه المتغيرات مع التصميم الجديد أو الإبقاء عليها. الأفضل: الحفاظ على المتغيرات في الدالة الجديدة (نقلها من r32)
- CSS إضافي services-manager-r2.css موجود ~3KB — يمكن الإبقاء عليه
- ملاحظة مهمة: site-app-r32.js حجمه 630KB minified — تعديل servicesPage يدويًا عبر استبدال الدالة في الملف المنسوخ r33

## sv20 حالة 13:15 UTC (بعد ضغط سياق)
- دالة servicesPage الجديدة (تصميم svc24 الفاخر) مكتوبة في site-app-r33.js سطر 445 بنجاح.
- دالة svc24Styles() مضافة نهاية الملف سطر 1141 (CSS كامل داخل template literal).
- الشبكة: `${svc24Css}<div class="svc24-wrap"` (سطر 457: const svc24Css = svc24Styles(); سطر 474: return `${svc24Css}...`)
- التفاصيل: سطر 508: return `${svc24Styles()}<div class="svc24-detail">`
- node --check: صيغة سليمة. events handlers القديمة (select-service سطر 1056، back-services سطر 1057) تعمل على data-action نفسها.
- اختبار Node كان يفشل بسبب عمق الأقواس في depthScan (يتوقف مبكرًا عند 6434 بايت) — الدالة الحقيقية تنتهي عند سطر 1140 قبل function svc24Styles. يجب اقتطاع fnSrc عند content.indexOf('function svc24Styles()') - 1.
- الباقي: اختبار نهائي متكامل (ESM من /tmp/content.js) → تحديث index.html + client/index.html + vite.config.ts من r32 إلى r33 (index.html سطر 55: appModule.src="/assets/js/site-app-r32.js"، client/index.html سطر 62، vite.config سطر 203/249/295) → pnpm test → build → md5 r33 مقابل المصدر → checkpoint (auto-publish) → تحقق حي prod → تحديث todo.md.
- md5 المصدر الحالي: (لم يُحسب بعد)

## sv20 حالة 13:20 UTC — الاختبارات مكتملة ✓
- تصميم svc24 الجديد مكتمل ومختبر بـ Node+jsdom: شبكة الأقسام (15 بطاقة، 15 زر select-service، hero بإحصائيات) + صفحة تفاصيل لكل قسم (جميع العناوين الفرعية + back-services + wa.me 966542699518).
- ملاحظة مهمة: بيانات SERVICES[0].items = strings وليست كائنات؛ الدالة الجديدة تستخدم item.title مع fallback `item.title || item` فيتحول تلقائيًا للاسم الصحيح (مطابقة للتطبيق الحقيقي حيث handler يعيد قراءة البيانات الأصلية).
- اختبارات محلية نجحت: `node /tmp/test_svc24.mjs` → ALL TESTS PASSED.
- قاعدة JS سليمة (node --check OK)، طول الملف 110659 بايت.
- المتبقي: تحديث index.html (public سطر ~55) + client/index.html (سطر ~62) + vite.config.ts (سطور 203/249/295) من r32 إلى r33، ثم pnpm test ثم pnpm build، والتحقق من md5 الملف r33 داخل dist مقابل المصدر. إذا اختبر ownerLoginR13Assets.test.ts وجود r33 يجب تحديثه أيضًا.
- بعدها: checkpoint (auto-publish) + تحقق حي https://uploadplus-47dkogbk.manus.space/#/services + تحديث todo.md.

## sv20 حالة 13:18 UTC — لقطة المعاينة المحلية ✓
التصميم الجديد يظهر في المعاينة (/#/services): خلفية متدرجة كحلية فاخرة، Hero بعنوان "خدماتنا الأكاديمية" + إحصائيات (15 قسم · 75 خدمة فرعية)، بطاقات زجاجية بأيقونات متوهجة، badges بعدد الخدمات، أسهم hover. التصميم يعرض من الرتبة الثانية (الصف الأول يظهر مقطوعًا قليلاً في لقطة العرض فقط، وهذا من أصل التصميم). بقي: حفظ نقطة التفتيش (auto-publish) ثم تحقق حي على https://uploadplus-47dkogbk.manus.space/#/services.

## sv21 (2026-08-16 13:25 UTC) — طلب جديد: إعادة تصميم لوحة إدارة التحميلات (رفع نماذج)
الطلب: "قم بتحديث وتصميم بشكل أقوى واحترافي وجذاب وقوي لرفع ملفات نماذج في لوحة الإدارة"

### حالة sv20 (منجزة ومنشورة):
- تصميم قسم الخدمات الجديد (svc24) في site-app-r33.js منشور على الإنتاج: https://uploadplus-47dkogbk.manus.space/#/services يعمل، md5 متطابق (e1d7bd1b31d9f961942d8366357629f5)، checkpoint 71d3bc3b.
- index.html يستهلك الآن عبر React entry (assets/site-*.js يحمل site-app-r33.js inline)، purgex v19 يعمل على الإنتاج.
- رابط الإدارة: https://uploadplus-47dkogbk.manus.space/admin

### خطة sv21:
- الملف الحالي: client/public/assets/js/admin-downloads-manager-r16.js (1040 سطر، يبدأ بإIFE يحتوي BRAND/state/esc/admin/toast/fmtDate/fmtSize/fileGlyph/apiError/request/list/filesOf/byOrder/visibleCats/totalStats/saveCategory/removeCategory/toggleCategoryVisibility/moveCategory/saveFile/removeFile/toggleFileVisibility/moveFile/copyFileUrl/shareFile...).
- الإحالات إلى r16 في: client/public/admin.html (سطور 112/163/241)، client/public/admin-dashboard.html (46/96/173)، vite.config.ts (سطر 189).
- المنهجية المتبعة سابقًا (r15/r16): إنشاء نسخة جديدة admin-downloads-manager-r17.js بنمط dl10/dfa17 فاخر، ثم sed للإحالات، pnpm test + build، md5 match، checkpoint (auto-publish).
- ملاحظة: المستخدم يكرر طلب تصميم أقوى — سنعيد تصميم النموذج كاملًا (drawer جديد dfa17): header متدرج فاخر، رفع ملفات بتجربة drag & drop، معاينة ضخمة، شريط تقدم، رسائل تأكيد، وجعل زر الإضافة واضحًا دائمًا (شكوى سابقة: زر إضافة يختفي/النافذة تغمق).

## sv21 تفاصيل تقنية (مرحلة 2):
- قرأت r16 بالكامل (1040 سطر): السطور 1-246 منطق سليم (BRAND/state/esc/admin/toast/fmtDate/fmtSize/fileGlyph/apiError/request/list/saveCategory/removeCategory/saveFile/createWithUploads/replaceFile/uploadFileWithProgress/uploadFileLegacy/showNotice/closeOverlays/overlay/categoryDrawer).
- السطور 266-622: drawers (overlay/ categoryDrawer / fileDrawer بتدرج dl15).
- السطور 624-834: render + bindEvents + activate + window.WajbatDownloadsManager.
- السطور 844-1040: CSS (dl10 + dl15).
- العقد الخلفية (server/downloads.ts + server/_core/index.ts): /api/trpc/admin.downloads.{list,createFile,updateFile,replaceFile,trackDownload} و/api/downloads/upload يعيد {success,mediaId,fileName,originalName,fileUrl,fileKey,mimeType,sizeBytes}. لا تغيير في الخلفية.
- الاختبارات المتأثرة بـ r16→r17: server/downloadsAssets.test.ts (يعتمد admin-downloads-manager-r16.js + downloads-r16)، server/r15UploadUI.test.ts (يدقق dl15 tokens في الملفين المصدر وdist) — يجب تحديثها لـ r17/dfa17.
- الإحالات r16: admin.html (112/163/241), admin-dashboard.html (46/96/173), vite.config.ts (189).

### خطة تنفيذ r17 (في build_r17.py):
1. نسخ r16 → r17.
2. إضافة BRAND فاخر جديد (كحلي #0c1e3f + بنفسجي) + CSS dfa17 جديد كامل في نهاية الملف قبل السكربت الختامي (أو بعد CSS dl15) مع استبدال class prefix dl15→dfa17 في fileDrawer فقط.
3. الدوال الحرجة يجب ألا تتغير توقيعاتها: fileDrawer(file, categoryId), overlay, showNotice, list, saveFile, createWithUploads, uploadFileWithProgress, fileGlyph, fmtSize, esc, request, admin, toast, BRAND.
4. التحسينات المطلوبة من المستخدم: زر «إضافة النموذج» بارز دائم (يظهر قبل اختيار ملف مع حالة معطلة واضحة)، نافذة لا تغمق/تختفي، رسالة «تم رفع الشعار/النموذج» واضحة، رفع فعلي بشريط تقدم يبقى كما هو، استبدال CSS الداعم بالكامل.

## sv21 تقدم (بعد البناء):
r17 جاهز: client/public/assets/js/admin-downloads-manager-r17.js بنى بتصميم dfa17 فاخر (header متدرج كحلي-بنفسجي + orbs متحركة + dropzone أنيق + بطاقات ملفات بشريط تقدم + استبدال ملف + زر إضافة دائم معطل حتى اختيار ملف وقسم + brand new accent #3d32c8/#7c3aed). md5: 7cc36e5ee0e4383351c02cc849f5a699 متطابق بين dist والمصدر. الاختبارات 98/98 كلها تمر. الإحالات: admin.html/admin-dashboard.html/vite.config.ts والاختبارات كلها على r17.
المتبقي: حفظ نقطة تفتيش + نشر + تحقق حي من /admin downloads على الدومين الأصلي uploadplus-47dkogbk.manus.space.

## sv21 - المتبقي: اختبار رفع فعلي على الإنتاج ثم حذف بيانات الاختبار
- r17 منشور حيًا على الدومين الأصلي بمطابقة md5 كاملة (7cc36e5ee0e4383351c02cc849f5a699)، admin.html الحي يشير لـ r17، الاختبارات 98/98، checkpoint b13ebfaf محفوظ ومنشور.
- سكربت الاختبار: /tmp/test_upload_r17.mjs (تسجيل دخول عبر /api/trpc/auth.login بـ email bdalslamanwralajsh@gmail.com / password abd77312، رفع multipart إلى /api/downloads/upload، إنشاء عبر /api/trpc/admin.downloads.createFile، تحقق عبر /api/downloads.public، حذف عبر /api/trpc/admin.downloads.removeFile). اسم الكوكي: ADMIN_SESSION_COOKIE (معرّف في shared أو _core، يجلب من set-cookie header).
- جدول download_files: 22 ملفًا أصليًا، الأعمدة: id, categoryId, fileName, originalName, description, fileKey, fileUrl, mimeType, sizeBytes, imageKey, imageUrl, sortOrder, isVisible, downloadCount, lastDownloadedAt, createdAt, updatedAt.
- بعد نجاح الاختبار: DELETE FROM download_files WHERE fileName LIKE '%sv21%' أو LIKE '%اختبار%'.
- روابط: الموقع https://uploadplus-47dkogbk.manus.space ، الإدارة https://uploadplus-47dkogbk.manus.space/admin

# sv22 تشخيص ضبابية نموذج الرفع (2026-08-16)
- لقطة المستخدم: نموذج إضافة نموذج (dfa17 drawer) على هاتف Android Chrome يبدو كله ضبابي، زر إضافة النموذج غير واضح، لا يستطيع رفع ملفات.
- عناصر الضبابية في r17: .dfa17-backdrop { background:radial-gradient(rgba(11,18,38,.62),rgba(11,18,38,.78)); backdrop-filter:blur(6px); z-index:85 } — يغطي الشاشة بخلفية كحلية شفافة + blur.
- .dfa17-card خلفية بيضاء صلبة #fff لكن الـ backdrop يعتم 62-78% من الشاشة؛ على Android Chrome قديم:
  1) backdrop-filter قد لا تُدعم → الخلفية تصبح كتلة داكنة خالصة تغطي المحتوى جزئيًا.
  2) الـ aside قد يُعرض بارتفاع صغير + الحقول داخل overflow-y:auto فتبدو صغيرة وضبابية.
- الحل (sv22): إنشاء -r18.js من r17 مع:
  1) تقليل تعتيم الخلفية إلى rgba(11,18,38,.38/.5) فقط وإزالة blur أو خفضه 2px + -webkit-backdrop-filter.
  2) dfa17-card z-index:95، عرض 100% على الشاشات <480px (padding أقل)، الحقول min-height 44px (لمس)، زر إضافة ثابت واضح أسفل الدفتر.
  3) إزالة أي opacity على محتوى الـ card.
- بعد التعديل: نسخ إلى admin-downloads-manager-r18.js → تحديث الإحالات: admin.html، admin-dashboard.html، vite.config.ts (redirect r16/r17→r18)، اختبارات: downloadsAssets.test.ts + ownerLoginR13Assets.test.ts + test r15UploadUI → r18 (يجب أن تبقى تمر).
- ثم: pnpm test + pnpm run build + md5 تحقق + checkpoint + تحقق حي.
- ملاحظة: لقطة sandbox لـ /admin#/downloads أظهرت صفحة تسجيل دخول (خلفية صورة مهندس + login-card) — صفحة الدخول normal، غير مرتبطة بالدفتر.

## sv22 تشخيص مفصل نهائي (CSS r17 أسطر 958-1120)
الملف: client/public/assets/js/admin-downloads-manager-r17.js

1. الـ drawer: HTML سطر 382-408: div.dfa17-overlay > (div.dfa17-backdrop[data-dfa17-close] + aside.dfa17-card) ثم header.dfa17-head يحتوي orbs متوهمة (filter:blur(30px) opacity:.75/.5) والأنماط inline على aside.
2. backdrop سطر 974: background radial rgba(11,18,38,.62)→.78 + backdrop-filter:blur(6px) + z-index:85 — يعتم الشاشة كلها 62-78% ويعمي ما خلفها (مقصود) لكنه على هواتف أندرويد قديمة قد يُطبق blur على layer كامل أو لا يُدعم فيصبح لونًا داكنًا كثيفًا.
3. card سطر 975: max-width:520px، max-height:min(88vh,780px) — على شاشة 812px height → 710px تقريبًا، لا مشكلة.
4. لا يوجد media query خاص بـ dfa17 داخل @media 560px (سطر 1106 يخص dl15 فقط!) → على الهاتف الدفتر يأخذ padding:16px وعرض 520px بكامل عرضه — الحقول والأزرار تبقى بنفس الحجم.
5. orbs: filter:blur(30px) — blur كثيف داخل head فقط، لا يؤثر على الحقول.

التشخيص الأهم: المستخدم يرى الشاشة كلها ضبابية حتى الحقول — الأرجح أن هاتفه (Chrome Android) لديه:
أ) كاش JS قديم يخدم r15/r16 (الدفتر القديم dl15 كان له مشكلة «الصورة الضبابية» التي اشتكى منها سابقًا: "التحديث ظهر بس صورة غير واضحة... أضغط في أي مكان تختفي"). dl15 drawer كان يستخدم dl15-pop animation مع opacity:0→1 وقد يعلق في opacity:0!
ب) أو أن dfa17-backdrop blur(6px) + overlay بشفافية 62-78% تجعل الدفتر يبدو مظلمًا ضبابيًا حتى لو أبيض.

الحل المتضمن في r18:
- تسمية جديدة: admin-downloads-manager-r18.js + تحديث الإحالات admin.html/admin-dashboard.html/vite.config.ts + اختبارات (downloadsAssets, ownerLoginR13Assets مع r18, test وصف r15UploadUI).
- تعديلات CSS: backdrop rgba(.35)→(.5) + blur(3px) فقط + -webkit-backdrop-filter؛ card: width:100% حتى 520، على <=560px card عرض 100% وhead padding أقل؛ إضافة media query لـ dfa17 داخل 560px: حقول min-height:44px، .dfa17-btn padding:14px 22px (لمس أسهل)؛ orbs opacity تخفيض .55/.35؛ dfa17-head p لون أفتح rgba(255,255,255,.92).
- الأهم: التأكد أن الـ animation dfa17-pop ينتهي إلى opacity:1 دائمًا (موجود) ولا يوجد animation يعلق.
- لا تغيير في JS logic (الرفع/الحفظ كما هو).

## sv22 حالة التنفيذ (محدثة)
تم إنشاء admin-downloads-manager-r18.js (md5: b2999159a576bd73a3cb0b4cc6e53433) مع التعديلات التالية على r17: خفض تعتيم الـ backdrop من rgba(.62/.78) إلى rgba(.34/.5) مع blur(3px) و-webkit-backdrop-filter، تخفيف orbs (.5/.3 بدل .75/.5)، نص header أفتح (.92 بدل .85)، حقول الإدخال min-height:44px والزر min-height:48px، وmedia query جديد لـ 560px يجعل الـ drawer بعرض 100% وأزرار كاملة العرض min-height:50px.
تم تحديث الإحالات: admin.html (3)، admin-dashboard.html (3)، vite.config.ts (1)، والاختبارات الثلاثة (downloadsAssets/ownerLoginR13Assets/r15UploadUI → r18).
pnpm test = 98/98 وbuild = md5 متطابق (b2999159).
لقطة /admin (375x812): تظهر صفحة تسجيل دخول المالك الطبيعية (login-card فوق صورة خلفية) — غير مرتبطة بمشكلة الـ drawer، وهي سليمة.
المتبقي: حفظ checkpoint (auto-publish) → انتظار انتشار → curl حي على r18 + admin.html يشير لـ r18 → تسليم المستخدم مع الطلب بتجربة الرفع على هاتفه.
ملاحظة: الدومين الوحيد المتاح: uploadplus-47dkogbk.manus.space.

## sv22 — تسليم نهائي (2026-08-16)
- المستخدم أرسل لقطة للصفحة الرئيسية وهي واضحة تمامًا (الساعة تعمل، الشعار، الأزرار) → التحديث r33 يعمل على جهازه.
- تم تسليم نتيجة إصلاح الضبابية r18: منشور على الإنتاج بمطابقة md5 (b2999159a576bd73a3cb0b4cc6e53433) وadmin.html الحي يشير إلى r18.
- checkpoint a709fae9 حُفظ وسُلم (auto-publish).
- المتبقي: انتظار رد المستخدم من تجربة نموذج إضافة النموذج على هاتفه.

# تشخيص sv23 (2026-08-16): استمرار ضبابية نموذج إضافة النموذج على هاتف المستخدم
المشكلة: لقطة المستخدم (17:15) تظهر الـ drawer ضبابيًا بالكامل على الهاتف رغم أن الإنتاج يحمل r18 بمطابقة md5 (b2999159) وadmin.html يشير r18. السبب: كاش CDN/متصفح على جهاز المستخدم يخدم نسخة r17 القديمة (backdrop معتمة 62-78% + blur 6px) — الـ inline purgex نفسه داخل admin.html القديم المخبّأ لا يعمل (بيضة ودجاجة).

عوامل الضبابية في r18 نفسها (يجب تخفيفها أكثر كخط دفاع ثانٍ):
- .dfa17-backdrop: blur(3px) + gradient داكن
- .dfa17-orb: filter:blur(30px) مع animations طويلة
- header متدرج داكن كحلي + نص أبيض شفاف
- .dfa17-badge/.dfa17-x: backdrop-filter blur(5px)
- animation dfa17-pop (scale .97 opacity 0)

خطة sv23:
1. إنشاء admin-downloads-manager-r19.js "وضع الوضوح على الهاتف": إزالة backdrop-filter من backdrop (خلفية صلبة شفافة ~30%)، إخفاء orbs الضبابية على الهاتف، نص داكن صلب في الحقول والتسميات، خلفية body بيضاء صلبة، زيادة وضوح header.
2. v20 purge: سكربت inline في admin.html/index.html/client/index.html بمفتاح localStorage جديد + SW جديد sw-purgex-v20.js بمسار جديد + ?u=v20 في register — يعمل من الصفحة نفسها بلا اعتماد على SW.
3. الإحالات r18→r19 في admin.html + admin-dashboard.html + vite.config.ts + 3 اختبارات.
4. pnpm test (98/98) + build + md5 + checkpoint auto-publish + تحقق حي + تسلم.

# sv23 خطة التنفيذ النهائية (2026-08-16)
المصدر: client/public/assets/js/admin-downloads-manager-r18.js (سيُنسخ إلى r19)

تعديلات CSS المطلوبة في r19 (كلها داخل style tag واحد بنهاية الملف):
1. `.dfa17-backdrop`: إزالة backdrop-filter:blur(3px) و-webkit-، استبدال gradient الداكن بـ background:rgba(11,18,38,.18) صافي (أو #0b122633) — النص الآن: `background:radial-gradient(ellipse at center,rgba(11,18,38,.34),rgba(11,18,38,.5));backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)`
2. `.dfa17-orb`: `opacity:0` (إخفاء orbs الضبابية على الهاتف) + `.dfa17-orb-1, .dfa17-orb-2` display:none داخل media 560px
3. `.dfa17-head`: تفتيح gradient: `linear-gradient(130deg,#1a1455 0%,#2a20a0 45%,#4c40d0 80%,#8b5cf6 100%)`
4. `.dfa17-head h3`: text-shadow أخف (أو بدون) + opacity النص p إلى #fff كامل أو rgba(255,255,255,1)
5. `.dfa17-badge`: استبدال gradient النص بخلفية أبيض صلبة ونص كحلي `background:#fff;color:#0b1226` وإزالة backdrop-filter
6. `.dfa17-x`: خلفية بيضاء صلبة ونص داكن `background:#fff;color:#0b1226;border:1.8px solid #e4e9f5` وإزالة backdrop-filter
7. `@media (max-width:560px)`: إضافة `.dfa17-backdrop{background:rgba(11,18,38,.15)!important;backdrop-filter:none!important}` + hide orbs
8. .dfa17-card: تقليل box-shadow من .38 إلى .25

v20 purge:
- سكربت inline في admin.html/index.html/client/index.html: localStorage key `__wp20` (مفاتيح سابقة: __sw17, __sw18, __wp19) — يمسح caches + يلغي registrations + fetch cache-bust للملفات الجديدة مرة واحدة لكل جلسة
- SW جديد: client/public/sw-purgex-v20.js (نسخة من sw-purgex-v19.js) بمسار جديد
- تسجيل الـ SW: navigator.serviceWorker.register("/assets/js/sw-purgex-v20.js?u=v20")
- الإحالات: admin-downloads-manager-r18.js → r19.js في client/public/admin.html + client/public/admin-dashboard.html + vite.config.ts
- اختبار ownerLoginR13Assets/downloadsAssets/r15UploadUI: r18→r19
- pnpm test 98/98 + build + md5 match + checkpoint + تحقق حي curl md5 + تسلم

# حالة sv23 اللحظية (2026-08-16)
- 98/98 اختبار نجح، pnpm build نجح، md5 متطابق: r19 = c5a7543c15a614d9f1aa0b6e5f09c2cf، sw-purgex-v20.js = 070bf5b4abb462b846579a979a506901 (مصدر == dist)
- كل الإحالات: admin.html/admin-dashboard.html/client index.html/client public index.html → r19 + downloads-r19 + __wp_purge_v20 + sw-purgex-v20.js
- تسجيل الدخول للمالك نجح عبر معاينة التطوير (bdalslamanwralajsh@gmail.com / abd77312) — لوحة المالك تعمل
- المتبقي: فتح إدارة التحميلات → زر إضافة نموذج → فحص drawer dfa17 على موبايل (viewport 375x812) والتقاط لقطة
- لقطات تسجيل الدخول: /home/ubuntu/screenshots/localhost_2026-08-16_14-26-32_5769.webp و...41_1393 و...47_7763
- بعد التحقق: checkpoint + تحقق حي على uploadplus-47dkogbk.manus.space (/assets/js/admin-downloads-manager-r19.js + /sw-purgex-v20.js md5 عبر curl) + تسلم
- todo.md محدث: بنود sv23 — يبقى فقط: pnpm test/build+md5 (✓ فعليًا)، تحقق حي، تسليم

## فحص بصري dev (14:27 UTC) — drawer dfa17/r19 مفتوح
- لوحة المالك: إدارة التحميلات تعمل، أقسام 8 وملفات 22 ظاهرة.
- Drawer «إضافة نموذج جديد» مفتوح وواضح جدًا على ديسكتوب: header كحلي-بنفسجي بشارتين بيضاء صلبتين (نموذج جديد + ✕)، خلفية نموذج رمادية فاتحة صافية، حقول اسم/وصف/قسم واضحة، dropzone بإطار متقطع ورمز سحابة ونص «اضغط هنا أو اسحب النموذج»، زر إضافة بنفسجي/زر إلغاء رمادي. لا ضبابية إطلاقًا (r19: backdrop صافٍ + orbs مخفية).
- اللقطة: /home/ubuntu/screenshots/localhost_2026-08-16_14-27-22_4980.webp
- المتبقي: لقطة موبايل 375x812 لنفس الـ drawer + checkpoint + تحقق حي prod (md5 r19/v20) + تسليم.

## تحقق برمجي حي (dev) على عناصر dfa17 المفتوح — 14:28 UTC
القيم المحسوبة (computed) كلها نظيفة بلا ضبابية: overlay شفاف بدون filter، dfa17-backdrop = rgba(11,18,38,0.18) مع backdrop-filter: none، dfa17-card أبيض صلب rgb(255,255,255)، orbs مخفية (display:none)، badge أبيض صلب، opacity=1 في كل العناصر. هذا يطابق تصميم Clarity Mode لـ r19 تمامًا. اللقطة البصرية أكدت الوضوح على ديسكتوب؛ media query 560px تعطي backdrop صافيًا (none !important) على الموبايل.

## الحالة قبل الـ checkpoint (14:30 UTC) — جاهز للحفظ
كل مراحل sv23 مكتملة وموثقة: (1) r19 = Clarity Mode: backdrop صافٍ rgba(11,18,38,.18) بلا blur، orbs مخفية display:none، card أبيض صلب، badge/close أبيض صلب، media 560px backdrop none !important + عناصر أكبر، dl10-backdrop blur 1.5px؛ md5 = c5a7543c15a614d9f1aa0b6e5f09c2cf. (2) v20-purgex: sw-purgex-v20.js بمسار جديد (md5 = 070bf5b4abb462b846579a979a506901) + سكربت inline بمفتاح __wp_purge_v20 في admin.html وclient/public/index.html وclient/index.html وadmin-dashboard.html؛ كل الإحالات على r19 وdownloads-r19. (3) الاختبارات 98/98. (4) بناء dist سليم بمطابقة md5 كاملة للمصدر. (5) فحص بصري وقيم computed حيًا على dev أثبت وضوح drawer dfa17 دون أي ضبابية. المتبقي: checkpoint + curl تحقق حي على prod (r19.js + sw-purgex-v20.js) + رسالة تسليم.
