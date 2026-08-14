# حالة تطوير «إدارة اتصل بنا» — جلسة 2026-08-14

## ما هو مكتمل ومثبت (68/68 اختبار، بناء إنتاج سليم، checkpoint منشور c19e7dfe — أحدث checkpoint)

### الخادم
- `drizzle/schema.ts` سطور 360-452: 5 جداول قنوات اتصال (whatsapp/mobile/email/addresses/socials) + contact_messages موجود في مكان آخر من schema.
- `server/db.ts` سطور 823-1035: contactTableFor، listContactChannels (873-914)، listContactChannelsPublic (916-918)، migrateLegacyContactChannels من siteSettings (920-946)، createContactChannel (948-974)، updateContactChannel (985-1008)، deleteContactChannel (1011-1018)، setContactChannelVisibility (1020-1027)، moveContactChannel (1029+).
- `server/db.ts` سطور 259-265: createContactMessage يحفظ رسائل الزوار.
- `server/contact.ts`: router رفيع — publicList/list (81-93) + create/update/delete/setVisibility/move مع تدقيق سجل (94-127).
- `server/routers.ts` سطور 333-342: site.submitContact يتحقق name/phone/email/subject/message → createContactMessage → notifyOwner (غير متزامن) ثم success. مثبت على site.contact وadmin.contact.

### لوحة الإدارة
- `admin-contact-manager-r4.js` (بصمة contact-r4): مدير كامل بـ activate()/renderInto(container). 5 أنواع: whatsapp/mobile/email/address/social. 6 أشكال (circle/square/rectangle/card/icon-only/large-card) مع shapeCss وpreview حي #shape-preview. 20 لون جاهز + إدخال hex. رفع صورة مباشر (4MB حد) عبر API.uploadImage → pendingImage → يحفظ مع النموذج. إظهار/إخفاء، تحريك ↑↓، حذف بنافذة تأكيد داخلية، تعديل (يملأ النموذج)، حفظ/إلغاء. toast نجاح عربي.
- `admin-app-r21.js`: labels.contact + navSections "التواصل": requests/contact/messages/submittedReviews. سطور 55-63 تركب window.WajbatContactManager في `<section data-contact-workspace>`. سطور 73-86 توجيه data-contact-nav. معاينة الموقع العامة `href="/"` في الشريط العلوي.
- `admin.html`: يحمل admin-contact-manager-r4.js?v=contact-r4 مع آلية احتياطية بعد 4 ثوانٍ.

### موقع الزائر
- `site-app-r13.js`:
  - buildContactCards (509-543): من managedContact.channels (غير social)، أيقونات ◉/☎/✉/⌖، wa.me للواتساب (wa(""))، tel:+ للجوال، mailto: للبريد، صور مصغرة contact-thumb، fallback للميراث siteSettings إن كانت القائمة فارغة.
  - dynamicSocialRow (549-573): أشكال 6 مع CSS مطابق للأشكال، ألوان accent/bg/border/text، PLATFORM_SYMBOLS، أسماء في rectangle/card/large-card، safeHref + target _blank.
  - loadSiteContact (575-583): rpcQuery site.contact.publicList ثم render إن كنا في /contact.
  - contactPage (585-587): النموذج data-form="contact" (name/phone/email/subject/message)، خريطة الرياض iframe، وسائل تواصل في card.

### اختبارات
- server/downloadsAssets.test.ts (سطر 16-20): يتحقق من site-app-r13.js (حدث من r12).
- server/ownerLoginR13Assets.test.ts (سطر 46): يتحقق من site-app-r13.js.
- 68/68 اختبار ناجح، pnpm build نجح.

## المتبقي / التحقق
- بند 296 (معاينة كزائر لقسم اتصل بنا داخل الإدارة): التغطية الحالية هي معاينة الموقع العام «معاينة الموقع» href="/" في الشريط العلوي — تحقق تقريبي. يمكن إضافة زر «معاينة كزائر» يفتح /#/contact لكن التغطية الموجودة تعتبر كافية جزئياً.
- بند 293 (بريد استقبال الرسائل في إعدادات القسم/الموقع): موجود ضمن siteSettings (email) ويستخدمه الخادم notifyOwner — التحقق موجود مسبقاً في اختبارات أخرى.
- قناة اختبارية «تويتر بلاس» في قاعدة البيانات يجب حذفها قبل النشر (اختبار تفاعلي سابق).
- بنود todo.md 286-301 كلها [ ] حاليًا — تحتاج تحديث إلى [x] بعد اكتمال التدقيق.

## بيانات مهمة
- رابط الزائر: https://uploadplus-47dkogbk.manus.space
- رابط الإدارة: https://uploadplus-47dkogbk.manus.space/admin
- ADMIN_EMAIL = bdalslamanwralajsh@gmail.com / ADMIN_PASSWORD = abd77312
- auto-publish مفعّل: كل checkpoint يُنشر تلقائياً.
- ملفات: admin-app-r21.js، admin-contact-manager-r4.js، site-app-r13.js.

## فحص مباشر على الإنتاج (2026-08-14 15:50)
- حُذفت قناة الاختبار «تويتر بلاس» (id 30001) من contact_socials — أصبح العدد 0.
- صفحة /#/contact المنشورة تعرض بنجاح: بطاقات واتساب (wa.me/966567680470)، جوال (tel:)، بريد (mailto:wajbatbls@gmail.com)، ساعات العمل، العنوان، وسائل التواصل (fallback القديم لأن لا توجد قنوات اجتماعية مضافة)، زر واتساب الفوري، ونموذج «أرسل لنا رسالة» بالحقول الخمسة (الاسم، الجوال، البريد، الموضوع، الرسالة) وزر الإرسال، وخريطة الموقع. التصميم الأصلي محفوظ بالكامل.
- المتبقي: إرسال رسالة تجريبية من النموذج للتحقق من حفظها في contact_messages ثم حذفها.

## نتائج الاختبار التفاعلي النهائي (2026-08-14 15:52)
أُرسلت رسالة تجريبية من نموذج «أرسل لنا رسالة» في الإنتاج فظهرت رسالة النجاح العربية «تم إرسال رسالتك ✓ سنقوم بالرد عليك في أقرب وقت ممكن»، ووُجدت الرسالة في جدول contact_messages بالاسم والرقم والموضوع وحالة new، ثم حُذفت للتحقق من تنظيف البيانات (العدد أصبح 0). صفحة اتصل بنا المنشورة تعرض: قنوات واتساب/جوال/بريد/عنوان/ساعات العمل من البيانات المدارة (واستغنى النظام عن بيانات الكود القديمة لأن الهجرة الميراثية لم تُفعّل — fallback موجود فقط عند فراغ القائمة)، نموذج الرسالة بالحقول الخمسة، وسائل التواصل، وزر واتساب الفوري، والخريطة — والتصميم الأصلي سليم بالكامل.
