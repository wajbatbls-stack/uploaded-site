/* إدارة التحميلات — واجبات بلس r11 (تصميم احترافي فاخر + رفع متعدد + حقل قسم ظاهر) */
(function () {
  "use strict";

  const BRAND = { ink: "#0c1a33", slate: "#475274", mist: "#7b86a6", line: "#e4e9f5", paper: "#f3f6fd", accent: "#3d32c8", accent2: "#7c3aed", ok: "#059669", danger: "#dc2626", card: "#ffffff", deep: "#0b1226" };

  const state = {
    categories: [], files: [], search: "", loading: false,
    openCategoryEditor: null, openFileEditor: null, draftFiles: [],
    expanded: new Set(), activeCategory: null, toastTimer: null,
  };

  /* ===== أدوات مساعدة ===== */
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const admin = () => window.WajbatAdmin;
  const toast = message => { if (admin()?.toast) { admin().toast(message); return; } window.alert(message); };
  const fmtDate = v => v ? new Date(v).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const fmtSize = v => {
    const n = Number(v || 0);
    if (!n) return "غير معروف";
    if (n < 1024) return `${n} بايت`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ك.ب`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ج.ب`;
  };
  const fileGlyph = mime => {
    if (!mime) return "📄";
    if (mime.startsWith("image/")) return "🖼";
    if (mime.startsWith("video/")) return "🎥";
    if (mime.startsWith("audio/")) return "🎵";
    if (mime.includes("pdf")) return "📕";
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "🗜";
    if (mime.includes("word") || mime.includes("msword") || mime.includes("document")) return "📘";
    if (mime.includes("sheet") || mime.includes("excel")) return "📗";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "📙";
    return "📄";
  };
  const apiError = async res => {
    const p = await res.json().catch(() => null);
    if (!res.ok) throw new Error(p?.error?.json?.message || "تعذّر إتمام العملية. حاول مرة أخرى.");
    return p?.result?.data?.json ?? p?.result?.data;
  };
  const request = (procedure, input, method = "POST") => {
    const url = method === "GET" ? `/api/trpc/${procedure}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}` : `/api/trpc/${procedure}`;
    return fetch(url, { method, credentials: "same-origin", cache: "no-store", headers: method === "POST" ? { "content-type": "application/json" } : undefined, body: method === "POST" ? JSON.stringify({ json: input }) : undefined }).then(apiError);
  };


  /* ===== تحميل القائمة ===== */
  const list = async () => {
    state.loading = true; render();
    try {
      const data = await request("admin.downloads.list", undefined, "GET");
      state.categories = Array.isArray(data?.categories) ? data.categories : [];
      state.files = Array.isArray(data?.files) ? data.files : [];
      if (state.activeCategory && !state.categories.some(c => Number(c.id) === Number(state.activeCategory))) state.activeCategory = state.categories[0]?.id ?? null;
      else if (!state.activeCategory) state.activeCategory = state.categories[0]?.id ?? null;
      state.categories.forEach(c => state.expanded.add(c.id));
    } catch (e) { toast(e.message || "تعذّر تحميل التحميلات"); }
    finally { state.loading = false; render(); }
  };

  const filesOf = id => state.files
    .filter(f => Number(f.categoryId) === Number(id))
    .filter(f => {
      const q = state.search.trim().toLowerCase();
      if (!q) return true;
      return [f.fileName, f.originalName, f.description].some(v => String(v || "").toLowerCase().includes(q));
    })
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) || new Date(b.createdAt) - new Date(a.createdAt));
  const byOrder = arr => [...arr].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const visibleCats = state => state.categories.filter(c => c.isVisible !== false);
  const totalStats = () => ({
    cats: state.categories.length,
    files: state.files.length,
    visibleFiles: state.files.filter(f => f.isVisible !== false).length,
    downloads: state.files.reduce((s, f) => s + Number(f.downloadCount || 0), 0),
  });

  /* ===== عمليات الأقسام ===== */
  const saveCategory = async input => {
    if (!input.name || !String(input.name).trim()) throw new Error("أدخل عنوان القسم.");
    try {
      const payload = {
        name: String(input.name).trim(),
        description: String(input.description || "").trim() || undefined,
        emoji: (String(input.emoji || "📁").trim() || "📁").slice(0, 4),
        color: String(input.color || BRAND.accent),
        backgroundColor: String(input.backgroundColor || "#eef0fb"),
        imageKey: typeof input.imageKey === "string" && input.imageKey.length > 0 ? input.imageKey : undefined,
        imageUrl: typeof input.imageUrl === "string" && input.imageUrl.length > 0 ? input.imageUrl : undefined,
      };
      let category;
      if (state.openCategoryEditor?.id) {
        category = await request("admin.downloads.updateCategory", { id: state.openCategoryEditor.id, ...payload });
        toast("تم تحديث القسم بنجاح");
      } else {
        category = await request("admin.downloads.createCategory", payload);
        toast("تم إنشاء القسم بنجاح");
      }
      state.openCategoryEditor = null; closeOverlays(); await list();
      return category;
    } catch (e) { toast(e.message); closeOverlays(); render(); throw e; }
  };
  const removeCategory = async id => {
    try { await request("admin.downloads.deleteCategory", { id }); toast("تم حذف القسم"); await list(); }
    catch (e) { toast(e.message); render(); }
  };
  const toggleCategoryVisibility = async id => {
    try {
      const c = state.categories.find(c => Number(c.id) === Number(id));
      await request("admin.downloads.setCategoryVisibility", { id, isVisible: !c?.isVisible });
      toast(c?.isVisible ? "تم إخفاء القسم عن الزوار" : "تم إظهار القسم للزوار");
      await list();
    } catch (e) { toast(e.message); render(); }
  };
  const moveCategory = async (id, direction) => {
    try { await request("admin.downloads.moveCategory", { id, direction }); await list(); }
    catch (e) { toast(e.message); render(); }
  };

  /* ===== عمليات الملفات ===== */
  const saveFile = async input => {
    try {
      if (state.openFileEditor?.id) {
        await request("admin.downloads.updateFile", { id: state.openFileEditor.id, ...input });
        toast("تم تحديث الملف بنجاح");
      } else {
        const created = await request("admin.downloads.createFile", input);
        toast(`تمت إضافة الملف بنجاح${input.originalName ? ` «${esc(input.originalName)}»` : ""}`);
      }
      state.openFileEditor = null; closeOverlays(); await list();
    } catch (e) { toast(e.message); closeOverlays(); render(); throw e; }
  };
  const removeFile = async id => {
    try { await request("admin.downloads.deleteFile", { id }); toast("تم حذف الملف"); await list(); }
    catch (e) { toast(e.message); render(); }
  };
  const toggleFileVisibility = async id => {
    try {
      const f = state.files.find(f => Number(f.id) === Number(id));
      await request("admin.downloads.setFileVisibility", { id, isVisible: !f?.isVisible });
      toast(f?.isVisible ? "تم إخفاء الملف عن الزوار" : "تم إظهار الملف للزوار");
      await list();
    } catch (e) { toast(e.message); render(); }
  };
  const moveFile = async (id, direction) => {
    try { await request("admin.downloads.moveFile", { id, direction }); await list(); }
    catch (e) { toast(e.message); render(); }
  };
  const copyFileUrl = async file => {
    try {
      const r = await request("admin.downloads.trackDownload", { id: file.id });
      const link = `${location.origin}${r.fileUrl}`;
      try { await navigator.clipboard.writeText(link); } catch {
        const ta = document.createElement("textarea"); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }
      toast("تم نسخ رابط التحميل");
    } catch (e) { toast(e.message); }
  };
  const shareFile = (file, platform) => {
    request("admin.downloads.trackDownload", { id: file.id }).then(r => {
      const link = `${location.origin}${r.fileUrl}`;
      const title = r.fileName || r.originalName || "";
      const url = platform === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`${title}: ${link}`)}`
        : `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }).catch(e => toast(e.message));
  };
  const replaceFile = async (fileId, file) => {
    try {
      const uploaded = await uploadFileLegacy(file);
      await request("admin.downloads.replaceFile", {
        id: fileId, fileKey: uploaded.fileKey, fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes, originalName: uploaded.originalName,
      });
      toast("تم استبدال الملف بنجاح");
      await list();
    } catch (e) { toast(e.message); render(); }
  };
  const createWithUploads = async (categoryId, files) => {
    try {
      const ok = [], bad = [];
      for (const file of Array.from(files)) {
        try {
          const uploaded = await uploadFileLegacy(file);
          await request("admin.downloads.createFile", {
            categoryId, fileName: uploaded.originalName.replace(/\.[^.]+$/, "") || uploaded.originalName,
            originalName: uploaded.originalName, fileKey: uploaded.fileKey, fileUrl: uploaded.fileUrl,
            mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes,
          });
          ok.push(file.name);
        } catch (e) { bad.push(`${file.name}: ${e.message}`); }
      }
      if (ok.length) toast(`تم رفع ${ok.length} ملف بنجاح`);
      if (bad.length) toast(`فشل رفع ${bad.length} ملف — ${bad[0].slice(0, 80)}`);
      await list();
    } catch (e) { toast(e.message); render(); }
  };
  const previewFile = file => {
    request("admin.downloads.trackDownload", { id: file.id }).then(r => {
      window.open(r.fileUrl, "_blank", "noopener,noreferrer");
    }).catch(e => toast(e.message));
  };

  /* ===== رفع فعلي مع شريط تقدم ===== */
  const uploadFileWithProgress = (file, onProgress) => {
    if (!file) throw new Error("اختر ملفًا من جهازك أولًا.");
    if (file.size > 50 * 1024 * 1024) throw new Error(`الملف أكبر من الحد المسموح (50 م.ب): ${esc(file.name)}.`);
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/downloads/upload");
      xhr.withCredentials = true;
      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener("load", async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch (err) { reject(new Error("استجابة غير صالحة من الخادم.")); }
        } else {
          let msg = `تعذّر رفع الملف: ${esc(file.name)}`;
          try { const p = JSON.parse(xhr.responseText); if (p?.error) msg = p.error; } catch { /* ignore */ }
          reject(new Error(msg));
        }
      });
      xhr.addEventListener("error", () => reject(new Error(`انقطع الاتصال أثناء رفع: ${esc(file.name)} — تحقق من الإنترنت وأعد المحاولة.`)));
      xhr.send(fd);
    });
  };
  /* إبقاء المسار القديم كمرجع داخلي */
  const uploadFileLegacy = file => {
    if (!file) throw new Error("اختر ملفًا من جهازك أولًا.");
    if (file.size > 50 * 1024 * 1024) throw new Error(`الملف أكبر من الحد المسموح (50 م.ب): ${esc(file.name)}.`);
    const fd = new FormData();
    fd.append("file", file);
    return fetch("/api/downloads/upload", { method: "POST", credentials: "same-origin", body: fd }).then(async res => {
      if (!res.ok) {
        const p = await res.json().catch(() => null);
        throw new Error(p?.error || `تعذّر رفع الملف: ${esc(file.name)}`);
      }
      return await res.json();
    });
  };

  /* ===== طبقة التنبيهات ===== */
  const showNotice = (message, kind = "ok") => {
    const layer = document.getElementById("dl-r10-notices");
    if (!layer) return;
    const el = document.createElement("div");
    el.className = `dl10-notice dl10-notice-${kind}`;
    el.textContent = message;
    layer.appendChild(el);
    requestAnimationFrame(() => el.classList.add("dl10-notice-in"));
    setTimeout(() => { el.classList.remove("dl10-notice-in"); el.classList.add("dl10-notice-out"); setTimeout(() => el.remove(), 250); }, 3200);
  };

  /* ===== إغلاق الطبقات ===== */
  const closeOverlays = () => {
    document.querySelectorAll(".dl10-overlay").forEach(o => o.remove());
  };

  /* ===== القوالب (تصميم فاخر) ===== */
  const overlay = (title, body, onClose) => {
    closeOverlays();
    const root = document.createElement("div");
    root.className = "dl10-overlay";
    root.setAttribute("dir", "rtl");
    root.innerHTML = `
      <div class="dl10-backdrop" data-dl10-close></div>
      <aside class="dl10-drawer">
        <header class="dl10-head">
          <div><h3>${esc(title)}</h3><p class="dl10-sub">${esc(typeof onClose === "string" ? onClose : "إدارة التحميلات")}</p></div>
          <button type="button" class="dl10-x" data-dl10-close aria-label="إغلاق">✕</button>
        </header>
        <div class="dl10-body">${body}</div>
      </aside>`;
    document.body.appendChild(root);
    root.querySelectorAll("[data-dl10-close]").forEach(el => el.addEventListener("click", () => root.remove()));
    return root;
  };

  const categoryDrawer = category => {
    const root = overlay(category ? "تعديل القسم" : "قسم جديد", `
      <form data-dl10-cat-form class="dl10-form">
        <div class="dl10-grid-2">
          <div class="dl10-field">
            <label>عنوان القسم <b class="dl10-req">*</b></label>
            <input name="name" required value="${esc(category?.name || "")}" placeholder="مثلًا: نماذج واجبات" />
          </div>
          <div class="dl10-field">
            <label>الرمز التعبيري</label>
            <input name="emoji" value="${esc(category?.emoji || "📁")}" maxlength="4" style="width:110px" />
          </div>
        </div>
        <div class="dl10-field">
          <label>الوصف</label>
          <textarea name="description" placeholder="وصف قصير يظهر للزوار في هذا القسم">${esc(category?.description || "")}</textarea>
        </div>
        <div class="dl10-grid-2">
          <div class="dl10-field">
            <label>لون القسم</label>
            <input type="color" name="color" value="${esc(category?.color || BRAND.accent)}" />
          </div>
          <div class="dl10-field">
            <label>لون الخلفية</label>
            <input type="color" name="backgroundColor" value="${esc(category?.backgroundColor || "#eef0fb")}" />
          </div>
        </div>
        <div class="dl10-field">
          <label>شعار القسم (اختياري)</label>
          <div class="dl10-uploader">
            <input type="file" name="logo" accept="image/*" hidden />
            <button type="button" class="dl10-up-btn" data-dl10-logo-pick>
              <span class="dl10-up-icon">📤</span>
              <span class="dl10-up-label">رفع شعار القسم من جهازك</span>
            </button>
            <div class="dl10-preview ${category?.imageUrl ? "" : "dl10-preview-empty"}" data-dl10-logo-preview>
              ${category?.imageUrl ? `<img src="${esc(category.imageUrl)}" alt="الشعار" />` : "<span>معاينة الشعار</span>"}
            </div>
          </div>
        </div>
        <footer class="dl10-foot">
          <button type="button" class="dl10-btn dl10-ghost" data-dl10-close>إلغاء</button>
          <button type="submit" class="dl10-btn dl10-primary">${category ? "حفظ التغييرات" : "إنشاء القسم"}</button>
        </footer>
      </form>`, category ? "عدّل بيانات القسم وظهوره أمام الزوار" : "أنشئ قسمًا جديدًا لملفاتك");
    const form = root.querySelector("[data-dl10-cat-form]");
    const logoInput = root.querySelector("[name=logo]");
    const preview = root.querySelector("[data-dl10-logo-preview]");
    let pendingLogo = category ? {
      imageKey: typeof category.imageKey === "string" && category.imageKey.length > 0 ? category.imageKey : undefined,
      imageUrl: typeof category.imageUrl === "string" && category.imageUrl.length > 0 ? category.imageUrl : undefined,
    } : null;
    logoInput.addEventListener("change", () => {
      const f = logoInput.files?.[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) { showNotice("اختر ملف صورة صالحًا", "bad"); return; }
      const reader = new FileReader();
      reader.onload = () => {
        preview.innerHTML = `<img src="${reader.result}" alt="معاينة" />`;
        preview.classList.remove("dl10-preview-empty");
        pendingLogo = { imageUrl: String(reader.result) };
        showNotice("تم رفع صورة الشعار بنجاح", "ok");
      };
      reader.readAsDataURL(f);
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true;
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        await saveCategory({
          name: data.name, emoji: data.emoji, description: data.description,
          color: data.color, backgroundColor: data.backgroundColor,
          ...(pendingLogo || {}),
        });
        showNotice(category ? "تم حفظ القسم بنجاح" : "تم إنشاء القسم بنجاح", "ok");
        root.remove();
      } catch (err) {
        submit.disabled = false;
        showNotice(err && err.message ? String(err.message) : "تعذّر حفظ القسم. حاول مرة أخرى.", "bad");
      }
    });
  };

  /* ===== نموذج «إضافة نموذج» — تصميم dfa17 الفاخر ===== */
  const fileDrawer = async (file, categoryId) => {
    const isEdit = Boolean(file);
    /* إعادة جلب قائمة الأقسام قبل فتح النموذج لضمان ظهورها حتى لو فُتح النموذج قبل اكتمال التحميل الأول */
    try {
      const data = await request("admin.downloads.list", undefined, "GET");
      state.categories = Array.isArray(data?.categories) ? data.categories : [];
    } catch (e) { /* تبقى القائمة كما هي من آخر تحميل ناجح */ }
    const cats = state.categories.filter(c => c.isVisible !== false);

    /* ========== تصميم dfa17 الفاخر ========== */
    closeOverlays();
    const root = document.createElement("div");
    root.className = "dfa17-overlay";
    root.setAttribute("dir", "rtl");
    const title = isEdit ? "تعديل النموذج" : "إضافة نموذج جديد";
    const subtitle = isEdit ? "عدّل البيانات واستبدل الملف أو احفظ البيانات فقط" : "انشر نموذجًا جديدًا يظهر للزوار فور الحفظ";
    const catDefault = Number(file?.categoryId ?? categoryId ?? cats[0]?.id ?? "");
    root.innerHTML = `
      <div class="dfa17-backdrop" data-dfa17-close></div>
      <aside class="dfa17-card" style="animation:dfa17-pop .34s cubic-bezier(.23,1,.32,1)">
        <header class="dfa17-head">
          <div class="dfa17-orb dfa17-orb-1"></div>
          <div class="dfa17-orb dfa17-orb-2"></div>
          <div class="dfa17-head-inner">
            <div class="dfa17-badge">${isEdit ? "✎ تعديل" : "📄 نموذج جديد"}</div>
            <h3>${esc(title)}</h3>
            <p>${esc(subtitle)}</p>
            <button type="button" class="dfa17-x" data-dfa17-close aria-label="إغلاق">✕</button>
          </div>
        </header>
        <div class="dfa17-body">
          <form id="dfa17-form-internal" data-dfa17-file-form class="dfa17-form">
            <div class="dfa17-step"><span class="dfa17-step-num">1</span><span class="dfa17-step-title">بيانات النموذج</span></div>
            <div class="dfa17-grid-2">
              <div class="dfa17-field dfa17-field-span">
                <label>اسم النموذج <b class="dfa17-req">*</b></label>
                <input name="fileName" required value="${esc(file?.fileName || "")}" placeholder="مثلًا: نموذج واجب نهائي" />
              </div>
              <div class="dfa17-field">
                <label>القسم <b class="dfa17-req">*</b></label>
                <select name="categoryId" required ${isEdit ? "disabled" : ""}>
                  ${!isEdit && cats.length > 0 ? "<option value=\"\" disabled>— اختر القسم —</option>" : ""}
                  ${cats.length === 0 ? "<option value=\"\" selected>لا توجد أقسام — أغلق وأنشئ قسمًا جديدًا أولًا</option>" : cats.map(c => `<option value="${c.id}" ${Number(catDefault) === Number(c.id) ? "selected" : ""}>${esc(c.emoji || "📁")} ${esc(c.name)}</option>`).join("")}
                </select>
              </div>
              <div class="dfa17-field">
                <label>الوصف (اختياري)</label>
                <input name="description" placeholder="وصف قصير يظهر بجانب النموذج" value="${esc(file?.description || "")}" />
              </div>
            </div>
            ${isEdit ? `` : `
            <div class="dfa17-step"><span class="dfa17-step-num">2</span><span class="dfa17-step-title">ملف النموذج</span></div>
            <div class="dfa17-drop" data-dfa17-dropzone>
              <input type="file" name="file" hidden multiple />
              <div class="dfa17-drop-inner">
                <span class="dfa17-drop-icon">☁</span>
                <span class="dfa17-drop-label">اضغط هنا أو اسحب النموذج من جهازك</span>
                <span class="dfa17-drop-hint">PDF · Word · Excel · صور · حتى 50 م.ب</span>
              </div>
              <div class="dfa17-cards" data-dfa17-cards></div>
            </div>`}
            ${isEdit ? `
            <div class="dfa17-step"><span class="dfa17-step-num">2</span><span class="dfa17-step-title">استبدال الملف (اختياري)</span></div>
            <div class="dfa17-replace">
              <div class="dfa17-replace-wrap">
                <span class="dfa17-replace-glyph">🔄</span>
                <span class="dfa17-replace-text">استبدل الملف الحالي بملف جديد من جهازك</span>
              </div>
              <input type="file" name="replace" hidden />
              <button type="button" class="dfa17-btn-ghost" data-dfa17-replace-pick>اختر ملفًا من الجهاز</button>
              <div class="dfa17-replace-meta" data-dfa17-replace-meta></div>
            </div>` : ""}
          </form>
        </div>
        <footer class="dfa17-foot">
          <span class="dfa17-foot-hint" data-dfa17-hint>${isEdit ? "التغييرات تنعكس على الزوار فور الحفظ" : "النموذج يظهر للزوار فورًا بعد الإضافة"}</span>
          <button type="button" class="dfa17-btn dfa17-ghost" data-dfa17-close>إلغاء</button>
          <button type="button" class="dfa17-btn dfa17-primary" data-dfa17-submit ${isEdit ? "" : "disabled"}>${isEdit ? "💾 حفظ التغييرات" : "⬆ إضافة النموذج"}</button>
        </footer>
      </aside>`;
    document.body.appendChild(root);
    root.querySelectorAll("[data-dfa17-close]").forEach(el => el.addEventListener("click", () => root.remove()));

    const form = root.querySelector("[data-dfa17-file-form]");
    const submitBtn = root.querySelector("[data-dfa17-submit]");
    const hint = root.querySelector("[data-dfa17-hint]");
    const enableIfReady = () => {
      if (isEdit) return;
      submitBtn.disabled = !(pendingUploads.length > 0 && catSelect?.value);
    };
    let pendingUploads = [];

    if (isEdit) {
      const replaceInput = root.querySelector("[name=replace]");
      const meta = root.querySelector("[data-dfa17-replace-meta]");
      root.querySelector("[data-dfa17-replace-pick]").addEventListener("click", () => replaceInput.click());
      replaceInput.addEventListener("change", () => {
        const f = replaceInput.files?.[0];
        if (!f) { meta.innerHTML = ""; return; }
        meta.innerHTML = `<span class="dfa17-meta-ok">✓ جاهز: ${esc(f.name)} (${fmtSize(f.size)})</span>`;
        showNotice("تم اختيار الملف بنجاح — احفظ لتطبيق الاستبدال", "ok");
      });
      submitBtn.addEventListener("click", async () => {
        if (submitBtn.disabled || submitBtn.getAttribute("data-busy") === "1") return;
        submitBtn.setAttribute("data-busy", "1");
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ جارٍ الحفظ…";
        try {
          const data = Object.fromEntries(new FormData(form).entries());
          const f = replaceInput.files?.[0];
          if (f) {
            const uploaded = await uploadFileLegacy(f);
            await request("admin.downloads.replaceFile", {
              id: file.id, fileKey: uploaded.fileKey, fileUrl: uploaded.fileUrl,
              mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes, originalName: uploaded.originalName,
            });
            showNotice("تم استبدال الملف بنجاح", "ok");
          } else {
            await request("admin.downloads.updateFile", { id: file.id, ...data, description: data.description || undefined });
            showNotice("تم حفظ التغييرات بنجاح", "ok");
          }
          root.remove(); await list();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("data-busy");
          submitBtn.textContent = "💾 حفظ التغييرات";
          showNotice(err?.message || "تعذّر الحفظ", "bad");
        }
      });
      root.addEventListener("keydown", e => {
        if (e.key === "Enter" && !submitBtn.disabled && e.target.tagName === "INPUT") {
          e.preventDefault(); submitBtn.click();
        }
      });
      return;
    }

    /* ========== رفع فعلي بشريط تقدم ========== */
    const cardsRoot = root.querySelector("[data-dfa17-cards]");
    const dropzone = root.querySelector("[data-dfa17-dropzone]");
    const fileInput = root.querySelector("[name=file]");
    const catSelect = root.querySelector("[name=categoryId]");
    root.querySelector(".dfa17-drop-inner").addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("dfa17-drag"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dfa17-drag"));
    dropzone.addEventListener("drop", e => {
      e.preventDefault(); dropzone.classList.remove("dfa17-drag");
      addFiles(Array.from(e.dataTransfer?.files || []));
    });
    const addFiles = files => {
      const valid = files.filter(f => f.size > 0 && f.size <= 50 * 1024 * 1024);
      if (!valid.length) { showNotice("لم يتم تحديد ملفات صالحة (حتى 50 م.ب)", "bad"); return; }
      pendingUploads = pendingUploads.concat(valid.map(file => ({ file, status: "idle", percent: 0 })));
      renderCards();
      showNotice(`تم اختيار ${valid.length} ملف — اضغط «إضافة النموذج» للرفع`, "ok");
      fileInput.value = "";
      enableIfReady();
    };
    fileInput.addEventListener("change", () => addFiles(Array.from(fileInput.files || [])));
    if (catSelect) catSelect.addEventListener("change", () => { enableIfReady(); });

    const percentOf = ({ status, percent }) => status === "done" ? 100 : status === "failed" ? 0 : percent;
    const renderCards = () => {
      cardsRoot.innerHTML = pendingUploads.map((e, i) => `
        <div class="dfa17-card ${e.status}">
          <div class="dfa17-card-main">
            <span class="dfa17-card-glyph">${fileGlyph(e.file.type)}</span>
            <div class="dfa17-card-info">
              <b title="${esc(e.file.name)}">${esc(e.file.name)}</b>
              <small>${fmtSize(e.file.size)}${e.status === "done" ? " · ✓ اكتمل" : e.status === "failed" ? " · ✗ فشل" : ""}</small>
            </div>
            ${e.status === "idle" ? `<button type="button" class="dfa17-card-rm" data-dfa17-rm="${i}" title="إزالة">✕</button>` : ""}
          </div>
          <div class="dfa17-track" style="width:${percentOf(e)}%"></div>
          ${e.status === "uploading" ? `<span class="dfa17-pct">${e.percent}%</span>` : ""}
        </div>`).join("");
      cardsRoot.querySelectorAll("[data-dfa17-rm]").forEach(btn => btn.addEventListener("click", () => {
        pendingUploads.splice(Number(btn.dataset.dfa17Rm), 1);
        renderCards(); enableIfReady();
      }));
    };
    const setCard = (i, patch) => { Object.assign(pendingUploads[i], patch); renderCards(); };

    /* أي ضغط على زر الإرسال (حتى Enter داخل حقول النص) يمر من هنا */
    root.addEventListener("keydown", e => {
      if (e.key === "Enter" && !submitBtn.disabled && e.target.tagName === "INPUT") {
        e.preventDefault(); submitBtn.click();
      }
    });
    submitBtn.addEventListener("click", async () => {
      if (submitBtn.disabled || submitBtn.getAttribute("data-busy") === "1") return;
      if (!pendingUploads.length) { showNotice("اختر ملف النموذج من جهازك أولًا", "bad"); return; }
      if (!catSelect?.value) { showNotice("اختر القسم أولًا", "bad"); return; }
      submitBtn.setAttribute("data-busy", "1");
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ جارٍ الرفع…";
      hint.textContent = "يُرفع الملف فعلًا الآن — لا تغلق الصفحة حتى ينتهي";
      const data = Object.fromEntries(new FormData(form).entries());
      const enteredName = String(data.fileName || "").trim();
      let done = 0;
      try {
        for (let i = 0; i < pendingUploads.length; i++) {
          const entry = pendingUploads[i];
          if (entry.status === "done") { done++; continue; }
          setCard(i, { status: "uploading", percent: 0 });
          try {
            const uploaded = await uploadFileWithProgress(entry.file, pct => setCard(i, { percent: pct }));
            setCard(i, { status: "done" });
            const modelName = pendingUploads.length === 1 && enteredName
              ? enteredName
              : (uploaded.originalName.replace(/\.[^.]+$/, "") || uploaded.originalName);
            await request("admin.downloads.createFile", {
              categoryId: Number(data.categoryId),
              fileName: modelName,
              originalName: uploaded.originalName,
              description: data.description || undefined,
              fileKey: uploaded.fileKey, fileUrl: uploaded.fileUrl,
              mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes,
            });
            done++;
            showNotice(`✓ تم حفظ «${esc(modelName)}» (${done}/${pendingUploads.length})`, "ok");
          } catch (upErr) {
            setCard(i, { status: "failed" });
            showNotice(upErr?.message || `فشل رفع: ${esc(entry.file.name)}`, "bad");
          }
        }
        if (done) {
          state.activeCategory = Number(data.categoryId);
          await list();
          showNotice(`✓ تمت إضافة ${done} نموذج بنجاح — يظهر الآن للزوار`, "ok");
        }
        const failed = pendingUploads.length - done;
        if (failed === 0) {
          root.remove();
        } else {
          hint.textContent = done
            ? `تم حفظ ${done} نموذج، وتعذر حفظ ${failed}. راجع بطاقة الملف ذات العلامة الحمراء ثم أعد المحاولة.`
            : "لم يُحفظ أي نموذج بعد. راجع الرسالة الحمراء وتحقق من اتصالك ثم أعد المحاولة.";
          showNotice(`تعذر حفظ ${failed} نموذج. بقيت النافذة مفتوحة حتى لا تضيع بياناتك.`, "bad");
        }
      } finally {
        submitBtn.removeAttribute("data-busy");
        submitBtn.textContent = "⬆ إضافة النموذج";
        enableIfReady();
      }
    });
  };

  /* ===== العرض الرئيسي ===== */
  const render = () => {
    const workspace = document.querySelector(".side-workspace");
    if (!workspace) return;
    const stats = totalStats();
    const active = state.categories.find(c => Number(c.id) === Number(state.activeCategory));
    const activeFiles = active ? filesOf(active.id) : [];

    workspace.innerHTML = `
      <div class="dl10">
        <div class="dl10-headbar">
          <div>
            <h2 class="dl10-title">إدارة التحميلات</h2>
            <p class="dl10-subtitle">الأقسام وملفات النماذج والسيَر والعروض التي تظهر للزوار</p>
          </div>
          <div class="dl10-head-actions">
            <div class="dl10-searchbox">
              <span class="dl10-search-icon">🔍</span>
              <input type="search" data-dl10-search placeholder="ابحث في الأقسام والملفات…" value="${esc(state.search)}" dir="rtl" />
            </div>
            <button type="button" class="dl10-btn dl10-primary dl10-btn-lg" data-dl10-add-category>
              <span>➕</span> قسم جديد
            </button>
          </div>
        </div>

        <div class="dl10-stats">
          <div class="dl10-stat"><span class="dl10-stat-n">${stats.cats}</span><span class="dl10-stat-l">قسم</span></div>
          <div class="dl10-stat"><span class="dl10-stat-n">${stats.files}</span><span class="dl10-stat-l">ملف</span></div>
          <div class="dl10-stat"><span class="dl10-stat-n">${stats.visibleFiles}</span><span class="dl10-stat-l">ملف ظاهر</span></div>
          <div class="dl10-stat"><span class="dl10-stat-n">${stats.downloads.toLocaleString("ar-SA-u-nu-latn")}</span><span class="dl10-stat-l">تحميل</span></div>
        </div>

        ${state.loading ? `<div class="dl10-empty"><div class="dl10-empty-glyph">⏳</div><p>جارٍ تحميل التحميلات…</p></div>` :
          state.categories.length === 0 ? `<div class="dl10-empty">
            <div class="dl10-empty-glyph">📂</div>
            <h3>لا توجد أقسام بعد</h3>
            <p>أنشئ القسم الأول (نماذج واجبات، سيَر ذاتية، عروض…) ثم ارفع ملفاتك مباشرة من جهازك.</p>
            <button type="button" class="dl10-btn dl10-primary" data-dl10-add-category>➕ إنشاء القسم الأول</button>
          </div>` : `
          <div class="dl10-layout">
            <nav class="dl10-cats">
              <div class="dl10-cats-label">الأقسام</div>
              ${byOrder(state.categories).map(c => {
                const n = filesOf(c.id).length;
                const isActive = Number(c.id) === Number(state.activeCategory);
                return `<button type="button" class="dl10-cat ${isActive ? "dl10-cat-active" : ""} ${c.isVisible === false ? "dl10-cat-hidden" : ""}" data-dl10-cat="${c.id}">
                  <span class="dl10-cat-emoji" style="background:${esc(c.color || BRAND.accent)};color:#fff">${esc(c.emoji || "📁")}</span>
                  <span class="dl10-cat-name">${esc(c.name)}${c.isVisible === false ? " <small>مخفي</small>" : ""}</span>
                  <span class="dl10-cat-count">${n}</span>
                </button>`;
              }).join("")}
            </nav>
            <main class="dl10-main">
              ${active ? `
              <header class="dl10-section-head" style="--dl10-color:${esc(active.color || BRAND.accent)}">
                <div class="dl10-section-identity">
                  <span class="dl10-section-emoji" style="background:${esc(active.color || BRAND.accent)}">${esc(active.emoji || "📁")}</span>
                  <div>
                    <h3>${esc(active.name)}</h3>
                    <p>${esc(active.description || "قسم ملفات التحميلات")}</p>
                  </div>
                </div>
                <div class="dl10-section-actions">
                  <button type="button" class="dl10-btn dl10-ghost" data-dl10-edit-category="${active.id}">✎ تعديل القسم</button>
                  <button type="button" class="dl10-btn dl10-ghost" data-dl10-cat-visible="${active.id}">${active.isVisible === false ? "👁 إظهار للزوار" : "🚫 إخفاء عن الزوار"}</button>
                  <button type="button" class="dl10-btn dl10-danger-soft" data-dl10-delete-category="${active.id}">🗑 حذف</button>
                </div>
              </header>
              <div class="dl10-file-actions">
                <button type="button" class="dl10-btn dl10-primary" data-dl10-add-file="${active.id}">⬆ رفع ملف جديد</button>
                <button type="button" class="dl10-btn dl10-ghost" data-dl10-upload-many="${active.id}">⬆⬆ رفع عدة ملفات</button>
                <input type="file" multiple hidden data-dl10-upload-input="${active.id}" />
              </div>
              ${activeFiles.length === 0 ? `<div class="dl10-empty dl10-empty-sm">
                <div class="dl10-empty-glyph">📥</div>
                <h3>هذا القسم فارغ</h3>
                <p>ارفع أول ملف ليقوم الزوار بتحميله مباشرة.</p>
                <button type="button" class="dl10-btn dl10-primary" data-dl10-add-file="${active.id}">⬆ رفع ملف جديد</button>
              </div>` : `<div class="dl10-files">
                ${activeFiles.map((f, i) => `
                <article class="dl10-file">
                  <div class="dl10-file-main">
                    <span class="dl10-file-glyph">${fileGlyph(f.mimeType)}</span>
                    <div class="dl10-file-info">
                      <b class="dl10-file-name" title="${esc(f.originalName)}">${esc(f.originalName || f.fileName)}</b>
                      <small class="dl10-file-meta">${esc(f.fileName !== f.originalName ? f.fileName : "")} ${f.description ? `· ${esc(String(f.description).slice(0, 60))}` : ""}</small>
                      <small class="dl10-file-meta">📦 ${fmtSize(f.sizeBytes)} · ⇩ ${Number(f.downloadCount || 0).toLocaleString("ar-SA-u-nu-latn")} تحميل · ${fmtDate(f.createdAt)}</small>
                    </div>
                  </div>
                  <div class="dl10-file-row">
                    <span class="dl10-chip ${f.isVisible !== false ? "dl10-chip-ok" : "dl10-chip-off"}">${f.isVisible !== false ? "ظاهر للزوار" : "مخفي"}</span>
                    <div class="dl10-file-btns">
                      <button type="button" class="dl10-btn-sm" data-dl10-copy="${f.id}" title="نسخ رابط التحميل">📋 نسخ الرابط</button>
                      <button type="button" class="dl10-btn-sm" data-dl10-share-wa="${f.id}" title="مشاركة واتساب">💬 واتساب</button>
                      <button type="button" class="dl10-btn-sm" data-dl10-share-tg="${f.id}" title="مشاركة تيليجرام">✈ تيليجرام</button>
                      <button type="button" class="dl10-btn-sm" data-dl10-preview="${f.id}" title="معاينة الملف">▶ معاينة</button>
                      <button type="button" class="dl10-btn-sm" data-dl10-edit-file="${f.id}" title="تعديل">✎ تعديل</button>
                      <button type="button" class="dl10-btn-sm" data-dl10-file-visible="${f.id}" title="${f.isVisible !== false ? "إخفاء" : "إظهار"}">${f.isVisible !== false ? "🚫 إخفاء" : "👁 إظهار"}</button>
                      ${i > 0 ? `<button type="button" class="dl10-btn-sm" data-dl10-file-up="${f.id}" title="أعلى">▲</button>` : ""}
                      ${i < activeFiles.length - 1 ? `<button type="button" class="dl10-btn-sm" data-dl10-file-down="${f.id}" title="أسفل">▼</button>` : ""}
                      <button type="button" class="dl10-btn-sm dl10-btn-sm-danger" data-dl10-delete-file="${f.id}" title="حذف">🗑</button>
                    </div>
                  </div>
                </article>`).join("")}
              </div>`}` : `<div class="dl10-empty">
                <div class="dl10-empty-glyph">🗂</div><h3>اختر قسمًا من القائمة</h3>
              </div>`}
            </main>
          </div>`}
      </div>
      <div id="dl-r10-notices" class="dl10-notices"></div>`;
  };

  /* ===== الأحداث ===== */
  const delegate = (root, attr, cb) => root.addEventListener("click", e => {
    const t = e.target.closest ? e.target.closest(`[data-dl10-${attr}]`) : null;
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    cb(t.dataset[`dl10${attr}`] ?? t.getAttribute(`data-dl10-${attr}`), t);
  });

  const bindEvents = workspace => {
    workspace.addEventListener("input", e => {
      if (e.target.matches("[data-dl10-search]")) { state.search = e.target.value; render(); }
    });
    delegate(workspace, "add-category", () => categoryDrawer(null));
    delegate(workspace, "edit-category", id => {
      const c = state.categories.find(c => Number(c.id) === Number(id));
      if (c) categoryDrawer(c);
    });
    delegate(workspace, "cat", id => { state.activeCategory = id; render(); });
    delegate(workspace, "cat-visible", id => void toggleCategoryVisibility(Number(id)));
    delegate(workspace, "delete-category", id => {
      const c = state.categories.find(c => Number(c.id) === Number(id));
      if (!c) return;
      const root = overlay("تأكيد الحذف", `
        <p class="dl10-confirm-text">هل تريد حذف القسم «<b>${esc(c.name)}</b>» وجميع ملفاته؟<br/>لا يمكن التراجع عن هذا الإجراء.</p>
        <footer class="dl10-foot">
          <button type="button" class="dl10-btn dl10-ghost" data-dl10-close>إلغاء</button>
          <button type="button" class="dl10-btn dl10-danger" data-dl10-confirm>نعم، احذف القسم</button>
        </footer>`, "حذف نهائي");
      root.querySelector("[data-dl10-confirm]").addEventListener("click", async () => {
        await removeCategory(Number(id));
        root.remove();
      });
    });
    delegate(workspace, "add-file", id => fileDrawer(null, Number(id)));
    delegate(workspace, "edit-file", id => {
      const f = state.files.find(f => Number(f.id) === Number(id));
      if (f) fileDrawer(f, f.categoryId);
    });
    delegate(workspace, "file-visible", id => void toggleFileVisibility(Number(id)));
    delegate(workspace, "file-up", id => void moveFile(Number(id), "up"));
    delegate(workspace, "file-down", id => void moveFile(Number(id), "down"));
    delegate(workspace, "copy", id => {
      const f = state.files.find(f => Number(f.id) === Number(id));
      if (f) void copyFileUrl(f);
    });
    delegate(workspace, "share-wa", id => {
      const f = state.files.find(f => Number(f.id) === Number(id));
      if (f) shareFile(f, "whatsapp");
    });
    delegate(workspace, "share-tg", id => {
      const f = state.files.find(f => Number(f.id) === Number(id));
      if (f) shareFile(f, "telegram");
    });
    delegate(workspace, "preview", id => {
      const f = state.files.find(f => Number(f.id) === Number(id));
      if (f) previewFile(f);
    });
    delegate(workspace, "delete-file", id => {
      const f = state.files.find(f => Number(f.id) === Number(id));
      if (!f) return;
      const root = overlay("تأكيد الحذف", `
        <p class="dl10-confirm-text">هل تريد حذف الملف «<b>${esc(f.originalName)}</b>»؟<br/>لا يمكن التراجع عن هذا الإجراء.</p>
        <footer class="dl10-foot">
          <button type="button" class="dl10-btn dl10-ghost" data-dl10-close>إلغاء</button>
          <button type="button" class="dl10-btn dl10-danger" data-dl10-confirm>نعم، احذف الملف</button>
        </footer>`, "حذف نهائي");
      root.querySelector("[data-dl10-confirm]").addEventListener("click", async () => {
        await removeFile(Number(id));
        root.remove();
      });
    });
    delegate(workspace, "upload-many", id => {
      workspace.querySelector(`[data-dl10-upload-input="${id}"]`)?.click();
    });
    workspace.addEventListener("change", e => {
      if (e.target.matches && e.target.matches("[data-dl10-upload-input]")) {
        const files = e.target.files;
        if (files?.length) void createWithUploads(Number(e.target.dataset.dl10UploadInput), files);
        e.target.value = "";
      }
    });
  };

  /* ===== الواجهة العامة ===== */
  const activate = () => {
    closeOverlays();
    if (admin()?.selected !== "downloads") {
      const a = admin();
      if (a && typeof a.setWorkspaceState === "function") a.setWorkspaceState({ selected: "downloads" });
    }
    render();
    list().then(() => {
      const workspace = document.querySelector(".side-workspace");
      if (workspace && !workspace.dataset.dl10Bound) { bindEvents(workspace); workspace.dataset.dl10Bound = "1"; }
    });
  };

  window.WajbatDownloadsManager = {
    workspace: () => render(),
    activate,
    mountCompatibleDownloadsManager: container => { container.innerHTML = ""; activate(); return {}; },
    refresh: () => list(),
  };

  /* ===== الأنماط ===== */
  if (!document.getElementById("dl10-css")) {
    const css = document.createElement("style");
    css.id = "dl10-css";
    css.textContent = `
      .dl10{font-family:inherit;direction:rtl;text-align:right;color:${BRAND.ink}}
      .dl10-headbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px}
      .dl10-headbar > div:first-child{flex:1;min-width:200px}
      .dl10-title{font-size:19px;font-weight:800;margin:0;color:${BRAND.ink};letter-spacing:-.2px}
      .dl10-subtitle{font-size:12.5px;color:${BRAND.mist};margin:3px 0 0}
      .dl10-head-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .dl10-searchbox{position:relative;display:flex;align-items:center}
      .dl10-search-icon{position:absolute;right:10px;font-size:12px;opacity:.6;pointer-events:none}
      .dl10-searchbox input{width:200px;padding:9px 32px 9px 12px;border:1.5px solid ${BRAND.line};border-radius:12px;font-size:13px;background:#fff;color:${BRAND.ink};outline:none;transition:border-color .18s,box-shadow .18s}
      .dl10-searchbox input:focus{border-color:${BRAND.accent};box-shadow:0 0 0 3px rgba(79,70,229,.12)}
      .dl10-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 15px;border-radius:12px;border:1.5px solid transparent;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:transform .14s cubic-bezier(.23,1,.32,1),box-shadow .14s,background .18s,border-color .18s;background:#f1f3fa;color:${BRAND.slate}}
      .dl10-btn:active{transform:scale(.97)}
      .dl10-btn:hover{background:#e8ebf6}
      .dl10-btn-primary{background:linear-gradient(135deg,#0b1226 0%,#2a20a0 55%,#7c3aed 100%);color:#fff;box-shadow:0 8px 22px rgba(61,50,200,.35)}
      .dl10-btn-primary:hover{box-shadow:0 8px 24px rgba(79,70,229,.42)}
      .dl10-btn-danger-soft{background:#fdf0f0;color:${BRAND.danger}}
      .dl10-btn-danger-soft:hover{background:#fbe4e4}
      .dl10-btn-lg{padding:10px 18px;font-size:14px;border-radius:13px}
      .dl10-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
      .dl10-stat{background:linear-gradient(160deg,#ffffff,#f4f6ff);border:1.5px solid ${BRAND.line};border-radius:15px;padding:13px 10px;text-align:center;position:relative;overflow:hidden;box-shadow:0 8px 22px rgba(11,18,38,.06);transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s}
      .dl10-stat::before{content:"";position:absolute;top:0;right:0;left:0;height:3px;background:linear-gradient(90deg,#3d32c8,#7c3aed,#0ea5e9)}
      .dl10-stat:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(11,18,38,.1)}
      .dl10-stat-n{display:block;font-size:23px;font-weight:900;color:transparent;background:linear-gradient(135deg,#0c1a33,#3d32c8);-webkit-background-clip:text;background-clip:text;font-feature-settings:"tnum"}
      .dl10-stat-l{display:block;font-size:11.5px;color:${BRAND.mist};margin-top:3px}
      .dl10-layout{display:grid;grid-template-columns:230px 1fr;gap:14px;align-items:start}
      .dl10-cats{background:#fff;border:1.5px solid ${BRAND.line};border-radius:16px;padding:10px;position:sticky;top:12px;max-height:calc(100vh - 26px);overflow-y:auto}
      .dl10-cats-label{font-size:11px;font-weight:700;color:${BRAND.mist};text-transform:uppercase;letter-spacing:.6px;padding:4px 10px 8px}
      .dl10-cat{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:11px;border:none;background:transparent;font-family:inherit;font-size:13px;color:${BRAND.slate};cursor:pointer;text-align:right;transition:background .15s}
      .dl10-cat:hover{background:#f4f6fd}
      .dl10-cat-active{background:linear-gradient(135deg,rgba(61,50,200,.12),rgba(124,58,237,.1));color:${BRAND.accent};font-weight:800;box-shadow:inset 0 0 0 1px rgba(61,50,200,.2)}
      .dl10-cat-hidden{opacity:.65}
      .dl10-cat-emoji{width:30px;height:30px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 auto}
      .dl10-cat-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dl10-cat-name small{font-weight:400;color:${BRAND.mist};font-size:11px}
      .dl10-cat-count{font-size:11px;background:${BRAND.line};color:${BRAND.slate};border-radius:999px;padding:2px 8px;font-weight:700}
      .dl10-main{min-width:0}
      .dl10-section-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:#fff;border:1.5px solid ${BRAND.line};border-right:5px solid var(--dl10-color,#3d32c8);border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 8px 24px rgba(11,18,38,.07)}
      .dl10-section-identity{flex:1;min-width:200px;display:flex;align-items:center;gap:12px}
      .dl10-section-emoji{width:46px;height:46px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;flex:0 0 auto;box-shadow:0 8px 20px rgba(61,50,200,.35);border:1px solid rgba(255,255,255,.6)}
      .dl10-section-identity h3{margin:0;font-size:16px;font-weight:800}
      .dl10-section-identity p{margin:2px 0 0;font-size:12.5px;color:${BRAND.mist}}
      .dl10-section-actions{display:flex;gap:7px;flex-wrap:wrap}
      .dl10-file-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
      .dl10-files{display:flex;flex-direction:column;gap:9px}
      .dl10-file{background:#fff;border:1.5px solid ${BRAND.line};border-radius:15px;padding:13px 15px;transition:border-color .16s,box-shadow .16s,transform .16s cubic-bezier(.23,1,.32,1)}
      .dl10-file:hover{border-color:#b9c4e8;box-shadow:0 12px 30px rgba(61,50,200,.13);transform:translateY(-1.5px)}
      .dl10-file-main{display:flex;align-items:center;gap:12px}
      .dl10-file-glyph{width:42px;height:42px;border-radius:12px;background:linear-gradient(150deg,#eef1ff,#dde3fa);display:inline-flex;align-items:center;justify-content:center;font-size:19px;flex:0 0 auto;box-shadow:0 5px 13px rgba(61,50,200,.14)}
      .dl10-file-info{flex:1;min-width:0}
      .dl10-file-name{display:block;font-size:13.5px;font-weight:700;color:${BRAND.ink};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dl10-file-meta{display:block;font-size:11.5px;color:${BRAND.mist};margin-top:2px}
      .dl10-file-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:9px;padding-top:9px;border-top:1px dashed ${BRAND.line}}
      .dl10-chip{font-size:11px;padding:3px 10px;border-radius:999px;font-weight:700}
      .dl10-chip-ok{background:linear-gradient(135deg,#e8f7ef,#dff4ea);color:${BRAND.ok};border:1px solid #c6ead8}
      .dl10-chip-off{background:#f1f3f9;color:${BRAND.mist};border:1px solid #e2e7f0}
      .dl10-file-btns{margin-right:auto;display:flex;gap:5px;flex-wrap:wrap}
      .dl10-btn-sm{padding:6px 10px;border-radius:10px;border:1.5px solid #e3e8f5;background:#fbfcfe;color:${BRAND.slate};font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer;transition:background .14s,transform .14s,box-shadow .14s}
      .dl10-btn-sm:hover{background:#e8edff;box-shadow:0 4px 12px rgba(61,50,200,.12);transform:translateY(-1px)}
      .dl10-btn-sm-danger{color:${BRAND.danger}}
      .dl10-btn-sm-danger:hover{background:#fdf0f0}
      .dl10-empty{text-align:center;background:#fff;border:1.5px dashed #d6dce9;border-radius:18px;padding:40px 20px;margin-bottom:12px}
      .dl10-empty-sm{padding:30px 20px}
      .dl10-empty-glyph{font-size:40px;margin-bottom:8px}
      .dl10-empty h3{margin:6px 0;font-size:15px;color:${BRAND.ink}}
      .dl10-empty p{margin:0 0 16px;font-size:13px;color:${BRAND.mist}}
      /* الدرج */
      .dl10-backdrop{position:fixed;inset:0;background:rgba(12,18,40,.22);backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px);z-index:80;animation:dl10-fade .22s cubic-bezier(.23,1,.32,1)}
      .dl10-drawer{position:fixed;top:0;right:0;bottom:0;width:min(460px,92vw);background:#fff;z-index:81;display:flex;flex-direction:column;box-shadow:-16px 0 50px rgba(12,18,40,.25);animation:dl10-slide .26s cubic-bezier(.23,1,.32,1)}
      @keyframes dl10-fade{from{opacity:0}to{opacity:1}}
      @keyframes dl10-slide{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
      .dl10-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1.5px solid ${BRAND.line}}
      .dl10-head h3{margin:0;font-size:16.5px;font-weight:800}
      .dl10-sub{margin:4px 0 0;font-size:12px;color:${BRAND.mist}}
      .dl10-x{background:#f4f6fb;border:none;border-radius:10px;width:32px;height:32px;font-size:14px;color:${BRAND.slate};cursor:pointer;transition:background .15s}
      .dl10-x:hover{background:#e9edf8}
      .dl10-body{flex:1;overflow-y:auto;padding:16px 20px}
      .dl10-form{display:flex;flex-direction:column;gap:13px}
      .dl10-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .dl10-field-span{grid-column:1 / -1}
      .dl10-field label{display:block;font-size:12.5px;font-weight:700;color:${BRAND.ink};margin-bottom:6px}
      .dl10-req{color:${BRAND.danger}}
      .dl10-field input[type=text],.dl10-field input[type=search],.dl10-field select,.dl10-field textarea{width:100%;padding:10px 12px;border:1.5px solid ${BRAND.line};border-radius:11px;font-family:inherit;font-size:13.5px;background:#fff;color:${BRAND.ink};outline:none;transition:border-color .18s,box-shadow .18s}
      .dl10-field input:focus,.dl10-field select:focus,.dl10-field textarea:focus{border-color:${BRAND.accent};box-shadow:0 0 0 3px rgba(79,70,229,.1)}
      .dl10-field textarea{min-height:72px;resize:vertical}
      .dl10-field input[type=color]{width:100%;height:42px;padding:4px;border:1.5px solid ${BRAND.line};border-radius:11px;cursor:pointer;background:#fff}
      .dl10-uploader{display:flex;flex-direction:column;gap:9px}
      .dl10-up-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 12px;border:1.5px dashed #c9d1ec;border-radius:13px;background:#fafbfd;font-family:inherit;cursor:pointer;transition:border-color .16s,background .16s}
      .dl10-up-btn:hover{border-color:${BRAND.accent};background:#f2f4fe}
      .dl10-up-btn-lg{padding:22px 14px}
      .dl10-up-icon{font-size:20px}
      .dl10-up-icon-lg{font-size:26px}
      .dl10-up-label{font-size:13px;font-weight:700;color:${BRAND.ink}}
      .dl10-up-hint{font-size:11.5px;color:${BRAND.mist}}
      .dl10-preview{border:1.5px solid ${BRAND.line};border-radius:12px;padding:6px;text-align:center;background:#fff;min-height:80px;display:flex;align-items:center;justify-content:center}
      .dl10-preview img{max-width:100%;max-height:140px;border-radius:9px}
      .dl10-preview-empty span{font-size:12px;color:${BRAND.mist}}
      .dl10-up-meta{font-size:12px;color:${BRAND.slate}}
      .dl10-up-meta-ok{color:${BRAND.ok};font-weight:700}
      .dl10-queue{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}
      .dl10-queue-item{display:flex;align-items:center;gap:9px;background:#f6f8fe;border:1.5px solid ${BRAND.line};border-radius:10px;padding:8px 10px}
      .dl10-queue-glyph{font-size:16px}
      .dl10-queue-info{flex:1;min-width:0}
      .dl10-queue-info b{display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dl10-queue-info small{font-size:11px;color:${BRAND.mist}}
      .dl10-queue-rm{background:none;border:none;color:${BRAND.mist};cursor:pointer;font-size:13px;padding:2px 6px;border-radius:7px}
      .dl10-queue-rm:hover{background:#eef1f9;color:${BRAND.danger}}
      .dl10-foot{display:flex;justify-content:flex-end;gap:9px;padding:14px 20px;border-top:1.5px solid ${BRAND.line};background:#fcfcfe}
      .dl10-foot .dl10-btn{padding:10px 18px}
      .dl10-confirm-text{font-size:13.5px;color:${BRAND.slate};line-height:1.7;margin:6px 0 0}
      .dl10-notices{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:90;display:flex;flex-direction:column;gap:8px;pointer-events:none}
      .dl10-notice{background:#fff;border:1.5px solid ${BRAND.line};border-radius:12px;padding:10px 16px;font-size:13px;font-weight:600;color:${BRAND.ink};box-shadow:0 12px 34px rgba(12,18,40,.22);opacity:0;transform:translateY(-10px);transition:opacity .22s,transform .22s cubic-bezier(.23,1,.32,1)}
      .dl10-notice-in{opacity:1;transform:none}
      .dl10-notice-out{opacity:0;transform:translateY(-10px)}
      .dl10-notice-ok{border-color:#bfe9d5;color:${BRAND.ok}}
      .dl10-notice-bad{border-color:#f5c6c6;color:${BRAND.danger}}
      @media (max-width:860px){
        .dl10-layout{grid-template-columns:1fr}
        .dl10-cats{position:static;display:flex;overflow-x:auto;gap:8px;max-height:none}
        .dl10-cat{flex:0 0 auto;white-space:nowrap}
        .dl10-stats{grid-template-columns:repeat(2,1fr)}
        .dl10-grid-2{grid-template-columns:1fr}
        .dl10-headbar{flex-direction:column;align-items:stretch}
        .dl10-head-actions{justify-content:flex-end}
      }
      /* ===== تصميم dfa17 الفاخر — نموذج إضافة النموذج + تحسينات عامة ===== */
      @keyframes dfa17-pop{from{transform:translateY(22px) scale(.97);opacity:0}to{transform:none;opacity:1}}
      @keyframes dfa17-orb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(14px,-18px) scale(1.15)}}
      @keyframes dfa17-orb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-20px,14px) scale(1.25)}}
      @keyframes dfa17-pulse{0%{box-shadow:0 0 0 0 rgba(124,58,237,.45)}70%{box-shadow:0 0 0 14px rgba(124,58,237,0)}100%{box-shadow:0 0 0 0 rgba(124,58,237,0)}}
      @keyframes dfa17-shine{0%{transform:translateX(130%) skewX(-18deg)}100%{transform:translateX(-230%) skewX(-18deg)}}
      .dfa17-overlay{position:fixed;inset:0;z-index:85;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}
      .dfa17-backdrop{position:fixed;inset:0;background:rgba(11,18,38,.18);backdrop-filter:none;-webkit-backdrop-filter:none;z-index:85;animation:dl10-fade .24s cubic-bezier(.23,1,.32,1)}
      .dfa17-card{position:relative;width:100%;max-width:520px;background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(11,18,38,.25);display:flex;flex-direction:column;max-height:min(88vh,780px);overflow:hidden}
      .dfa17-head{position:relative;overflow:hidden;padding:26px 24px 24px;background:linear-gradient(130deg,#1a1455 0%,#2a20a0 45%,#4c40d0 80%,#8b5cf6 100%)}
      .dfa17-orb{position:absolute;border-radius:50%;opacity:0;pointer-events:none;display:none}
      .dfa17-orb-1{width:130px;height:130px;background:#7c3aed;top:-50px;left:-30px;animation:dfa17-orb1 7s ease-in-out infinite}
      .dfa17-orb-2{width:160px;height:160px;background:#0ea5e9;bottom:-70px;right:-40px;opacity:.3;animation:dfa17-orb2 9s ease-in-out infinite}
      .dfa17-head-inner{position:relative;display:flex;flex-direction:column;gap:7px}
      .dfa17-badge{align-self:flex-start;background:#ffffff;color:#1a1455;font-size:11.5px;font-weight:800;padding:5px 12px;border-radius:999px;border:1.5px solid #e4e9f5;box-shadow:0 4px 14px rgba(0,0,0,.12)}
      .dfa17-head h3{margin:4px 0 0;font-size:19px;font-weight:900;color:#fff;letter-spacing:-.3px}
      .dfa17-head p{margin:0;font-size:13px;color:#eef1ff;line-height:1.6}
      .dfa17-x{position:absolute;top:14px;left:14px;background:#ffffff;border:1.8px solid #e4e9f5;color:#0b1226;width:34px;height:34px;border-radius:11px;font-size:14px;cursor:pointer;transition:background .15s,transform .15s;z-index:2}
      .dfa17-x:hover{background:rgba(255,255,255,.38);transform:scale(1.06)}
      .dfa17-body{flex:1;overflow-y:auto;padding:18px 22px}
      .dfa17-form{display:flex;flex-direction:column;gap:12px}
      .dfa17-step{display:flex;align-items:center;gap:10px;margin:14px 0 9px}
      .dfa17-step:first-child{margin-top:2px}
      .dfa17-step-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9px;background:linear-gradient(135deg,#3d32c8,#7c3aed);color:#fff;font-size:12.5px;font-weight:900;box-shadow:0 5px 14px rgba(124,58,237,.35)}
      .dfa17-step-title{font-size:13px;font-weight:900;color:#0c1a33;letter-spacing:.2px}
      .dfa17-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
      .dfa17-field-span{grid-column:1 / -1}
      .dfa17-field input,.dfa17-field textarea{min-height:44px}.dfa17-field label{display:block;font-size:12.5px;font-weight:800;color:#0c1a33;margin-bottom:6px}
      .dfa17-req{color:#dc2626}
      .dfa17-field input[type=text],.dfa17-field select{width:100%;padding:11px 13px;border:1.8px solid #e4e9f5;border-radius:12px;font-family:inherit;font-size:13.5px;background:#fff;color:#0c1a33;outline:none;transition:border-color .18s,box-shadow .18s}
      .dfa17-field input:focus,.dfa17-field select:focus{border-color:#3d32c8;box-shadow:0 0 0 4px rgba(61,50,200,.12)}
      .dfa17-drop{border:2px dashed #b3bce0;border-radius:16px;background:linear-gradient(180deg,#fbfcff,#f0f4fe);padding:16px;cursor:pointer;transition:border-color .18s,background .18s,transform .16s,box-shadow .18s;display:flex;flex-direction:column;gap:8px}
      .dfa17-drop:hover{border-color:#7c3aed;background:#f4f1ff;box-shadow:0 10px 26px rgba(124,58,237,.16)}
      .dfa17-drop.dfa17-drag{border-color:#7c3aed;background:#eeeaff;transform:scale(1.008);box-shadow:0 12px 32px rgba(124,58,237,.25)}
      .dfa17-drop-inner{display:flex;flex-direction:column;align-items:center;gap:7px;padding:16px 10px}
      .dfa17-drop-icon{font-size:30px;filter:drop-shadow(0 4px 8px rgba(124,58,237,.25))}
      .dfa17-drop-label{font-size:14px;font-weight:900;color:#0c1a33}
      .dfa17-drop-hint{font-size:11.5px;color:#7b86a6}
      .dfa17-cards{display:flex;flex-direction:column;gap:9px;margin-top:6px}
      .dfa17-card-row{position:relative;background:#fff;border:1.8px solid #e4e9f5;border-radius:13px;overflow:hidden}
      .dfa17-card-row.done{border-color:#9fe8cb;background:linear-gradient(135deg,#f3fdf8,#ecfbf4)}
      .dfa17-card-row.failed{border-color:#f5c6c6;background:#fffafa}
      .dfa17-card-main{display:flex;align-items:center;gap:10px;padding:10px 12px}
      .dfa17-card-glyph{font-size:18px}
      .dfa17-card-info{flex:1;min-width:0}
      .dfa17-card-info b{display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dfa17-card-info small{font-size:10.5px;color:#7b86a6}
      .dfa17-card-rm{background:none;border:none;color:#7b86a6;cursor:pointer;font-size:13px;padding:2px 6px;border-radius:7px}
      .dfa17-card-rm:hover{background:#eef1f9;color:#dc2626}
      .dfa17-track{height:6px;background:linear-gradient(90deg,#3d32c8,#7c3aed,#0ea5e9);transition:width .18s cubic-bezier(.23,1,.32,1);width:0}
      .dfa17-card-row.done .dfa17-track{background:linear-gradient(90deg,#059669,#34d399);width:100%}
      .dfa17-pct{position:absolute;bottom:7px;left:9px;font-size:10px;font-weight:900;color:#fff;background:linear-gradient(135deg,#3d32c8,#7c3aed);border-radius:7px;padding:2px 8px;box-shadow:0 3px 10px rgba(61,50,200,.35)}
      .dfa17-replace{display:flex;align-items:center;gap:11px;border:1.8px solid #e4e9f5;border-radius:14px;padding:13px 14px;background:linear-gradient(180deg,#fbfcff,#f5f7ff)}
      .dfa17-replace-wrap{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
      .dfa17-replace-glyph{font-size:19px}
      .dfa17-replace-text{font-size:12px;color:#475274;font-weight:700}
      .dfa17-replace-meta{width:100%;margin-top:6px;font-size:11.5px}
      .dfa17-meta-ok{color:#059669;font-weight:900}
      .dfa17-btn-ghost{background:linear-gradient(135deg,#f0f4ff,#e9eeff);border:1.8px solid #d9e0f8;border-radius:11px;padding:9px 14px;font-family:inherit;font-size:12px;font-weight:900;color:#3d32c8;cursor:pointer;transition:background .15s,transform .14s;flex:0 0 auto}
      .dfa17-btn-ghost:hover{background:linear-gradient(135deg,#e6ecff,#dde4ff);transform:translateY(-1px)}
      .dfa17-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 20px;border-top:1.8px solid #e9edf7;background:linear-gradient(180deg,#fdfeff,#f6f8fd)}
      .dfa17-foot-hint{font-size:11px;color:#7b86a6;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dfa17-btn{font-family:inherit;font-size:14px;font-weight:900;border-radius:12px;padding:14px 24px;min-height:48px;cursor:pointer;transition:transform .14s cubic-bezier(.23,1,.32,1),background .15s,opacity .15s,box-shadow .15s;border:none}
      .dfa17-btn:active{transform:scale(.96)}
      .dfa17-primary{background:linear-gradient(135deg,#0b1226 0%,#2a20a0 55%,#7c3aed 100%);color:#fff;box-shadow:0 10px 28px rgba(124,58,237,.35)}
      .dfa17-primary:hover:not(:disabled){box-shadow:0 12px 34px rgba(124,58,237,.5);filter:brightness(1.06)}
      .dfa17-primary:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
      .dfa17-ghost{background:#f1f4fd;color:#475274;border:1.8px solid #e1e7f5}
      .dfa17-ghost:hover{background:#e6ebfa}
@media (max-width:860px){
        .dl10-layout{grid-template-columns:1fr}
        .dl10-cats{position:static;display:flex;overflow-x:auto;gap:8px;max-height:none}
        .dl10-cat{flex:0 0 auto;white-space:nowrap}
        .dl10-stats{grid-template-columns:repeat(2,1fr)}
        .dl10-grid-2{grid-template-columns:1fr}
        .dl10-headbar{flex-direction:column;align-items:stretch}
        .dl10-head-actions{justify-content:flex-end}
      }
      /* ===== تصميم r15 الفاخر — نموذج إضافة النموذج ===== */
      @keyframes dl15-pop{from{transform:translateY(18px) scale(.97);opacity:0}to{transform:none;opacity:1}}
      .dl15-overlay{position:fixed;inset:0;z-index:85;display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto}
      .dl15-drawer{position:relative;width:100%;max-width:500px;background:#fff;border-radius:18px;box-shadow:0 24px 64px rgba(12,18,40,.32);display:flex;flex-direction:column;max-height:min(86vh, 760px)}
      .dl15-head{position:relative;border-radius:18px 18px 0 0;overflow:hidden;padding:22px 22px 20px;background:linear-gradient(135deg, ${BRAND.accent} 0%, #6366f1 70%, #8b5cf6 100%)}
      .dl15-head-content{position:relative;display:flex;flex-direction:column;gap:6px}
      .dl15-head-badge{align-self:flex-start;background:#ffffff;color:#0c1228;font-size:11px;font-weight:700;padding:4px 11px;border-radius:999px;border:1.5px solid #e4e9f5}
      .dl15-head h3{margin:0;font-size:17px;font-weight:800;color:#fff}
      .dl15-head p{margin:0;font-size:12.5px;color:rgba(255,255,255,.85)}
      .dl15-x{position:absolute;top:12px;left:12px;background:#ffffff;border:1.5px solid #e4e9f5;color:#0c1228;width:32px;height:32px;border-radius:10px;font-size:14px;cursor:pointer;transition:background .15s}
      .dl15-x:hover{background:rgba(255,255,255,.38)}
      .dl15-body{flex:1;overflow-y:auto;padding:18px 22px}
      .dl15-step{display:flex;align-items:center;gap:10px;margin:14px 0 10px}
      .dl15-step:first-child{margin-top:2px}
      .dl15-step-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;background:${BRAND.accent};color:#fff;font-size:12px;font-weight:800}
      .dl15-step-title{font-size:12.5px;font-weight:800;color:${BRAND.ink};letter-spacing:.2px}
      .dl15-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
      .dl15-field-span{grid-column:1 / -1}
      .dl15-field label{display:block;font-size:12.5px;font-weight:700;color:${BRAND.ink};margin-bottom:6px}
      .dl15-req{color:${BRAND.danger}}
      .dl15-field input[type=text],.dl15-field select{width:100%;padding:10.5px 12px;border:1.5px solid ${BRAND.line};border-radius:11px;font-family:inherit;font-size:13.5px;background:#fff;color:${BRAND.ink};outline:none;transition:border-color .18s,box-shadow .18s}
      .dl15-field input:focus,.dl15-field select:focus{border-color:${BRAND.accent};box-shadow:0 0 0 3px rgba(79,70,229,.11)}
      .dl15-drop{border:1.8px dashed #b9c3e8;border-radius:14px;background:linear-gradient(180deg,#fafbfd,#f2f5fe);padding:16px;cursor:pointer;transition:border-color .18s,background .18s,transform .16s;display:flex;flex-direction:column;gap:8px}
      .dl15-drop:hover{border-color:${BRAND.accent};background:#eef2fe}
      .dl15-drop.dl15-drag{border-color:${BRAND.accent};background:#e7ecff;transform:scale(1.008)}
      .dl15-drop-inner{display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 10px}
      .dl15-drop-icon{font-size:28px}
      .dl15-drop-label{font-size:13.5px;font-weight:800;color:${BRAND.ink}}
      .dl15-drop-hint{font-size:11.5px;color:${BRAND.mist}}
      .dl15-cards{display:flex;flex-direction:column;gap:8px;margin-top:4px}
      .dl15-card{position:relative;background:#fff;border:1.5px solid ${BRAND.line};border-radius:12px;overflow:hidden}
      .dl15-card.done{border-color:#bfe9d5}
      .dl15-card.failed{border-color:#f5c6c6}
      .dl15-card-main{display:flex;align-items:center;gap:10px;padding:9px 11px}
      .dl15-card-glyph{font-size:17px}
      .dl15-card-info{flex:1;min-width:0}
      .dl15-card-info b{display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dl15-card-info small{font-size:10.5px;color:${BRAND.mist}}
      .dl15-card-rm{background:none;border:none;color:${BRAND.mist};cursor:pointer;font-size:13px;padding:2px 6px;border-radius:7px}
      .dl15-card-rm:hover{background:#eef1f9;color:${BRAND.danger}}
      .dl15-track{height:5px;background:linear-gradient(90deg,#4f46e5,#8b5cf6);transition:width .18s cubic-bezier(.23,1,.32,1);width:0}
      .dl15-card.done .dl15-track{background:linear-gradient(90deg,#10b981,#34d399);width:100%}
      .dl15-pct{position:absolute;bottom:6px;left:8px;font-size:10px;font-weight:800;color:#fff;background:rgba(79,70,229,.9);border-radius:6px;padding:1px 7px}
      .dl15-replace{display:flex;align-items:center;gap:11px;border:1.5px solid ${BRAND.line};border-radius:13px;padding:12px 13px;background:#fafbfd}
      .dl15-replace-wrap{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
      .dl15-replace-glyph{font-size:18px}
      .dl15-replace-text{font-size:12px;color:${BRAND.slate};font-weight:600}
      .dl15-replace-meta{width:100%;margin-top:6px;font-size:11.5px}
      .dl15-meta-ok{color:${BRAND.ok};font-weight:700}
      .dl15-btn-ghost{background:#f0f3fd;border:1.5px solid #d7ddf5;border-radius:10px;padding:8px 13px;font-family:inherit;font-size:12px;font-weight:700;color:${BRAND.accent};cursor:pointer;transition:background .15s;flex:0 0 auto}
      .dl15-btn-ghost:hover{background:#e3e9ff}
      .dl15-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 20px;border-top:1.5px solid ${BRAND.line};background:#fcfcfe}
      .dl15-foot-hint{font-size:11px;color:${BRAND.mist};flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dl15-btn{font-family:inherit;font-size:13px;font-weight:800;border-radius:11px;padding:11px 20px;cursor:pointer;transition:transform .14s cubic-bezier(.23,1,.32,1),background .15s,opacity .15s;border:none}
      .dl15-btn:active{transform:scale(.96)}
      .dl15-primary{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;box-shadow:0 8px 22px rgba(79,70,229,.28)}
      .dl15-primary:hover:not(:disabled){background:linear-gradient(135deg,#4338ca,#5b55e8)}
      .dl15-primary:disabled{opacity:.55;cursor:not-allowed}
      .dl15-ghost{background:#f0f3fd;color:${BRAND.slate};border:1.5px solid #e2e7f5}
      .dl15-ghost:hover{background:#e6ebfa}
      .dl15-ghost.danger{color:${BRAND.danger}}
      @media (max-width:560px){
        .dl15-grid-2{grid-template-columns:1fr}
        .dl15-overlay{padding:8px;align-items:flex-end}
        .dl15-drawer{max-height:92vh;border-radius:18px 18px 0 0}
        .dl15-head{border-radius:18px 18px 0 0}
        .dfa17-overlay{padding:8px;align-items:flex-end}
        .dfa17-card{max-width:100%;max-height:92vh;border-radius:18px 18px 0 0}
        .dfa17-head{padding:20px 16px 18px;border-radius:18px 18px 0 0}
        .dfa17-head h3{font-size:17px}
        .dfa17-body{padding:14px 12px}
        .dfa17-field input,.dfa17-field textarea{min-height:46px;font-size:15px}
        .dfa17-foot{padding:12px 14px}
        .dfa17-btn{width:100%;padding:15px 20px;font-size:15px;min-height:50px}
        .dfa17-backdrop{background:rgba(11,18,38,.12) !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important}
        .dfa17-orb,.dfa17-orb-1,.dfa17-orb-2{display:none !important}
        .dfa17-head{background:linear-gradient(130deg,#2320a0 0%,#4c40d0 60%,#8b5cf6 100%)}
      }`;
    document.head.appendChild(css);
  }
})();
