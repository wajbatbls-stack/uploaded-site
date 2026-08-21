import { describe, expect, it } from "vitest";

const PUBLISHED_ORIGIN = "https://uploadplus-47dkogbk.manus.space";
const PLATFORM_LOGO_PATH = "/manus-storage/wajibat-plus-site-logo_7728b19c.jpg";

describe("إعداد شعار واجبات بلس كأيقونة للنطاق", () => {
  it("يشير إلى شعار المنصة المتاح ولا يشير إلى صورة شخصية", async () => {
    const configuredLogo = process.env.VITE_APP_LOGO ?? "";

    expect(configuredLogo).toBe(PLATFORM_LOGO_PATH);
    expect(configuredLogo).not.toContain("user_upload_by_module/web_dev_logo");
    expect(configuredLogo).not.toContain("personal");

    const response = await fetch(`${PUBLISHED_ORIGIN}${configuredLogo}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type") ?? "").toMatch(/^image\//i);
  });
});
