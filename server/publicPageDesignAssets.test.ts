import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("طبقة تصميم الصفحات العامة sv34", () => {
  it("تربط طبقات الاتصال والمدونة والأسئلة الشائعة في مدخلي الزوار", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");
    expect(sourceEntry).toContain("site-contact-blog-faq-r2.css?v=sv47-contact-studio");
    expect(publicEntry).toContain("site-contact-blog-faq-r2.css?v=sv47-contact-studio");
    expect(sourceEntry).toContain("site-contact-blog-faq-r3.css?v=sv48-burgundy-concierge");
    expect(publicEntry).toContain("site-contact-blog-faq-r3.css?v=sv48-burgundy-concierge");
    expect(sourceEntry).toContain("site-contact-blog-faq-r4.css?v=sv49-navy-gold-atlas");
    expect(publicEntry).toContain("site-contact-blog-faq-r4.css?v=sv49-navy-gold-atlas");
    expect(sourceEntry).toContain("site-contact-blog-faq-r5.css?v=sv50-royal-hall");
    expect(publicEntry).toContain("site-contact-blog-faq-r5.css?v=sv50-royal-hall");
    expect(sourceEntry).toContain("site-contact-blog-faq-r6.css?v=sv51-atelier-royal");
    expect(publicEntry).toContain("site-contact-blog-faq-r6.css?v=sv51-atelier-royal");
    expect(sourceEntry).toContain("site-contact-blog-faq-r7.css?v=sv52-galleria-consulting");
    expect(publicEntry).toContain("site-contact-blog-faq-r7.css?v=sv52-galleria-consulting");
  });

  it("ينسخ طبقة sv34 إلى بناء الإنتاج ويستهدف القوالب الحقيقية فقط", () => {
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-contact-blog-faq-r2.css");
    expect(vite).toContain('{ source: "assets/css/site-contact-blog-faq-r2.css", destination: "assets/css/site-contact-blog-faq-r2.css" }');
    expect(styles).toContain(".contact-r2-hero");
    expect(styles).toContain(".contact-r2-chips");
    expect(styles).toContain(".contact-page");
  });
  it("يربط طبقة sv48 التي تستبدل هوية اتصل بنا بتصميم مختلف كليًا", () => {
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-contact-blog-faq-r3.css");
    expect(vite).toContain('{ source: "assets/css/site-contact-blog-faq-r3.css", destination: "assets/css/site-contact-blog-faq-r3.css" }');
    expect(styles).toContain(".contact-couture");
    expect(styles).toContain(".contact-couture .contact-r2-hero");
    expect(styles).toContain(".contact-couture .contact-r2-chips");
    expect(styles).toContain("body.dark .contact-couture");
  });

  it("يربط طبقة sv49 المرئية التي تستبدل هوية اتصل بنا الفعلية", () => {
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-contact-blog-faq-r4.css");
    expect(vite).toContain('{ source: "assets/css/site-contact-blog-faq-r4.css", destination: "assets/css/site-contact-blog-faq-r4.css" }');
    expect(styles).toContain(".contact-atlas");
    expect(styles).toContain(".contact-atlas .contact-r2-hero");
    expect(styles).toContain(".contact-atlas .contact-r2-chips");
  });

  it("ينسخ طبقة sv50 الملكية كطبقة تاريخية ويربط الهيكل المستبدل بالكامل في sv51", () => {
    const vite = projectFile("vite.config.ts");
    const royalStyles = projectFile("client/public/assets/css/site-contact-blog-faq-r5.css");
    const atelierStyles = projectFile("client/public/assets/css/site-contact-blog-faq-r6.css");
    const app = projectFile("client/public/assets/js/site-app-r44.js");
    expect(vite).toContain('{ source: "assets/css/site-contact-blog-faq-r5.css", destination: "assets/css/site-contact-blog-faq-r5.css" }');
    expect(royalStyles).toContain(".contact-royal");
    expect(royalStyles).toContain(".royal-marquee");
    expect(vite).toContain('{ source: "assets/css/site-contact-blog-faq-r6.css", destination: "assets/css/site-contact-blog-faq-r6.css" }');
    expect(atelierStyles).toContain(".contact-atelier");
    expect(atelierStyles).toContain(".atelier-workspace");
    expect(app).toContain('class="contact-atelier"');
  });

  it("يربط طبقة sv52 الاستشارية بالهيكل التحريري الجديد", () => {
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-contact-blog-faq-r7.css");
    const app = projectFile("client/public/assets/js/site-app-r45.js");
    expect(vite).toContain('{ source: "assets/css/site-contact-blog-faq-r7.css", destination: "assets/css/site-contact-blog-faq-r7.css" }');
    expect(vite).toContain('{ source: "assets/js/site-app-r45.js", destination: "assets/js/site-app-r45.js" }');
    expect(styles).toContain(".contact-galleria");
    expect(styles).toContain(".galleria-letter");
    expect(app).toContain('class="contact-galleria"');
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

  it("يربط طبقة sv38 التي تعيد بناء هوية التحميلات في نقاط النشر والبناء", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-downloads-r2.css");

    expect(sourceEntry).toContain("site-downloads-r2.css?v=sv38-downloads-library");
    expect(publicEntry).toContain("site-downloads-r2.css?v=sv38-downloads-library");
    expect(vite).toContain('{ source: "assets/css/site-downloads-r2.css", destination: "assets/css/site-downloads-r2.css" }');
    expect(styles).toContain(".dl11-library .dl10-hero");
    expect(styles).toContain(".dl11-library .dl10-tab-active");
    expect(styles).toContain(".dl11-library .dl10-file");
    expect(styles).toContain("body.dark .dl11-library");
  });

  it("يربط طبقة sv40 التي تعيد بناء هوية الخدمات في نقاط النشر والبناء", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");
    const vite = projectFile("vite.config.ts");
    const styles = projectFile("client/public/assets/css/site-services-r4.css");

    expect(sourceEntry).toContain("site-services-r4.css?v=sv40-services-studio");
    expect(publicEntry).toContain("site-services-r4.css?v=sv40-services-studio");
    expect(vite).toContain('{ source: "assets/css/site-services-r4.css", destination: "assets/css/site-services-r4.css" }');
    expect(styles).toContain("body .svc24-hero");
    expect(styles).toContain("body .svc24-card");
    expect(styles).toContain("body .svc24-sub-grid");
    expect(styles).toContain("body.dark .svc24-wrap");
  });
});
