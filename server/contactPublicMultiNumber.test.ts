import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/public/assets/js/site-app-r44.js"), "utf8");

describe("عرض قنوات الاتصال العامة", () => {
  it("يعرض كل قنوات الاتصال ولا يختار الرقم الأول فقط", () => {
    expect(source).toContain('const allChannels = cards.map((card) => chip(card, channelClass(card))).join("");');
    expect(source).not.toContain("cards.find((c) => c[0] === \"◉\")");
    expect(source).not.toContain("cards.find((c) => c[0] === \"☎\")");
  });

  it("يربط كل رقم واتساب برقمه المحفوظ نفسه", () => {
    expect(source).toContain('href = "https://wa.me/" + number.replace(/^\\+/, "")');
    expect(source).not.toContain('value = "+" + number; href = wa("")');
  });
});
