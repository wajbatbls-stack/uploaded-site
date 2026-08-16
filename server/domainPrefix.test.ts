import { describe, expect, it } from "vitest";

describe("CHANGE_DOMAIN_PREFIX", () => {
  it("uses the restored production domain prefix in a valid HTTPS origin", () => {
    const prefix = process.env.CHANGE_DOMAIN_PREFIX;
    expect(prefix).toBe("uploadplus-47dkogbk");
    expect(new URL(`https://${prefix}.manus.space/`).origin).toBe(
      "https://uploadplus-47dkogbk.manus.space"
    );
  });
});
