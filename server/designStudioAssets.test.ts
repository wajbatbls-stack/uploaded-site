import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("استوديو تصميم الموقع", () => {
  it("يربط الحفظ وسجل النسخ والاستعادة بإجراءات خادمية فعلية", () => {
    const studio = projectFile("client/public/assets/js/admin-design-studio-r2.js");
    const router = projectFile("server/routers.ts");

    expect(studio).toContain('runtime.saveCollection("siteSettings"');
    expect(studio).toContain('admin().query("admin.designHistory"');
    expect(studio).toContain('runtime.mutate("admin.restoreDesignSnapshot"');
    expect(router).toContain("designHistory: ownerProcedure");
    expect(router).toContain("restoreDesignSnapshot: ownerProcedure");
  });

  it("يحتفظ بسجل نسخة سابقة عند حفظ إعدادات التصميم ويعيدها إلى إعدادات الموقع", () => {
    const db = projectFile("server/db.ts");

    expect(db).toContain('if (collectionKey === "siteSettings")');
    expect(db).toContain("db.insert(siteDesignHistory)");
    expect(db).toContain('await saveCollection("siteSettings", JSON.parse(snapshot[0].settingsSnapshot))');
  });

  it("يطّبق إعدادات الخلفية والعناصر والترتيب والساعة من المحتوى العام", () => {
    const app = projectFile("client/public/assets/js/app.js");
    const style = projectFile("client/public/assets/css/site-design-r2.css");

    expect(app).toContain("const backgroundType = activeDesign.backgroundType");
    expect(app).toContain("const requestedOrder = Array.isArray(config.sectionOrder)");
    expect(app).toContain("#site-design-clock");
    expect(style).toContain("body[data-site-buttons=");
    expect(style).toContain("body[data-site-frame=");
  });
});
