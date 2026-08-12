import { describe, expect, it } from "vitest";
import { sortRecentArticles } from "./db";

describe("sortRecentArticles", () => {
  it("يعرض أحدث المقالات وفق تاريخ النشر العربي وليس وفق موضعها في المحتوى", () => {
    const sorted = sortRecentArticles([
      { title: "الأقدم", publishedText: "20 أبريل 2024" },
      { title: "الأحدث", publishedText: "15 مايو 2024" },
      { title: "متوسط الحداثة", publishedText: "01 مايو 2024" },
    ]);

    expect(sorted.map(article => article.title)).toEqual(["الأحدث", "متوسط الحداثة", "الأقدم"]);
  });
});
