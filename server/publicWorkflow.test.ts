import { describe, expect, it } from "vitest";
import { decodeUpload } from "./adminUpload";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const publicContext = {
  user: null,
  req: { headers: {} },
  res: { cookie: () => undefined, clearCookie: () => undefined },
} as unknown as TrpcContext;

describe("رفع المرفقات العامة", () => {
  it("يقبل PDF مدعوماً ويرفض الامتدادات غير المسموح بها", () => {
    const pdf = decodeUpload("data:application/pdf;base64,JVBERi0xLjQ=", "application/pdf");
    expect(pdf.category).toBe("document");
    expect(pdf.extension).toBe("pdf");
    expect(() => decodeUpload("data:text/plain;base64,aGVsbG8=", "text/plain")).toThrow("نوع الملف غير مسموح");
  });
});

describe("نماذج الزوار", () => {
  it("يرفض طلب الواجب غير المكتمل قبل محاولة حفظه", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.site.submitAssignment({
      studentName: "م", studentId: "1", university: "", college: "", course: "", professor: "", serviceType: "", deadline: "اليوم", description: "قصير",
    } as never)).rejects.toBeTruthy();
  });

  it("يتحقق من حد أدنى لمحتوى رسالة التواصل", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.site.submitContact({ name: "م", phone: "12", subject: "س", message: "لا" } as never)).rejects.toBeTruthy();
  });
});
