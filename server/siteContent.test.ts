import { describe, expect, it } from "vitest";
import { getPublicSiteContent } from "./db";

describe("site content persistence", () => {
  it("seeds the original content into the database and returns all public collections", async () => {
    const content = await getPublicSiteContent() as Record<string, unknown>;
    expect(Array.isArray(content.services)).toBe(true);
    expect((content.services as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(content.plans)).toBe(true);
    expect(Array.isArray(content.downloads)).toBe(true);
    expect(Array.isArray(content.articles)).toBe(true);
    expect(Array.isArray(content.reviews)).toBe(true);
    expect(Array.isArray(content.partners)).toBe(true);
    expect(Array.isArray(content.faqs)).toBe(true);
    expect(content.siteSettings).toBeTruthy();
  });
});
