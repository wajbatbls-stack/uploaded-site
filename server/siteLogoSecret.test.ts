import { describe, expect, it } from "vitest";

describe("إعداد أيقونة الموقع", () => {
  it("يعتمد شعار واجبات بلس بدل صورة الملف الشخصية", () => {
    const configuredLogo = process.env.VITE_APP_LOGO ?? "";

    expect(configuredLogo).toBe("/manus-storage/wajibat-plus-site-logo_7728b19c.jpg");
    expect(configuredLogo).not.toContain("files.manuscdn.com/user_upload_by_module/web_dev_logo");
  });
});
