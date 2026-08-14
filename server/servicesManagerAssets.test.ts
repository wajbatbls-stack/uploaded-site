import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProject = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("مدير الخدمات الهرمي", () => {
	it("يحفظ الشجرة عبر إجراء الإدارة المحمي ويحافظ على مفاتيح الترتيب والإظهار", () => {
		const manager = readProject("client/public/assets/js/admin-services-manager-r2.js");
		expect(manager).toContain('api.saveCollection("services", services)');
    expect(manager).toContain("sortOrder:i");
    expect(manager).toContain("sortOrder:x");
		expect(manager).toContain("isVisible");
	});

	it("يتوافق مع استدعاء workspace في تطبيق الإدارة ثم يركّب المدير بعد إدراج الحاوية", () => {
		const manager = readProject("client/public/assets/js/admin-services-manager-r2.js");
		const app = readProject("client/public/assets/js/admin-app-r18.js");
		expect(app).toContain("WajbatServicesManager.workspace(data)");
			expect(manager).toContain("workspace(data)");
			expect(manager).toContain('data-services-manager');
			expect(manager).toContain("queueMicrotask(mountAfterDashboard)");
			expect(manager).toContain("this.mount({ ...context, root })");
			expect(app).toContain("function mountCompatibleServicesManager()");
			expect(app).toContain('typeof manager?.workspace === "function"');
			expect(app).toContain('manager.mount({ ...window.WajbatAdmin, root, content: () => content("services") })');
	});

	it("يربط زر الخدمات في القائمة الجانبية مباشرةً حتى لا يعتمد على تفويض النقر العام وحده", () => {
		const app = readProject("client/public/assets/js/admin-app-r18.js");
		const page = readProject("client/public/admin.html");
		expect(app).toContain("function bindSidebarNavigation()");
		expect(app).toContain('document.querySelectorAll(".side-menu [data-select]")');
		expect(app).toContain("bindSidebarNavigation();");
			expect(page).toContain("services-nav-fix-r4");
	});

	it("يحمّل مدير روابط الزوار ببصمة إصدار تمنع تنفيذ نسخة قديمة مخزنة مؤقتاً", () => {
		const page = readProject("client/public/admin.html");
		expect(page).toContain("admin-visitor-links-manager-r4.js?v=visitor-links-r4-load");
	});

	  it("يوفر الرفع المباشر والحذف المؤكد وترتيب السحب للخدمات والخدمات الفرعية", () => {
    const manager = readProject("client/public/assets/js/admin-services-manager-r2.js");
    expect(manager).toContain("api.uploadMedia(file)");
    expect(manager).toContain("confirm(`هل أنت متأكد من حذف");
    expect(manager).toContain("data-drag-service");
    expect(manager).toContain('addEventListener("drop"');
  });

  it("يطبق إعدادات القسم وبطاقات الخدمة على صفحة الخدمات العامة", () => {
    const app = readProject("client/public/assets/js/app.js");
    const css = readProject("client/public/assets/css/services-manager-r2.css");
    expect(app).toContain("managedServicesStyle");
    expect(app).toContain("services-page-managed");
    expect(app).toContain("servicesStyle.title");
    expect(css).toContain("--services-columns");
    expect(css).toContain("data-services-layout");
  });

  it("يوفر لوحة تصميم ومعاينة فورية وحقول زر الخدمة والوجهة", () => {
    const manager = readProject("client/public/assets/js/admin-services-manager-r2.js");
    const app = readProject("client/public/assets/js/app.js");
    expect(manager).toContain("تصميم القسم");
    expect(manager).toContain("معاينة فورية");
    expect(manager).toContain("buttonLink");
    expect(manager).toContain("iconImageUrl");
    expect(manager).toContain("backgroundImageUrl");
    expect(app).toContain("serviceButtonHref");
    expect(app).toContain("serviceSurfaceStyle");
    expect(app).toContain("buttonTextColor");
  });
});
