import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("owner login current assets", () => {
  it("loads the current owner-login assets from the independent admin page", () => {
    const adminHtml = projectFile("client/public/admin.html");
    expect(adminHtml).toContain("admin-r14.css");
    expect(adminHtml).toContain("admin-owner-login-r13-mobile.css");
    expect(adminHtml).toContain("admin-app-r30.js");
    expect(adminHtml).toContain("admin-downloads-manager-r17.js");
    expect(adminHtml).toContain("admin-design-studio-r2.js");
    expect(adminHtml).toContain("admin-services-manager-r2.js");
    expect(adminHtml).toContain("admin-services-r2.css");
    expect(adminHtml).toContain("admin-owner-login-security-r6.js");
    expect(adminHtml).toContain("admin-owner-login-enhancements-r14.js");
  });

  it("keeps the owner-login editor full-width and touch-friendly on phones", () => {
    const css = projectFile("client/public/assets/css/admin-owner-login-r13-mobile.css");
    expect(css).toContain(".owner-login-layout { grid-template-columns: minmax(0, 1fr); }");
    expect(css).toContain("@media (max-width: 600px)");
    expect(css).toContain(".three-col { grid-template-columns: minmax(0, 1fr); gap: 0; }");
  });

  it("removes the public gallery from login-image controls and preserves only direct upload bindings", () => {
    const app = projectFile("client/public/assets/js/admin-app-r16.js");
    expect(app).toContain('input[type="hidden"][name="${kind}MediaId"]');
    expect(app).toContain("استخدم حقل الرفع المجاور");
    expect(app).toContain("replaceOwnerLoginMediaSelects(); enhanceOwnerLoginForm();");
  });

  it("uses an automatic device label and a single visible password field for Passkeys", () => {
    const security = projectFile("client/public/assets/js/admin-owner-login-security-r6.js");
    expect(security).toContain('name="passkeyLabel" type="hidden" value="جهاز المالك"');
    expect(security).toContain("تفعيل البصمة على هذا الجهاز");
    expect(security).toContain('const label = "جهاز المالك"');
  });

  it("publishes the visitor design layer and versioned entry asset", () => {
    const site = projectFile("client/public/index.html");
    const css = projectFile("client/public/assets/css/site-design-r2.css");
    expect(site).toContain("site-design-r2.css");
    expect(site).toContain("site-app-r33.js");
    expect(site).toContain("style-r3.css");
    expect(projectFile("client/public/assets/css/style-r3.css")).toContain(".contact");
    const app = projectFile("client/public/assets/js/site-app-r33.js");
    expect(app).toContain("contact-social-strip");
    expect(app).toContain("contact-social-icon");
    expect(app).toContain('data-action="contact-scroll"');
    expect(app).not.toContain("iframe class=\"map\"");
    expect(site).toContain("services-manager-r2.css");
    expect(css).toContain("#site-design-clock");
  });
});
