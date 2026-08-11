import { describe, expect, it } from "vitest";
import { decodeAdminImage } from "./adminUpload";

describe("decodeAdminImage", () => {
  it("accepts a permitted image data URL and rejects an unsupported type", () => {
    const data = "data:image/png;base64,aGVsbG8=";
    expect(decodeAdminImage(data, "image/png").bytes.toString()).toBe("hello");
    expect(() => decodeAdminImage("data:text/plain;base64,aGVsbG8=", "text/plain")).toThrow("صيغة الصورة غير مدعومة");
  });
});
