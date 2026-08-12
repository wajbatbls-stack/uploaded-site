(() => {
  const managedTitles = new Set(["طلبات العملاء", "رسائل التواصل", "تقييمات بانتظار المراجعة", "معرض الصور والوسائط"]);
  const listCore = window.WajbatAdminListCore || { pagination: (totalItems, requestedPage, perPage) => { const totalPages = Math.max(1, Math.ceil(totalItems / perPage)); const page = Math.min(Math.max(1, requestedPage), totalPages); return { page, totalPages, start: (page - 1) * perPage, end: page * perPage, hasPrevious: page > 1, hasNext: totalItems > 0 && page < totalPages }; }, filterRecords: (records, searchTerm, filterValue) => { const term = String(searchTerm || "").trim().toLocaleLowerCase("ar-SA"); return records.filter(record => (!term || String(record.searchText || "").toLocaleLowerCase("ar-SA").includes(term)) && (!filterValue || record.filterValue === filterValue)); } };

  function listFilterConfig(title) {
    if (title.includes("رسائل التواصل")) return { kind: "message-status", label: "حالة الرسالة", allLabel: "كل الحالات", entry: row => { const field = row.querySelector("[data-message-status]"); return field?.value ? { value: field.value, label: field.selectedOptions?.[0]?.textContent?.trim() || field.value } : null; } };
    if (title.includes("معرض الصور والوسائط")) return { kind: "media-category", label: "نوع الوسيط", allLabel: "كل الأنواع", entry: row => { const value = row.dataset.mediaCategory || ""; return value ? { value, label: value === "image" ? "صور" : "ملفات" } : null; } };
    return { kind: "status", label: "الحالة", allLabel: "كل الحالات", entry: row => { const value = row.querySelector(".status")?.textContent?.trim() || ""; return value ? { value, label: value } : null; } };
  }

  function applyManagedListControls(workspace) {
    const title = workspace.querySelector(".workspace-head h2")?.textContent?.trim() || "";
    if (![...managedTitles].some(label => title.includes(label)) || workspace.dataset.managedListEnhanced === "true") return;
    const list = workspace.querySelector(".item-list");
    if (!list) return;
    const rows = Array.from(list.querySelectorAll(":scope > .item-row, :scope > .editor"));
    workspace.dataset.managedListEnhanced = "true";

    // تُستبدل حقول البحث والتصفية القديمة في الطلبات والرسائل بتحكم موحّد يعمل على جميع القوائم المطلوبة.
    const legacyFilters = workspace.querySelector("[data-request-search], [data-message-search]")?.closest(".two-col");
    legacyFilters?.remove();

    const filterConfig = listFilterConfig(title);
    const availableFilters = [...new Map(rows.map(filterConfig.entry).filter(Boolean).map(entry => [entry.value, entry])).values()];
    const controls = document.createElement("section");
    controls.className = "list-controls list-controls-managed";
    controls.dataset.filterKind = filterConfig.kind;
    controls.innerHTML = `<label class="list-search"><span>بحث</span><input type="search" placeholder="ابحث في ${title}" autocomplete="off" /></label><label class="list-filter"><span>${filterConfig.label}</span><select><option value="">${filterConfig.allLabel}</option>${availableFilters.map(entry => `<option value="${entry.value}">${entry.label}</option>`).join("")}</select></label><label class="list-sort"><span>الترتيب</span><select><option value="newest">الأحدث أولاً</option><option value="oldest">الأقدم أولاً</option><option value="name-asc">الاسم من أ إلى ي</option><option value="name-desc">الاسم من ي إلى أ</option></select></label><div class="list-pagination" aria-label="ترقيم الصفحات"><button type="button" data-page="next">التالي</button><strong data-page-current></strong><button type="button" data-page="previous">السابق</button></div>`;
    workspace.querySelector(".workspace-head")?.append(controls);

    const input = controls.querySelector("input");
    const filter = controls.querySelector(".list-filter select");
    const sort = controls.querySelector(".list-sort select");
    const current = controls.querySelector("[data-page-current]");
    const previous = controls.querySelector('[data-page="previous"]');
    const next = controls.querySelector('[data-page="next"]');
    const perPage = 8;
    let page = 1;

    function rowLabel(row) {
      return row.querySelector("h3, .item-title b")?.textContent?.trim() || row.textContent?.trim() || "";
    }

    function orderedRows() {
      const term = String(input?.value || "").trim().toLocaleLowerCase("ar-SA");
      const status = String(filter?.value || "");
      const matches = listCore.filterRecords(rows.map(row => ({ row, searchText: row.textContent || "", filterValue: filterConfig.entry(row)?.value || "" })), term, status).map(record => record.row);
      const mode = String(sort?.value || "newest");
      return matches.sort((left, right) => {
        if (mode === "oldest") return rows.indexOf(right) - rows.indexOf(left);
        if (mode === "name-asc") return rowLabel(left).localeCompare(rowLabel(right), "ar");
        if (mode === "name-desc") return rowLabel(right).localeCompare(rowLabel(left), "ar");
        return rows.indexOf(left) - rows.indexOf(right);
      });
    }

    function render() {
      const matches = orderedRows();
      const pagination = listCore.pagination(matches.length, page, perPage);
      page = pagination.page;
      list.append(...matches, ...rows.filter(row => !matches.includes(row)));
      rows.forEach(row => { row.hidden = true; });
      matches.slice(pagination.start, pagination.end).forEach(row => { row.hidden = false; });
      if (current) current.textContent = matches.length ? `صفحة ${pagination.page} من ${pagination.totalPages}` : "لا توجد نتائج";
      if (previous) previous.disabled = !pagination.hasPrevious;
      if (next) next.disabled = !pagination.hasNext;
    }

    input?.addEventListener("input", () => { page = 1; render(); });
    filter?.addEventListener("change", () => { page = 1; render(); });
    sort?.addEventListener("change", () => { page = 1; render(); });
    previous?.addEventListener("click", () => { page -= 1; render(); });
    next?.addEventListener("click", () => { page += 1; render(); });
    render();
  }

  function applyBasicPagination(workspace) {
    const list = workspace.querySelector(".item-list");
    if (!list || workspace.dataset.listEnhanced === "true" || workspace.dataset.managedListEnhanced === "true") return;
    const title = workspace.querySelector(".workspace-head h2")?.textContent?.trim() || "";
    const rows = Array.from(list.querySelectorAll(":scope > .item-row"));
    if (!rows.length) return;
    workspace.dataset.listEnhanced = "true";
    const controls = document.createElement("div");
    controls.className = "list-controls";
    controls.innerHTML = `<label class="list-search"><span>بحث داخل ${title}</span><input type="search" placeholder="اكتب للبحث في العناصر" autocomplete="off" /></label><div class="list-pagination" aria-label="ترقيم الصفحات"><button type="button" data-page="next">التالي</button><strong data-page-current></strong><button type="button" data-page="previous">السابق</button></div>`;
    workspace.querySelector(".workspace-head")?.append(controls);
    const input = controls.querySelector("input"); const current = controls.querySelector("[data-page-current]"); const previous = controls.querySelector('[data-page="previous"]'); const next = controls.querySelector('[data-page="next"]'); const perPage = 8; let page = 1;
    function render() { const term = String(input?.value || "").trim().toLocaleLowerCase("ar-SA"); const matches = rows.filter(row => row.textContent.toLocaleLowerCase("ar-SA").includes(term)); const pagination = listCore.pagination(matches.length, page, perPage); page = pagination.page; rows.forEach(row => { row.hidden = true; }); matches.slice(pagination.start, pagination.end).forEach(row => { row.hidden = false; }); if (current) current.textContent = matches.length ? `صفحة ${pagination.page} من ${pagination.totalPages}` : "لا توجد نتائج"; if (previous) previous.disabled = !pagination.hasPrevious; if (next) next.disabled = !pagination.hasNext; }
    input?.addEventListener("input", () => { page = 1; render(); }); previous?.addEventListener("click", () => { page -= 1; render(); }); next?.addEventListener("click", () => { page += 1; render(); }); render();
  }

  function enhanceLists() { document.querySelectorAll(".workspace").forEach(workspace => { applyManagedListControls(workspace); applyBasicPagination(workspace); }); }
  new MutationObserver(enhanceLists).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("load", enhanceLists);
  enhanceLists();
})();
