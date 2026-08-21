import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("هيكل استوديو التواصل", () => {
  it("يعرض جميع القنوات في الدليل الجديد ويحافظ على نموذج الرسالة", () => {
    const app = read("client/public/assets/js/site-app-r44.js");
    expect(app).toContain('class="contact-atelier"');
    expect(app).toContain('class="atelier-route-list"');
    expect(app).toContain('class="atelier-contact-form"');
    expect(app).toContain('cards.map((card, index) => channelCard(card, channelClass(card), index))');
  });

  it("يربط طبقة التصميم الجديدة في مداخل الزوار والإنتاج", () => {
    const source = read("client/index.html");
    const publicEntry = read("client/public/index.html");
    const vite = read("vite.config.ts");
    expect(source).toContain("site-contact-blog-faq-r6.css?v=sv51-atelier-royal");
    expect(publicEntry).toContain("site-contact-blog-faq-r6.css?v=sv51-atelier-royal");
    expect(vite).toContain('assets/css/site-contact-blog-faq-r6.css');
  });
});
