import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("طبقة تصميم الصفحات العامة sv34", () => {
  it("تربط طبقة الاتصال والمدونة والأسئلة الشائعة في مدخلي الزوار", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");
    expect(sourceEntry).toContain("site-contact-blog-faq-r1.css?v=sv34-public-pages");
    expect(publicEntry).toContain("site-contact-blog-faq-r1.css?v=sv34-public-pages");
  });

  it("ينسخ طبقة sv34 إلى بناء الإنتاج ويستهدف القوالب الحقيقية فقط", () => {
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-contact-blog-faq-r1.css");
    expect(vite).toContain('{ source: "assets/css/site-contact-blog-faq-r1.css", destination: "assets/css/site-contact-blog-faq-r1.css" }');
    expect(styles).toContain(".contact-page");
    expect(styles).toContain(".article-card");
    expect(styles).toContain(".faq-list");
    expect(styles).toContain("body.dark");
  });

  it("يربط طبقة sv35 الخاصة بصفحة من نحن في نقاط النشر والبناء", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-about-r1.css");

    expect(sourceEntry).toContain("site-about-r1.css?v=sv35-about-story");
    expect(publicEntry).toContain("site-about-r1.css?v=sv35-about-story");
    expect(vite).toContain('{ source: "assets/css/site-about-r1.css", destination: "assets/css/site-about-r1.css" }');
    expect(styles).toContain(".about-box");
    expect(styles).toContain(".goal-card");
    expect(styles).toContain("body.dark");
  });

  it("يربط طبقة sv36 الخاصة بشركاء النجاح في نقاط النشر والبناء", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-partners-r1.css");

    expect(sourceEntry).toContain("site-partners-r1.css?v=sv36-partners");
    expect(publicEntry).toContain("site-partners-r1.css?v=sv36-partners");
    expect(vite).toContain('{ source: "assets/css/site-partners-r1.css", destination: "assets/css/site-partners-r1.css" }');
    expect(styles).toContain(".partner-pro-card");
    expect(styles).toContain(".partner-pro-badge");
    expect(styles).toContain("body.dark");
  });

  it("يربط طبقة sv37 التي تستبدل تجربة بطاقات الشركاء كليًا", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-partners-r2.css");

    expect(sourceEntry).toContain("site-partners-r2.css?v=sv37-partners-rebuilt");
    expect(publicEntry).toContain("site-partners-r2.css?v=sv37-partners-rebuilt");
    expect(vite).toContain('{ source: "assets/css/site-partners-r2.css", destination: "assets/css/site-partners-r2.css" }');
    expect(styles).toContain(".partner-grid-pro");
    expect(styles).toContain(".partner-pro-card");
    expect(styles).toContain(".partner-pro-card:first-child");
    expect(styles).toContain("body.dark");
  });
});
