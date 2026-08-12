# قالب إعدادات البيئة

أنشئ ملف البيئة السري في منصة الاستضافة أو على الخادم من القيم التالية. لا تضع قيماً فعلية في الحزمة أو في مستودع عام.

| المتغير | قيمة نموذجية | الاستخدام |
|---|---|---|
| `NODE_ENV` | `production` | تشغيل الخادم في نمط الإنتاج. |
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DB_NAME` | اتصال MySQL أو TiDB. |
| `JWT_SECRET` | سر عشوائي طويل | توقيع جلسات المالك. |
| `ADMIN_EMAIL` | `owner@example.com` | بريد المالك الأولي. |
| `ADMIN_PASSWORD` | كلمة مرور قوية | كلمة مرور المالك الأولية. |
| `S3_ENDPOINT` | `https://s3.example.com` | نقطة نهاية مزود S3؛ اختيارية مع AWS. |
| `S3_REGION` | `auto` | منطقة S3. |
| `S3_BUCKET` | `wajbat-plus-files` | حاوية الملفات. |
| `S3_ACCESS_KEY_ID` | مفتاح وصول | اعتماد رفع الملفات. |
| `S3_SECRET_ACCESS_KEY` | سر الوصول | اعتماد رفع الملفات. |
| `S3_PUBLIC_BASE_URL` | `https://cdn.example.com` | رابط CDN أو النطاق العام للملفات. |

متغيرات Manus مثل `BUILT_IN_FORGE_API_KEY` و`OAUTH_SERVER_URL` اختيارية للتشغيل المستقل، ولا تُستخدم إلا عند تفعيل التكاملات الخاصة بالمنصة.
