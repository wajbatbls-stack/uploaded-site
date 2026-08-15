/*
 * مدير «شركاء النجاح» — لوحة المالك (إصدار r8)
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
        this.toast("✔ تم حذف الشريك");
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
      if (!form || !form.id) { this.toast("💾 احفظ الشريك أولًا ليصبح له شعار"); return; }
      try {
        const result = await this.uploadLogo(file, form.id);
        form.logoUrl = result?.url || null;
        const inList = this.state.partners.find(p => p.id === form.id);
        if (inList) inList.logoUrl = form.logoUrl;
        this.toast("✔ تم رفع الشعار بنجاح — يظهر الآن على البطاقة وفي صفحة الزائر");
        this.render();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async save() {
      const form = this.state.editing;
      if (!form) return;
      if (!form.name.trim()) { this.toast("اكتب اسم الجهة أولًا"); return; }
      if (String(form.link || "").trim().toUpperCase() === "NULL") { form.link = ""; this.toast("رابط الموقع يجب أن يبدأ بـ https://"); }
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
          await this.mutate("admin.partners.create", input);
        }
        this.toast("✔ تم حفظ الشريك — يظهر فورًا في صفحة الزائر");
        void this.loadFresh();

    async loadFresh() {
      this.state.loaded = false;
      this.state.loading = false;
      try {
        const partners = await this.request("admin.partners.listAll");
        this.state.partners = Array.isArray(partners) ? partners : [];
        this.state.loaded = true;
        const saved = this.state.editing;
        if (saved) {
          const latest = this.state.partners.find(p => p.id === saved.id);
          if (latest) this.startEdit(latest);
        }
        this.render();
      } catch (error) {
        this.toast(this.messageOf(error));
        this.render();
      }
    },
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
            <p>أضف الجامعات والمعاهد والجهات التعليمية. ارفع شعار كل جهة من جهازك مباشرة — يظهر فورًا على بطاقة الزائر — ثم أدخل رابط موقعها الرسمي ليظهر زر «🌐 زيارة الموقع».</p>
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
        if (!this.state.editing?.id) { this.toast("💾 احفظ الشريك أولًا ليصبح له شعار"); return; }
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
        input.addEventListener("change", () => { const file = input.files?.[0]; if (file) void this.uploadPartnerLogo(file); });
        input.click();
      }));
      root.querySelectorAll(".pm-card[data-partner-edit]").forEach(card => {
        card.addEventListener("click", event => {
          if (event.target.closest(".pm-card-actions")) return;
          const item = this.state.partners.find(p => p.id === Number(card.dataset.partnerEdit));
          if (item) this.startEdit(item);
        });
        card.addEventListener("keydown", event => { if (event.key === "Enter") card.click(); });
      });
    },

    partnerRow(partner) {
      const logoPart = partner.logoUrl
        ? `<img src="${this.esc(partner.logoUrl)}" alt="${this.esc(partner.name)}" class="pm-card-logo" onerror="this.style.display='none'">`
        : `<div class="pm-card-logo-fallback">${this.esc((partner.name || "شريك").trim().charAt(0))}</div>`;
      const statusHtml = partner.isVisible === false
        ? `<span class="pm-status pm-status-hidden">مخفي عن الزوار</span>`
        : `<span class="pm-status pm-status-visible">ظاهر للزوار</span>`;
      const logoMissing = !partner.logoUrl ? `<span class="pm-need-logo">لم يُرْفع الشعار بعد</span>` : "";
      return `<article class="pm-card" data-partner-edit="${partner.id}" tabindex="0" role="button" aria-label="تعديل ${this.esc(partner.name)}">
        <div class="pm-card-head">
          <div class="pm-card-logo-wrap">${logoPart}</div>
          <div class="pm-status-wrap">${statusHtml}${logoMissing ? `<span class="pm-tip">📷</span>` : ""}</div>
        </div>
        <div class="pm-card-body">
          <b class="pm-name">${this.esc(partner.name)}</b>
          <div class="pm-meta">${this.esc(partner.kind || "")}${partner.city ? ` · ${this.esc(partner.city)}` : ""}</div>
          <div class="pm-card-actions">
            <button class="pm-btn pm-btn-edit" data-partner-edit="${partner.id}" type="button">✏️ تعديل</button>
            <button class="pm-btn pm-btn-vis" data-partner-toggle="${partner.id}" type="button">${partner.isVisible === false ? "👁️ إظهار" : "🙈 إخفاء"}</button>
            <button class="pm-btn pm-btn-up" data-partner-move="${partner.id}:up" type="button">↑</button>
            <button class="pm-btn pm-btn-down" data-partner-move="${partner.id}:down" type="button">↓</button>
            <button class="pm-btn pm-btn-del" data-partner-delete="${partner.id}" type="button">🗑 حذف</button>
          </div>
        </div>
      </article>`;
    },

    formSection(form) {
      const logoPreview = form.logoUrl
        ? `<img src="${this.esc(form.logoUrl)}" alt="معاينة الشعار" class="pm-edit-logo-preview" />`
        : `<div class="pm-edit-logo-preview pm-edit-logo-empty"><div class="pm-edit-logo-empty-icon">📷</div><div class="pm-edit-logo-empty-text">لم يُرْفَع شعار بعد</div></div>`;
      const hasId = !!form.id;
      return `<article class="pm-editor">
        <div class="pm-editor-head">
          <div class="pm-step"><span class="pm-step-num">1</span><span>الشعار</span></div>
          <div class="pm-step"><span class="pm-step-num">2</span><span>بيانات الجهة</span></div>
          <div class="pm-step"><span class="pm-step-num">3</span><span>المظهر</span></div>
        </div>
        <div class="pm-editor-grid">
          <div class="pm-edit-side">
            ${logoPreview}
            <button type="button" class="pm-logo-upload-btn" data-partner-logo>${hasId ? (form.logoUrl ? "📤 تغيير الشعار من الجهاز" : "📤 رفع الشعار من الجهاز") : "💾 احفظ الشريك أولًا ثم ارفع شعاره"}</button>
            ${form.logoUrl ? `<div class="pm-upload-ok">✔ الشعار مرفوع ويظهر على بطاقة الزائر</div>` : ""}
            <small class="pm-note">يُقْبَل من جهازك مباشرة: PNG · JPG · WEBP · GIF · SVG حتى 4 ميغابايت.</small>
          </div>
          <div class="pm-edit-fields">
            <label><span>🏫 اسم الجهة</span><input type="text" maxlength="255" value="${this.esc(form.name)}" placeholder="مثال: جامعة الملك سعود" data-partner-prop="name" /></label>
            <div class="pm-inline">
              <label><span>نوع الجهة</span><select data-partner-prop="kind"><option value="جامعة" ${form.kind === "جامعة" ? "selected" : ""}>جامعة</option><option value="معهد" ${form.kind === "معهد" ? "selected" : ""}>معهد</option><option value="جهة تعليمية" ${form.kind === "جهة تعليمية" ? "selected" : ""}>جهة تعليمية</option></select></label>
              <label><span>المدينة</span><input type="text" maxlength="120" value="${this.esc(form.city || "")}" placeholder="مثال: الرياض" data-partner-prop="city" /></label>
            </div>
            <label><span>🌐 رابط موقع الجامعة (الموقع الرسمي)</span><input type="url" dir="ltr" maxlength="512" value="${this.esc(form.link || "")}" placeholder="https://example.edu.sa" data-partner-prop="link" /></label>
            <label><span>📝 وصف مختصر</span><textarea maxlength="1200" rows="2" placeholder="سطر واحد عن الجهة" data-partner-prop="description">${this.esc(form.description || "")}</textarea></label>
            <div class="pm-looks">
              <label><span>قالب العرض في صفحة الزائر</span>
                <select data-partner-prop="shape">
                  <option value="card" ${form.shape === "card" ? "selected" : ""}>بطاقة رسمية (Card)</option>
                  <option value="circle" ${form.shape === "circle" ? "selected" : ""}>دائرة أنيقة (Circle)</option>
                  <option value="square" ${form.shape === "square" ? "selected" : ""}>مربع بارز (Square)</option>
                  <option value="pill" ${form.shape === "pill" ? "selected" : ""}>كبسولة (Pill)</option>
                  <option value="badge" ${form.shape === "badge" ? "selected" : ""}>شارة نصية (Badge)</option>
                  <option value="banner" ${form.shape === "banner" ? "selected" : ""}>شريط كبير (Banner)</option>
                </select></label>
              <label><span>معاينة البطاقة</span>
                <div class="partner-shape-preview" data-preview-shape="${form.shape || "card"}" style="background:${form.backgroundColor || "#eef1f8"};border-color:${form.borderColor || form.accentColor || "#4966d6"};color:${form.accentColor || "#4966d6"}">
                  ${form.logoUrl ? `<img src="${this.esc(form.logoUrl)}" alt="" />` : "🏛"}
                </div></label>
            </div>
            <div class="pm-colors">
              <label class="color-field"><span>لون الشعار</span><input type="color" value="${form.accentColor || "#4966d6"}" data-partner-prop="accentColor" /></label>
              <label class="color-field"><span>لون النص</span><input type="color" value="${form.textColor || "#ffffff"}" data-partner-prop="textColor" /></label>
              <label class="color-field"><span>لون الخلفية</span><input type="color" value="${form.backgroundColor || "#eef1f8"}" data-partner-prop="backgroundColor" /></label>
              <label class="color-field"><span>لون الإطار</span><input type="color" value="${form.borderColor || form.accentColor || "#4966d6"}" data-partner-prop="borderColor" /></label>
            </div>
            <small class="pm-note">أدخل رابط الموقع الرسمي ليظهر زر «🌐 زيارة موقع الجامعة» على بطاقة الزائر.</small>
          </div>
        </div>
        <div class="pm-editor-foot">
          <button class="btn btn-soft" data-partner-cancel>إلغاء</button>
          <button class="btn btn-primary pm-btn-save-big" data-partner-save>💾 حفظ الشريك</button>
        </div>
      </article>`;
    },
  };

  /* ————— إعادة التصميم الكامل للوحة شركاء النجاح ————— */
  (function injectPartnerPreviewCss() {
    if (document.getElementById("partner-preview-style")) return;
    const style = document.createElement("style");
    style.id = "partner-preview-style";
    style.textContent = `
    .pm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.9rem;margin-top:.8rem}
    .pm-card{background:#fff;border:1.5px solid #e5e7eb;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s cubic-bezier(.23,1,.32,1),box-shadow .15s cubic-bezier(.23,1,.32,1)}
    .pm-card:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(73,102,214,.18)}
    .pm-card-head{display:flex;align-items:center;justify-content:space-between;padding:.7rem .7rem .3rem}
    .pm-card-logo-wrap{width:76px;height:76px;border-radius:12px;background:linear-gradient(135deg,#f1f4fd,#e7ecfb);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e3e9f8}
    .pm-card-logo{width:76px;height:76px;object-fit:contain}
    .pm-card-logo-fallback{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#4966d6,#6c83e0);color:#fff;font-size:2rem;font-weight:800;display:flex;align-items:center;justify-content:center}
    .pm-status-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:.25rem}
    .pm-status{font-size:.65rem;font-weight:700;padding:.15rem .45rem;border-radius:999px}
    .pm-status-visible{background:#e6f7ee;color:#15803d}
    .pm-status-hidden{background:#fdeeee;color:#c23a3a}
    .pm-tip{font-size:.8rem;opacity:.75}
    .pm-need-logo{display:block;margin-top:.3rem;position:absolute;font-size:.6rem;color:#9ca3af}
    .pm-card-body{padding:.2rem .7rem .7rem;display:flex;flex-direction:column;gap:.45rem}
    .pm-name{font-size:.9rem;color:#1f2433;display:block}
    .pm-meta{font-size:.7rem;color:#6b7280}
    .pm-card-actions{display:flex;flex-wrap:wrap;gap:.3rem;border-top:1px dashed #e5e7eb;padding-top:.45rem}
    .pm-btn{font-size:.7rem;padding:.3rem .55rem;border-radius:8px;border:1px solid #e5e7eb;background:#f8fafc;color:#374151;cursor:pointer;transition:background .14s ease-out}
    .pm-btn:hover{background:#eef1f8}
    .pm-btn:active{transform:scale(.96)}
    .pm-btn-edit{background:#eef2ff;border-color:#4966d6;color:#4966d6;font-weight:700}
    .pm-btn-del{color:#c23a3a;border-color:#f7d5d5}
    .pm-btn-vis{color:#15803d;border-color:#d5f2e1}
    /* محرر الشريك الجديد */
    .pm-editor{background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;padding:1rem;margin-bottom:1rem;box-shadow:0 10px 30px rgba(73,102,214,.1)}
    .pm-editor-head{display:flex;gap:.6rem;margin-bottom:.8rem}
    .pm-step{display:flex;align-items:center;gap:.35rem;font-size:.75rem;font-weight:700;color:#6b7280}
    .pm-step-num{width:1.4rem;height:1.4rem;border-radius:50%;background:#4966d6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem}
    .pm-editor-grid{display:grid;grid-template-columns:210px 1fr;gap:1rem}
    @media (max-width:768px){.pm-editor-grid{grid-template-columns:1fr}}
    .pm-edit-side{display:flex;flex-direction:column;gap:.5rem;align-items:center}
    .pm-edit-logo-preview{width:180px;height:180px;max-width:100%;border-radius:14px;border:1.5px dashed #c7d2e8;display:flex;align-items:center;justify-content:center;background:#f8fafd;object-fit:contain;overflow:hidden}
    .pm-edit-logo-empty{flex-direction:column;gap:.4rem;color:#94a3b8}
    .pm-edit-logo-empty-icon{font-size:2.4rem}
    .pm-edit-logo-empty-text{font-size:.75rem;font-weight:600}
    .pm-logo-upload-btn{width:100%;padding:.55rem;border-radius:10px;border:1.5px dashed #4966d6;background:#eef2ff;color:#4966d6;font-weight:700;font-size:.8rem;cursor:pointer;text-align:center}
    .pm-logo-upload-btn:hover{background:#e3e9fb}
    .pm-logo-upload-btn:disabled{opacity:.5;cursor:not-allowed}
    .pm-upload-ok{font-size:.72rem;font-weight:700;color:#15803d;background:#e6f7ee;border-radius:8px;padding:.3rem .5rem;width:100%;text-align:center}
    .pm-edit-fields{display:flex;flex-direction:column;gap:.6rem}
    .pm-edit-fields label{display:flex;flex-direction:column;gap:.25rem;font-size:.8rem;font-weight:600;color:#374151}
    .pm-edit-fields input,.pm-edit-fields select,.pm-edit-fields textarea{border:1.5px solid #e2e6f0;border-radius:10px;padding:.5rem;font-size:.85rem;background:#fff;font-family:inherit;transition:border-color .14s ease-out}
    .pm-edit-fields input:focus,.pm-edit-fields select:focus,.pm-edit-fields textarea:focus{outline:none;border-color:#4966d6}
    .pm-inline{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
    .pm-looks{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
    .pm-colors{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem}
    .pm-note{font-size:.7rem;color:#6b7280}
    .pm-editor-foot{display:flex;gap:.6rem;justify-content:flex-end;margin-top:.9rem;padding-top:.8rem;border-top:1px dashed #e5e7eb}
    .pm-btn-save-big{padding:.6rem 1.6rem;border-radius:11px;background:linear-gradient(135deg,#4966d6,#6c83e0);color:#fff;font-weight:800;font-size:.9rem;border:none;cursor:pointer;transition:transform .14s ease-out,box-shadow .14s ease-out}
    .pm-btn-save-big:hover{box-shadow:0 6px 18px rgba(73,102,214,.35)}
    .pm-btn-save-big:active{transform:scale(.97)}
    [data-preview-shape="card"]{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:2px solid;background:transparent;border-radius:12px;font-size:1.7rem}
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
  try {
    if (typeof window.__adminRerenderPartners === "function") {
      window.__adminRerenderPartners();
    }
  } catch (_) {
    /* لا شيء */
  }
})();
