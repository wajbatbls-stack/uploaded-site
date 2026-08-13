import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("مساعدات صفحة الخدمات", () => {
  const source = readFileSync(resolve(process.cwd(), "client/public/assets/js/app.js"), "utf8");

  it("يعرّف safeCss في نطاق التطبيق قبل دالة صفحة الخدمات", () => {
    const helperIndex = source.indexOf("const safeCss");
    const servicesIndex = source.indexOf("function servicesPage()");

    expect(helperIndex).toBeGreaterThan(-1);
    expect(servicesIndex).toBeGreaterThan(helperIndex);
  });

  it("يوفر safeHref في نطاق التطبيق لمسارات أزرار الخدمات", () => {
    const helperIndex = source.indexOf('const safeHref = (value, fallback = "#/")');
    const servicesButtonIndex = source.indexOf("function serviceButtonHref");

    expect(helperIndex).toBeGreaterThan(-1);
    expect(servicesButtonIndex).toBeGreaterThan(helperIndex);
  });
});
