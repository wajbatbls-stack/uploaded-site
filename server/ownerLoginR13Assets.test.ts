import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("owner login r13 assets", () => {
  it("loads the r13 owner-login assets from the independent admin page", () => {
    const adminHtml = projectFile("client/public/admin.html");
    expect(adminHtml).toContain("admin-r13.css");
    expect(adminHtml).toContain("admin-owner-login-r13-mobile.css");
    expect(adminHtml).toContain("admin-app-r13.js");
    expect(adminHtml).toContain("admin-owner-login-security-r4.js");
  });

  it("keeps the owner-login editor full-width and touch-friendly on phones", () => {
    const css = projectFile("client/public/assets/css/admin-owner-login-r13-mobile.css");
    expect(css).toContain(".owner-login-layout { grid-template-columns: minmax(0, 1fr); }");
    expect(css).toContain("@media (max-width: 600px)");
    expect(css).toContain(".three-col { grid-template-columns: minmax(0, 1fr); gap: 0; }");
  });

  it("limits login-image choices to images uploaded for the owner login screen", () => {
    const app = projectFile("client/public/assets/js/admin-app-r13.js");
    expect(app).toContain('String(item.usage || "").includes("شاشة دخول المالك")');
    expect(app).toContain("option.remove()");
    expect(app).toContain("الصورة المستخدمة حالياً");
  });

  it("uses an automatic device label and a single visible password field for Passkeys", () => {
    const security = projectFile("client/public/assets/js/admin-owner-login-security-r4.js");
    expect(security).toContain('name="passkeyLabel" type="hidden" value="جهاز المالك"');
    expect(security).toContain("تفعيل البصمة على هذا الجهاز");
    expect(security).toContain('const label = "جهاز المالك"');
  });
});
