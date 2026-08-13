import { describe, expect, it } from "vitest";
import { SITE_SEED } from "./siteSeed";

describe("مرجع واجهة الزائر الأصلية", () => {
  it("يحافظ على مجموعة الخدمات الأصلية وإعدادات الاتصال الأساسية", () => {
    expect(SITE_SEED.services).toHaveLength(15);
    expect(SITE_SEED.services[0]).toMatchObject({
      title: "حل الواجبات الدراسية",
      emoji: "📝",
      sortOrder: 0,
      isVisible: true,
    });
    expect(SITE_SEED.siteSettings).toMatchObject({
      whatsapp: "966567680470",
      tickerText: "مرحباً بكم في واجبات بلس ⭐ نقدم أفضل الخدمات الأكاديمية ⭐ تواصل معنا على واتساب +966567680470",
    });
  });
});
