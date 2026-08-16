/**
 * مدير «شركاء النجاح» — لوحة المالك (إصدار r14 — تصميم بطاقات محسّن)
 * شبكة بطاقات احترافية + محرر جانبي + رفع شعار فوري + رسائل نجاح مؤكدة.
 */
(function () {
  "use strict";

  const TRPC = "/api/trpc";

  const manager = {
    state: {
      partners: [],
      loaded: false,
      loading: false,
      editing: null,
      logoUploadState: null, // null | "uploading" | "done"
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
    toast(message, kind = "ok") {
      const existing = document.querySelector(".pm-toast-active");
      if (existing) existing.remove();
      const element = document.createElement("div");
      element.className = "pm-toast pm-toast-active";
      element.dataset.kind = kind;
      element.innerHTML = (kind === "ok" ? "✔✔ " : "⚠ ") + this.esc(message);
      document.body.append(element);
      window.setTimeout(() => element.remove(), 3800);
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
    async refresh() {
      this.state.loaded = false;
      this.state.loading = false;
      this.state.editing = null;
      await this.load();
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
    async uploadPartnerLogo(file) {
      const form = this.state.editing;
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
        this.toast("صيغة الشعار غير مدعومة. استخدم PNG أو JPG أو WEBP أو GIF أو SVG.", "err");
        return;
      }
      if (file.size > 4 * 1024 * 1024) { this.toast("حجم الشعار يتجاوز 4 ميغابايت", "err"); return; }
      /* يمكن رفع الشعار لشريك جديد محفوظ أو موجود فقط */
      if (!form || !form.id) { this.toast("💾 احفظ الشريك أولًا ليصبح له شعار", "err"); return; }
      this.state.logoUploadState = "uploading";
      this.render();
      try {
        const dataUrl = await this.fileToDataUrl(file);
        const result = await this.uploadLogo(file, form.id);
        form.logoUrl = result?.url || null;
        this.state.logoUploadState = "done";
        /* تحديث القائمة أيضًا حتى تظهر البطاقة الجديدة بالشعار */
        const idx = this.state.partners.findIndex(p => p.id === form.id);
        if (idx !== -1) this.state.partners[idx] = { ...this.state.partners[idx], logoUrl: form.logoUrl };
        this.render();
        this.toast("✔✔ تم رفع الشعار بنجاح — يظهر فورًا في بطاقة الجهة وفي صفحة الزائر", "ok");
      } catch (error) {
        this.state.logoUploadState = null;
        this.render();
        this.toast(this.messageOf(error), "err");
      }
    },
    async uploadLogo(file, partnerId) {
      const dataUrl = await this.fileToDataUrl(file);
      return this.mutate("admin.partners.uploadLogo", { id: partnerId, mimeType: file.type, dataUrl });
    },

    /* --------------------- العمليات --------------------- */
    emptyForm() {
      return { id: null, name: "", city: "", description: "", kind: "جامعة", link: "", logoUrl: null, shape: "card", accentColor: "#4966d6", textColor: "#ffffff", backgroundColor: "#eef1f8", borderColor: null };
    },
    startNew() {
      this.state.editing = this.emptyForm();
      this.state.logoUploadState = null;
      this.render();
    },
    cancel() {
      this.state.editing = null;
      this.state.logoUploadState = null;
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
      this.state.logoUploadState = null;
      this.render();
      const editor = this.container?.querySelector(".pm-editor");
      if (editor) editor.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    async deletePartner(id) {
      try {
        await this.mutate("admin.partners.delete", { id });
        this.toast("✔ تم حذف الشريك نهائيًا", "ok");
        await this.refresh();
      } catch (error) { this.toast(this.messageOf(error), "err"); }
    },
    confirmDelete(id) {
      this.confirmDialog("حذف هذا الشريك؟", "سيُحذف الشريك نهائيًا من قاعدة البيانات مع شعاره.", "حذف الشريك", () => this.deletePartner(id));
    },
    async toggleVisibility(id, isVisible) {
      try {
        await this.mutate("admin.partners.setVisibility", { id, isVisible });
        this.toast(isVisible ? "✔ تم إظهار الشريك للزوار" : "تم إخفاء الشريك عن الزوار", "ok");
        await this.refresh();
      } catch (error) { this.toast(this.messageOf(error), "err"); }
    },
    async move(id, direction) {
      try {
        await this.mutate("admin.partners.move", { id, direction });
        await this.refresh();
      } catch (error) { this.toast(this.messageOf(error), "err"); }
    },
    async save() {
      const form = this.state.editing;
      if (!form) return;
      if (!form.name.trim()) { this.toast("اكتب اسم الجهة أولًا", "err"); return; }
      if (String(form.link || "").trim().toUpperCase() === "NULL") { form.link = ""; }
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
      if (input.city === "" || input.city === "NULL") delete input.city;
      if (input.description === "" || input.description === "NULL") delete input.description;
      if (input.link === "" || input.link === "NULL") delete input.link;
      try {
        if (form.id) {
          await this.mutate("admin.partners.update", { id: form.id, data: input });
        } else {
          const created = await this.mutate("admin.partners.create", input);
          form.id = created?.id || form.id;
        }
        this.toast("✔✔ تم حفظ الشريك في قاعدة البيانات — يظهر فورًا في صفحة الزائر", "ok");
        /* إعادة تحميل القائمة مع إبقاء نموذج التعديل مفتوحًا */
        await this.refreshListKeepEditing();
      } catch (error) { this.toast(this.messageOf(error), "err"); }
    },
    async refreshListKeepEditing() {
      const keepId = this.state.editing?.id;
      this.state.loaded = false;
      this.state.loading = false;
      try {
        const partners = await this.request("admin.partners.listAll");
        this.state.partners = Array.isArray(partners) ? partners : [];
        this.state.loaded = true;
      } finally {
        this.state.loading = false;
        this.render();
      }
      if (keepId) {
        const item = this.state.partners.find(p => p.id === keepId);
        if (item) this.startEdit(item);
      }
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
      overlay.className = "pm-overlay";
      overlay.innerHTML = `<div class="pm-confirm" role="dialog" aria-modal="true">
        <div class="pm-confirm-icon">⚠️</div>
        <h4>${this.esc(title)}</h4><p>${this.esc(body)}</p>
        <div class="pm-confirm-actions">
          <button type="button" class="pm-btn-flat" data-pm-cancel>إلغاء</button>
          <button type="button" class="pm-btn-del-big" data-pm-ok>${this.esc(confirmLabel)}</button>
        </div></div>`;
      document.body.append(overlay);
      const close = () => overlay.remove();
      overlay.querySelector("[data-pm-cancel]").addEventListener("click", close);
      overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
      overlay.querySelector("[data-pm-ok]").addEventListener("click", () => { close(); onConfirm(); });
    },

    pickLogoFile() {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
      input.addEventListener("change", () => { const file = input.files?.[0]; if (file) void this.uploadPartnerLogo(file); });
      input.click();
    },

    /* --------------------- البناء --------------------- */
    render() {
      if (!this.container) return;
      const { state } = this;
      const root = this.container;

      const head = `
        <div class="pm-head">
          <div class="pm-head-right">
            <span class="pm-head-badge">إدارة المحتوى</span>
            <h2 class="pm-head-title">🏛️ شركاء النجاح</h2>
            <p class="pm-head-sub">أضف الجامعات والمعاهد والجهات التعليمية بشعاراتها، وغيّر ترتيبها وإخفاءها؛ تظهر في صفحة «شركاء النجاح» للزوار.</p>
          </div>
          <button type="button" class="pm-btn-add-new" data-partner-add>+ إضافة جهة جديدة</button>
        </div>`;

      if (state.loading || !state.loaded) {
        root.innerHTML = `<section class="pm-section" data-partners-workspace>${head}<div class="pm-empty"><span class="pm-spin"></span>جارٍ تحميل الشركاء من قاعدة البيانات...</div></section>`;
        return;
      }

      const form = state.editing ? this.formSection(state.editing) : "";
      const rows = state.partners.map(partner => this.partnerRow(partner)).join("");
      const visibleCount = state.partners.filter(p => p.isVisible !== false).length;

      root.innerHTML = `<section class="pm-section" data-partners-workspace>${head}
        <div class="pm-editor-wrap">${form}</div>
        <div class="pm-grid-head"><span>${state.partners.length} جهة${state.partners.length !== visibleCount ? ` · ${visibleCount} ظاهرة للزوار` : ""}</span></div>
        ${rows ? `<div class="pm-grid">${rows}</div>` : `<div class="pm-empty">لا توجد جهات بعد. أضف أول جهة تعليمية.</div>`}
      </section>`;

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
      root.querySelectorAll("[data-partner-logo]").forEach(btn => btn.addEventListener("click", () => this.pickLogoFile()));
    },

    partnerRow(partner) {
      const initial = String(partner.name || "?").trim().charAt(0);
      return `<article class="pm-card" style="--pm-accent:${partner.accentColor || "#4966d6"};--pm-bg:${partner.backgroundColor || "#eef1f8"}">
        <div class="pm-card-top">
          ${partner.logoUrl ? `<img src="${this.esc(partner.logoUrl)}" alt="شعار ${this.esc(partner.name)}" class="pm-logo" />` : `<span class="pm-logo-letter">${this.esc(initial)}</span>`}
          <span class="pm-status ${partner.isVisible === false ? "hidden" : ""}">${partner.isVisible === false ? "مخفي" : "ظاهر"}</span>
        </div>
        <div class="pm-card-body">
          <span class="pm-name">${this.esc(partner.name)}</span>
          <span class="pm-meta">${this.esc(partner.kind || "جامعة")}${partner.city ? ` · ${this.esc(partner.city)}` : ""}</span>
          <div class="pm-card-actions">
            <button class="pm-btn pm-btn-edit" data-partner-edit="${partner.id}">✎ تعديل</button>
            <button class="pm-btn pm-btn-vis" data-partner-toggle="${partner.id}">${partner.isVisible === false ? "◉ إظهار" : "◎ إخفاء"}</button>
            <button class="pm-btn" data-partner-move="${partner.id}:up">▲</button>
            <button class="pm-btn" data-partner-move="${partner.id}:down">▼</button>
            <button class="pm-btn pm-btn-del" data-partner-delete="${partner.id}">🗑</button>
          </div>
        </div>
      </article>`;
    },

    formSection(form) {
      const logoPreview = form.logoUrl
        ? `<img src="${this.esc(form.logoUrl)}" alt="شعار الجهة" class="pm-logo-preview-img" />`
        : `<div class="pm-logo-preview-empty"><span class="pm-logo-preview-icon">🏛</span><span class="pm-logo-preview-text">شعار الجهة</span></div>`;
      const uploadBtnText = this.state.logoUploadState === "uploading" ? "⏳ جارٍ رفع الشعار..."
        : this.state.logoUploadState === "done" ? "✔ تم رفع الشعار — ارفع آخر" : (form.logoUrl ? "تغيير الشعار من الجهاز" : "📤 رفع الشعار من الجهاز");
      const doneBanner = this.state.logoUploadState === "done"
        ? `<div class="pm-upload-ok">✔✔ تم رفع الشعار بنجاح — احفظ الشريك لتثبيت البيانات</div>` : "";
      return `<div class="pm-editor">
        <div class="pm-editor-head">
          <span class="pm-step-num">1</span><span class="pm-step">شعار الجهة</span>
          <span class="pm-step-num">2</span><span class="pm-step">بيانات الجهة</span>
          <span class="pm-step-num">3</span><span class="pm-step">مظهر البطاقة</span>
        </div>
        <div class="pm-editor-grid">
          <div class="pm-edit-side">
            <div class="pm-edit-logo-preview">${logoPreview}</div>
            <button type="button" class="pm-logo-upload-btn" data-partner-logo>${this.esc(uploadBtnText)}</button>
            ${doneBanner}
            ${form.id ? `<small class="pm-note">الشعار يُحفظ في قاعدة البيانات ويظهر فورًا للزوار في بطاقة الجهة.</small>` : `<small class="pm-note">احفظ الشريك أولًا ثم ارفع شعاره من جهازك مباشرة.</small>`}
          </div>
          <div class="pm-edit-fields">
            <label><span>اسم الجهة *</span><input type="text" maxlength="255" value="${this.esc(form.name)}" placeholder="مثال: جامعة طيبة" data-partner-prop="name" /></label>
            <div class="pm-inline">
              <label><span>نوع الجهة</span><select data-partner-prop="kind"><option value="جامعة" ${form.kind === "جامعة" ? "selected" : ""}>جامعة</option><option value="معهد" ${form.kind === "معهد" ? "selected" : ""}>معهد</option><option value="جهة تعليمية" ${form.kind === "جهة تعليمية" ? "selected" : ""}>جهة تعليمية</option></select></label>
              <label><span>المدينة</span><input type="text" maxlength="120" value="${this.esc(form.city || "")}" placeholder="مثال: المدينة المنورة" data-partner-prop="city" /></label>
            </div>
            <label><span>رابط موقع الجامعة (الموقع الرسمي) — الزائر يفتح هذا الرابط عند الضغط</span><input type="text" dir="ltr" maxlength="512" value="${this.esc(form.link || "")}" placeholder="https://example.edu.sa" data-partner-prop="link" /></label>
            <label><span>وصف مختصر</span><textarea maxlength="1200" rows="2" placeholder="سطر واحد عن الشراكة" data-partner-prop="description">${this.esc(form.description || "")}</textarea></label>
            <div class="pm-looks">
              <label><span>قالب البطاقة في موقع الزائر</span>
                <select data-partner-prop="shape">
                  <option value="card" ${form.shape === "card" ? "selected" : ""}>بطاقة رسمية (Card)</option>
                  <option value="circle" ${form.shape === "circle" ? "selected" : ""}>دائرة أنيقة (Circle)</option>
                  <option value="square" ${form.shape === "square" ? "selected" : ""}>مربع بارز (Square)</option>
                  <option value="pill" ${form.shape === "pill" ? "selected" : ""}>كبسولة (Pill)</option>
                  <option value="badge" ${form.shape === "badge" ? "selected" : ""}>شارة نصية (Badge)</option>
                  <option value="banner" ${form.shape === "banner" ? "selected" : ""}>شريط كبير (Banner)</option>
                </select></label>
              <label><span>معاينة الشكل</span>
                <div class="pm-preview-box" data-preview-shape="${form.shape || "card"}" style="background:${form.backgroundColor || "#eef1f8"};border-color:${form.borderColor || form.accentColor || "#4966d6"};color:${form.accentColor || "#4966d6"}">
                  ${form.logoUrl ? `<img src="${this.esc(form.logoUrl)}" alt="" />` : "🏛"}
                </div></label>
            </div>
            <div class="pm-colors">
              <label class="color-field"><span>لون الشعار</span><input type="color" value="${form.accentColor || "#4966d6"}" data-partner-prop="accentColor" /></label>
              <label class="color-field"><span>لون النص</span><input type="color" value="${form.textColor || "#ffffff"}" data-partner-prop="textColor" /></label>
              <label class="color-field"><span>لون الخلفية</span><input type="color" value="${form.backgroundColor || "#eef1f8"}" data-partner-prop="backgroundColor" /></label>
              <label class="color-field"><span>لون الإطار</span><input type="color" value="${form.borderColor || form.accentColor || "#4966d6"}" data-partner-prop="borderColor" /></label>
            </div>
            <div class="pm-editor-foot">
              <button type="button" class="pm-btn-flat" data-partner-cancel>إلغاء</button>
              <button type="button" class="pm-btn-save-big" data-partner-save>${form.id ? "💾 حفظ التعديلات" : "✔ حفظ الجهة الجديدة"}</button>
            </div>
          </div>
        </div>
      </div>`;
    },
  };

  /* أنماط اللوحة الجديدة — معيّن واحد فقط (إصلاح حاسم) */
  (function injectPartnerManagerCss() {
    if (document.getElementById("partner-manager-style-r10")) return;
    const style = document.createElement("style");
    style.id = "partner-manager-style-r10";
    style.textContent = `.pm-section{margin-bottom:1.4rem}
.pm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.2rem}
.pm-head-badge{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.04em;color:#4966d6;background:#eef2ff;border:1px solid #d4dcf7;border-radius:999px;padding:.2rem .6rem;margin-bottom:.35rem}
.pm-head-title{font-size:1.35rem;font-weight:800;color:#1f2433;margin:0 0 .3rem}
.pm-head-sub{font-size:.8rem;color:#6b7280;margin:0;max-width:46rem}
.pm-btn-add-new{padding:.7rem 1.4rem;border-radius:12px;background:linear-gradient(135deg,#4966d6 0%,#7c5ce0 100%);color:#fff;font-weight:800;font-size:.85rem;border:none;cursor:pointer;box-shadow:0 8px 20px rgba(73,102,214,.32);transition:transform .14s ease-out,box-shadow .14s ease-out}
.pm-btn-add-new:hover{box-shadow:0 12px 26px rgba(73,102,214,.42)}
.pm-btn-add-new:active{transform:scale(.97)}
.pm-empty{display:flex;align-items:center;justify-content:center;gap:.6rem;color:#6b7280;font-size:.85rem;font-weight:600;padding:2.6rem 1rem;border:1.5px dashed #e2e6f0;border-radius:14px;background:#fbfcfe}
.pm-spin{width:1.1rem;height:1.1rem;border:2.5px solid #e2e6f0;border-top-color:#4966d6;border-radius:50%;animation:pm-rot .7s linear infinite}
@keyframes pm-rot{to{transform:rotate(360deg)}}
.pm-editor-wrap{margin-bottom:1.2rem}
.pm-grid-head{display:flex;align-items:center;margin:0 0 .7rem;font-size:.78rem;font-weight:700;color:#6b7280}
.pm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.9rem}
@media (max-width:640px){.pm-grid{grid-template-columns:repeat(2,1fr);gap:.6rem}}
.pm-card{background:#fff;border:1.5px solid #e9ecf5;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(47,54,80,.06);transition:transform .16s ease-out,box-shadow .16s ease-out;display:flex;flex-direction:column}
.pm-card:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(47,54,80,.12)}
.pm-card-top{height:96px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--pm-bg) 0%,#fff 130%);position:relative}
.pm-logo{width:70px;height:70px;object-fit:contain;border-radius:10px}
.pm-logo-letter{width:58px;height:58px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:900;color:#fff;background:linear-gradient(135deg,var(--pm-accent),#7c5ce0);border-radius:16px}
.pm-status{position:absolute;top:.5rem;left:.5rem;font-size:.62rem;font-weight:800;border-radius:999px;padding:.15rem .5rem}
.pm-status{color:#15803d;background:#e6f7ee;border:1px solid #bde9d0}
.pm-status.hidden{color:#b45309;background:#fef3e2;border-color:#f7dcaf}
.pm-card-body{padding:.45rem .7rem .7rem;display:flex;flex-direction:column;gap:.4rem;flex:1}
.pm-name{font-size:.84rem;font-weight:800;color:#1f2433;line-height:1.25}
.pm-meta{font-size:.66rem;color:#9aa0ad;font-weight:600}
.pm-card-actions{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:auto}
.pm-btn{font-size:.66rem;padding:.32rem .55rem;border-radius:8px;border:1px solid #e5e7eb;background:#f8fafc;color:#374151;cursor:pointer;transition:background .14s ease-out,transform .12s ease-out;flex:1;text-align:center}
.pm-btn:hover{background:#eef1f8}
.pm-btn:active{transform:scale(.95)}
.pm-btn-edit{background:#eef2ff;border-color:#4966d6;color:#4966d6;font-weight:800}
.pm-btn-del{color:#c23a3a;border-color:#f7d5d5;background:#fff6f6;flex:0}
.pm-btn-vis{color:#15803d;border-color:#d5f2e1;flex:0}
.pm-editor{background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;padding:1rem;margin-bottom:.4rem;box-shadow:0 14px 36px rgba(73,102,214,.12)}
.pm-editor-head{display:flex;align-items:center;gap:.45rem;margin-bottom:.9rem;padding-bottom:.7rem;border-bottom:1px dashed #e5e7eb;flex-wrap:wrap}
.pm-step{display:flex;align-items:center;gap:.35rem;font-size:.72rem;font-weight:700;color:#6b7280}
.pm-step-num{width:1.4rem;height:1.4rem;border-radius:50%;background:linear-gradient(135deg,#4966d6,#7c5ce0);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800}
.pm-editor-grid{display:grid;grid-template-columns:230px 1fr;gap:1.1rem}
@media (max-width:768px){.pm-editor-grid{grid-template-columns:1fr}}
.pm-edit-side{display:flex;flex-direction:column;gap:.55rem;align-items:stretch}
.pm-edit-logo-preview{width:100%;min-height:180px;max-height:220px;border-radius:14px;border:1.5px dashed #c7d2e8;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#f8fafd,#eef2ff);object-fit:contain;overflow:hidden}
.pm-logo-preview-img{max-width:100%;max-height:200px;object-fit:contain}
.pm-logo-preview-empty{display:flex;flex-direction:column;gap:.45rem;color:#94a3b8;align-items:center}
.pm-logo-preview-icon{font-size:2.6rem}
.pm-logo-preview-text{font-size:.75rem;font-weight:700}
.pm-logo-upload-btn{padding:.6rem;border-radius:10px;border:1.5px dashed #4966d6;background:linear-gradient(135deg,#eef2ff,#f4f0ff);color:#4966d6;font-weight:800;font-size:.8rem;cursor:pointer;text-align:center;transition:background .14s ease-out,transform .12s ease-out}
.pm-logo-upload-btn:hover{background:linear-gradient(135deg,#e3e9fb,#eae2fc)}
.pm-logo-upload-btn:active{transform:scale(.98)}
.pm-upload-ok{font-size:.72rem;font-weight:800;color:#15803d;background:linear-gradient(135deg,#e6f7ee,#d7f4e6);border:1px solid #a9e3c2;border-radius:10px;padding:.45rem .5rem;width:100%;text-align:center;animation:pm-pop .28s ease-out}
@keyframes pm-pop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.pm-edit-fields{display:flex;flex-direction:column;gap:.7rem}
.pm-edit-fields label{display:flex;flex-direction:column;gap:.25rem;font-size:.78rem;font-weight:700;color:#374151}
.pm-edit-fields input,.pm-edit-fields select,.pm-edit-fields textarea{border:1.5px solid #e2e6f0;border-radius:10px;padding:.5rem;font-size:.85rem;background:#fff;font-family:inherit;transition:border-color .14s ease-out}
.pm-edit-fields input:focus,.pm-edit-fields select:focus,.pm-edit-fields textarea:focus{outline:none;border-color:#4966d6;box-shadow:0 0 0 3px rgba(73,102,214,.12)}
.pm-inline{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
.pm-looks{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
.pm-preview-box{border-radius:12px;border:2px solid;display:flex;align-items:center;justify-content:center;min-height:72px}
.pm-preview-box img{width:44px;height:44px;object-fit:contain;border-radius:inherit}
.pm-colors{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem}
.pm-note{font-size:.68rem;color:#6b7280;line-height:1.5}
.pm-editor-foot{display:flex;gap:.6rem;justify-content:flex-end;margin-top:.4rem;padding-top:.8rem;border-top:1px dashed #e5e7eb}
.pm-btn-save-big{padding:.65rem 1.8rem;border-radius:11px;background:linear-gradient(135deg,#4966d6 0%,#7c5ce0 100%);color:#fff;font-weight:800;font-size:.9rem;border:none;cursor:pointer;box-shadow:0 8px 20px rgba(73,102,214,.3);transition:transform .14s ease-out,box-shadow .14s ease-out}
.pm-btn-save-big:hover{box-shadow:0 12px 26px rgba(73,102,214,.42)}
.pm-btn-save-big:active{transform:scale(.97)}
.pm-btn-flat{padding:.6rem 1.2rem;border-radius:11px;background:#f1f3f9;color:#6b7280;font-weight:700;font-size:.85rem;border:none;cursor:pointer;transition:background .14s ease-out}
.pm-btn-flat:hover{background:#e6e9f3}
.pm-btn-del-big{padding:.6rem 1.2rem;border-radius:11px;background:#c23a3a;color:#fff;font-weight:800;font-size:.85rem;border:none;cursor:pointer}
.pm-overlay{position:fixed;inset:0;background:rgba(15,20,40,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem}
.pm-confirm{background:#fff;border-radius:16px;padding:1.4rem;max-width:24rem;width:100%;text-align:center;box-shadow:0 24px 60px rgba(15,20,40,.35)}
.pm-confirm-icon{font-size:2.2rem;margin-bottom:.5rem}
.pm-confirm h4{margin:0 0 .4rem;font-size:1.05rem;color:#1f2433}
.pm-confirm p{margin:0 0 1rem;font-size:.82rem;color:#6b7280}
.pm-confirm-actions{display:flex;gap:.6rem;justify-content:center}
.pm-toast{position:fixed;bottom:1.1rem;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#0f8538,#15a046);color:#fff;font-weight:800;font-size:.82rem;padding:.7rem 1.3rem;border-radius:12px;box-shadow:0 14px 34px rgba(15,133,56,.35);z-index:99999;animation:pm-pop .26s ease-out}
.pm-toast[data-kind="err"]{background:linear-gradient(135deg,#c23a3a,#e04a4a);box-shadow:0 14px 34px rgba(194,58,58,.35)}
[data-preview-shape="card"]{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:2px solid;background:transparent;border-radius:12px;font-size:1.7rem}
[data-preview-shape="circle"]{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:2px solid;background:transparent;border-radius:50%;font-size:1.7rem}
[data-preview-shape="square"]{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:3px solid;background:transparent;border-radius:6px;font-size:1.7rem}
[data-preview-shape="pill"]{width:100px;height:56px;display:flex;align-items:center;justify-content:center;border:2px solid;background:transparent;border-radius:999px;font-size:1.7rem}
[data-preview-shape="badge"]{min-width:110px;padding:.5rem 1rem;display:inline-flex;align-items:center;justify-content:center;border:1px dashed;background:transparent;border-radius:8px;font-size:.85rem;gap:.35rem;font-weight:700}
[data-preview-shape="banner"]{width:100%;min-height:64px;display:flex;align-items:center;justify-content:center;gap:.6rem;border:2px solid;background:transparent;border-radius:14px;font-size:1rem}
[data-preview-shape] img{width:44px;height:44px;object-fit:contain;border-radius:inherit}
[data-preview-shape="badge"] img{width:24px;height:24px}
.color-field{display:flex;flex-direction:column;gap:.2rem}
.color-field span{font-size:.72rem;font-weight:700;color:var(--muted,#6b7280)}
.color-field input[type=color]{width:100%;height:2.1rem;border:1.5px solid #e2e6f0;border-radius:8px;cursor:pointer;background:#fff}`;
    document.head.append(style);
  })();

  window.WajbatPartnersManager = manager;
  try {
    if (typeof window.__adminRerenderPartners === "function") {
      window.__adminRerenderPartners();
    }
  } catch (_) {
    /* لا شيء */
  }
})();
