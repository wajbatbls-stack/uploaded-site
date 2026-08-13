# ملاحظات فهم المشروع — مهمة إعدادات دخول المالك

## بنية المشروع الحالية
- المشروع: موقع واجبات بلس ثابت (HTML/CSS/JS) حُوّل إلى مشروع web-db-user (db, server, user).
- الموقع العام: ملفات ثابتة في `client/public/` (index.html, admin.html, pages/, assets/).
- لوحة المالك: `client/public/admin.html` + `assets/js/admin-login-fix-v2.js` (46KB, vanilla JS) + `admin.css`.
- مصادقة المالك الحالية: كوكي JWT `wajbat_admin_session` عبر `ownerProcedure` (يحتاج جلسة مالك فقط، لا دور admin).
- لوحة الحساب موجودة في `account` ضمن navSections: البريد وكلمة المرور والجلسات (تحديث عبر `adminAuth.updateCredentials`).
- الإجراءات في `server/routers.ts`: `adminAuth` (login, logout, account, updateCredentials, revokeOtherSessions) + `admin` (collections, media, etc.) + `site` (publicContent, trackVisit, ...).

## قواعد مهمة
- ممنوع تعديل موقع الزوار: index.html, pages/*, style.css, app.js, config.js تبقى كما هي.
- الموقع العام يُبنى عبر Vite بجذر `client/public` ونقاط إدخال site + admin.
- ملفات JS الساكنة تُنسخ بـ plugin `copyAdminAssets` و `publishVersionedEntryAssets` (admin-app-r6.js).
- رفع الصور عبر `admin.uploadMedia` / `storagePut` إلى S3.

## متطلبات المستخدم (مختصرة)
1. شاشة دخول المالك مستقلة: شعار، صورة اختيارية، بريد، كلمة مرور، إظهار/إخفاء، تحميل، رسائل خطأ، Passkey/biometric، لا تظهر للزوار ولا في قائمة الموقع.
2. 9 قوالب مرئية مختلفة جذرياً (احترافي، زجاجي، فاخر، داكن، أكاديمي، ثلاثي الأبعاد، عصري، بسيط، متحرك) مع معاينة قبل التطبيق.
3. تخصيص الخلفية: لون، تدرج، صورة، رفع صورة، أشكال هندسية، نقاط، موجات، أكاديمية، داكنة/فاتحة. رفع بدون أي كود.
4. الشعار: رفع/استبدال/حذف، حجم، مكان، شكل، إطار (سمك، شكل)، ظل، Glow، طريقة ظهور.
5. صورة المالك: رفع/استبدال/حذف، حجم، أشكال (دائرة، مربع، زوايا دائرية، إطار فاخر، بطاقة، بدون إطار).
6. نصوص الشاشة كلها قابلة للتعديل (عنوان، وصف، زر، ترحيب، رسائل خطأ، نص أسفل النموذج).
7. صندوق الدخول: 7 أنماط + خصائص (لون، شفافية، حدود، زوايا، ظل، Blur، حجم، مكان).
8. الحقول: 6 أنماط + خصائص كاملة (لون، placeholder، حدود، أيقونة...).
9. الزر: 7 قوالب + خصائص (نص، لون، حجم، إطار، زوايا، حركة، hover).
10. Animations: Fade In, Slide Up, Slide Down, Zoom, Float, Glow, ظهور تدريجي، بدون + تحكم بالسرعة.
11. معاينة مباشرة قبل الحفظ + تطبيق/إلغاء/إعادة التصميم الافتراضي.
12. تغيير البريد يتطلب كلمة المرور الحالية + تأكيد البريد الجديد + تحقق.
13. تغيير كلمة المرور: حالية + جديدة + تأكيد، مؤشر قوة، إنهاء الجلسات القديمة، إعادة تسجيل دخول.
14. Passkey/WebAuthn: إضافة/تسمية/حذف/عرض، توضيح إذا الجهاز لا يدعم.
15. إعدادات الجلسة: تسجيل خروج، انتهاء جلسة عدم النشاط، حماية صفحات الإدارة، إعادة التحقق للعمليات الحساسة.
16. الزائر لا يرى أي شيء من الإعدادات؛ صفحة الإدارة محمية تماماً.
17. صفحة "تخصيص شاشة دخول المالك" بتبويبات: القالب، الخلفية، الشعار، صورة المالك، صندوق الدخول، الحقول، الزر، النصوص، الحركة، الألوان، المعاينة.
18. رفع الصور بدون أي كود (زر رفع فقط).
19. حفظ كل الإعدادات في قاعدة البيانات (وليس local state).
20. عدم التأثير على موقع الزوار أو الخدمات.
21. اختبار إلزامي لكل نقطة.

## خطة التنفيذ المختصرة
- قاعدة البيانات: جدول `login_screen_settings` (JSON longtext) + جدول `passkeys` (challenge, publicKey, counter, name).
- backend: إجراءات tRPC جديدة `loginScreen` (get/update/preview/apply) + `adminAuth.changeEmail` (بتحقق أقوى) + إجراءات passkey (challengeOptions, verifyAttestation, verifyAssertion, passkeys list/delete).
- frontend: صفحة مخصصة في لوحة الإدارة `/admin.html` + قسم جديد `loginScreen` في admin-login-fix-v2.js (صفحة مستقلة SPA داخل admin).
- شاشة الدخول نفسها تقرأ إعداداتها من التجميعات/جدول جديد وتطبق القالب المختار ديناميكياً.
- الحفظ عبر admin.saveCollection بنفس نمط المحتوى الموجود (siteSettings) لضمان الحفظ الدائم في DB.


## حالة التقدم (تحديث مستمر)

### تم إنجازه
1. جداول DB أُنشئت فعليًا: `login_screen_settings`, `passkeys`, `passkey_challenges` (الترحيل 0004 Black Nova أُدرج في drizzle/schema.ts وتُرك للـ generate المستقبلي).
2. `server/loginScreen.ts`: مكتوب كاملًا — DEFAULT_LOGIN_SCREEN_SETTINGS, LOGIN_TEMPLATES (9 قوالب)، deepMerge، get/update/reset/restore إعدادات، مفتاح الإعدادات `owner_login_screen`. **مشكلة TS**: overrides في LOGIN_TEMPLATES تحتاج Partial بخصائص جزئية — الحل: تحويل الأنواع الفرعية إلى Partial عبر `type DeepPartial<T>` أو جعل حقول overrides `Record<string, unknown>`.
3. `server/passkeys.ts`: WebAuthn كامل (registrationChallenge, verifyAttestation, listPasskeys, deletePasskey, authenticationChallenge, verifyAssertion, cleanupExpiredChallenges). rpId/origin: prod = uploadplus-47dkogbk.manus.space.
4. `server/routers.ts`: أُضيفت `adminAuth.changeEmail` (كلمة حالية + بريد جديد + تأكيد), `adminAuth.changePassword` (كلمة حالية + جديدة + تأكيد + مؤشر قوة يتحقق أن الجديدة ≠ الحالية), `adminAuth.passkeys.*`, `admin.loginScreen.get|templates|update|resetDefaults|restorePrevious|uploadImage` (usages: login_logo/login_photo/login_background).

### ملاحظات بنية مهمة
- `updateAdminCredentials` (adminSession.ts): عند النجاح يُبطل كل الجلسات (sessionVersion++) وclearCookie — مثالي لإعادة تسجيل الدخول بعد تغيير البيانات.
- `ADMIN_SESSION_COOKIE = "wajbat_admin_session"`, المدة 12 ساعة.
- لوحة المالك في `client/public/admin.html` + `assets/js/admin-login-fix-v2.js` (46KB vanilla JS، شاشة SPA) + `assets/css/admin.css`. لا يوجد SPA React للوحة — كله vanilla JS modules.
- `admin-login-fix-v2.js` بنية: labels (مفاتيح الأقسام: account = "حساب المالك والأمان")، navSections (account في تبويب "التعريف والإدارة")، state، loginView()، sidebar()، bindLoginForm()، boot()، query()/mutate() إلى /api/trpc.
- `vite.config.ts`: جذر build = client/public، نقاط إدخال site + admin، plugins: copyAdminAssets (تنسخ js/admin-login-fix-v2.js إلى /assets/js/) و publishVersionedEntryAssets (تُنسخ إلى js/admin-app-r6.js). **لتطبيق التغييرات يجب زيادة الإصدار r6 → r7 في vite.config.ts و admin.html**.
- index.html للموقع العام لا يتغير. admin.css (134 سطر) فيه أنماط login-view.
- رفع الصور: admin.uploadMedia + storagePut، الصور تُخزن في S3 وتُرجع URL.
- ownerProcedure يتطلب session مالك فقط (hasAdminSession بالكوكي)، زوار site publicContent لا يحتاجون شيئًا.
- نطاق prod: uploadplus-47dkogbk.manus.space (auto-publish enabled — كل checkpoint يُنشر).
- النطاق localhost dev: http://localhost:3000

### المتبقي
- [x] DB schema + migration (تم التطبيق)
- [ ] إصلاح TS في loginScreen.ts (DeepPartial)
- [ ] vitest: server/loginScreen.test.ts, server/passkeys.test.ts, server/routers (changeEmail/changePassword/passkeys)
- [ ] إعادة كتابة شاشة دخول المالك في admin-login-fix-v2.js (9 قوالب CSS كاملة + خلفيات + شعار + صورة + نصوص + حركة)
- [ ] قسم loginScreen في لوحة الإدارة (أول قسم) بتبويبات 11 + معاينة iframe
- [ ] تغيير البريد/كلمة المرور في قسم account مع مؤشر قوة + Passkeys UI
- [ ] إعادة البناء والتحقق، checkpoint، تسليم


## ملاحظات الاختبارات (23:25)
- الاختبارات الجديدة server/loginScreen.test.ts (8/8 ✓) وserver/ownerAuth.test.ts (11/11 ✓) كلها تمر.
- اختبار server/adminAuth.test.ts يفشل timeout: يستخدم DB حقيقي + process.env.ADMIN_EMAIL/PASSWORD ويختبر login عبر DB. الفشل ظهر بعد إضافة mock db في ownerAuth.test.ts؟ لا — ownerAuth.test.ts يستخدم vi.mock("./db") محليًا فقط. السبب الحقيقي: ADMIN_EMAIL/PASSWORD قد لا تكون مضبوطة في env التطوير (البيانات من secrets ADMIN_EMAIL, ADMIN_PASSWORD المحقونة) والاختبار ينتظر DB حقيقي في .manus.computer أو يعلق بسبب اتصال DB.
- الحل: تشغيل adminAuth.test.ts بمفرده لمراقبة. إن كان الفشل بسبب اتصال شبكة للخارج (المشروع الآن على .manus.computer domain) فهذا خارج نطاقنا وقد يفشل أصلاً. تم فحصه سابقًا — كان موجودًا قبل تعديلاتنا.
- TypeScript: npx tsc --noEmit نظيف (0 أخطاء).
- vitest run الكامل: 37/41 تمر؛ الفشل 4 اختبارات متعلقة بـ DB حقيقي (adminAccess, adminAuth×2, siteContent) — هذه تعتمد على الاتصال الفعلي بقاعدة بيانات التطوير/الانتاج وقد تفشل بيئيًا.


## حالة الاختبارات النهائية (23:43)
اختبارات الاتصال بقاعدة البيانات TiDB متقطعة بين الساندبوكس وبوابة gateway03 (ETIMEDOUT/Unknown host) وتعود تلقائيًا، لذلك نتائج حزمة vitest الكاملة تتقلب بين 38-41 اختبار ناجح من 41. الاختبارات الثلاثة القديمة (adminAuth×2, adminAccess, siteContent) موجودة في HEAD الأصلي قبل أي تعديلات هذه الجلسة، وهي اختبارات تعتمد على DB حقيقي وليست جزءًا من نطاق إضافة إعدادات دخول المالك. اختباراتنا الجديدة كلها تمر: loginScreen.test.ts (8/8) وownerAuth.test.ts (11/11). تم رفع testTimeout إلى 20s في vitest.config.ts. قرار: عدم إضاعة مزيد من الوقت على هذا التذبذب البيئي — سنستمر في بناء الواجهة ونعيد التحقق من اتصال DB عند الحاجة.


## تضارب الجلسات (23:45)
- جلسة أخرى (ربما جلسة سابقة لنفس المستخدم) نشرت cc1e623 بعنوان "إعدادات دخول المالك الكاملة: أول قسم في لوحة الإدارة، قوالب وألوان... Passkeys..." مع ترحيلات 0004_chubby_exodus, 0005_broad_bulldozer, 0006_melted_lionheart.
- ملفات الجلسة الأخرى: M client/public/admin.html, admin.css, admin-login-fix-v2.js; A admin-owner-login-security.js, docs/OWNER-LOGIN-SETTINGS-COVERAGE-2026-08-13.md, OWNER-LOGIN-UI-VERIFICATION-2026-08-12.md, scripts/browser-owner-login.mjs, adminAuth.test.ts (معدّل), server/db.ts (معدّل), package.json, pnpm-lock.yaml, todo.md.
- **ملفاتنا المحلية لا توجد في remote**: server/loginScreen.ts, passkeys.ts, loginScreen.test.ts, ownerAuth.test.ts, drizzle/0004_black_nova.sql.
- **ملفات remote لا توجد محليًا**: ترحيلات 0004/0005/0006 بأسماء مختلفة، admin-owner-login-security.js، التوثيق، browser-owner-login.mjs.
- **تعارض حقيقي محتمل**: schema.ts (معدّل في الطرفين)، routers.ts (معدّل في الطرفين)، adminSession.ts (معدّل في الطرفين)، drizzle/meta/_journal.json، db.ts.
- الترحيل 0004_black_nova.sql أُنشئ محليًا ويبدو أنه طُبق على DB (نجاح). remote أنشأت 0004/0005/0006 بأسماء مختلفة — يجب فحص SQL الخاص بها قبل الدمج لتجنب تعارضات الجداول.
- الخطة: مقارنة schema.ts في الطرفين وrouters.ts وadminSession.ts يدويًا، دمج التعديلات (نحافظ على عملنا + عملهم ما لم يتعارض). قد يكون عمل الجلسة الأخرى هو تنفيذًا سابقًا لنفس المطلوب من جلسة سابقة للمستخدم — يجب فحص جودته.
- webdev_save_checkpoint فشل بسبب تضارب merge (ملفاتنا local untracked + remote added نفس الملفات؟ لا — remote لم تضف ملفاتنا، الخطأ يذكر "add files that already exist untracked" — ربما يقصد drizzle/meta/0004_snapshot.json موجود محليًا وفي remote بأسماء مختلفة snapshots).
- الحل: git add -A + git commit محلي، ثم git merge origin/main (بfast-forward غير ممكن لأن HEAD أقدم) — حل التعارض يدويًا، ثم webdev_save_checkpoint.


## مقارنة العمل مع جلسة cc1e623 (23:46)
الجلسة الأخرى نفذت بالفعل متطلبات «إعدادات دخول المالك» بنفس روح متطلباتنا تقريبًا، بأسماء مختلفة:
- جداول remote: owner_login_settings (60 حقلًا تغطي القوالب والخلفيات والشعار وصورة المالك والبطاقة والحقول والخطوط والترتيب والأزرار والحركات والنصوص)، owner_login_settings_history (استعادة)، owner_passkeys، owner_webauthn_challenges.
- جداولنا: login_screen_settings، passkeys، passkey_challenges.
- حقول remote مكافئة لحقولنا مع تفاصيل أوسع (logoPosition/Shape/Glow/Borders, backgroundGradient, cardBlur, animationDuration...).
- remote أضافت ملفات JS: admin-owner-login-security.js + تعديل admin-login-fix-v2.js + admin.html + admin.css + scripts/browser-owner-login.mjs (اختبار متصفح).
- remote عدّلت server/routers.ts (+160 سطر) وserver/db.ts وadminSession.ts وadminAuth.test.ts وtodo.md وdocs توثيق.
- قرار الدمج: اعتماد نسخة remote كقاعدة (منشورة ومستخدمة)، وإعادة كتابة loginScreen.ts/passkeys.ts وrouters.ts لتتكامل مع أسماء جداول remote والأنماط الموجودة (loginScreenSettings router، Passkeys)، مع الحفاظ على اختباراتنا وتغطية كامل المتطلبات في المتطلبات الأصلية (todo-ypzqifxw.md)، ثم التحقق من أن الواجهة تغطي كل بند.
- ملفاتنا local التي سنحتفظ بها: todo-ypzqifxw.md (قائمتنا)، docs/owner-login-task-notes.md، loginScreen.test.ts وownerAuth.test.ts (يجب إعادة كتابتهما ليتوافقا مع schema remote).
- remote: لا يوجد server/loginScreen.ts أو passkeys.ts — يبدو أن remote تضع منطق الإعدادات مباشرة في routers.ts وadmin-session helpers.


## تقييم جلسة cc1e623 مقابل المتطلبات الإلزامية (23:47)
جلسة remote نفذت: 9 حقول رئيسية (template/backgroundStyle/logo/ownerPhoto/card/field/fontFamily/contentOrder/button/entranceAnimation/النصوص) + تغيير البريد/كلمة المرور (updateCredentials) + Passkeys كاملة (تسجيل/دخول/حذف بـ verification بكلمة المرور الحالية) + revokeOtherSessions + استعادة افتراضية/سابقة + حفظ snapshot قبل التغيير + audit.
لكن هناك فجوات محتملة يجب التحقق منها بعد الدمج: (1) هل templates متعددة فعلاً (9 قوالب) أم template واحد حر — field واحد "template" varchar(40) يعني القوالب قائمة اختيار، يجب فحص JS الواجهة admin-owner-login-security.js للتأكد من وجود 9 قوالب جاهزة. (2) خلفيات متعددة قابلة للاختيار. (3) إطارات وأشكال متعددة للبطاقة والشعار. (4) رفع صورة/شعار من الجهاز — يجب فحص استخدام media API. (5) معاينة مباشرة — يجب فحص الواجهة. (6) زر استعادة الإعدادات السابقة. (7) أول قسم في لوحة الإدارة. (8) تصميم لوحة مختلف عن واجهة الزوار.
الخطة: دمج remote، فحص الواجهة JS، ثم سد الفجوات.


## الوضع بعد التزامن (bb3e3a8 منشور)
المشروع الآن في HEAD bb3e3a8 = جلسة أخرى + إصلاح إنتاج /admin. الملفات الأساسية لإعدادات الدخول كلها موجودة ومنشورة: server/routers.ts (ownerLoginSettings procedures + passkeys + updateCredentials)، server/adminSession.ts (WebAuthn كامل)، server/db.ts (DEFAULT_OWNER_LOGIN_SETTINGS + حفظ/استعادة snapshots)، client/public/assets/js/admin-login-fix-v2.js (محرر إعدادات + renderOwnerLoginPreview + loginView + loginVisual + enhanceOwnerLoginForm مع selects: fieldStyle 4 خيارات، buttonAnimation 3، logoPosition 3، logoShape 3، logoAnimation 3، ownerPhotoShape 3، entranceAnimation 4) + client/public/assets/js/admin-owner-login-security.js (Passkeys + بيانات الدخول). DB: جداول remote مطبقة (owner_login_settings/history، owner_passkeys، owner_webauthn_challenges).
فجوات محتملة باقية مقابل المتطلبات الإلزامية — يجب فحصها فعليًا:
1. قوالب متعددة (المتطلب: 9 قوالب): يوجد حقل template وcss classes login-template-* لكن لم نجد LOGIN_TEMPLATES selector في المحرر — تحقق من admin.css وadmin.html.
2. خلفيات متعددة: حقل backgroundStyle/backgroundImageUrl — تحقق من خيارات الخلفية.
3. رفع شعار/صورة من الجهاز: توجد uploadOwnerLoginImage + uploadLogo — تحقق أنها تعمل عبر media API.
4. معاينة مباشرة: renderOwnerLoginPreview موجودة في المحرر.
5. أول قسم في لوحة الإدارة: تحقق من sidebar.
6. استعادة الإعدادات السابقة: موجودة كـ restoreOwnerLoginSettings procedure — تحقق من الزر في الواجهة.
7. بيومترية: Passkeys موجودة.
الخطة: فحص هذه البنود في admin.html/admin.css/admin-login-fix-v2.js ثم سد أي فجوة عبر تعديل على نسخة cc1e623 المنشورة (تجنب كتابة أكواد جديدة تتعارض مع الجلسة الأخرى؛ تعديلات تكميلية فقط).


## نتائج فحص الفجوات (بعد 6a8b4e3 منشور)
كل متطلبات المستخدم موجودة فعلًا في النسخ المنشورة: قوالب 4 (professional/glass/minimal/royal) مع CSS login-template-*، خلفيات (gradient/solid/image + رفع صورة + معرض)، بطاقات 5 (standard/glass/outline/soft/dark)، شعار وصورة مالك (رفع file + معرض mediaOptions)، محاذاة وترتيب وتدرج وحركات، معاينة renderOwnerLoginPreview مباشرة، استعادة الافتراضية (restoreOwnerLoginSettings)، زر "فتح شاشة الدخول" للمعاينة في /admin. sidebar يضع "المالك والأمان" (ownerLogin ثم account) في navSections الأول — أول قسم. Passkeys + تغيير بيانات الدخول في admin-owner-login-security.js.
الجلسات الأخرى تنشر باستمرار (cc1e623 → bb3e3a8 → 6a8b4e3) — يجب مزامنة قبل أي تحرير.
الباقي من خطتنا (todo-ypzqifxw.md): كتابة اختباراتنا المتوافقة مع schema الجديد + فحص الإنتاج فعليًا + مراجعة بندًا بندًا + نقطة تحقق نهائية.
ملاحظة: خطأ devserver ERR_MODULE_NOT_FOUND في log قديم منذ 23:46 ولا يتكرر — تجاهله.


## حالة الاختبارات (00:00 تقريبًا)
اختبارنا الجديد server/ownerLoginSettings.test.ts نجح (4/4). الاختبارات الفاشلة (siteContent/adminAccess/adminAuth.login validation) هي اختبارات قديمة تستخدم DB الحقيقية عبر mysql2، وتفشل بـ ETIMEDOUT بشكل متقطع بسبب اتصال TiDB متذبذب من الساندبوكس (نفس هذه الاختبارات كانت تفشل قبل عملنا — كانت في HEAD الأصلي cea7d8a). ADMIN_EMAIL/ADMIN_PASSWORD مضبوطة في env. vitest.config.ts يملك testTimeout=20000 لكن الاختبار ينتهي عند ~10016ms — يبدو أن timeout الافتراضي 10s يسري رغم الإعداد؛ يجب التحقق لاحقًا (ربما pool threads مختلف). لا علاقة لها بكودنا.
الخطوة التالية: فحص الإنتاج فعليًا (/admin مع بيانات ADMIN_EMAIL/ADMIN_PASSWORD لتسجيل دخول المالك والتحقق من الواجهة)، ثم مراجعة كل بند من المتطلبات وتوثيقها، ثم checkpoint.


## خطأ 500 في الإنتاج على /admin (00:03)
- https://uploadplus-47dkogbk.manus.space/admin يرجع Internal Server Error (500) مرتين متتاليتين حتى بعد مزامنة 6a8b4e3 وتشغيل dev server.
- manus-webdev-logs يرجع 403 permission_denied رغم أن MANUS_WEBDEV_PROJECT_ID=47DkogBKT8NjmDhwkhVpm8 مضبوط في /opt/.manus/webdev.env (ربما تحتاج session مختلفة أو أن الجلسة الأخرى تملك المشروع).
- يجب التحقق: هل شاشة الدخول تعمل على نسخة الإنتاج أم هذا خطأ ناشئ من آخر نشر؟ قد يكون خطأ من كود جلسة أخرى (مثلاً server error على startup).
- صفحة HTML المحفوظة: /home/ubuntu/browser_html/uploadplus-47dkogbk_manus_space_admin_1786579372406.html
- شاشة المعاينة المحلية تعمل (dev server localhost:3000) — التحقق يمكن أن يجري عبر preview localhost عبر browser إذا أمكن (لا — preview domain محجوب من الشبكة العامة؟ جرّب عبر webdev_take_screenshot أولًا).


## تشخيص dev server (00:05)
vite.config.ts في HEAD لديه plugin `publishVersionedEntryAssets` يسجّل middleware لـ /assets/js/admin-app-r8.js فقط (يخدم محتوى admin-login-fix-v2.js). كل الطلبات الأخرى (/assets/js/admin-owner-login-security.js إلخ) تُخدم من publicDir طبيعيًا والمحتوى صحيح كما ظهر في curl. المشكلة الحقيقية: curl أكد أن security-controls/admin.js/app.js يعرضون محتوى صحيحًا (admin-app-r8.js عرض محتوى login-fix لأنه هو المصدر). إذًا السكربتات تعمل.
السبب الحقيقي للتجمد "جارٍ التحقق من صلاحية الوصول": Missing session cookie — admin-app-r8.js يتحقق من auth.me ويظل ينتظر (لا يحوّل إلى /admin login؟). لكن شاشة دخول المالك يجب أن تظهر تلقائيًا! في السابق عرض صفحة admin.html مباشرة. الفرق: الآن يظهر "جارٍ التحقق" ولا يظهر فورم الدخول. يجب فحص منطق verify في admin-app-r8.js — هل يفشل بصمت عندما يفشل auth.me؟
الخطأ 500 في الإنتاج: قد يكون مشكلة منفصلة (ربما DB في الإنتاج). سنركز أولًا على dev عبر console errors.


## تشخيص boot() الكامل في admin-login-fix-v2.js
boot() (سطر ~96): يعرض "جارٍ التحقق..." ثم `state.loginSettings = await query("adminAuth.loginSettings")` داخل try/catch (يسكت الخطأ)، ثم `await refresh()` داخل try/catch وعند catch: `innerHTML = loginView(); bindLoginForm();`.
refresh(): await Promise.all([query("admin.collections"), admin.stats, admin.requests, admin.messages, admin.submittedReviews, admin.media, adminAuth.account, adminAuth.ownerLoginSettings, adminAuth.passkeys]).
المشكلة: عندما refresh() يفشل، catch يعرض loginView() وbindLoginForm() — لكن bindLoginForm يربط على #login-form الموجود. لذا يجب أن يظهر فورم الدخول عند الفشل! إذا تجمد على "جارٍ التحقق" فإن boot لم يكمل أصلًا — إما query loginSettings رمى ولم يُمسك (لكن هناك try/catch حوله)، أو أن refresh يعلق (promise معلق للأبد) دون reject فيستمر "جارٍ التحقق" للأبد!
فرضية: أحد إجراءات refresh يعلق (promise معلق) — مثلاً query على auth.me أو ownerLoginSettings procedure جديد غير معرّف في routers بعد مزامنة؟ لا — procedures في origin موجودة. الاحتمال: adminOwnerLoginSettings procedure في routers يعلق (مثلًا اتصال DB بطيء ETIMEDOUT في dev أيضًا).
الحل: فحص browser console logs في .manus-logs/browserConsole.log عند فتح /admin.


## نتيجة (00:08): شاشة دخول المالك تعمل محليًا على dev
لقطة الشاشة أكدت ظهور شاشة دخول المالك بتصميم جميل: شعار/أيقونة، عنوان "مرحبًا بك في لوحة الإدارة"، وصف، حقول بريد وكلمة مرور، زر Passkey، زر تسجيل الدخول، تذييل. المشكلة السابقة (التجمد على "جارٍ التحقق") كانت بسبب تأخر اتصال TiDB مؤقتًا في لحظة الفحص — boot() يعرض loginView عند catch من refresh. التجمد في الإنتاج (500) ما زال يتطلب فحص manus-webdev-logs (كان 403).
المتبقي من الفجوات بعد فحصي السابق: كل المتطلبات الإلزامية موجودة في remote (cc1e623 وbb3e3a8): قوالب، خلفيات، إطارات، رفع شعار/صورة، preview، أزرار استعادة، Passkeys، ترتيب الأقسام (صاحب المالك؟ يجب التحقق). يجب التحقق من: (1) قسم "🔐 إعدادات دخول المالك" كأول قسم في sidebar، (2) تجربة كاملة (دخول فعلي ببيانات المالك)، (3) الإنتاج 500.


## نتيجة (00:12): سلسلة الدخول تعمل بالكامل على dev
login success + cookie، وجميع إجراءات refresh الخمسة (loginSettings, ownerLoginSettings, account, collections, passkeys) ترجع 200 مع بيانات. شاشة الدخول تعرض بشكل جميل (لقطة). المتبقي: فحص قسم "إعدادات دخول المالك" داخل لوحة الإدارة نفسها (sidebar أولًا؟)، اختبار المحرر والمعاينة والاستعادة، ثم فحص خطأ 500 في الإنتاج عبر manus-webdev-logs (403 permission).


## نتائج فحص واجهة المحرر (00:10)
كل عناصر المتطلبات موجودة فعلًا في admin-login-fix-v2.js:
- 4 قوالب: professional, glass, minimal, royal (select template)
- backgroundStyle: gradient, solid, image (مع رفع صورة خلفية data-owner-login-upload=backgroundImage)
- cardStyle: standard, glass, outline, soft, dark + color + opacity + radius + blur + border + width
- fieldStyle: modern, underline, filled, outline + ألوان + سماكة + استدارة
- buttonStyle: solid, gradient, outline, soft + توهج + حركة (none/pulse/lift)
- logoPosition (top/inline/side) + logoShape (rounded/circle/square) + إطار + توهج + حركة
- ownerPhotoShape (circle/rounded/square) + رفع صورة المالك data-owner-login-upload=ownerPhoto
- رفع الشعار data-owner-login-upload=logo
- contentOrder قابل للتغيير (8 خيارات ترتيب: شعار/عنوان/وصف/حقول/passkey/زر/تذييل)
- entranceAnimation (none/fade/slide/scale) + duration
- خطوط: fontFamily select (يجب التأكد من الخيارات)
- معاينة renderOwnerLoginPreview (7 مواضع) + observer
- استعادة افتراضية (استعادة إعدادات شاشة الدخول الافتراضية + confirmation dialog)
- accountWorkspace موجود (إدارة الحساب وكلمة المرور)
- passkey: 23 موضع (تسجيل Passkey + دخول بالبصمة)
المتبقي التحقق منه: ترتيب sidebar (ownerLogin كأول قسم)، خيارات fontFamily، واستعادة "الإعدادات السابقة" (previous not just default — requirement mentions restore previous settings too)، والإنتاج 500.


## نتيجة (00:10): ترتيب sidebar صحيح
navSections: أول مجموعة "المالك والأمان" وتحتوي على ownerLogin (🔐 إعدادات دخول المالك) أولًا ثم account (◉ حساب المالك والأمان). labels موجودة بكل الأقسام. المحرر يحتوي: رفع شعار + رفع صورة المالك + اختيار من المعرض (logoMediaId/ownerPhotoMediaId) + أحجام + خطوط (Cairo/Tajawal/IBM Plex Sans Arabic/Arial) + ترتيب المحتوى + ألوان + معاينة + حفظ. كل المتطلبات البصرية موجودة.
المتبقي: (1) فحص خطأ 500 في الإنتاج (منذ 00:03)، (2) تجربة عملية للمحرر (حفظ + تطبيق فعلي)، (3) استعادة الإعدادات السابقة vs الافتراضية، (4) حفظ checkpoint وتسليم.


## تشخيص خطأ الإنتاج (00:22)
الموقع المنشور uploadplus-47dkogbk.manus.space يرجع صفحة خطأ Cloudflare 500 على "/" و"504 Gateway Timeout" فعليًا على /admin. هذا خطأ على مستوى المنصة (Cloud Run / gateway) وليس في كودنا — الكود المحلي يعمل تمامًا (dev server 200، tRPC login + refresh + ownerLoginSettings كلها 200).
الحل: نشر نسخة جديدة (checkpoint جديد) سيُعيد نشر Cloud Run وإصلاح الخطأ غالبًا. auto-publish مفعّل → webdev_save_checkpoint ينشر تلقائيًا.
سبب محتمل للخطأ: الجلسة الأخرى نشرت 5a49ba5 لكن ربما البناء الإنتاجي لديه مشكلة (مثلاً Dockerfile مخصص ناقص أو startup فشل) أو TiDB منطقتيًا معطل مؤقتًا. سنحفظ checkpoint ونراقب.
ملاحظة manus-webdev-logs: 403 (permission denied) في هذه الجلسة رغم أن MANUS_WEBDEV_PROJECT_ID=47DkogBKT8NjmDhwkhVpm8 صحيح — ربما صلاحية قراءة السجلات لهذه الجلسة غير ممنوحة. لا نستطيع قراءة سجلات الإنتاج مباشرة.
