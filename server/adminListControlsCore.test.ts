import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

function loadPagination() {
  const source = readFileSync(new URL("../client/public/assets/js/admin-list-controls-core.js", import.meta.url), "utf8");
  const context: { window: Record<string, unknown>; Object: ObjectConstructor; Math: Math; Number: NumberConstructor } = { window: {}, Object, Math, Number };
  vm.runInNewContext(source, context);
  return context.window.WajbatAdminListCore as { pagination: (total: number, page: number, perPage: number) => { page: number; totalPages: number; start: number; end: number; hasPrevious: boolean; hasNext: boolean }; filterRecords: <T extends { searchText: string; filterValue: string }>(records: T[], term: string, filter: string) => T[] };
}

describe("نواة ترقيم قوائم الإدارة", () => {
  it("تنقل بين الصفحة التالية والسابقة ضمن حدود العناصر من دون إنشاء أو تعديل أي سجل", () => {
    const { pagination } = loadPagination();
    expect(pagination(17, 1, 8)).toMatchObject({ page: 1, totalPages: 3, start: 0, end: 8, hasPrevious: false, hasNext: true });
    expect(pagination(17, 2, 8)).toMatchObject({ page: 2, totalPages: 3, start: 8, end: 16, hasPrevious: true, hasNext: true });
    expect(pagination(17, 1, 8)).toMatchObject({ page: 1, hasPrevious: false, hasNext: true });
    expect(pagination(17, 99, 8)).toMatchObject({ page: 3, totalPages: 3, start: 16, end: 24, hasPrevious: true, hasNext: false });
  });

  it("يطبق مرشح كل وحدة على الصفوف المطابقة فقط دون أي قراءة أو كتابة لقاعدة البيانات", () => {
    const { filterRecords } = loadPagination();
    const records = [
      { searchText: "طلب جديد", filterValue: "جديد" },
      { searchText: "رسالة مقروءة", filterValue: "مقروءة" },
      { searchText: "تقييم منشور", filterValue: "منشور" },
      { searchText: "صورة شعار", filterValue: "image" },
      { searchText: "ملف PDF", filterValue: "file" },
    ];
    expect(filterRecords(records, "", "جديد")).toEqual([records[0]]);
    expect(filterRecords(records, "", "مقروءة")).toEqual([records[1]]);
    expect(filterRecords(records, "", "منشور")).toEqual([records[2]]);
    expect(filterRecords(records, "", "image")).toEqual([records[3]]);
    expect(filterRecords(records, "", "file")).toEqual([records[4]]);
    expect(filterRecords(records, "تقييم", "منشور")).toEqual([records[2]]);
  });
});
