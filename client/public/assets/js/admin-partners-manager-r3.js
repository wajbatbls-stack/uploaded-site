/*
 * مدير «شركاء النجاح» — لوحة المالك (إصدار r2)
 * يدير الجهات التعليمية المعروضة في صفحة «شركاء النجاح» (جدول partners)
 * مع رفع شعارات من الجهاز مباشرة، تحرير كامل، ونوافذ تأكيد داخلية.
 */
(function () {
  "use strict";

  const TRPC = "/api/trpc";

  const manager = {
    state: {
      partners: [],
      loaded: false,
      loading: false,
      editing: null, // null | { id, name, city, description, kind, link, logoUrl, shape, accentColor, textColor, backgroundColor, borderColor }
    },
    container: null,

    activate() {
      const target = this.container || document.querySelector("[data-partners-workspace]");
      if (!target) return;
      this.container = target;
      this.state.loaded = false;
      void this.load();
    },

    /* --------------------- الاتصال بالخادم --------------------- */
    async request(procedure, input) {
      const suffix = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
      const response = await fetch(`${TRPC}/${procedure}${suffix}`, { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload?.error?.json?.message) || "تعذر الاتصال بالخادم");
      const raw = payload?.result?.data ?? payload?.result;
      const inner = (raw && typeof raw === "object" && "json" in raw) ? raw.json : raw;
      const tail = procedure.split(".").pop();
      if (inner && typeof inner === "object" && !Array.isArray(inner) && tail in inner) return inner[tail];
      return inner;
    },
    async mutate(procedure, input) {
      const response = await fetch(`${TRPC}/${procedure}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ json: input }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload?.error?.json?.message) || "تعذر حفظ التعديلات");
      const raw = payload?.result?.data ?? payload?.result;
      const inner = (raw && typeof raw === "object" && "json" in raw) ? raw.json : raw;
      const tail = procedure.split(".").pop();
      if (inner && typeof inner === "object" && !Array.isArray(inner) && tail in inner) return inner[tail];
      return inner;
    },
    esc(value = "") {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
    },
    toast(message) {
      const element = document.createElement("div");
      element.className = "toast";
      element.textContent = message;
      document.body.append(element);
      window.setTimeout(() => element.remove(), 3200);
    },
    messageOf(error) {
      return error && (error.message || (typeof error === "string" ? error : "حدث خطأ غير متوقع"));
    },

    /* --------------------- التحميل --------------------- */
    async load() {
      if (this.state.loaded || this.state.loading) return;
      this.state.loading = true;
      this.render();
      try {
        const partners = await this.request("admin.partners.listAll");
        this.state.partners = Array.isArray(partners) ? partners : [];
        this.state.loaded = true;
      } finally {
        this.state.loading = false;
        this.render();
      }
    },
    refresh() {
      this.state.loaded = false;
      this.state.loading = false;
      this.state.editing = null;
      void this.load();
    },

    /* --------------------- رفع الشعارات --------------------- */
    async fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("تعذر قراءة الملف من جهازك"));
        reader.readAsDataURL(file);
      });
    },
    async uploadLogo(file, partnerId) {
      if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
        throw new Error("صيغة الشعار غير مدعومة. استخدم PNG أو JPG أو WEBP أو GIF أو SVG.");
      }
      if (file.size > 4 * 1024 * 1024) throw new Error("حجم الشعار يتجاوز 4 ميغابايت");
      const dataUrl = await this.fileToDataUrl(file);
      return this.mutate("admin.partners.uploadLogo", { id: partnerId, mimeType: file.type, dataUrl });
    },

    /* --------------------- العمليات --------------------- */
    emptyForm() {
      return { id: null, name: "", city: "", description: "", kind: "جامعة", link: "", logoUrl: null, shape: "card", accentColor: "#4966d6", textColor: "#ffffff", backgroundColor: "#eef1f8", borderColor: null };
    },
    startNew() {
      this.state.editing = this.emptyForm();
      this.render();
    },
    cancel() {
      this.state.editing = null;
      this.render();
    },
    startEdit(partner) {
      this.state.editing = {
        id: partner.id,
        name: partner.name || "",
        city: partner.city || "",
        description: partner.description || "",
        kind: partner.kind || "جامعة",
        link: partner.link || "",
        logoUrl: partner.logoUrl || null,
        shape: partner.shape || "card",
        accentColor: partner.accentColor || "#4966d6",
        textColor: partner.textColor || "#ffffff",
        backgroundColor: partner.backgroundColor || "#eef1f8",
        borderColor: partner.borderColor || null,
      };
      this.render();
    },
    async deletePartner(id) {
      try {
        await this.mutate("admin.partners.delete", { id });
        this.toast("تم حذف الشريك");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    confirmDelete(id) {
      this.confirmDialog("حذف هذا الشريك؟", "سيُحذف الشريك نهائيًا من قاعدة البيانات مع شعاره.", "حذف الشريك", () => this.deletePartner(id));
    },
    async toggleVisibility(id, isVisible) {
      try {
        await this.mutate("admin.partners.setVisibility", { id, isVisible });
        this.toast(isVisible ? "تم إظهار الشريك للزوار" : "تم إخفاء الشريك عن الزوار");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async move(id, direction) {
      try {
        await this.mutate("admin.partners.move", { id, direction });
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async uploadPartnerLogo(file) {
      const form = this.state.editing;
      if (!form || !form.id) { this.toast("احفظ الشريك أولًا قبل رفع الشعار"); return; }
      try {
        const result = await this.uploadLogo(file, form.id);
        form.logoUrl = result?.url || null;
        this.toast("تم رفع شعار الشريك");
        this.render();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async save() {
      const form = this.state.editing;
      if (!form) return;
      if (!form.name.trim()) { this.toast("اكتب اسم الجهة أولًا"); return; }
      const input = {
        name: form.name.trim(),
        city: form.city ? String(form.city).trim() : undefined,
        description: form.description ? String(form.description).trim() : undefined,
        kind: form.kind || "جامعة",
        link: form.link ? String(form.link).trim() : undefined,
        shape: form.shape || "card",
        accentColor: form.accentColor || "#4966d6",
        textColor: form.textColor || "#ffffff",
        backgroundColor: form.backgroundColor || "#eef1f8",
        borderColor: form.borderColor || null,
      };
      if (input.city === "") delete input.city;
      if (input.description === "") delete input.description;
      if (input.link === "") delete input.link;
      try {
        if (form.id) {
          await this.mutate("admin.partners.update", { id: form.id, data: input });
        } else {
          await this.mutate("admin.partners.create", input);
        }
        this.toast("تم حفظ الشريك في قاعدة البيانات");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    updateShapePreview(root) {
      const preview = root.querySelector("[data-preview-shape]");
      if (!preview || !this.state.editing) return;
      const { shape, accentColor, backgroundColor, borderColor } = this.state.editing;
      preview.dataset.previewShape = shape || "card";
      preview.style.background = backgroundColor || "#eef1f8";
      preview.style.borderColor = borderColor || accentColor || "#4966d6";
      preview.style.color = accentColor || "#4966d6";
    },

    bindProps(root) {
      root.querySelectorAll("[data-partner-prop]").forEach(el => {
        const key = el.dataset.partnerProp;
        if (!key) return;
        const handler = () => {
          if (this.state.editing) this.state.editing[key] = el.value;
          this.updateShapePreview(root);
        };
        el.addEventListener("input", handler);
        el.addEventListener("change", handler);
      });
    },

    confirmDialog(title, body, confirmLabel, onConfirm) {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay blog-confirm-overlay";
      overlay.innerHTML = `<div class="modal-card blog-confirm" role="dialog" aria-modal="true">
        <h4>${this.esc(title)}</h4><p>${this.esc(body)}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-soft" data-partner-confirm-cancel>إلغاء</button>
          <button type="button" class="btn btn-danger" data-partner-confirm-ok>${this.esc(confirmLabel)}</button>
        </div></div>`;
      document.body.append(overlay);
      const close = () => overlay.remove();
      overlay.querySelector("[data-partner-confirm-cancel]").addEventListener("click", close);
      overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
      overlay.querySelector("[data-partner-confirm-ok]").addEventListener("click", () => { close(); onConfirm(); });
    },

    /* --------------------- البناء --------------------- */
    render() {
      if (!this.container) return;
      const { state } = this;
      const root = this.container;

      const head = `
        <div class="workspace-head">
          <div><p class="eyebrow">إدارة المحتوى</p>
            <h2>🏛️ شركاء النجاح</h2>
            <p>أضف الجامعات والمعاهد والجهات التعليمية بشعاراتها، وغيّر ترتيبها وإخفاءها؛ تظهر في صفحة «شركاء النجاح» للزوار.</p>
          </div>
        </div>`;

      if (state.loading || !state.loaded) {
        root.innerHTML = `<section class="workspace side-workspace" data-partners-workspace>${head}<div class="workspace-body"><div class="empty">جارٍ تحميل الشركاء من قاعدة البيانات...</div></div></section>`;
        return;
      }

      const form = state.editing ? this.formSection(state.editing) : "";
      const rows = state.partners.map(partner => this.partnerRow(partner)).join("");
      const visibleCount = state.partners.filter(p => p.isVisible !== false).length;

      root.innerHTML = `<section class="workspace side-workspace" data-partners-workspace>${head}<div class="workspace-body">${form}<div class="section-heading"><h3>الشركاء</h3><p class="eyebrow">${state.partners.length} جهة${state.partners.length !== visibleCount ? ` · ${visibleCount} ظاهرة` : ""}</p><div class="section-actions"><button class="btn btn-small" data-partner-add>+ شريك جديد</button></div></div>${rows ? `<div class="item-list">${rows}</div>` : `<div class="empty">لا توجد جهات بعد. أضف أول جهة تعليمية.</div>`}</div></section>`;

      this.bindProps(root);
      root.querySelectorAll("[data-partner-add]").forEach(btn => btn.addEventListener("click", () => this.startNew()));
      root.querySelectorAll("[data-partner-cancel]").forEach(btn => btn.addEventListener("click", () => this.cancel()));
      root.querySelectorAll("[data-partner-save]").forEach(btn => btn.addEventListener("click", () => this.save()));
      root.querySelectorAll("[data-partner-edit]").forEach(btn => btn.addEventListener("click", () => {
        const item = state.partners.find(p => p.id === Number(btn.dataset.partnerEdit));
        if (item) this.startEdit(item);
      }));
      root.querySelectorAll("[data-partner-toggle]").forEach(btn => btn.addEventListener("click", () => {
        const item = state.partners.find(p => p.id === Number(btn.dataset.partnerToggle));
        if (item) void this.toggleVisibility(item.id, item.isVisible === false);
      }));
      root.querySelectorAll("[data-partner-move]").forEach(btn => btn.addEventListener("click", () => {
        const [raw, direction] = btn.dataset.partnerMove.split(":");
        void this.move(Number(raw), direction);
      }));
      root.querySelectorAll("[data-partner-delete]").forEach(btn => btn.addEventListener("click", () => this.confirmDelete(Number(btn.dataset.partnerDelete))));
      root.querySelectorAll("[data-partner-logo]").forEach(btn => btn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
        input.addEventListener("change", () => { const file = input.files?.[0]; if (file) void this.uploadPartnerLogo(file); });
        input.click();
      }));
    },

    partnerRow(partner) {
      return `<article class="item-row">
        <div class="item-title">
          ${partner.logoUrl ? `<img src="${this.esc(partner.logoUrl)}" alt="" class="blog-row-thumb">` : `<span>🏛</span>`}
          <div><b>${this.esc(partner.name)}</b><br><small>${this.esc(partner.kind || "")}${partner.city ? ` · ${this.esc(partner.city)}` : ""}</small></div>
          <span class="status ${partner.isVisible === false ? "hidden" : ""}">${partner.isVisible === false ? "مخفي" : "ظاهر"}</span>
        </div>
        <div class="row-actions">
          <button class="btn btn-outline btn-small" data-partner-move="${partner.id}:up">↑</button>
          <button class="btn btn-outline btn-small" data-partner-move="${partner.id}:down">↓</button>
          <button class="btn btn-soft btn-small" data-partner-edit="${partner.id}">تعديل</button>
          <button class="btn btn-soft btn-small" data-partner-toggle="${partner.id}">${partner.isVisible === false ? "إظهار" : "إخفاء"}</button>
          <button class="btn btn-danger btn-small" data-partner-delete="${partner.id}">حذف</button>
        </div>
      </article>`;
    },

    formSection(form) {
      return `<article class="item-row item-editor">
        <div class="editor-fields">
          <label><span>اسم الجهة</span><input type="text" maxlength="255" value="${this.esc(form.name)}" placeholder="مثال: جامعة الملك سعود" data-partner-prop="name" /></label>
          <label><span>نوع الجهة</span><select data-partner-prop="kind"><option value="جامعة" ${form.kind === "جامعة" ? "selected" : ""}>جامعة</option><option value="معهد" ${form.kind === "معهد" ? "selected" : ""}>معهد</option><option value="جهة تعليمية" ${form.kind === "جهة تعليمية" ? "selected" : ""}>جهة تعليمية</option></select></label>
          <label><span>المدينة</span><input type="text" maxlength="120" value="${this.esc(form.city || "")}" placeholder="مثال: الرياض" data-partner-prop="city" /></label>
          <label><span>رابط الموقع</span><input type="text" maxlength="512" value="${this.esc(form.link || "")}" placeholder="https://example.com" data-partner-prop="link" /></label>
          <label><span>وصف مختصر</span><textarea maxlength="1200" rows="2" placeholder="سطر واحد عن الشراكة" data-partner-prop="description">${this.esc(form.description || "")}</textarea></label>
          <div class="team-photo-row">
            ${form.logoUrl ? `<img src="${this.esc(form.logoUrl)}" alt="شعار الشريك" class="team-photo-preview" />` : `<div class="team-photo-placeholder">شعار الجهة</div>`}
            <button type="button" class="btn btn-outline btn-small" data-partner-logo>${form.logoUrl ? "تغيير الشعار" : "رفع الشعار"}</button>
            ${form.id ? "" : `<small>احفظ الشريك أولًا ثم ارفع شعاره من جهازك مباشرة.</small>`}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.5rem;padding-top:.5rem;border-top:1px dashed var(--border, #e5e7eb)">
            <label><span>قالب العرض في موقع الزائر</span>
              <select data-partner-prop="shape">
                <option value="card" ${form.shape === "card" ? "selected" : ""}>بطاقة رسمية (Card)</option>
                <option value="circle" ${form.shape === "circle" ? "selected" : ""}>دائرة أنيقة (Circle)</option>
                <option value="square" ${form.shape === "square" ? "selected" : ""}>مربع بارز (Square)</option>
                <option value="pill" ${form.shape === "pill" ? "selected" : ""}>كبسولة (Pill)</option>
                <option value="badge" ${form.shape === "badge" ? "selected" : ""}>شارة نصية (Badge)</option>
                <option value="banner" ${form.shape === "banner" ? "selected" : ""}>شريط كبير (Banner)</option>
              </select></label>
            <label><span>معاينة الشكل</span>
              <div class="partner-shape-preview" data-preview-shape="${form.shape || "card"}" style="background:${form.backgroundColor || "#eef1f8"};border-color:${form.borderColor || form.accentColor || "#4966d6"};color:${form.accentColor || "#4966d6"}">
                ${form.logoUrl ? `<img src="${this.esc(form.logoUrl)}" alt="" />` : "🏛"}
              </div></label>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-top:.5rem">
            <label class="color-field"><span>لون الشعار</span><input type="color" value="${form.accentColor || "#4966d6"}" data-partner-prop="accentColor" /></label>
            <label class="color-field"><span>لون النص</span><input type="color" value="${form.textColor || "#ffffff"}" data-partner-prop="textColor" /></label>
            <label class="color-field"><span>لون الخلفية</span><input type="color" value="${form.backgroundColor || "#eef1f8"}" data-partner-prop="backgroundColor" /></label>
            <label class="color-field"><span>لون الإطار</span><input type="color" value="${form.borderColor || form.accentColor || "#4966d6"}" data-partner-prop="borderColor" /></label>
          </div>
          <small style="color:var(--muted,#6b7280)">اختر القالب الذي يعرض به هذا الشريك في صفحة «شركاء النجاح» وحدد ألوانه؛ يظهر التغيير فورًا للزوار.</small>
        </div>
        <div class="row-actions">
          <button class="btn btn-soft btn-small" data-partner-cancel>إلغاء</button>
          <button class="btn btn-small" data-partner-save>حفظ الشريك</button>
        </div>
      </article>`;
    },
  };

  /* معاينة شكل الشريك داخل النموذج */
  (function injectPartnerPreviewCss() {
    if (document.getElementById("partner-preview-style")) return;
    const style = document.createElement("style");
    style.id = "partner-preview-style";
    style.textContent = `[data-preview-shape="card"]{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:2px solid;background:transparent;border-radius:12px;font-size:1.7rem}
[data-preview-shape="circle"]{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:2px solid;background:transparent;border-radius:50%;font-size:1.7rem}
[data-preview-shape="square"]{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:3px solid;background:transparent;border-radius:6px;font-size:1.7rem}
[data-preview-shape="pill"]{width:100px;height:56px;display:flex;align-items:center;justify-content:center;border:2px solid;background:transparent;border-radius:999px;font-size:1.7rem}
[data-preview-shape="badge"]{min-width:110px;padding:.5rem 1rem;display:inline-flex;align-items:center;justify-content:center;border:1px dashed;background:transparent;border-radius:8px;font-size:.85rem;gap:.35rem;font-weight:700}
[data-preview-shape="banner"]{width:100%;min-height:64px;display:flex;align-items:center;justify-content:center;gap:.6rem;border:2px solid;background:transparent;border-radius:14px;font-size:1rem}
[data-preview-shape] img{width:44px;height:44px;object-fit:contain;border-radius:inherit}
[data-preview-shape="badge"] img{width:24px;height:24px}
.color-field{display:flex;flex-direction:column;gap:.2rem}
.color-field span{font-size:.75rem;font-weight:600;color:var(--muted,#6b7280)}
.color-field input[type=color]{width:100%;height:2.1rem;border:1px solid var(--border,#e5e7eb);border-radius:8px;cursor:pointer;background:#fff}`;
    document.head.append(style);
  })();
  window.WajbatPartnersManager = manager;
})();
