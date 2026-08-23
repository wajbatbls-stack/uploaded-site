import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("بداية الصفحة الرئيسية", () => {
  it("يلغي التعويض العلوي القديم عندما تكون الترويسة داخل تدفق الصفحة الرئيسية", () => {
    const styles = read("client/public/assets/css/site-layout-r1.css");
    expect(styles).toContain(".main-shell:has(.hero),body:has(.home-managed-stack) .main-shell{padding-top:0!important}");
    expect(styles).toContain(".main-shell:has(.hero) .page-content,body:has(.home-managed-stack) .page-content{padding-top:0!important}");
  });

  it("يربط طبقة إصلاح المسافة في مداخل الزوار وبناء الإنتاج", () => {
    const source = read("client/index.html");
    const publicEntry = read("client/public/index.html");
    const vite = read("vite.config.ts");
    expect(source).toContain("site-layout-r1.css?v=sv54-home-offset");
    expect(publicEntry).toContain("site-layout-r1.css?v=sv54-home-offset");
    expect(vite).toContain('assets/css/site-layout-r1.css');
  });
});
