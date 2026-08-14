# تشخيص «لا توجد عناصر في القسم» — 2026-08-14

## البلاغ من هاتف المالك
صورة من هاتف Android تعرض لوحة المالك: قسم «إنشاء روابط الزوار» يظهر داخل بطاقة «تواصل» لكن داخله يعرض «لا توجد عناصر في القسم» (نص القالب العام الفارغ في admin-app-r18 السطر ~50) بدل قائمة المدير، ولا يظهر زر «➕ إضافة». الرابط الوحيد «منصة واجبات بلس» محذوف؟ لا — هو موجود في DB (تحقق 13:20: id=120001).

## الحقائق من الكود (محليًا)
1. `mountCompatibleVisitorLinksManager` (admin-app-r18 سطر 46-53): إذا كان `window.WajbatVisitorLinksManager?.workspace` و`activate` دالتين يعيد `<section data-visitor-links-workspace><div class="workspace-body"></div></section>` ويستدعي activate عبر queueMicrotask.
2. إذا فشلت الشروط → contentWorkspace يسقط إلى القالب العام الذي يعرض «لا توجد عناصر في هذا القسم».
3. المدير r3 يسجّل `window.WajbatVisitorLinksManager = { activate, workspace, refresh }` فقط في نهاية الملف (window.WajbatVisitorLinksManager).
4. في صورة المالك: العنوان داخل البطاقة «🔗 إنشاء رابط الزوار» مع زر «+ إضافة» — هذا القالب العام؟ لا، زر «+ إضافة» موجود في رأس القالب العام لقسم المحتوى. يعني أن `mountCompatibleVisitorLinksManager` أعاد null على هاتف المالك.

## فرضيات للفشل على الإنتاج (هاتف المالك)
- أ) نسخة admin-app-r18.js مخزنة مؤقتًا (بصمة?v=visitor-links-mobile-fix-r8) لم تُحمَّل بعد — عادت نسخة قديمة بدون mountCompatibleVisitorLinksManager أو بمسار مختلف. بصمة الملف الحالي في admin.html: admin-app-r18.js?v=visitor-links-mobile-fix-r8.
- ب) ملف admin-visitor-links-manager-r3.js?v=visitor-links-delete-modal-r6 لم يُحمَّل (خطأ تحميل السلسلة)، فيبقى window.WajbatVisitorLinksManager غير معرف → null → القالب العام → «لا توجد عناصر في القسم».
- ج) الصورة تظهر عنوان «إنشاء روابط الزوار» مع زر +إضافة → فعلاً القالب العام.

## ملاحظة مهمة
صورة المالك تعرض بطاقة القسم في منتصف الصفحة الرئيسية مع زر «+ إضافة» ونص «لا توجد عناصر في القسم.» — هذا حرفيًا القالب العام. لذا على هاتفه إما: الملف r3 لم يحمل (فرضية ب) أو حالة selected ليست visitorLinks أو ... الأهم أن الحالة في لقطة هاتفه تعرض القالب العام وليس قسم المدير.

## تحقق محلي (13:25)
اللوحة المحلية تعرض قائمة روابط الزوار بشكل صحيح بعد navi + click على القسم (بقي التحقق). DB: رابط واحد «منصة واجبات بلس» id=120001.

## خطوات تشخيص الإنتاج
- curl للإنتاج: https://uploadplus-47dkogbk.manus.space/admin والتحقق من بصمات script في HTML المنشور.
- curl للملف r3 من الإنتاج للتأكد من وجوده وبصمته.
- إذا الإنتاج يحمل نسخة قديمة من admin.html (بصمة قديمة)، فالسبب تخزين مؤقت CDN لـ admin.html نفسه.

## نتائج فحص الإنتاج (13:26)
- admin.html المنشور يحتوي بصمات r3 الصحيحة في كلا المسارين (السطرين 51 و72). ✓
- admin-app-r18.js?v=visitor-links-mobile-fix-r8 → 200 بحجم 79807 ✓
- r3 المنشور مطابق محليًا md5 fbed092c ✓ لكن **cache-control: max-age=7776000 (90 يومًا)** ← أي هاتف شغّل القسم قبل إصلاحنا وحمل نسخة قديمة من r1 أو r2 أو r3 سيبقى يحملها حتى 90 يومًا!
- r1 القديم (admin-visitor-links-manager-r1.js بدون بصمة) → cache-control: no-cache ✓
- admin.html نفسه → no-cache ✓

