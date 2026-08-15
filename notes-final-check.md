

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
