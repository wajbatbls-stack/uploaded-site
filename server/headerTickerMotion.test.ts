import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("شريط التواصل المتحرك", () => {
  it("يفصل النص عن شرائح الأرقام ولا يعيد استخدام مسار الحركة القديم", () => {
    const app = read("client/public/assets/js/site-app-r49.js");
    expect(app).toContain('class="ticker ticker-motion"');
    expect(app).toContain('class="ticker-message-track"');
    expect(app).toContain('class="ticker-number-chip"');
    expect(app).toContain("function buildTickerContent(text)");
    expect(app).not.toContain('class="ticker ticker-pro"');
  });

  it("يربط طبقة الحركة الجديدة في مداخل الزوار وبناء الإنتاج", () => {
    const source = read("client/index.html");
    const publicEntry = read("client/public/index.html");
    const vite = read("vite.config.ts");
    const styles = read("client/public/assets/css/site-ticker-r1.css");
    expect(source).toContain("site-ticker-r1.css?v=sv53-motion-strip");
    expect(publicEntry).toContain("site-ticker-r1.css?v=sv53-motion-strip");
    expect(vite).toContain('assets/css/site-ticker-r1.css');
    expect(styles).toContain("@keyframes ticker-message-drift");
    expect(styles).toContain("prefers-reduced-motion");
  });
});
