import { describe, expect, it } from "vitest";
import { getWebAuthnContext } from "./webAuthnContext";

describe("getWebAuthnContext", () => {
  it("uses the explicit secure browser origin when Android provides it", () => {
    expect(getWebAuthnContext({
      origin: "https://uploadplus-47dkogbk.manus.space",
      host: "uploadplus-47dkogbk.manus.space",
    })).toEqual({
      origin: "https://uploadplus-47dkogbk.manus.space",
      rpId: "uploadplus-47dkogbk.manus.space",
    });
  });

  it("falls back to trusted reverse-proxy headers when same-origin Android requests omit Origin", () => {
    expect(getWebAuthnContext({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "uploadplus-47dkogbk.manus.space",
    })).toEqual({
      origin: "https://uploadplus-47dkogbk.manus.space",
      rpId: "uploadplus-47dkogbk.manus.space",
    });
  });

  it("rejects an explicit origin from a different site", () => {
    expect(() => getWebAuthnContext({
      origin: "https://attacker.example",
      host: "uploadplus-47dkogbk.manus.space",
    })).toThrow("لا يطابق نطاق لوحة المالك");
  });
});
