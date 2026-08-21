import { describe, expect, it } from "vitest";

const PLATFORM_LOGO_PATH = "/manus-storage/wajibat-plus-site-logo_7728b19c.jpg";

describe("إعداد شعار واجبات بلس كأيقونة للنطاق", () => {
  it("يشير إلى شعار المنصة ولا يشير إلى صورة شخصية", () => {
    const configuredLogo = process.env.VITE_APP_LOGO ?? "";

    expect(configuredLogo).toBe(PLATFORM_LOGO_PATH);
    expect(configuredLogo).not.toContain("user_upload_by_module/web_dev_logo");
    expect(configuredLogo).not.toContain("personal");
    expect(configuredLogo).toMatch(/^\/manus-storage\/[\w-]+\.(jpg|jpeg|png|webp|svg)$/i);
  });
});
