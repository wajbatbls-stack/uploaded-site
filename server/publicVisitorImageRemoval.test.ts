import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicEntry = fs.readFileSync(path.join(root, "client/public/index.html"), "utf8");
const devEntry = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "client/public/assets/js/site-app-r42.js"), "utf8");
const extension = fs.readFileSync(path.join(root, "client/public/assets/js/site-app-r43.js"), "utf8");
const vite = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");

describe("public visitor image removal", () => {
  it("loads the image-free public application release from both visitor entries", () => {
    expect(publicEntry).toContain("site-app-r43.js?v=sv53-motion-strip");
    expect(devEntry).toContain("site-app-r43.js?v=sv53-motion-strip");
    expect(extension).toContain('import "./site-app-r46.js"');
  });

  it("does not restore the former personal image as a default logo", () => {
    expect(app).toContain('let logoUrl = ""');
    expect(app).toContain('logoUrl = String(siteSettings.logoUrl || "").trim()');
    expect(app).not.toContain("c9haZQXaJt4uRTkEadgd4A");
  });

  it("includes the new visitor releases in production asset copying", () => {
    expect(vite).toContain('source: "assets/js/site-app-r42.js"');
    expect(vite).toContain('source: "assets/js/site-app-r43.js"');
    expect(vite).toContain('source: "assets/js/site-app-r44.js"');
    expect(vite).toContain('source: "assets/js/site-app-r45.js"');
    expect(vite).toContain('source: "assets/js/site-app-r46.js"');
    expect(vite).toContain('source: "js/site-app-r43.js"');
  });
});
