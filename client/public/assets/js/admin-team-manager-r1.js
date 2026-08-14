/*
 * مدير «فريق الإدارة» — لوحة المالك (إصدار r1)
 * يدير أعضاء الفريق المعروضين في صفحة «من نحن» (جدول team_members)
 * مع رفع صور من الجهاز مباشرة، تحرير كامل، ونوافذ تأكيد داخلية.
 */
(function () {
  "use strict";

  const TRPC = "/api/trpc";

  const manager = {
    state: {
      members: [],
      loaded: false,
      loading: false,
      editing: null, // null | { id, name, role, description, imageUrl }
    },
    container: null,

    activate() {
      const target = this.container || document.querySelector("[data-team-workspace]");
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
        const members = await this.request("admin.team.listAll");
        this.state.members = Array.isArray(members) ? members : [];
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

    /* --------------------- رفع صور الأعضاء --------------------- */
    async fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("تعذر قراءة الملف من جهازك"));
        reader.readAsDataURL(file);
      });
    },
    async uploadPhoto(file, memberId) {
      if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
        throw new Error("صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP أو GIF.");
      }
      if (file.size > 4 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 4 ميغابايت");
      const dataUrl = await this.fileToDataUrl(file);
      return this.mutate("admin.team.uploadPhoto", { id: memberId, mimeType: file.type, dataUrl });
    },

    /* --------------------- العمليات --------------------- */
    emptyForm() {
      return { id: null, name: "", role: "", description: "", imageUrl: null };
    },
    startNew() {
      this.state.editing = this.emptyForm();
      this.render();
    },
    cancel() {
      this.state.editing = null;
      this.render();
    },
    startEdit(member) {
      this.state.editing = {
        id: member.id,
        name: member.name || "",
        role: member.role || "",
        description: member.description || "",
        imageUrl: member.photoUrl || null,
      };
      this.render();
    },
    async deleteMember(id) {
      try {
        await this.mutate("admin.team.delete", { id });
        this.toast("تم حذف العضو");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    confirmDelete(id) {
      this.confirmDialog("حذف هذا العضو؟", "سيُحذف العضو نهائيًا من قاعدة البيانات مع صورته.", "حذف العضو", () => this.deleteMember(id));
    },
    async toggleVisibility(id, isVisible) {
      try {
        await this.mutate("admin.team.setVisibility", { id, isVisible });
        this.toast(isVisible ? "تم إظهار العضو للزوار" : "تم إخفاء العضو عن الزوار");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async move(id, direction) {
      try {
        await this.mutate("admin.team.move", { id, direction });
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async uploadMemberPhoto(file) {
      const form = this.state.editing;
      if (!form || !form.id) { this.toast("احفظ العضو أولًا قبل رفع الصورة"); return; }
      try {
        const result = await this.uploadPhoto(file, form.id);
        form.imageUrl = result?.url || null;
        this.toast("تم رفع صورة العضو");
        this.render();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async save() {
      const form = this.state.editing;
      if (!form) return;
      if (!form.name.trim()) { this.toast("اكتب اسم العضو أولًا"); return; }
      if (!form.role.trim()) { this.toast("اكتب المسمى الوظيفي أولًا"); return; }
      const input = {
        name: form.name.trim(),
        role: form.role.trim(),
        description: form.description ? String(form.description).trim() : undefined,
      };
      if (input.description === "") delete input.description;
      try {
        if (form.id) {
          await this.mutate("admin.team.update", { id: form.id, data: input });
        } else {
          await this.mutate("admin.team.create", input);
        }
        this.toast("تم حفظ العضو في قاعدة البيانات");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    bindProps(root) {
      root.querySelectorAll("[data-team-prop]").forEach(el => {
        const key = el.dataset.teamProp;
        if (!key) return;
        const handler = () => {
          if (this.state.editing) this.state.editing[key] = el.value;
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
          <button type="button" class="btn btn-soft" data-team-confirm-cancel>إلغاء</button>
          <button type="button" class="btn btn-danger" data-team-confirm-ok>${this.esc(confirmLabel)}</button>
        </div></div>`;
      document.body.append(overlay);
      const close = () => overlay.remove();
      overlay.querySelector("[data-team-confirm-cancel]").addEventListener("click", close);
      overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
      overlay.querySelector("[data-team-confirm-ok]").addEventListener("click", () => { close(); onConfirm(); });
    },

    /* --------------------- البناء --------------------- */
    render() {
      if (!this.container) return;
      const { state } = this;
      const root = this.container;

      const head = `
        <div class="workspace-head">
          <div><p class="eyebrow">إدارة المحتوى</p>
            <h2>♙ فريق الإدارة</h2>
            <p>أضف أعضاء فريق العمل بصورهم، وغيّر ترتيبهم وإخفاءهم؛ يظهرون في صفحة «من نحن» للزوار.</p>
          </div>
        </div>`;

      if (state.loading || !state.loaded) {
        root.innerHTML = `<section class="workspace side-workspace" data-team-workspace>${head}<div class="workspace-body"><div class="empty">جارٍ تحميل الفريق من قاعدة البيانات...</div></div></section>`;
        return;
      }

      const form = state.editing ? this.formSection(state.editing) : "";
      const rows = state.members.map(member => this.memberRow(member)).join("");
      const visibleCount = state.members.filter(m => m.isVisible !== false).length;

      root.innerHTML = `<section class="workspace side-workspace" data-team-workspace>${head}<div class="workspace-body">${form}<div class="section-heading"><h3>الأعضاء</h3><p class="eyebrow">${state.members.length} عضو${state.members.length !== visibleCount ? ` · ${visibleCount} ظاهر` : ""}</p><div class="section-actions"><button class="btn btn-small" data-team-add>+ عضو جديد</button></div></div>${rows ? `<div class="item-list">${rows}</div>` : `<div class="empty">لا يوجد أعضاء بعد. أضف أول عضو في الفريق.</div>`}</div></section>`;

      this.bindProps(root);
      root.querySelectorAll("[data-team-add]").forEach(btn => btn.addEventListener("click", () => this.startNew()));
      root.querySelectorAll("[data-team-cancel]").forEach(btn => btn.addEventListener("click", () => this.cancel()));
      root.querySelectorAll("[data-team-save]").forEach(btn => btn.addEventListener("click", () => this.save()));
      root.querySelectorAll("[data-team-edit]").forEach(btn => btn.addEventListener("click", () => {
        const item = state.members.find(m => m.id === Number(btn.dataset.teamEdit));
        if (item) this.startEdit(item);
      }));
      root.querySelectorAll("[data-team-toggle]").forEach(btn => btn.addEventListener("click", () => {
        const item = state.members.find(m => m.id === Number(btn.dataset.teamToggle));
        if (item) void this.toggleVisibility(item.id, item.isVisible === false);
      }));
      root.querySelectorAll("[data-team-move]").forEach(btn => btn.addEventListener("click", () => {
        const [raw, direction] = btn.dataset.teamMove.split(":");
        void this.move(Number(raw), direction);
      }));
      root.querySelectorAll("[data-team-delete]").forEach(btn => btn.addEventListener("click", () => this.confirmDelete(Number(btn.dataset.teamDelete))));
      root.querySelectorAll("[data-team-photo]").forEach(btn => btn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/png,image/jpeg,image/webp,image/gif";
        input.addEventListener("change", () => { const file = input.files?.[0]; if (file) void this.uploadMemberPhoto(file); });
        input.click();
      }));
    },

    memberRow(member) {
      return `<article class="item-row">
        <div class="item-title">
          ${member.photoUrl ? `<img src="${this.esc(member.photoUrl)}" alt="" class="blog-row-thumb">` : `<span>♟</span>`}
          <div><b>${this.esc(member.name)}</b><br><small>${this.esc(member.role || "")}</small></div>
          <span class="status ${member.isVisible === false ? "hidden" : ""}">${member.isVisible === false ? "مخفي" : "ظاهر"}</span>
        </div>
        <div class="row-actions">
          <button class="btn btn-outline btn-small" data-team-move="${member.id}:up">↑</button>
          <button class="btn btn-outline btn-small" data-team-move="${member.id}:down">↓</button>
          <button class="btn btn-soft btn-small" data-team-edit="${member.id}">تعديل</button>
          <button class="btn btn-soft btn-small" data-team-toggle="${member.id}">${member.isVisible === false ? "إظهار" : "إخفاء"}</button>
          <button class="btn btn-danger btn-small" data-team-delete="${member.id}">حذف</button>
        </div>
      </article>`;
    },

    formSection(form) {
      return `<article class="item-row item-editor">
        <div class="editor-fields">
          <label><span>الاسم</span><input type="text" maxlength="180" value="${this.esc(form.name)}" placeholder="مثال: خالد أحمد" data-team-prop="name" /></label>
          <label><span>المسمى الوظيفي</span><input type="text" maxlength="120" value="${this.esc(form.role)}" placeholder="مثال: المدير العام" data-team-prop="role" /></label>
          <label><span>نبذة مختصرة</span><textarea maxlength="1200" rows="3" placeholder="وصف موجز يظهر تحت الاسم" data-team-prop="description">${this.esc(form.description || "")}</textarea></label>
          <div class="team-photo-row">
            ${form.imageUrl ? `<img src="${this.esc(form.imageUrl)}" alt="صورة العضو" class="team-photo-preview" />` : `<div class="team-photo-placeholder">صورة العضو</div>`}
            <button type="button" class="btn btn-outline btn-small" data-team-photo>${form.imageUrl ? "تغيير الصورة" : "رفع الصورة"}</button>
            ${form.id ? "" : `<small>احفظ العضو أولًا ثم ارفع صورته من جهازك مباشرة.</small>`}
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-soft btn-small" data-team-cancel>إلغاء</button>
          <button class="btn btn-small" data-team-save>حفظ العضو</button>
        </div>
      </article>`;
    },
  };

  window.WajbatTeamManager = manager;
})();
