(() => {
  "use strict";

  const state = { links: [], search: "", filter: "all", sort: "newest", editor: null, loading: false };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const targetOptions = [
    ["/", "الصفحة الرئيسية"], ["/services", "الخدمات"], ["/assignment", "تسليم الواجب"], ["/downloads", "التحميلات"], ["/blog", "المدونة"], ["/contact", "اتصل بنا"], ["/about", "من نحن"]
  ];
  const admin = () => window.WajbatAdmin;
  const toast = message => admin()?.toast?.(message) || window.alert(message);
  const date = value => value ? new Date(value).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const publicUrl = token => `${location.origin}/?link=${encodeURIComponent(token)}`;
  const localValue = value => value ? new Date(value).toISOString().slice(0, 16) : "";
  const apiError = async response => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.json?.message || "تعذر إتمام العملية. حاول مرة أخرى.");
    return payload?.result?.data?.json ?? payload?.result?.data;
  };
  const request = (procedure, input, method = "POST") => {
    const url = method === "GET" ? `/api/trpc/${procedure}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}` : `/api/trpc/${procedure}`;
    return fetch(url, { method, credentials: "same-origin", cache: "no-store", headers: method === "POST" ? { "content-type": "application/json" } : undefined, body: method === "POST" ? JSON.stringify({ json: input }) : undefined }).then(apiError);
  };
  const list = async () => {
    state.loading = true;
    render();
    try { state.links = await request("admin.visitorLinks", undefined, "GET"); }
    catch (error) { toast(error.message || "تعذر تحميل روابط الزوار"); }
    finally { state.loading = false; render(); }
  };
  const isExpired = link => Boolean(link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now());
  const isAvailable = link => Boolean(link.isActive) && !isExpired(link);
  const current = () => state.links
    .filter(link => {
      const q = state.search.trim().toLowerCase();
      return !q || [link.name, link.token, link.targetPath].some(value => String(value || "").toLowerCase().includes(q));
    })
    .filter(link => state.filter === "all" || (state.filter === "active" ? isAvailable(link) : state.filter === "expired" ? isExpired(link) : !isAvailable(link)))
    .sort((a, b) => state.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : state.sort === "visits" ? Number(b.visitCount || 0) - Number(a.visitCount || 0) : new Date(b.createdAt) - new Date(a.createdAt));
  const selectTargets = selected => targetOptions.map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
  const status = link => {
    const expired = link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now();
    return expired ? `<span class="vl-status expired">منتهي</span>` : link.isActive ? `<span class="vl-status active">نشط</span>` : `<span class="vl-status disabled">معطّل</span>`;
  };
  const row = link => {
    const url = publicUrl(link.token);
    return `<article class="vl-card" data-vl-id="${link.id}">
      <div class="vl-card-main"><div class="vl-card-title"><span class="vl-link-mark">↗</span><div><h3>${esc(link.name)}</h3><p>${status(link)} <span>أُنشئ ${date(link.createdAt)}</span></p></div></div>
      <div class="vl-url"><code dir="ltr">${esc(url)}</code><button type="button" class="vl-icon-button" data-vl-action="copy" data-id="${link.id}" aria-label="نسخ الرابط">⧉</button></div>
      <dl class="vl-meta"><div><dt>الوجهة</dt><dd dir="ltr">${esc(link.targetPath)}</dd></div><div><dt>الزيارات</dt><dd>${Number(link.visitCount || 0).toLocaleString("ar-SA")}</dd></div><div><dt>آخر استخدام</dt><dd>${date(link.lastVisitedAt)}</dd></div><div><dt>الصلاحية</dt><dd>${link.expiresAt ? date(link.expiresAt) : "بدون انتهاء"}</dd></div></dl></div>
      <div class="vl-actions"><button type="button" data-vl-action="preview" data-id="${link.id}">👁 معاينة</button><button type="button" data-vl-action="visitor" data-id="${link.id}">🌐 اختبار كزائر</button><button type="button" data-vl-action="edit" data-id="${link.id}">✏️ تعديل</button><button type="button" data-vl-action="toggle" data-id="${link.id}">${link.isActive ? "🔴 تعطيل" : "🟢 تفعيل"}</button><button type="button" class="danger" data-vl-action="delete" data-id="${link.id}">🗑 حذف</button></div>
    </article>`;
  };
  const editor = () => {
    if (!state.editor) return "";
    const entry = state.editor;
    const mode = entry.id ? "تعديل رابط زائر" : "إنشاء رابط زائر جديد";
    return `<div class="vl-modal-backdrop" data-vl-close-modal><section class="vl-modal" role="dialog" aria-modal="true" aria-labelledby="vl-editor-title"><header><div><p>رابط عام وآمن</p><h3 id="vl-editor-title">${mode}</h3></div><button type="button" data-vl-action="close-editor" aria-label="إغلاق">×</button></header><form data-vl-form novalidate>
      <label>اسم الرابط <input name="name" value="${esc(entry.name || "")}" placeholder="مثال: رابط خدمات الفصل الدراسي" required minlength="2" maxlength="160" autofocus /></label>
      <label>الصفحة المستهدفة <select name="targetPath">${selectTargets(entry.targetPath || "/")}</select></label>
      <label>تاريخ انتهاء الصلاحية <input name="expiresAt" type="datetime-local" value="${localValue(entry.expiresAt)}" /><small>اختياري — بعد انتهاء الموعد تظهر رسالة للزائر ولا تُسجل زيارة.</small></label>
      <label class="vl-switch"><input name="isActive" type="checkbox" ${entry.isActive !== false ? "checked" : ""} /><span>الرابط متاح للزوار</span></label>
      <div class="vl-form-actions"><button type="button" class="btn btn-outline" data-vl-action="close-editor">إلغاء</button><button type="submit" class="btn">💾 ${entry.id ? "حفظ التعديل" : "إنشاء الرابط والتحقق منه"}</button></div>
    </form></section></div>`;
  };
  const workspace = () => {
    const links = current();
    return `<section class="workspace visitor-links-workspace" data-visitor-links-workspace><div class="workspace-head"><div><p class="eyebrow">روابط عامة قابلة للمشاركة</p><h2>🔗 إنشاء رابط الزوار</h2><p>أنشئ رابطاً حقيقياً يفتح نسخة الزائر فقط، وتابع الزيارات والصلاحية وحالة الوصول من مكان واحد.</p></div><div class="head-actions"><button type="button" class="btn btn-outline" data-vl-action="refresh">↻ تحديث القائمة</button><button type="button" class="btn" data-vl-action="create">➕ إنشاء رابط زائر جديد</button></div></div><div class="workspace-body"><div class="vl-summary"><b>${state.links.length.toLocaleString("ar-SA")}</b><span>إجمالي الروابط المحفوظة</span><i></i><b>${state.links.filter(isAvailable).length.toLocaleString("ar-SA")}</b><span>روابط متاحة</span><i></i><b>${state.links.reduce((sum, link) => sum + Number(link.visitCount || 0), 0).toLocaleString("ar-SA")}</b><span>زيارات مسجّلة</span></div><div class="vl-toolbar"><label class="vl-search"><span>🔍</span><input data-vl-search value="${esc(state.search)}" placeholder="ابحث بالاسم أو الرابط أو الصفحة" /></label><select data-vl-filter aria-label="تصفية الروابط"><option value="all" ${state.filter === "all" ? "selected" : ""}>كل الحالات</option><option value="active" ${state.filter === "active" ? "selected" : ""}>المتاحة</option><option value="disabled" ${state.filter === "disabled" ? "selected" : ""}>المعطلة</option><option value="expired" ${state.filter === "expired" ? "selected" : ""}>المنتهية</option></select><select data-vl-sort aria-label="ترتيب الروابط"><option value="newest" ${state.sort === "newest" ? "selected" : ""}>الأحدث أولاً</option><option value="oldest" ${state.sort === "oldest" ? "selected" : ""}>الأقدم أولاً</option><option value="visits" ${state.sort === "visits" ? "selected" : ""}>الأكثر زيارة</option></select></div>${state.loading ? `<div class="vl-empty">جارٍ تحميل الروابط المحفوظة…</div>` : links.length ? `<div class="vl-list">${links.map(row).join("")}</div>` : `<div class="vl-empty"><strong>لا توجد روابط مطابقة.</strong><span>أنشئ أول رابط زائر حقيقي، أو غيّر عبارة البحث والتصفية.</span><button type="button" class="btn" data-vl-action="create">إنشاء رابط زائر جديد</button></div>`}</div>${editor()}</section>`;
  };
  const replaceWorkspace = () => {
    const root = document.querySelector(".workspace");
    if (root) root.outerHTML = workspace();
    document.body.classList.add("visitor-links-active");
    document.querySelectorAll("[data-visitor-links-nav]").forEach(button => button.classList.add("active"));
  };
  const render = () => { if (document.querySelector("[data-visitor-links-workspace]")) replaceWorkspace(); };
  const activate = async () => {
    if (!admin()) return;
    const shellState = admin().getState?.();
    if (shellState) shellState.selected = "dashboard";
    admin().dashboard?.();
    replaceWorkspace();
    await list();
  };
  const ensureNavigation = () => {
    const nav = document.querySelector(".side-menu");
    if (!nav || nav.querySelector("[data-visitor-links-nav]")) return;
    const group = [...nav.querySelectorAll(".nav-group")].find(item => item.querySelector(".nav-group-title")?.textContent?.includes("التواصل")) || nav.lastElementChild;
    group?.insertAdjacentHTML("afterbegin", `<button type="button" data-visitor-links-nav><span class="nav-item-icon">🔗</span><span>إنشاء رابط الزوار</span></button>`);
  };
  const copy = async link => {
    const value = publicUrl(link.token);
    try { await navigator.clipboard.writeText(value); }
    catch { const input = document.createElement("textarea"); input.value = value; document.body.append(input); input.select(); document.execCommand("copy"); input.remove(); }
    toast("تم نسخ الرابط بنجاح.");
  };
  const preview = link => {
    const url = publicUrl(link.token);
    const modal = document.createElement("div");
    modal.className = "vl-preview-backdrop";
    modal.innerHTML = `<section class="vl-preview" role="dialog" aria-modal="true"><header><div><p>نسخة حقيقية من تجربة الزائر</p><h3>${esc(link.name)}</h3></div><div><a class="btn btn-outline btn-small" href="${esc(url)}" target="_blank" rel="noopener">فتح في نافذة</a><button type="button" class="vl-preview-close" aria-label="إغلاق">×</button></div></header><iframe title="معاينة رابط الزائر" src="${esc(url)}"></iframe></section>`;
    modal.querySelector(".vl-preview-close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", event => { if (event.target === modal) modal.remove(); });
    document.body.append(modal);
  };
  const verifyAvailability = async (token, input) => {
    if (!token) throw new Error("تعذر تحديد رمز الرابط للتحقق منه.");
    const resolved = await request("site.resolveVisitorLink", { token, recordVisit: false }, "GET");
    const shouldOpen = Boolean(input.isActive) && !(input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now());
    if (shouldOpen && (!resolved?.active || resolved.targetPath !== input.targetPath)) throw new Error("حُفظ الرابط لكن لم ينجح التحقق من وجهته. حدّث القائمة ثم أعد المحاولة.");
    if (!shouldOpen && resolved?.active) throw new Error("حُفظت الحالة لكن الرابط ما زال متاحاً؛ حدّث القائمة ثم أعد المحاولة.");
  };
  const save = async form => {
    const data = new FormData(form);
    const input = { name: String(data.get("name") || "").trim(), targetPath: String(data.get("targetPath") || ""), isActive: data.get("isActive") === "on", expiresAt: data.get("expiresAt") ? new Date(String(data.get("expiresAt"))).toISOString() : null };
    if (input.name.length < 2) throw new Error("اكتب اسماً للرابط لا يقل عن حرفين.");
    const old = state.editor;
    const result = old.id ? await request("admin.updateVisitorLink", { id: old.id, ...input }) : await request("admin.createVisitorLink", input);
    const token = old.token || result.token;
    await verifyAvailability(token, input);
    state.editor = null;
    await list();
    toast(old.id ? "تم حفظ تعديل الرابط فعلياً." : "تم إنشاء الرابط والتحقق من فتحه بنجاح.");
  };
  document.addEventListener("click", async event => {
    const nav = event.target.closest?.("[data-visitor-links-nav]");
    if (nav) { event.preventDefault(); await activate(); return; }
    const action = event.target.closest?.("[data-vl-action]")?.dataset.vlAction;
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = Number(event.target.closest("[data-vl-action]").dataset.id);
    const link = state.links.find(item => Number(item.id) === id);
    try {
      if (action === "create") { state.editor = { name: "", targetPath: "/", isActive: true, expiresAt: null }; render(); }
      else if (action === "close-editor") { state.editor = null; render(); }
      else if (action === "refresh") await list();
      else if (action === "copy" && link) await copy(link);
      else if (action === "preview" && link) preview(link);
      else if (action === "visitor" && link) window.open(publicUrl(link.token), "_blank", "noopener");
      else if (action === "edit" && link) { state.editor = { ...link }; render(); }
      else if (action === "toggle" && link) { const input = { isActive: !link.isActive, targetPath: link.targetPath, expiresAt: link.expiresAt || null }; await request("admin.updateVisitorLink", { id: link.id, isActive: input.isActive }); await verifyAvailability(link.token, input); await list(); toast(link.isActive ? "تم تعطيل الرابط؛ سيظهر للزائر أنه غير متاح." : "تم تفعيل الرابط مجدداً."); }
      else if (action === "delete" && link) { if (!window.confirm("هل أنت متأكد من حذف رابط الزوار؟\nلا يمكن التراجع عن الحذف.")) return; await request("admin.deleteVisitorLink", { id: link.id }); await list(); toast("تم حذف رابط الزوار فعلياً."); }
    } catch (error) { toast(error.message || "تعذر إتمام العملية"); }
  }, true);
  document.addEventListener("input", event => { const input = event.target.closest?.("[data-vl-search]"); if (!input) return; state.search = input.value; render(); });
  document.addEventListener("change", event => { const input = event.target; if (input.matches?.("[data-vl-filter]")) { state.filter = input.value; render(); } if (input.matches?.("[data-vl-sort]")) { state.sort = input.value; render(); } });
  document.addEventListener("submit", async event => { const form = event.target.closest?.("[data-vl-form]"); if (!form) return; event.preventDefault(); try { await save(form); } catch (error) { toast(error.message || "تعذر حفظ الرابط"); } }, true);
  document.addEventListener("click", event => { if (event.target.matches?.("[data-vl-close-modal]")) { state.editor = null; render(); } });
  const observer = new MutationObserver(() => { ensureNavigation(); if (!document.querySelector("[data-visitor-links-workspace]")) document.body.classList.remove("visitor-links-active"); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureNavigation();
  window.WajbatVisitorLinksManager = { activate, workspace: () => workspace(), refresh: list };
})();
