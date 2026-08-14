/* WajbatContactManager — مدير «إدارة اتصل بنا» الحديث
 * خمسة أنواع قنوات: واتساب / جوال / بريد / عناوين / وسائل تواصل (بأشكال وألوان وصورة رفع من الجهاز).
 * يعمل بواجهة Vanilla JS داخل لوحة المالك عبر دالة activate() و renderInto(container).
 */
(function () {
  "use strict";

  const API = {
    list: "/api/trpc/admin.contact.list",
    publicList: "/api/trpc/admin.contact.publicList",
    create: "/api/trpc/admin.contact.createChannel",
    update: "/api/trpc/admin.contact.updateChannel",
    remove: "/api/trpc/admin.contact.deleteChannel",
    visibility: "/api/trpc/admin.contact.setVisibility",
    move: "/api/trpc/admin.contact.move",
    upload: "/api/trpc/admin.uploadImage",
  };

  const TYPE_META = {
    whatsapp: { label: "أرقام واتساب", icon: "◉", hint: "رقم يبدأ برمز الدولة (مثال: 966567680470)" },
    mobile: { label: "أرقام الجوال", icon: "☎", hint: "رقم جوال للاتصال المباشر" },
    email: { label: "البريد الإلكتروني", icon: "✉", hint: "بريد إلكتروني لاستقبال الرسائل" },
    address: { label: "العناوين", icon: "⌖", hint: "عنوان المكتب أو فرع الخدمة" },
    social: { label: "وسائل التواصل", icon: "🌐", hint: "حسابات المنصات الاجتماعية بأشكال وألوان مخصصة" },
  };

  const PLATFORMS = [
    { value: "whatsapp", name: "واتساب", color: "#25D366", emoji: "◉" },
    { value: "facebook", name: "فيسبوك", color: "#1877F2", emoji: "f" },
    { value: "instagram", name: "إنستغرام", color: "#E1306C", emoji: "◎" },
    { value: "twitter", name: "X / تويتر", color: "#1D9BF0", emoji: "𝕏" },
    { value: "youtube", name: "يوتيوب", color: "#FF0000", emoji: "▶" },
    { value: "tiktok", name: "تيك توك", color: "#010101", emoji: "♪" },
    { value: "snapchat", name: "سناب شات", color: "#FFFC00", emoji: "⚡" },
    { value: "linkedin", name: "لينكد إن", color: "#0A66C2", emoji: "in" },
    { value: "telegram", name: "تيليجرام", color: "#26A5E4", emoji: "✈" },
  ];

  const SHAPES = [
    { value: "circle", label: "دائرة", note: "شكل دائري كلاسيكي" },
    { value: "square", label: "مربع", note: "حواف حادة متساوية" },
    { value: "rectangle", label: "مستطيل", note: "أيقونة عريضة مع نص" },
    { value: "card", label: "بطاقة", note: "بطاقة أنيقة بحدود" },
    { value: "icon-only", label: "أيقونة فقط", note: "رمز المنصة بدون خلفية" },
    { value: "large-card", label: "بطاقة كبيرة", note: "بطاقة عريضة مع اسم المنصة" },
  ];

  /** مخطط CSS للشكل المحدد في المعاينة والواجهة الزائرة. */
  function shapeCss(shape) {
    switch (shape) {
      case "circle": return "border-radius:50%;width:56px;height:56px;display:flex;align-items:center;justify-content:center";
      case "square": return "border-radius:10px;width:56px;height:56px;display:flex;align-items:center;justify-content:center";
      case "rectangle": return "border-radius:10px;padding:8px 14px;display:inline-flex;align-items:center;gap:8px;height:44px";
      case "card": return "border-radius:12px;padding:10px 16px;display:inline-flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);height:52px";
      case "icon-only": return "display:flex;align-items:center;justify-content:center;font-size:32px";
      case "large-card": return "border-radius:16px;padding:14px 22px;display:flex;align-items:center;gap:14px;width:100%;box-shadow:0 3px 12px rgba(0,0,0,.1)";
      default: return "border-radius:50%;width:56px;height:56px;display:flex;align-items:center;justify-content:center";
    }
  }

  const COLORS = ["#25D366", "#1877F2", "#E1306C", "#1D9BF0", "#FF0000", "#010101", "#FFFC00", "#0A66C2", "#26A5E4", "#833AB4", "#405DE6", "#FFFFFF", "#4966D6", "#F59E0B", "#10B981", "#EF4444", "#6366F1", "#0EA5E9", "#111827", "#F3F4F6"];

  const manager = {
    state: { channels: [], loaded: false, loading: false, editing: null, formType: "whatsapp", toastTimer: null },
    container: null,

    async request(url, input) {
      const suffix = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
      const response = await fetch(url + suffix, { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload?.error?.json?.message) || "تعذر الاتصال بالخادم");
      return payload?.result?.data?.json ?? payload?.result?.data;
    },

    async mutate(url, input) {
      const response = await fetch(url, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ json: input }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload?.error?.json?.message) || "تعذر حفظ التعديلات");
      return payload?.result?.data?.json ?? payload?.result?.data;
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

    /** ربط القناة بمدير الإدارة عبر التتريك العام. */
    mountCompatible() {
      if (typeof window.WajbatContactManager !== "undefined") return;
      window.WajbatContactManager = manager;
      document.addEventListener("DOMContentLoaded", () => manager.autoBind());
      if (document.readyState !== "loading") manager.autoBind();
    },

    autoBind() {
      const button = document.querySelector("[data-contact-nav], [data-open-contact]");
      if (button && manager.container && manager.container.querySelector("[data-contact-workspace]")) {
        manager.activate();
      }
    },

    /** نقطة التركيب الرئيسية: يُستدعى من admin-app بعد فتح قسم اتصل بنا. */
    activate() {
      if (!manager.container) manager.container = document.querySelector("[data-contact-workspace]") || document.querySelector("#admin-root [data-contact-workspace] .workspace-body")?.parentElement || document.querySelector("[data-contact-workspace] .workspace-body");
      if (manager.container) manager.renderInto(manager.container);
    },

    attach(container) {
      manager.container = container;
      manager.renderInto(container);
    },

    renderInto(container) {
      if (!manager.state.loaded) {
        container.innerHTML = `<div class="empty" style="padding:2rem;text-align:center">جارٍ تحميل قنوات الاتصال…</div>`;
        void manager.load().catch(() => {
          container.innerHTML = `<div class="empty" style="padding:2rem;text-align:center">تعذر تحميل القنوات. <button class="btn btn-small" onclick="window.WajbatContactManager.load().then(() => window.WajbatContactManager.renderInto(window.WajbatContactManager.container)).catch(() => {});">إعادة المحاولة</button></div>`;
        });
        return;
      }
      container.innerHTML = manager.workspaceMarkup();
      manager.bindEvents(container);
    },

    async load() {
      manager.state.loading = true;
      manager.state.channels = (await manager.request(API.list)).channels ?? [];
      manager.state.loaded = true;
      manager.state.loading = false;
      if (manager.container) manager.renderInto(manager.container);
    },

    get grouped() {
      const groups = [];
      for (const type of Object.keys(TYPE_META)) {
        groups.push({ type, meta: TYPE_META[type], items: manager.state.channels.filter(c => c.type === type).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) });
      }
      return groups;
    },

    channelValueFor(channel) {
      switch (channel.type) {
        case "whatsapp": return channel.number;
        case "mobile": return channel.number;
        case "email": return channel.email;
        case "address": return channel.address;
        case "social": return channel.link || "";
        default: return "";
      }
    },

    channelExtraFor(channel) {
      if (channel.type === "social") return `${channel.platformName || ""}${channel.username ? ` · @${channel.username}` : ""}`;
      if (channel.description) return channel.description;
      return "";
    },

    workspaceMarkup() {
      const g = manager.grouped;
      const panels = g.map(group => {
        const cards = group.items.map((channel, index) => manager.channelCardMarkup(channel, group.type, index));
        return `<section class="dl-section"><div class="dl-section-head"><h3>${group.meta.icon} ${group.meta.label} <small>(${group.items.length})</small></h3><button class="btn btn-small" data-add-channel="${group.type}">+ إضافة ${group.meta.label.split(" ")[0]}</button></div><div class="dl-section-body">${cards.length ? `<div class="item-list">${cards.join("")}</div>` : `<div class="empty">لا توجد عناصر بعد. أضف أول قناة من الزر أعلاه.</div>`}</div></section>`;
      }).join("");

      return `<div class="workspace-inner" data-contact-workspace>
        <div class="workspace-head"><div><h2>${TYPE_META.whatsapp.icon} إدارة اتصل بنا</h2><p>أرقام واتساب والجوال والبريد والعناوين ووسائل التواصل بأشكالها وألوانها — ارفع صورة لكل قناة من جهازك مباشرة.</p></div></div>
        <div class="workspace-body" style="padding-top:0">${manager.editFormMarkup() || panels}</div>
      </div>`;
    },

    editFormMarkup() {
      const editing = manager.state.editing;
      if (!editing) return "";
      const type = editing.type || manager.state.formType;
      const meta = TYPE_META[type];
      const channel = editing.id ? manager.state.channels.find(c => c.id === editing.id) : null;
      const title = channel ? `تعديل ${meta.label}: ${esc(channel.label || "")}` : `إضافة ${meta.label}`;
      const v = channel || {};

      const primaryFields = (() => {
        switch (type) {
          case "whatsapp": return `<div class="field"><label>رقم الواتساب * (بصيغة دولية بدون +)</label><input name="number" value="${esc(v.number || "")}" required placeholder="966567680470" dir="ltr" /></div>`;
          case "mobile": return `<div class="field"><label>رقم الجوال * (بصيغة دولية بدون +)</label><input name="number" value="${esc(v.number || "")}" required placeholder="966567680470" dir="ltr" /></div>`;
          case "email": return `<div class="field"><label>البريد الإلكتروني *</label><input name="email" type="email" value="${esc(v.email || "")}" required placeholder="example@email.com" dir="ltr" /></div>`;
          case "address": return `<div class="field"><label>العنوان *</label><input name="address" value="${esc(v.address || "")}" required placeholder="الرياض، المملكة العربية السعودية" /></div>`;
          case "social": return `
            <div class="grid grid-2"><div class="field"><label>المنصة *</label><select name="platform" required>${PLATFORMS.map(p => `<option value="${p.value}" ${v.platform === p.value ? "selected" : ""}>${p.name}</option>`).join("")}</select></div>
            <div class="field"><label>الاسم المعروض</label><input name="platformName" value="${esc(v.platformName || v.platform || "")}" placeholder="واتساب" /></div></div>
            <div class="field"><label>رابط الحساب *</label><input name="link" type="url" value="${esc(v.link || "")}" required placeholder="https://..." dir="ltr" /></div>
            <div class="field"><label>اسم المستخدم (اختياري)</label><input name="username" value="${esc(v.username || "")}" placeholder="username" dir="ltr" /></div>
            <div class="grid grid-2"><div class="field"><label>طريقة العرض</label><select name="displayMode">${["icon", "card", "banner"].map(m => `<option value="${m}" ${v.displayMode === m ? "selected" : ""}>${m === "icon" ? "أيقونة فقط" : m === "card" ? "بطاقة كاملة" : "شريط عريض"}</option>`).join("")}</select></div>
            <div class="field"><label>شكل القناة</label><select name="shape">${SHAPES.map(s => `<option value="${s.value}" ${v.shape === s.value ? "selected" : ""}>${s.label} — ${s.note}</option>`).join("")}</select></div></div>
            <div class="field"><label>معاينة الشكل المختار (تحديث تلقائي)</label><div class="shape-preview-row" id="shape-preview" aria-hidden="true"></div></div><div class="field"><label>لون القناة (أيقونة/زر)</label><div class="color-row">${COLORS.map(c => `<button type="button" class="color-swatch ${v.accentColor === c ? "selected" : ""}" style="--swatch-bg:${c};${c === "#FFFFFF" || c === "#FFFC00" ? "--swatch-border:#cfd3dc;" : ""}" data-color="accentColor" data-value="${c}" aria-label="${c}"></button>`).join("")}<input name="accentColor" type="text" value="${esc(v.accentColor || "")}" placeholder="#hex" dir="ltr" style="margin-right:.5rem;flex:1;max-width:110px" /></div></div>
            <div class="field"><label>لون النص</label><div class="color-row">${COLORS.map(c => `<button type="button" class="color-swatch ${v.textColor === c ? "selected" : ""}" style="--swatch-bg:${c};${c === "#FFFFFF" || c === "#FFFC00" ? "--swatch-border:#cfd3dc;" : ""}" data-color="textColor" data-value="${c}"></button>`).join("")}<input name="textColor" type="text" value="${esc(v.textColor || "")}" placeholder="#hex" dir="ltr" style="margin-right:.5rem;flex:1;max-width:110px" /></div></div>
            <div class="field"><label>لون الخلفية</label><div class="color-row">${COLORS.map(c => `<button type="button" class="color-swatch ${v.backgroundColor === c ? "selected" : ""}" style="--swatch-bg:${c};${c === "#FFFFFF" || c === "#FFFC00" ? "--swatch-border:#cfd3dc;" : ""}" data-color="backgroundColor" data-value="${c}"></button>`).join("")}<input name="backgroundColor" type="text" value="${esc(v.backgroundColor || "")}" placeholder="#hex" dir="ltr" style="margin-right:.5rem;flex:1;max-width:110px" /></div></div>
            <div class="field"><label>لون الإطار</label><div class="color-row">${COLORS.map(c => `<button type="button" class="color-swatch ${v.borderColor === c ? "selected" : ""}" style="--swatch-bg:${c};${c === "#FFFFFF" || c === "#FFFC00" ? "--swatch-border:#cfd3dc;" : ""}" data-color="borderColor" data-value="${c}"></button>`).join("")}<input name="borderColor" type="text" value="${esc(v.borderColor || "")}" placeholder="#hex" dir="ltr" style="margin-right:.5rem;flex:1;max-width:110px" /></div></div>`;
          default: return "";
        }
      })();

      return `<div class="workspace-head"><div><h2>${title}</h2><p>${meta.hint}</p></div></div>
        <div class="workspace-body">
        <form class="channel-form" data-channel-form>
          <div class="field"><label>العنوان الظاهر *</label><input name="label" value="${esc(v.label || "")}" required placeholder="${type === "whatsapp" ? "واتساب الدعم" : "اسم القناة"}" /></div>
          <div class="field"><label>وصف مختصر (اختياري)</label><input name="description" value="${esc(v.description || "")}" placeholder="متاحون على مدار الساعة" maxlength="2000" /></div>
          ${primaryFields}
          <div class="field"><label>صورة القناة (اختياري)</label>
            <div class="upload-row">
              <input type="file" name="imageFile" accept="image/*" class="hidden-file-input" />
              <button type="button" class="btn btn-outline btn-small" data-pick-image>⬆ اختر صورة من الجهاز</button>
              <span class="upload-status">${v.imageUrl ? `<img src="${esc(v.imageUrl)}" style="max-height:44px;border-radius:8px" /> <small>صورة حالية</small>` : "لم تُرفع صورة بعد"}</span>
              ${v.imageUrl ? `<button type="button" class="btn btn-soft btn-small" data-remove-image>إزالة الصورة</button>` : ""}
            </div>
          </div>
          <label class="checkbox-field"><input type="checkbox" name="isVisible" ${v.isVisible === false ? "" : "checked"} /> مرئية للزوار</label>
          ${channel?.isPrimary ? `<label class="checkbox-field"><input type="checkbox" name="isPrimary" checked disabled /> القناة الأساسية</label>` : `<label class="checkbox-field"><input type="checkbox" name="isPrimary" ${v.isPrimary ? "checked" : ""} /> جعلها القناة الأساسية</label>`}
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${channel ? "حفظ التعديلات" : "إضافة القناة"}</button>
            <button type="button" class="btn btn-outline" data-cancel-form>إلغاء</button>
          </div>
        </form></div>`;
    },

    channelCardMarkup(channel, type, index) {
      const esc = manager.esc;
      const value = manager.channelValueFor(channel);
      const extra = manager.channelExtraFor(channel);
      const preview = channel.imageUrl ? `<img src="${esc(channel.imageUrl)}" alt="" class="channel-thumb" />` : `<span class="channel-thumb channel-thumb-placeholder">${TYPE_META[type].icon}</span>`;
      const socialPreview = channel.type === "social" ? `<div class="dl-channel-social" style="--accent:${channel.accentColor || TYPE_META.social.icon};--shape:${channel.shape || "circle"};${channel.backgroundColor ? `--bg:${channel.backgroundColor};` : ""}${channel.borderColor ? `--border:${channel.borderColor};` : ""}${channel.textColor ? `--text:${channel.textColor};` : ""}">${esc(channel.platformName || channel.platform || "منصة")}</div>` : "";
      return `<article class="dl-channel-row"><div class="dl-channel-main">${preview}${socialPreview}<div class="item-title"><b>${esc(channel.label || value)}</b><br><small>${esc(value)}${extra ? ` · ${esc(extra)}` : ""}</small></div></div>
        <div class="row-actions">
          <span class="channel-meta">${channel.isVisible === false ? `<span class="status hidden">مخفية</span>` : `<span class="status">مرئية</span>`}${channel.isPrimary ? ` <span class="status" style="background:#dbeafe;color:#1e40af">أساسية</span>` : ""}</span>
          <button class="btn btn-outline btn-small" data-move-channel="${type}:${channel.id}:up">↑</button>
          <button class="btn btn-outline btn-small" data-move-channel="${type}:${channel.id}:down">↓</button>
          <button class="btn btn-soft btn-small" data-toggle-channel="${type}:${channel.id}">${channel.isVisible === false ? "إظهار" : "إخفاء"}</button>
          <button class="btn btn-soft btn-small" data-edit-channel="${type}:${channel.id}">تعديل</button>
          <button class="btn btn-danger btn-small" data-delete-channel="${type}:${channel.id}">حذف</button>
        </div></article>`;
    },

    bindEvents(container) {
      container.querySelectorAll("[data-add-channel]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        manager.state.editing = { type: button.dataset.addChannel };
        manager.state.formType = button.dataset.addChannel;
        manager.renderInto(container);
      }));

      container.querySelectorAll("[data-edit-channel]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        const [type, id] = button.dataset.editChannel.split(":");
        const channel = manager.state.channels.find(c => c.type === type && c.id === Number(id));
        if (channel) { manager.state.editing = { type: channel.type, id: channel.id }; manager.state.formType = channel.type; manager.renderInto(container); }
      }));

      container.querySelectorAll("[data-pick-image]").forEach(button => button.addEventListener("click", () => {
        const input = button.closest(".field").querySelector("input[type=file]");
        if (input) input.click();
      }));

      container.querySelectorAll("input[type=file]").forEach(input => input.addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) { manager.toast("حجم الصورة يتجاوز 4MB. استخدم صورة أصغر."); input.value = ""; return; }
        const reader = new FileReader();
        reader.onload = async () => {
          const status = manager.container?.querySelector(".upload-status");
          if (status) status.textContent = "جارٍ رفع الصورة…";
          try {
            const result = await manager.mutate(API.upload, { mimeType: file.type, dataUrl: reader.result, originalName: file.name });
            manager.state.pendingImage = { url: result?.url || "", key: result?.key || "" };
            if (status) status.innerHTML = `<img src="${esc(result?.url || "")}" style="max-height:44px;border-radius:8px" /> <small>تم الرفع — ستُحفظ عند إرسال النموذج</small>`;
          } catch (error) {
            manager.toast(messageOf(error));
            if (status) status.textContent = "فشل رفع الصورة، حاول مرة أخرى";
          }
        };
        reader.readAsDataURL(file);
      }));

      container.querySelectorAll("[data-remove-image]").forEach(button => button.addEventListener("click", () => {
        manager.state.pendingImage = null;
        manager.state.removeImage = true;
        const status = manager.container?.querySelector(".upload-status");
        if (status) status.textContent = "ستُزال الصورة عند حفظ التعديلات";
      }));

      container.querySelectorAll(".color-swatch").forEach(swatch => swatch.addEventListener("click", () => {
        const name = swatch.dataset.color;
        const value = swatch.dataset.value;
        swatch.closest(".field").querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
        swatch.classList.add("selected");
        const input = swatch.closest(".field").querySelector(`input[name="${name}"]`);
        if (input) input.value = value;
        manager.updateShapePreview(container);
      }));

      container.querySelectorAll("select[name=shape], select[name=platform], select[name=displayMode]").forEach(select => select.addEventListener("change", () => manager.updateShapePreview(container)));
      container.querySelectorAll("input[name=platformName], input[name=username]").forEach(input => input.addEventListener("input", () => manager.updateShapePreview(container)));
      manager.updateShapePreview(container);

      container.querySelectorAll("[data-cancel-form]").forEach(button => button.addEventListener("click", () => {
        manager.state.editing = null;
        manager.state.pendingImage = null;
        manager.state.removeImage = false;
        manager.renderInto(container);
      }));

      const form = container.querySelector("[data-channel-form]");
      if (form) form.addEventListener("submit", event => manager.submitForm(event, form));

      container.querySelectorAll("[data-toggle-channel]").forEach(button => button.addEventListener("click", async event => {
        event.preventDefault();
        const [type, id] = button.dataset.toggleChannel.split(":");
        const channel = manager.state.channels.find(c => c.type === type && c.id === Number(id));
        if (!channel) return;
        try {
          await manager.mutate(API.visibility, { id: channel.id, type: channel.type, isVisible: channel.isVisible !== false });
          manager.toast("تم تحديث الظهور");
          await manager.load();
        } catch (error) { manager.toast(messageOf(error)); }
      }));

      container.querySelectorAll("[data-move-channel]").forEach(button => button.addEventListener("click", async event => {
        event.preventDefault();
        const [type, id, direction] = button.dataset.moveChannel.split(":");
        try {
          const result = await manager.mutate(API.move, { id: Number(id), type, direction });
          if (!result?.success) manager.toast("لا يمكن التحريك: القناة في البداية أو النهاية");
          else await manager.load();
        } catch (error) { manager.toast(messageOf(error)); }
      }));

      container.querySelectorAll("[data-delete-channel]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        const [type, id] = button.dataset.deleteChannel.split(":");
        const channel = manager.state.channels.find(c => c.type === type && c.id === Number(id));
        if (!channel) return;
        const dialog = manager.confirmDialog(`حذف القناة «${channel.label || manager.channelValueFor(channel)}»؟ لا يمكن التراجع عن هذا الإجراء.`, () => manager.deleteChannel(channel));
        document.body.appendChild(dialog);
      }));
    },

    confirmDialog(message, onConfirm) {
      const dialog = document.createElement("div");
      dialog.className = "modal-backdrop open";
      dialog.innerHTML = `<div class="modal-content" style="max-width:380px;text-align:center">
        <h3>تأكيد الحذف</h3><p style="margin:1rem 0">${manager.esc(message)}</p>
        <div class="form-actions" style="justify-content:center"><button class="btn btn-danger" data-confirm>حذف القناة</button><button class="btn btn-outline" data-dismiss>إلغاء</button></div>
      </div>`;
      dialog.querySelector("[data-confirm]").addEventListener("click", async () => { dialog.remove(); await onConfirm(); });
      dialog.querySelector("[data-dismiss]").addEventListener("click", () => dialog.remove());
      dialog.addEventListener("click", event => { if (event.target === dialog) dialog.remove(); });
      return dialog;
    },

    async deleteChannel(channel) {
      try {
        await manager.mutate(API.remove, { id: channel.id, type: channel.type });
        manager.toast("حُذفت القناة");
        await manager.load();
      } catch (error) { manager.toast(messageOf(error)); }
    },

    /** معاينة حية للشكل المختار: تحاكي شكله كزائر تماماً. */
    updateShapePreview(container) {
      const preview = container ? container.querySelector("#shape-preview") : null;
      if (!preview) return;
      const form = container.querySelector("[data-channel-form]");
      if (!form) { preview.innerHTML = ""; return; }
      const platform = (form.querySelector("select[name=platform]")?.value) || "whatsapp";
      const platformName = (form.querySelector("input[name=platformName]")?.value) || PLATFORMS.find(p => p.value === platform)?.name || "منصة";
      const username = (form.querySelector("input[name=username]")?.value) || "";
      const shape = (form.querySelector("select[name=shape]")?.value) || "circle";
      const bg = (form.querySelector("input[name=backgroundColor]")?.value) || PLATFORMS.find(p => p.value === platform)?.color || "#25D366";
      const text = (form.querySelector("input[name=textColor]")?.value) || "#ffffff";
      const iconChar = PLATFORMS.find(p => p.value === platform)?.emoji || "🌐";
      const css = shapeCss(shape);
      const showName = shape === "rectangle" || shape === "card" || shape === "large-card";
      preview.innerHTML = `<span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#f4f6fb;border:1px dashed #c9d0dc;border-radius:10px;padding:10px">
        <span style="${css};background:${bg};color:${text};border:1px solid ${bg};font-size:${shape === "icon-only" ? "30px" : "20px"}">${showName ? "" : iconChar}</span>
        ${showName ? `<span style="color:#374151;font-weight:600;font-size:15px">${platformName}${username ? " · @" + username : ""}</span>` : ""}
        <small style="color:#6b7280;margin-right:auto">شكل: ${SHAPES.find(s => s.value === shape)?.label || shape}</small>
      </span>`;
    },

    readForm(form) {
      const data = {};
      const type = manager.state.formType;
      for (const element of form.elements) {
        if (!element.name || element.disabled) continue;
        if (element.type === "checkbox") data[element.name] = element.checked;
        else if (element.type === "file") continue;
        else if (element.name === "platform") data.platform = element.value;
        else data[element.name] = element.value.trim();
      }
      const base = { type, label: data.label, description: data.description || undefined, isVisible: data.isVisible !== false };
      if (data.imageKey) base.imageKey = data.imageKey;
      switch (type) {
        case "whatsapp": return { ...base, number: data.number };
        case "mobile": return { ...base, number: data.number };
        case "email": return { ...base, email: data.email };
        case "address": return { ...base, address: data.address };
        case "social": return {
          ...base,
          platform: data.platform,
          platformName: data.platformName || data.platform,
          link: data.link,
          username: data.username || null,
          displayMode: data.displayMode || "icon",
          shape: data.shape || "circle",
          accentColor: data.accentColor || undefined,
          textColor: data.textColor || undefined,
          backgroundColor: data.backgroundColor || undefined,
          borderColor: data.borderColor || undefined,
          icon: PLATFORMS.find(p => p.value === data.platform)?.value || "🌐",
        };
      }
      return base;
    },

    async submitForm(event, form) {
      event.preventDefault();
      const editing = manager.state.editing;
      const input = manager.readForm(form);
      const submit = document.createElement("button");
      submit.disabled = true;
      submit.textContent = "جارٍ الحفظ…";
      form.querySelector('button[type="submit"]').replaceWith(submit);
      try {
        if (editing.id) {
          const updates = { id: editing.id, type: editing.type, ...input };
          if (manager.state.pendingImage) { updates.imageUrl = manager.state.pendingImage.url; updates.imageKey = manager.state.pendingImage.key; }
          else if (manager.state.removeImage) { updates.imageUrl = null; updates.imageKey = null; }
          await manager.mutate(API.update, updates);
          manager.toast("حُفظت التعديلات");
        } else {
          if (manager.state.pendingImage) { input.imageUrl = manager.state.pendingImage.url; input.imageKey = manager.state.pendingImage.key; }
          await manager.mutate(API.create, input);
          manager.toast("أُضيفت القناة");
        }
        manager.state.editing = null;
        manager.state.pendingImage = null;
        manager.state.removeImage = false;
        await manager.load();
      } catch (error) {
        manager.toast(messageOf(error));
        submit.replaceWith(form.querySelector('button[type="submit"]') || form.querySelector('button'));
      }
    },
  };

  function messageOf(error) { return error instanceof Error ? error.message : "حدث خطأ غير متوقع"; }
  function esc(value = "") { return manager.esc(value); }

  manager.mountCompatible();
  if (typeof window.WajbatContactManager === "undefined") window.WajbatContactManager = manager;
})();
