import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("هيكل معرض التواصل", () => {
  it("يعرض جميع القنوات في الدليل الجديد ويحافظ على نموذج الرسالة", () => {
    const app = read("client/public/assets/js/site-app-r46.js");
    expect(app).toContain('class="contact-galleria"');
    expect(app).toContain('class="galleria-channel-rail"');
    expect(app).toContain('class="galleria-contact-form"');
    expect(app).toContain('cards.map((card, index) => channelCard(card, channelClass(card), index))');
  });

  it("يربط طبقة التصميم الجديدة في مداخل الزوار والإنتاج", () => {
    const source = read("client/index.html");
    const publicEntry = read("client/public/index.html");
    const vite = read("vite.config.ts");
    expect(source).toContain("site-contact-blog-faq-r7.css?v=sv52-galleria-consulting");
    expect(publicEntry).toContain("site-contact-blog-faq-r7.css?v=sv52-galleria-consulting");
    expect(vite).toContain('assets/css/site-contact-blog-faq-r7.css');
  });
});