## الاستنتاج
الإنتاج صحيح كوديًا، لكن شاشة هاتف المالك تحمل نسخة قديمة من admin-app-r18.js أو r3 بسبب تخزين CDN/المتصفح (90 يومًا). حتى مع بصمة query-string، قد يعود المتصفح للنسخة القديمة إذا سبق وحمل نفس URL قبل (المتصفح يحتفظ بالنسخة المصغّرة أو CDN يحتفظ). الحل الأقوى: تغيير اسم الملف نفسه (r4) وتغيير مسار التحميل، مع no-store headers، و/أو استخدام meta no-cache في admin.html.

## الخطة
1. إعادة تسمية director إلى admin-visitor-links-manager-r4.js + بصمة تحميل جديدة في admin.html (مساران) + vite.config + الاختبارات.
2. إضافة cache-control: no-store عبر meta http-equiv أو headers إذا متاح.
3. إضافة آلية تراجع تلقائية: mountCompatibleVisitorLinksManager يحاول تحميل r4 في فشل window.WajbatVisitorLinksManager بعد مهلة.
4. اختبار، بناء، checkpoint.

## حالة التقدم (13:28)
- تمت إعادة تسمية r3 → r4: client/public/assets/js/admin-visitor-links-manager-r4.js (20142 بايت، مطابق r3)
- admin.html: بصمة التطبيق r9 (admin-app-r18.js?v=visitor-links-r4-cache-bust-r9)، تحميل r4 في مسارين + آلية fallback (setTimeout 4s يحمل r4 مع ?reload=Date.now() إذا !window.WajbatVisitorLinksManager)
- vite.config + visitorLinksAssets.test.ts + servicesManagerAssets.test.ts: كل المراجع محدثة إلى r4
- حذف r3 القديم
- pnpm test: 2 فشلا (59 ناجح من 61) — يجب فحص السطرين الفاشلين
- التالي: فحص الفشلين، pnpm build، اختبار محلي تفاعلي، checkpoint

## ملفات ذات صلة
- /home/ubuntu/uploaded-site/validation/empty-list-diagnosis.md (هذا)
- /home/ubuntu/uploaded-site/server/visitorLinksAssets.test.ts
- /home/ubuntu/uploaded-site/client/public/admin.html

## تحقق الإنتاج النهائي (13:31)
الإنتاج الآن يعرض البصمات الجديدة: admin-app-r18.js?v=visitor-links-r4-cache-bust-r9 وadmin-visitor-links-manager-r4.js?v=visitor-links-r4-load، وملف r4 يعمل (200, 20142 بايت). تم نشر checkpoint 43c9b3bf بنجاح تلقائي. لوحة الإدارة في الإنتاج تحمل الآن، والقسم «🔗 إنشاء روابط الزوار» موجود في القائمة (العنصر 4). لا يظهر في لقطة الشاشة الرئيسية إلا «جارٍ التحقق» أولًا ثم نظرة عامة — لم أتأكد بعد من أن قسم روابط الزوار يعرض الرابط «منصة واجبات بلس» بدل «لا توجد عناصر»؛ ذلك سيُتحقق منه في الإنتاج. السجل يعرض visitor_link_created/deleted/updated حديثة — البيانات سليمة. المتبقي: نقرة على القسم في الإنتاج للتحقق من عرض القائمة، ثم إغلاق بنود todo (التشخيص عبر استبدال اسم الملف كسر الكاش) وcheckpoint نهائي.

## حالة الإنتاج 13:32 — القسم فُتح لكن «جارٍ تحميل الروابط المحفوظة…», العدادات 0
القسم الآن تركّب فعليًا (أزرار + بحث + فلاتر). المتبقي التحقق هل تظهر الروابط بعد انتهاء التحميل أم تبقى «لا توجد عناصر». إن بقيت العدادات 0 رغم وجود روابط في قاعدة البيانات، فالمشكلة في GET admin.visitorLinks في الإنتاج (ربما خطأ الخادم). يجب فحص console/network في الإنتاج.

## نجاح التحقق النهائي في الإنتاج (13:32)
القسم عرض الرابط الحقيقي «منصة واجبات بلس» مع رابط https://uploadplus-47dkogbk.manus.space/?link=1c049a11ad1e4f58be9a037f14ccfd6afe621c7d، والعدادات: إجمالي 1، متاح 1، زيارات 5، صلاحية 13/08/2030. تعمل أزرار النسخ وواتساب وتيليجرام والمعاينة والاختبار والتعديل والتعطيل والحذف. المشكلة كانت في كسر التخزين المؤقت لملف المدير (كان CDN يحتفظ بنسخة قديمة 90 يومًا باسم r3)، وصلاحها باستبدال اسم الملف إلى r4 وبصمة admin-app-r18 الجديدة r9 مع آلية تحميل احتياطية.
