import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";

describe("إعداد أيقونة الموقع", () => {
  it("يعتمد ملفًا شفافًا لا يحتوي شعارًا أو صورة في إعداد النطاق", async () => {
    const configuredLogo = process.env.VITE_APP_LOGO ?? "";

    expect(configuredLogo).toBe("/manus-storage/wajibat-plus-transparent-favicon_57505e0e.svg");
    expect(configuredLogo).not.toContain("files.manuscdn.com/user_upload_by_module/web_dev_logo");
    expect(configuredLogo).not.toContain("site-logo");

    let requestedPath = "";
    const endpoint = createServer((request, response) => {
      requestedPath = request.url ?? "";
      response.writeHead(204);
      response.end();
    });

    await new Promise<void>((resolve, reject) => {
      endpoint.once("error", reject);
      endpoint.listen(0, "127.0.0.1", resolve);
    });

    try {
      const port = (endpoint.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}${configuredLogo}`, { method: "HEAD" });
      expect(response.status).toBe(204);
      expect(requestedPath).toBe(configuredLogo);
    } finally {
      await new Promise<void>((resolve, reject) => {
        endpoint.close(error => (error ? reject(error) : resolve()));
      });
    }
  });
});
