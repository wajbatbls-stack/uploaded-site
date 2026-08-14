/* مدير التحميلات v1 — أقسام ونماذج حقيقية مع رفع ملفات من الجهاز */
(function () {
  "use strict";

  const state = {
    categories: [], files: [], search: "", categoryFilter: "all", sort: "newest",
    loading: false, categoryEditor: null, fileEditor: null, createdFile: null,
    expandedCategories: new Set(), selectedCategory: null,
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const admin = () => window.WajbatAdmin;
  const toast = message => admin()?.toast?.(message) || window.alert(message);
  const date = value => value ? new Date(value).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const bytes = value => {
    const n = Number(value || 0);
    if (!n) return "حجم غير معروف";
    if (n < 1024) return `${n} بايت`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ك.ب`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ج.ب`;
  };
  const fileIcon = mimeType => {
    if (!mimeType) return "📄";
    if (mimeType.startsWith("image/")) return "🖼";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "🗜";
    if (mimeType.includes("word") || mimeType.includes("msword") || mimeType.includes("document")) return "📘";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📗";
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📙";
    return "📄";
  };
  const apiError = async response => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.json?.message || "تعذر إتمام العملية. حاول مرة أخرى.");
    return payload?.result?.data?.json ?? payload?.result?.data;
  };
  const request = (procedure, input, method = "POST") => {
    const url = method === "GET" ? `/api/trpc/${procedure}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}` : `/api/trpc/${procedure}`;
    return fetch(url, { method, credentials: "same-origin", cache: "no-store", headers: method === "POST" ? { "content-type": "application/json" } : undefined, body: method === "POST" ? JSON.stringify({ json: input }) : undefined }).then(apiError);
  };
  const uploadFile = async file => {
    if (!file) throw new Error("اختر ملفاً من جهازك أولاً.");
    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) throw new Error(`الملف أكبر من الحد المسموح (50 م.ب). اختر ملفاً أصغر.`);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/downloads/upload", { method: "POST", credentials: "same-origin", body: formData });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "تعذر رفع الملف. حاول مرة أخرى.");
    }
    return await response.json();
  };
  const list = async () => {
    state.loading = true;
    render();
    try {
      const data = await request("admin.downloads.list", undefined, "GET");
      state.categories = Array.isArray(data?.categories) ? data.categories : [];
      state.files = Array.isArray(data?.files) ? data.files : [];
      state.selectedCategory = state.categories[0]?.id ?? null;
      state.categories.forEach(category => state.expandedCategories.add(category.id));
    } catch (error) { toast(error.message || "تعذر تحميل التحميلات"); }
    finally { state.loading = false; render(); }
  };
  const filesOf = categoryId => state.files
    .filter(file => Number(file.categoryId) === Number(categoryId))
    .filter(file => {
      const q = state.search.trim().toLowerCase();
      return !q || [file.fileName, file.originalName, file.description].some(value => String(value || "").toLowerCase().includes(q));
    })
    .sort((a, b) => state.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : state.sort === "name" ? String(a.originalName).localeCompare(String(b.originalName), "ar") : new Date(b.createdAt) - new Date(a.createdAt));
  const sortedCategories = () => [...state.categories].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const count = id => state.files.filter(file => Number(file.categoryId) === Number(id)).length;
  const totalDownloads = () => state.files.reduce((sum, file) => sum + Number(file.downloadCount || 0), 0);
  const categoryColor = category => category?.color ?? "#4966d6";
  const categoryBackground = category => category?.backgroundColor ?? "#eef1fd";
  const emojiOf = category => category?.emoji || "📥";

  /* ===== إجراءات الأقسام ===== */
  const saveCategory = async input => {
    try {
      let category;
      if (state.categoryEditor?.id) {
        category = await request("admin.downloads.updateCategory", { id: state.categoryEditor.id, ...input });
        toast("تم حفظ القسم بنجاح");
      } else {
        category = await request("admin.downloads.createCategory", input);
        toast("تم إنشاء القسم بنجاح");
      }
      state.categoryEditor = null;
      await list();
      return category;
    } catch (error) { toast(error.message); state.categoryEditor = null; render(); throw error; }
  };
  const removeCategory = async id => {
    try { await request("admin.downloads.deleteCategory", { id }); await list(); }
    catch (error) { toast(error.message); render(); }
  };
  const toggleCategoryVisibility = async id => {
    try {
      const category = state.categories.find(category => Number(category.id) === Number(id));
      await request("admin.downloads.setCategoryVisibility", { id, visible: !category?.isVisible });
      await list();
    } catch (error) { toast(error.message); render(); }
  };
  const moveCategory = async (id, direction) => {
    try {
      await request("admin.downloads.moveCategory", { id, direction });
      await list();
    } catch (error) { toast(error.message); render(); }
  };

  /* ===== إجراءات الملفات ===== */
  const saveFile = async input => {
    try {
      if (state.fileEditor?.id) {
        await request("admin.downloads.updateFile", { id: state.fileEditor.id, ...input });
        toast("تم حفظ الملف بنجاح");
      } else {
        const created = await request("admin.downloads.createFile", input);
        toast("تم إضافة الملف بنجاح");
        state.createdFile = { id: created.id, url: created.fileUrl, name: created.originalName };
      }
      state.fileEditor = null;
      await list();
    } catch (error) { toast(error.message); state.fileEditor = null; render(); throw error; }
  };
  const removeFile = async id => {
    try { await request("admin.downloads.deleteFile", { id }); await list(); }
    catch (error) { toast(error.message); render(); }
  };
  const toggleFileVisibility = async id => {
    try {
      const file = state.files.find(file => Number(file.id) === Number(id));
      await request("admin.downloads.setFileVisibility", { id, visible: !file?.isVisible });
      await list();
    } catch (error) { toast(error.message); render(); }
  };
  const moveFile = async (id, direction) => {
    try {
      await request("admin.downloads.moveFile", { id, direction });
      await list();
    } catch (error) { toast(error.message); render(); }
  };
  const copyFileUrl = async file => {
    try {
      const result = await request("admin.downloads.trackDownload", { id: file.id });
      const link = `${location.origin}${result.fileUrl}`;
      try { await navigator.clipboard.writeText(link); toast("تم نسخ رابط التحميل"); }
      catch { const textarea = document.createElement("textarea"); textarea.value = link; document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); textarea.remove(); toast("تم نسخ رابط التحميل"); }
    } catch (error) { toast(error.message); }
  };
  const shareFile = async (file, platform) => {
    try {
      const result = await request("admin.downloads.trackDownload", { id: file.id });
      const link = `${location.origin}${result.fileUrl}`;
      const encoded = encodeURIComponent(`${result.fileName || result.originalName}: ${link}`);
      const url = platform === "whatsapp" ? `https://wa.me/?text=${encoded}` : `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(result.fileName || result.originalName)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) { toast(error.message); }
  };
  const replaceFileUpload = async (fileId, file) => {
    try {
      const uploaded = await uploadFile(file);
      await request("admin.downloads.replaceFile", { id: fileId, fileKey: uploaded.fileKey, fileUrl: uploaded.fileUrl, mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes, originalName: uploaded.originalName });
      toast("تم استبدال الملف بنجاح");
      await list();
    } catch (error) { toast(error.message); render(); }
  };
  const createWithUpload = async (categoryId, files) => {
    try {
      const results = [];
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file);
        const created = await request("admin.downloads.createFile", {
          categoryId, fileName: uploaded.originalName.replace(/\.[^.]+$/, "") || file.name,
          originalName: uploaded.originalName, fileKey: uploaded.fileKey, fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes,
        });
        results.push(created);
      }
      toast(`تم رفع ${results.length} ملف بنجاح`);
      await list();
    } catch (error) { toast(error.message); render(); }
  };
  const downloadTest = async file => {
    try {
      const result = await request("admin.downloads.trackDownload", { id: file.id });
      window.open(result.fileUrl, "_blank", "noopener,noreferrer");
    } catch (error) { toast(error.message); }
  };

  /* ===== القوالب ===== */
  const modalMarkup = (title, html) => `
    <div class="dl-modal" style="position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(15,20,40,.55);padding:16px" dir="rtl">
      <div class="dl-modal-inner" style="background:#fff;border-radius:18px;max-width:560px;width:100%;max-height:calc(100vh - 32px);overflow-y:auto;box-shadow:0 20px 60px rgba(10,20,60,.35);">
        <div class="dl-modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #eef1fd">
          <h3 style="margin:0;font-size:17px;color:#1a2340">${esc(title)}</h3>
          <button type="button" data-dl-close="1" aria-label="إغلاق" style="background:none;border:none;font-size:22px;color:#7a84a8;cursor:pointer">✕</button>
        </div>
        <form data-dl-form="1" style="padding:20px">${html}</form>
      </div>
    </div>`;
  const field = (label, type, name, value, extra) => `
    <label style="display:block;margin-bottom:12px">
      <span style="display:block;font-size:13px;color:#4a5378;margin-bottom:5px">${esc(label)}</span>
      ${type === "textarea" ? `<textarea name="${esc(name)}" style="width:100%;min-height:70px;padding:10px 12px;border:1.5px solid #e1e5f2;border-radius:10px;font-family:inherit;font-size:14px;resize:vertical" ${value !== undefined ? `>${esc(String(value))}</textarea>` : ">"}${value === undefined ? "" : ""}` :
        `<input type="${esc(type)}" name="${esc(name)}" value="${esc(String(value ?? ""))}" ${esc(extra || "")} style="width:100%;padding:10px 12px;border:1.5px solid #e1e5f2;border-radius:10px;font-family:inherit;font-size:14px">`}`;
  const row = cols => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">${cols.map(field => field).join("")}</div>`;
  const buttons = primaryText => `
    <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:14px">
      <button type="button" data-dl-cancel="1" style="padding:10px 18px;border:1.5px solid #e1e5f2;border-radius:10px;background:#fff;color:#4a5378;font-family:inherit;font-size:14px;cursor:pointer">إلغاء</button>
      <button type="submit" style="padding:10px 18px;border:none;border-radius:10px;background:#4966d6;color:#fff;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">${esc(primaryText)}</button>
    </div>`;
  const categoryForm = category => modalMarkup(category ? "تعديل القسم" : "قسم جديد", `
    ${row([
      ["العنوان", "text", "name", category?.name, "required"],
      ["الرمز التعبيري", "text", "emoji", category?.emoji ?? "📥"],
    ])}
    ${row([
      ["لون القسم", "color", "color", category?.color ?? "#4966d6"],
      ["لون الخلفية", "color", "backgroundColor", category?.backgroundColor ?? "#eef1fd"],
    ])}
    ${field("الوصف", "textarea", "description", category?.description)}
    ${field("صورة القسم (اختياري)", "file", "image", undefined, 'accept="image/*"')}
    ${buttons(category ? "حفظ القسم" : "إنشاء القسم")}
  `);
  const fileForm = (file, categoryList) => {
    const categoryOptions = categoryList.map(category =>
      `<option value="${esc(category.id)}" ${Number(file?.categoryId) === Number(category.id) ? "selected" : ""}>${esc(category.name)}</option>`).join("");
    return modalMarkup(file ? "تعديل الملف" : "ملف جديد", `
      ${row([
        ["اسم الملف", "text", "fileName", file?.fileName, "required"],
        ["الاسم الأصلي", "text", "originalName", file?.originalName, ""],
      ])}
      <label style="display:block;margin-bottom:12px">
        <span style="display:block;font-size:13px;color:#4a5378;margin-bottom:5px">القسم</span>
        <select name="categoryId" style="width:100%;padding:10px 12px;border:1.5px solid #e1e5f2;border-radius:10px;font-family:inherit;font-size:14px;background:#fff">${categoryOptions}</select>
      </label>
      ${field("الوصف", "textarea", "description", file?.description)}
      ${file ? "" : `
        <label style="display:block;margin-bottom:12px">
          <span style="display:block;font-size:13px;color:#4a5378;margin-bottom:5px">الملف</span>
          <input type="file" name="file" style="width:100%;padding:9px 12px;border:1.5px solid #e1e5f2;border-radius:10px;font-family:inherit;font-size:14px;background:#fff">
        </label>`}
      ${field("صورة مصغرة (اختياري)", "file", "image", undefined, 'accept="image/*"')}
      ${buttons(file ? "حفظ الملف" : "إضافة الملف")}
    `);
  };
  const confirmMarkup = message => modalMarkup("تأكيد الحذف", `
    <p style="margin:0 0 16px;color:#4a5378;font-size:14px">${esc(message)}</p>
    ${buttons("حذف")}
  `);

  /* ===== العرض الرئيسي ===== */
  const render = () => {
    const workspace = document.querySelector(".side-workspace");
    if (!workspace) return;
    const visible = state.categories.filter(category => category.isVisible).length;
    const hidden = state.categories.length - visible;
    const visibleFiles = state.files.filter(file => file.isVisible).length;
    workspace.innerHTML = `
      <style>
        .dl-stat{text-align:center;flex:1;background:#fff;border-radius:14px;padding:14px 8px}
        .dl-stat .n{font-size:26px;font-weight:700;color:#1a2340}
        .dl-stat .l{font-size:12px;color:#7a84a8;margin-top:2px}
        .dl-bar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
        .dl-head{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
        .dl-cat{background:#fff;border-radius:14px;margin-bottom:10px;overflow:hidden}
        .dl-cat-head{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer}
        .dl-emoji{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
        .dl-badge{font-size:12px;color:#7a84a8;background:#f2f4fa;border-radius:999px;padding:2px 10px}
        .dl-actions{margin-right:auto;display:flex;gap:6px}
        .dl-btn{padding:6px 10px;border-radius:9px;border:none;font-family:inherit;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
        .dl-btn-ghost{background:#f2f4fa;color:#4a5378}
        .dl-btn-primary{background:#4966d6;color:#fff;font-weight:600}
        .dl-btn-danger{background:#fdecee;color:#c0392b}
        .dl-btn-success{background:#e9f9ef;color:#1a8a4a}
        .dl-file{display:flex;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid #f0f2f8;background:#fff}
        .dl-file:hover{background:#fafbfd}
        .dl-file-icon{width:36px;height:36px;border-radius:9px;background:#f2f4fa;display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto}
        .dl-file-name{font-size:14px;color:#1a2340;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dl-file-meta{font-size:12px;color:#7a84a8}
        .dl-hint{background:#f8f9fe;border-radius:14px;padding:22px;text-align:center;color:#7a84a8;font-size:14px;border:1.5px dashed #e1e5f2}
        .dl-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;margin-right:4px}
        .dl-chip-ok{background:#e9f9ef;color:#1a8a4a}
        .dl-chip-off{background:#f0f2f8;color:#8a93ae}
      </style>
      <div class="dl-head">
        <input type="search" data-dl-search="1" placeholder="ابحث في الأقسام والملفات…" value="${esc(state.search)}" style="flex:1;min-width:180px;padding:10px 12px;border:1.5px solid #e1e5f2;border-radius:10px;font-family:inherit;font-size:14px;background:#fff">
        <select data-dl-sort="1" style="padding:10px 12px;border:1.5px solid #e1e5f2;border-radius:10px;font-family:inherit;font-size:14px;background:#fff">
          <option value="newest" ${state.sort === "newest" ? "selected" : ""}>الأحدث أولاً</option>
          <option value="oldest" ${state.sort === "oldest" ? "selected" : ""}>الأقدم أولاً</option>
          <option value="name" ${state.sort === "name" ? "selected" : ""}>حسب الاسم</option>
        </select>
        <button type="button" data-dl-add-category="1" class="dl-btn dl-btn-ghost">+ قسم جديد</button>
      </div>
      <div class="dl-bar">
        <div class="dl-stat"><div class="n">${state.categories.length}</div><div class="l">قسم</div></div>
        <div class="dl-stat"><div class="n">${state.files.length}</div><div class="l">ملف</div></div>
        <div class="dl-stat"><div class="n">${visibleFiles}</div><div class="l">ملف ظاهر</div></div>
        <div class="dl-stat"><div class="n">${hidden}</div><div class="l">قسم مخفي</div></div>
        <div class="dl-stat"><div class="n">${totalDownloads()}</div><div class="l">تحميل</div></div>
      </div>
      ${state.loading ? `<div class="dl-hint">جارٍ تحميل التحميلات…</div>` :
        state.categories.length === 0 ? `<div class="dl-hint">لا توجد أقسام بعد. أنشئ القسم الأول من الزر أدناه.</div>` :
        sortedCategories().map(category => {
          const expanded = state.expandedCategories.has(category.id);
          const files = filesOf(category.id);
          return `<div class="dl-cat" data-dl-category="${esc(category.id)}">
            <div class="dl-cat-head" style="background:${esc(categoryBackground(category))}" data-dl-toggle="${esc(category.id)}">
              <div class="dl-emoji" style="background:${esc(categoryColor(category))};color:#fff">${esc(emojiOf(category))}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:600;color:#1a2340">${esc(category.name)}</div>
                <div style="font-size:12px;color:#7a84a8">${esc(String(category.description || ""))}</div>
              </div>
              <span class="dl-badge">${count(category.id)} ملف</span>
              <div class="dl-actions">
                <button type="button" class="dl-btn dl-btn-ghost" data-dl-edit-category="${esc(category.id)}" title="تعديل">✎</button>
                <button type="button" class="dl-btn ${category.isVisible ? "dl-btn-ghost" : "dl-btn-danger"}" data-dl-cat-visible="${esc(category.id)}" title="${category.isVisible ? "إخفاء" : "إظهار"}">${category.isVisible ? "👁" : "🚫"}</button>
                <button type="button" class="dl-btn dl-btn-danger" data-dl-delete-category="${esc(category.id)}" title="حذف">🗑</button>
              </div>
            </div>
            ${expanded ? `<div style="background:#f8f9fe">
              <div style="padding:10px 14px;display:flex;gap:8px;border-bottom:1px dashed #e1e5f2;align-items:center;flex-wrap:wrap">
                <button type="button" class="dl-btn dl-btn-primary" data-dl-add-file="${esc(category.id)}">+ ملف</button>
                <button type="button" class="dl-btn dl-btn-ghost" data-dl-upload-many="${esc(category.id)}">⬆ رفع ملفات متعددة</button>
                <input type="file" data-dl-upload-input="${esc(category.id)}" multiple hidden>
                ${hidden || state.categories.length > 1 ? "" : ""}
              </div>
              ${files.length === 0 ? `<div style="padding:14px;text-align:center;color:#9aa3c0;font-size:13px">لا توجد ملفات في هذا القسم</div>` :
                files.map((file, index) => {
                  const previous = index > 0 ? files[index - 1] : null;
                  const next = files[index] !== files[files.length - 1] ? files[index + 1] : null;
                  return `<div class="dl-file">
                    <div class="dl-file-icon">${esc(fileIcon(file.mimeType))}</div>
                    <div style="flex:1;min-width:0">
                      <div class="dl-file-name">${esc(file.originalName || file.fileName)}${file.fileName !== file.originalName ? ` (${esc(file.fileName)})` : ""}</div>
                      <div class="dl-file-meta">${bytes(file.sizeBytes)} • ${file.downloadCount || 0} تحميل • ${date(file.createdAt)} ${file.description ? `• ${esc(String(file.description).slice(0, 40))}` : ""}</div>
                      <div style="margin-top:2px">
                        <span class="dl-chip ${file.isVisible ? "dl-chip-ok" : "dl-chip-off"}">${file.isVisible ? "ظاهر للزوار" : "مخفي"}</span>
                      </div>
                    </div>
                    <div class="dl-actions">
                      <button type="button" class="dl-btn dl-btn-ghost" data-dl-copy="${esc(file.id)}" title="نسخ الرابط">📋</button>
                      <button type="button" class="dl-btn dl-btn-ghost" data-dl-share-wa="${esc(file.id)}" title="واتساب">واتساب</button>
                      <button type="button" class="dl-btn dl-btn-ghost" data-dl-share-tg="${esc(file.id)}" title="تيليجرام">تيليجرام</button>
                      <button type="button" class="dl-btn dl-btn-ghost" data-dl-test="${esc(file.id)}" title="تجربة التحميل">▶</button>
                      <button type="button" class="dl-btn dl-btn-ghost" data-dl-edit-file="${esc(file.id)}" title="تعديل">✎</button>
                      <button type="button" class="dl-btn ${file.isVisible ? "dl-btn-ghost" : "dl-btn-danger"}" data-dl-file-visible="${esc(file.id)}" title="${file.isVisible ? "إخفاء" : "إظهار"}">${file.isVisible ? "👁" : "🚫"}</button>
                      ${previous ? `<button type="button" class="dl-btn dl-btn-ghost" data-dl-file-up="${esc(file.id)}" title="أعلى">▲</button>` : ""}
                      ${next ? `<button type="button" class="dl-btn dl-btn-ghost" data-dl-file-down="${esc(file.id)}" title="أسفل">▼</button>` : ""}
                      <button type="button" class="dl-btn dl-btn-danger" data-dl-delete-file="${esc(file.id)}" title="حذف">🗑</button>
                    </div>
                  </div>`;
                }).join("")}
              ${files.length === 0 ? `<div style="padding:8px 14px 10px;border-bottom:1px dashed #e1e5f2;display:flex;gap:6px">
                <button type="button" class="dl-btn dl-btn-ghost" data-dl-cat-up="${esc(category.id)}" ${sortedCategories().indexOf(state.categories.find(c => Number(c.id) === Number(category.id))) === 0 ? "disabled" : ""} title="أعلى">▲ القسم</button>
                <button type="button" class="dl-btn dl-btn-ghost" data-dl-cat-down="${esc(category.id)}" ${sortedCategories().indexOf(state.categories.find(c => Number(c.id) === Number(category.id))) >= sortedCategories().length - 1 ? "disabled" : ""} title="أسفل">▼ القسم</button>
              </div>` : ""}
            </div>` : ""}
          </div>`;
        }).join("")}
      ${state.createdFile ? `<div class="dl-hint" style="margin-top:10px;background:#e9f9ef;border-color:#bfe6d0;color:#1a8a4a">
        آخر ملف أُضيف: ${esc(state.createdFile.name)} — يمكنك مشاركته من القائمة أعلاه.
      </div>` : ""}`;
  };

  /* ===== النوافذ ===== */
  const openForm = html => {
    const workspace = document.querySelector(".side-workspace");
    if (!workspace) return;
    workspace.insertAdjacentHTML("beforeend", html);
    const modal = workspace.querySelector(".dl-modal:last-child");
    modal?.querySelector("[data-dl-close]")?.addEventListener("click", () => modal.remove());
    modal?.querySelector("[data-dl-cancel]")?.addEventListener("click", () => modal.remove());
    return modal;
  };
  const handleForm = async (modal, handler, options = {}) => {
    const form = modal?.querySelector("[data-dl-form]");
    if (!form) return;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector("button[type=submit]");
      if (submit) submit.disabled = true;
      try {
        await handler(form);
        if (!options.keepOpen) modal?.remove();
      } catch (error) { /* toast داخل handler */ }
      finally { if (submit) submit.disabled = false; }
    });
  };
  const editCategory = category => {
    state.categoryEditor = category ? { id: category.id } : null;
    openForm(categoryForm(category));
  };
  const editFile = file => {
    state.fileEditor = file ? { id: file.id, categoryId: file.categoryId } : null;
    const modal = openForm(fileForm(file, state.categories.filter(category => category.isVisible !== false)));
    if (!file) handleFileUpload(modal);
    handleForm(modal, async form => {
      const data = Object.fromEntries(new FormData(form).entries());
      const image = form.querySelector("[name=image]")?.files?.[0];
      if (image) data.imageKey = undefined;
      await saveFile({ ...data, categoryId: Number(data.categoryId) });
    });
  };
  const handleFileUpload = modal => {
    const input = modal?.querySelector("[name=file]");
    const submit = modal?.querySelector("button[type=submit]");
    input?.addEventListener("change", () => {
      submit?.disabled = !input.files || input.files.length === 0;
    });
  };
  const handleUploadSubmit = async (form, categoryId) => {
    const data = Object.fromEntries(new FormData(form).entries());
    const fileInput = form.querySelector("[name=file]");
    const upload = fileInput?.files?.[0];
    if (upload) {
      const uploaded = await uploadFile(upload);
      await saveFile({ ...data, categoryId: Number(categoryId), fileName: uploaded.originalName.replace(/\.[^.]+$/, "") || upload.name, originalName: uploaded.originalName, fileKey: uploaded.fileKey, fileUrl: uploaded.fileUrl, mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes });
    } else {
      await saveFile({ ...data, categoryId: Number(categoryId) });
    }
  };
  const handleCategoryForm = async (form, modal) => {
    const data = Object.fromEntries(new FormData(form).entries());
    await saveCategory({
      name: String(data.name || "").trim(),
      emoji: String(data.emoji || "📥").trim().slice(0, 4),
      color: String(data.color || "#4966d6"),
      backgroundColor: String(data.backgroundColor || "#eef1fd"),
      description: String(data.description || "").trim(),
    });
  };

  /* ===== الأحداث ===== */
  const delegate = (workspace, attribute, callback) => {
    workspace.addEventListener("click", event => {
      const target = event.target.closest ? event.target.closest(`[data-dl-${attribute}]`) : null;
      if (!target) return;
      event.preventDefault();
      callback(target.dataset[`dl${attribute}`] || target.getAttribute(`data-dl-${attribute}`), target);
    });
  };
  const bindEvents = workspace => {
    delegate(workspace, "search", value => { state.search = value; render(); });
    const searchInput = workspace.querySelector("[data-dl-search]");
    searchInput?.addEventListener("input", event => { state.search = event.target.value; render(); });
    delegate(workspace, "sort", value => { state.sort = value; render(); });
    delegate(workspace, "toggle", value => {
      const id = Number(value);
      if (state.expandedCategories.has(id)) state.expandedCategories.delete(id); else state.expandedCategories.add(id);
      render();
    });
    delegate(workspace, "add-category", () => editCategory(null));
    delegate(workspace, "edit-category", value => { const category = state.categories.find(category => Number(category.id) === Number(value)); if (category) { editCategory(category); } });
    delegate(workspace, "cat-visible", value => { toggleCategoryVisibility(Number(value)); });
    delegate(workspace, "delete-category", value => {
      const category = state.categories.find(category => Number(category.id) === Number(value));
      if (!category) return;
      const modal = openForm(confirmMarkup(`هل تريد حذف القسم «${category.name}» وجميع ملفاته؟ لا يمكن التراجع عن هذا الإجراء.`));
      handleForm(modal, async () => { await removeCategory(Number(value)); }, { keepOpen: false });
    });
    delegate(workspace, "cat-up", value => { moveCategory(Number(value), "up"); });
    delegate(workspace, "cat-down", value => { moveCategory(Number(value), "down"); });
    delegate(workspace, "add-file", value => { state.fileEditor = { categoryId: Number(value) }; editFile(null); state.fileEditor = null; });
    delegate(workspace, "edit-file", value => { const file = state.files.find(file => Number(file.id) === Number(value)); if (file) editFile(file); });
    delegate(workspace, "file-visible", value => { toggleFileVisibility(Number(value)); });
    delegate(workspace, "file-up", value => { moveFile(Number(value), "up"); });
    delegate(workspace, "file-down", value => { moveFile(Number(value), "down"); });
    delegate(workspace, "copy", value => { const file = state.files.find(file => Number(file.id) === Number(value)); if (file) void copyFileUrl(file); });
    delegate(workspace, "share-wa", value => { const file = state.files.find(file => Number(file.id) === Number(value)); if (file) void shareFile(file, "whatsapp"); });
    delegate(workspace, "share-tg", value => { const file = state.files.find(file => Number(file.id) === Number(value)); if (file) void shareFile(file, "telegram"); });
    delegate(workspace, "test", value => { const file = state.files.find(file => Number(file.id) === Number(value)); if (file) void downloadTest(file); });
    delegate(workspace, "delete-file", value => {
      const file = state.files.find(file => Number(file.id) === Number(value));
      if (!file) return;
      const modal = openForm(confirmMarkup(`هل تريد حذف الملف «${file.originalName}»؟ لا يمكن التراجع عن هذا الإجراء.`));
      handleForm(modal, async () => { await removeFile(Number(value)); });
    });
    delegate(workspace, "upload-many", value => {
      const input = workspace.querySelector(`[data-dl-upload-input="${value}"]`);
      input?.click();
    });
    workspace.addEventListener("change", event => {
      if (event.target.matches && event.target.matches("[data-dl-upload-input]")) {
        const files = event.target.files;
        if (files && files.length) void createWithUpload(Number(event.target.dataset.dlUploadInput), files);
        event.target.value = "";
      }
    });
  };

  /* ===== الواجهة العامة ===== */
  const activate = () => {
    if (admin()?.selected !== "downloads") {
      const a = admin();
      if (a && typeof a.setWorkspaceState === "function") a.setWorkspaceState({ selected: "downloads" });
    }
    render();
    list().then(() => {
      const workspace = document.querySelector(".side-workspace");
      if (workspace && !workspace.dataset.dlBound) { bindEvents(workspace); workspace.dataset.dlBound = "1"; }
    });
  };
  window.WajbatDownloadsManager = {
    workspace: () => render(),
    activate,
    mountCompatibleDownloadsManager: container => { container.innerHTML = ""; activate(); return {}; },
    refresh: () => list(),
  };
})();
