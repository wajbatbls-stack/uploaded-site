# تغطية رفع الوسائط في لوحة واجبات بلس

يتحقق هذا المستند من الواجهات التي تحتوي **حقول وسائط فعلية** في بيانات الموقع الحالية. لا يضيف حقول صور أو ملفات وهمية إلى الخدمات أو المقالات أو الشركاء، لأن نماذج بياناتها الحالية لا تحتوي تلك الحقول.

| الوحدة | حقل الوسيط الفعلي | تجربة المالك | الربط البرمجي | اختبار الإنشاء | اختبار الاختيار | اختبار الحفظ |
|---|---|---|---|---|---|---|
| تصميم الموقع | `logoUrl` | اختيار صورة من المعرض أو رفع صورة جديدة | `structured-logo-image` ثم `next.logoUrl` | `server/adminUpload.test.ts` و`server/adminMediaBindingCore.test.ts` | `scripts/browser-owner-login.mjs` | `server/adminMediaBindingCore.test.ts` و`server/siteContent.test.ts` |
| فريق الإدارة | `photoUrl` | اختيار صورة من المعرض أو رفع صورة جديدة | `team-photo-{index}` ثم `photoUrl` | `server/adminUpload.test.ts` و`server/adminMediaBindingCore.test.ts` | `scripts/browser-owner-login.mjs` | `server/adminMediaBindingCore.test.ts` و`server/siteContent.test.ts` |
| التحميلات | `remoteFile` | اختيار ملف من المعرض أو رفع ملف مباشر من المسودة | `downloadFile{index}` ثم `remoteFile` | `server/adminUpload.test.ts` | `scripts/browser-owner-login.mjs` | `server/adminMediaBindingCore.test.ts` و`scripts/browser-owner-login.mjs` |
| الخدمات، المقالات، الشركاء، الجامعات، الأسئلة والآراء | لا يوجد حقل وسيط في النموذج الحالي | لا يظهر حقل رابط يدوي غير فعلي | غير منطبق | غير منطبق | غير منطبق | `server/mediaEditorCoverage.test.ts` يثبت نطاق الحقول الفعلي |

يُنشئ مسار الرفع الخادمي المشترك سجل الوسيط وسجل التدقيق بعد نجاح التخزين، ثم يضيف المحرر نتيجة الرفع إلى المنتقي الهدف (`select.value = result.url`) قبل حفظ النموذج. وقد اختُبر هذا المسار بعزل الاعتمادات حتى لا تُنشأ ملفات أو سجلات اختبارية في بيئة الإنتاج.

لا تدعم وحدة **الخدمات** وسيطاً مستقلاً في نموذج البيانات الحالي؛ فهي تعرض رموزاً نصية وعناوين وبنوداً فقط. لذلك لا تُضاف إليها خانة صورة مصطنعة أو رابط يدوي لا يستخدمه موقع الزائر.
