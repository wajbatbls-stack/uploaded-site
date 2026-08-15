(function () {
  "use strict";

  const structuredKeys = new Set(["homePage", "design", "contact", "about", "team", "universities", "plans", "downloads", "articles", "reviews", "faqs", "partners"]);
  const storageKeyFor = key => ({ homePage: "siteSettings", design: "siteSettings", contact: "siteSettings", about: "aboutContent", team: "teamMembers", universities: "partners" }[key] || key);
  const captions = {
    homePage: ["⌂", "الصفحة الرئيسية", "حرر النصوص الظاهرة في الصفحة الرئيسية من حقول واضحة."],
    design: ["◐", "تصميم الموقع", "اختر شعار الموقع من معرض الصور أو ارفع صورة جديدة مباشرة."],
    contact: ["☎", "اتصل بنا", "حدّث بيانات التواصل التي تظهر لزوار الموقع."],
    about: ["ⓘ", "من نحن", "عدّل التعريف والرؤية والرسالة والأهداف من دون أي أكواد."],
    team: ["♙", "فريق الإدارة", "أضف أعضاء الفريق، أدوارهم وصورهم من معرض الصور."],
    universities: ["⌘", "الجامعات", "إدارة الجامعات فقط ضمن شركاء النجاح."],
    plans: ["📦", "الاشتراكات", "إدارة الباقات والأسعار وخصائص كل اشتراك."],
    downloads: ["📥", "التحميلات", "نظّم الفئات واختر الملفات المرفوعة من المعرض."],
    articles: ["📝", "المدونة", "أنشئ المقالات وحدد التصنيف وتاريخ النشر والمحتوى."],
    reviews: ["💬", "آراء الطلاب", "حرر الآراء المنشورة ودرجات التقييم."],
    faqs: ["❓", "الأسئلة الشائعة", "نظّم الأسئلة وإجاباتها الظاهرة للزوار."],
    partners: ["🏛️", "شركاء النجاح", "أدر الجهات التعليمية والشركاء من حقول واضحة."],
  };
  let editing = null;

  const admin = () => window.WajbatAdmin;
  const esc = value => admin()?.esc ? admin().esc(value ?? "") : String(value ?? "");
  const clone = value => JSON.parse(JSON.stringify(value ?? null));
  const visibleLabel = item => item?.isVisible === false ? "مخفي" : "ظاهر";
  const currentData = key => clone(admin().getContent(storageKeyFor(key)));
  const mediaItems = type => admin().getMedia().filter(item => !type || item.category === type);
  const selectOptions = (items, current, emptyLabel) => [`<option value="">${emptyLabel}</option>`, ...items.map(item => `<option value="${esc(item.url)}" ${String(item.url) === String(current || "") ? "selected" : ""}>${esc(item.originalName)}</option>`)].join("");
  const imagePicker = (current, target) => `<div class="structured-media-picker"><button class="btn btn-outline btn-small" type="button" data-structured-upload="${target}">رفع صورة جديدة</button><input id="${target}" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" hidden /></div>`;
  const filePicker = (current, target) => `<div class="structured-media-picker"><button class="btn btn-outline btn-small" type="button" data-structured-file-upload="${target}">رفع ملف</button><input id="${target}" data-structured-upload-kind="file" type="file" accept="application/pdf,.doc,.docx,image/jpeg,image/png,image/webp" hidden /></div>`;
  const visibilityField = item => `<label class="check-field"><input name="isVisible" type="checkbox" ${item?.isVisible === false ? "" : "checked"} /> ظاهر للزوار</label>`;
  const head = key => { const [icon, title, description] = captions[key]; return `<section class="workspace structured-workspace"><div class="workspace-head"><div><h2>${icon} ${title}</h2><p>${description}</p></div></div><div class="workspace-body">`; };
  const footer = () => "</div></section>";
  const field = (label, name, value = "", options = {}) => {
    const tag = options.multiline ? "textarea" : "input";
    const type = options.type || "text";
    const attrs = options.multiline ? "" : `type="${type}"`;
    return `<div class="field"><label>${label}</label><${tag} name="${name}" ${attrs} value="${options.multiline ? "" : esc(value)}" ${options.required ? "required" : ""} ${options.dir ? `dir="${options.dir}"` : ""}>${options.multiline ? esc(value) : ""}</${tag}></div>`;
  };
  const settingsPreview = (key, settings) => {
    if (key === "homePage") return `<aside class="structured-settings-preview" data-structured-preview="homePage" aria-live="polite"><span>معاينة قبل الحفظ</span><strong>نص الشريط العلوي</strong><p data-structured-preview-text>${esc(settings.tickerText || "سيظهر نص الشريط هنا أثناء التحرير")}</p></aside>`;
    if (key === "design") return `<aside class="structured-settings-preview structured-logo-preview" data-structured-preview="design" aria-live="polite"><span>معاينة قبل الحفظ</span><strong>شعار الموقع</strong><div class="structured-logo-preview-frame"><img data-structured-preview-logo src="${esc(settings.logoUrl || "")}" alt="معاينة شعار الموقع" ${settings.logoUrl ? "" : "hidden"} /><p data-structured-preview-placeholder ${settings.logoUrl ? "hidden" : ""}>ارفع صورة من جهازك لتظهر هنا قبل الحفظ.</p></div></aside>`;
    return "";
  };

  function settingsWorkspace(key) {
    const settings = currentData(key) || {};
    const body = key === "homePage"
      ? `${field("نص الشريط العلوي", "tickerText", settings.tickerText, { multiline: true, required: true })}`
      : key === "contact"
        ? `${field("رقم واتساب", "whatsapp", settings.whatsapp, { required: true, dir: "ltr" })}${field("رقم الجوال الظاهر", "phone", settings.phone, { required: true, dir: "ltr" })}${field("البريد الإلكتروني", "email", settings.email, { type: "email", required: true, dir: "ltr" })}${field("ساعات العمل", "businessHours", settings.businessHours, { required: true })}${field("العنوان", "address", settings.address, { required: true })}`
        : `<div class="field"><label>شعار الموقع</label>${imagePicker(settings.logoUrl, "structured-logo-image")}<small>يُعرض الشعار المختار فور الحفظ. لا تحتاج إلى نسخ أي رابط.</small></div>`;
    return `${head(key)}<form class="editor structured-settings" data-structured-settings="${key}" novalidate><div class="two-col">${body}</div>${settingsPreview(key, settings)}<div class="row-actions"><button class="btn" type="submit">حفظ التعديلات</button>${key === "design" ? `<a class="btn btn-outline" href="/" target="_blank" rel="noopener">معاينة الموقع كزائر</a>` : ""}</div></form>${footer()}`;
  }

  function aboutWorkspace() {
    const about = currentData("about") || {};
    const goals = Array.isArray(about.goals) ? about.goals : [];
    const goalFields = Array.from({ length: 4 }, (_, index) => {
      const goal = goals[index] || {};
      return `<div class="structured-goal"><b>الهدف ${index + 1}</b><div class="two-col">${field("العنوان", `goalTitle${index}`, goal.title, { required: true })}${field("الرمز", `goalEmoji${index}`, goal.emoji || "◉")}</div>${field("الوصف", `goalDescription${index}`, goal.description, { multiline: true, required: true })}</div>`;
    }).join("");
    return `${head("about")}<form class="editor structured-about" data-structured-about novalidate>${field("النص التعريفي", "intro", about.intro, { multiline: true, required: true })}<div class="two-col">${field("الرؤية", "vision", about.vision, { multiline: true, required: true })}${field("الرسالة", "mission", about.mission, { multiline: true, required: true })}</div><div class="structured-goals">${goalFields}</div><button class="btn" type="submit">حفظ محتوى من نحن</button></form>${footer()}`;
  }

  function defaultsFor(key) {
    const order = Array.isArray(currentData(key)) ? currentData(key).length : 0;
    const base = { sortOrder: order, isVisible: true };
    if (key === "plans") return { ...base, emoji: "📦", title: "باقة جديدة", duration: "", features: ["ميزة جديدة"], popular: false, color: "blue" };
    if (key === "downloads") return { ...base, categoryOrder: order, emoji: "📥", title: "فئة تحميلات جديدة", items: [{ name: "ملف جديد", remoteFile: "", sortOrder: 0, isVisible: true }] };
    if (key === "articles") return { ...base, title: "مقال جديد", category: "عام", publishedText: new Date().toLocaleDateString("ar-SA"), summary: "", body: "" };
    if (key === "reviews") return { ...base, name: "اسم الطالب", university: "", body: "", rating: 5 };
    if (key === "faqs") return { ...base, question: "سؤال جديد", answer: "" };
    if (key === "team") return { ...base, name: "عضو فريق جديد", role: "", photoUrl: "" };
    return { ...base, name: "جامعة جديدة", kind: "جامعة" };
  }

  function itemTitle(key, item, index) {
    if (key === "faqs") return item.question || `سؤال ${index + 1}`;
    return item.title || item.name || `عنصر ${index + 1}`;
  }

  function itemForm(key, item, index) {
    const common = `${visibilityField(item)}<div class="row-actions"><button class="btn" type="submit">حفظ</button><button class="btn btn-outline" type="button" data-structured-cancel>إلغاء</button></div>`;
    if (key === "plans") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field("اسم الباقة", "title", item.title, { required: true })}${field("الرمز", "emoji", item.emoji)}${field("المدة", "duration", item.duration, { required: true })}<div class="field"><label>اللون</label><select name="color">${["blue", "purple", "green", "orange"].map(color => `<option value="${color}" ${item.color === color ? "selected" : ""}>${color}</option>`).join("")}</select></div></div>${field("خصائص الباقة — سطر لكل خاصية", "features", (item.features || []).join("\n"), { multiline: true, required: true })}<label class="check-field"><input name="popular" type="checkbox" ${item.popular ? "checked" : ""} /> باقة مميزة</label>${common}</form>`;
    if (key === "downloads") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field("اسم الفئة", "title", item.title, { required: true })}${field("الرمز", "emoji", item.emoji)}</div><div class="structured-download-items">${(item.items || []).map((file, fileIndex) => `<div class="structured-file-row" data-download-row="${fileIndex}">${field("اسم الملف", `downloadName${fileIndex}`, file.name, { required: true })}<div class="field"><label>الملف المرفوع</label>${filePicker(file.remoteFile, `downloadFile${fileIndex}`)}</div><button class="btn btn-danger btn-small" type="button" data-structured-remove-file="${fileIndex}">حذف الملف</button></div>`).join("")}</div><button class="btn btn-soft btn-small" type="button" data-structured-add-file>+ إضافة ملف للفئة</button>${common}</form>`;
    if (key === "articles") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field("عنوان المقال", "title", item.title, { required: true })}${field("التصنيف", "category", item.category, { required: true })}${field("تاريخ النشر", "publishedText", item.publishedText, { required: true })}</div>${field("ملخص المقال", "summary", item.summary, { multiline: true, required: true })}${field("محتوى المقال", "body", item.body, { multiline: true, required: true })}${common}</form>`;
    if (key === "reviews") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field("اسم الطالب", "name", item.name, { required: true })}${field("الجامعة", "university", item.university, { required: true })}<div class="field"><label>التقييم</label><select name="rating">${[5, 4, 3, 2, 1].map(rating => `<option value="${rating}" ${Number(item.rating) === rating ? "selected" : ""}>${rating} من 5</option>`).join("")}</select></div></div>${field("نص الرأي", "body", item.body, { multiline: true, required: true })}${common}</form>`;
    if (key === "faqs") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}">${field("السؤال", "question", item.question, { multiline: true, required: true })}${field("الإجابة", "answer", item.answer, { multiline: true, required: true })}${common}</form>`;
    if (key === "team") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field("الاسم", "name", item.name, { required: true })}${field("المسمى الوظيفي", "role", item.role, { required: true })}<div class="field"><label>صورة العضو</label>${imagePicker(item.photoUrl, `team-photo-${index}`)}</div></div>${common}</form>`;
    if (key === "partners") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field("اسم الجهة", "name", item.name, { required: true })}<div class="field"><label>نوع الجهة</label><select name="kind">${["جامعة", "معهد", "جهة تعليمية"].map(kind => `<option value="${kind}" ${item.kind === kind ? "selected" : ""}>${kind}</option>`).join("")}</select></div></div><div class="two-col">${field("المدينة", "city", item.city || "", { placeholder: "مثال: الرياض" })}<div class="field"><label>رابط الموقع</label><input name="link" type="text" dir="ltr" maxlength="512" placeholder="https://example.com" value="${esc(item.link || "")}" /></div></div>${field("وصف مختصر", "description", item.description || "", { multiline: true, placeholder: "سطر واحد عن الشراكة" })}<div class="two-col"><div class="field"><label>شعار الجهة — رفع من الجهاز</label>${imagePicker(item.logoUrl, `partner-logo-${index}`)}</div><div class="field"><label>قالب العرض في موقع الزائر</label><select name="shape">${[["card", "بطاقة رسمية (Card)"], ["circle", "دائرة أنيقة (Circle)"], ["square", "مربع بارز (Square)"], ["pill", "كبسولة (Pill)"], ["badge", "شارة نصية (Badge)"], ["banner", "شريط كبير (Banner)"]].map(([value, label]) => `<option value="${value}" ${item.shape === value ? "selected" : ""}>${label}</option>`).join("")}</select></div></div><div class="two-col"><div class="field"><label>لون الشعار</label><input name="accentColor" type="color" value="${esc(item.accentColor || "#4966d6")}" /></div><div class="field"><label>لون النص</label><input name="textColor" type="color" value="${esc(item.textColor || "#ffffff")}" /></div><div class="field"><label>لون الخلفية</label><input name="backgroundColor" type="color" value="${esc(item.backgroundColor || "#eef1f8")}" /></div><div class="field"><label>لون الإطار</label><input name="borderColor" type="color" value="${esc(item.borderColor || item.accentColor || "#4966d6")}" /></div></div><small>اختر قالب العرض وحدد الألوان؛ يظهر التغيير فورًا للزوار بعد الحفظ.</small>${common}</form>`;
  return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field(key === "universities" ? "اسم الجامعة" : "اسم الجهة", "name", item.name, { required: true })}<div class="field"><label>نوع الجهة</label><select name="kind">${["جامعة", "معهد", "جهة تعليمية"].map(kind => `<option value="${kind}" ${item.kind === kind ? "selected" : ""}>${kind}</option>`).join("")}</select></div></div>${common}</form>`;
  }

  function listWorkspace(key) {
    const storageKey = storageKeyFor(key);
    const original = Array.isArray(currentData(key)) ? currentData(key) : [];
    const indexes = key === "universities" ? original.map((item, index) => ({ item, index })).filter(({ item }) => item.kind === "جامعة") : original.map((item, index) => ({ item, index }));
    const editingIndex = editing?.key === key ? editing.index : null;
    const draft = editing?.key === key && editing?.isNew ? editing.item : null;
    const rows = indexes.map(({ item, index }) => `<article class="item-row structured-row"><div class="item-title"><span>${esc(item.emoji || (key === "team" ? "♙" : "◉"))}</span><div><b>${esc(itemTitle(key, item, index))}</b><br><small>${esc(key === "articles" ? item.category : key === "reviews" ? item.university : key === "plans" ? item.duration : key === "team" ? item.role : item.kind || "")}</small></div><span class="status ${item.isVisible === false ? "hidden" : ""}">${visibleLabel(item)}</span></div><div class="row-actions"><button class="btn btn-outline btn-small" type="button" data-structured-move="${index}:up" data-structured-key="${key}">↑</button><button class="btn btn-outline btn-small" type="button" data-structured-move="${index}:down" data-structured-key="${key}">↓</button><button class="btn btn-soft btn-small" type="button" data-structured-edit="${index}" data-structured-key="${key}">تعديل</button><button class="btn btn-soft btn-small" type="button" data-structured-toggle="${index}" data-structured-key="${key}">${item.isVisible === false ? "إظهار" : "إخفاء"}</button><button class="btn btn-danger btn-small" type="button" data-structured-delete="${index}" data-structured-key="${key}">حذف</button></div></article>${editingIndex === index ? itemForm(key, item, index) : ""}`).join("");
    return `${head(key)}<div class="workspace-head structured-list-head"><p>أضف، عدّل، أظهر أو أخفِ، ثم رتب العناصر دون التعامل مع أي بيانات تقنية.</p><button class="btn btn-small" type="button" data-structured-add data-structured-key="${key}">+ إضافة</button></div><div class="item-list">${rows || `<div class="empty">لا توجد عناصر حالياً. استخدم زر إضافة لإنشاء أول عنصر.</div>`}${draft ? itemForm(key, draft, -1) : ""}</div>${footer()}`;
  }

  function workspace(key) {
    if (["homePage", "design", "contact"].includes(key)) return settingsWorkspace(key);
    if (key === "about") return aboutWorkspace();
    return listWorkspace(key);
  }

  function formValue(form, name) { return String(new FormData(form).get(name) || "").trim(); }
  function selectedMediaValue(form, target) { return form.querySelector(`[data-media-target="${target}"]`)?.value || ""; }
  function bindMedia(scope, target, item, url) { return window.WajbatAdminMediaBinding?.bindUploadedMedia(scope, target, item, url) || { ...(item || {}) }; }
  function updateSettingsPreview(form) {
    const key = form?.dataset?.structuredSettings;
    if (key === "homePage") {
      const preview = form.querySelector("[data-structured-preview-text]");
      if (preview) preview.textContent = formValue(form, "tickerText") || "سيظهر نص الشريط هنا أثناء التحرير";
    }
    if (key === "design") {
      const logoUrl = selectedMediaValue(form, "structured-logo-image");
      const image = form.querySelector("[data-structured-preview-logo]");
      const placeholder = form.querySelector("[data-structured-preview-placeholder]");
      if (image) { image.hidden = !logoUrl; if (logoUrl) image.src = logoUrl; }
      if (placeholder) placeholder.hidden = Boolean(logoUrl);
    }
  }
  function buildItem(key, oldItem, form, index) {
    const item = { ...oldItem, isVisible: new FormData(form).get("isVisible") === "on" };
    if (key === "plans") return { ...item, title: formValue(form, "title"), emoji: formValue(form, "emoji"), duration: formValue(form, "duration"), color: formValue(form, "color"), features: formValue(form, "features").split("\n").map(value => value.trim()).filter(Boolean), popular: new FormData(form).get("popular") === "on" };
    if (key === "downloads") { const rows = [...form.querySelectorAll("[data-download-row]")]; return { ...item, title: formValue(form, "title"), emoji: formValue(form, "emoji"), items: rows.map((row, rowIndex) => bindMedia("downloads", `downloadFile${row.dataset.downloadRow}`, { name: formValue(form, `downloadName${row.dataset.downloadRow}`), sortOrder: rowIndex, isVisible: true }, selectedMediaValue(form, `downloadFile${row.dataset.downloadRow}`))).filter(file => file.name && file.remoteFile) }; }
    if (key === "articles") return { ...item, title: formValue(form, "title"), category: formValue(form, "category"), publishedText: formValue(form, "publishedText"), summary: formValue(form, "summary"), body: formValue(form, "body") };
    if (key === "reviews") return { ...item, name: formValue(form, "name"), university: formValue(form, "university"), rating: Number(formValue(form, "rating")) || 5, body: formValue(form, "body") };
    if (key === "faqs") return { ...item, question: formValue(form, "question"), answer: formValue(form, "answer") };
    if (key === "team") return bindMedia("team", `team-photo-${index}`, { ...item, name: formValue(form, "name"), role: formValue(form, "role") }, selectedMediaValue(form, `team-photo-${index}`));
    if (key === "partners") return bindMedia("partners", `partner-logo-${index}`, { ...item, name: formValue(form, "name"), kind: formValue(form, "kind") || "جهة تعليمية", city: formValue(form, "city") || "", link: formValue(form, "link") || "", description: formValue(form, "description") || "", shape: formValue(form, "shape") || "card", accentColor: formValue(form, "accentColor") || "#4966d6", textColor: formValue(form, "textColor") || "#ffffff", backgroundColor: formValue(form, "backgroundColor") || "#eef1f8", borderColor: formValue(form, "borderColor") || "" }, selectedMediaValue(form, `partner-logo-${index}`));
  return { ...item, name: formValue(form, "name"), kind: formValue(form, "kind") || "جهة تعليمية" };
  }

  async function saveList(key, next) {
    editing = null;
    await admin().saveCollection(storageKeyFor(key), next);
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || !admin()) return;
    const key = button.dataset.structuredKey;
    if (button.hasAttribute("data-structured-edit")) { editing = { key, index: Number(button.dataset.structuredEdit) }; admin().dashboard(); return; }
    if (button.hasAttribute("data-structured-cancel")) { editing = null; admin().dashboard(); return; }
    if (button.hasAttribute("data-structured-add")) { editing = { key, index: -1, isNew: true, item: defaultsFor(key) }; admin().dashboard(); return; }
    if (button.hasAttribute("data-structured-delete")) { const list = currentData(key) || []; const index = Number(button.dataset.structuredDelete); if (!window.confirm("هل تريد حذف هذا العنصر؟")) return; void saveList(key, list.filter((_, itemIndex) => itemIndex !== index)); return; }
    if (button.hasAttribute("data-structured-toggle")) { const list = currentData(key) || []; const index = Number(button.dataset.structuredToggle); list[index] = { ...list[index], isVisible: list[index]?.isVisible === false }; void saveList(key, list); return; }
    if (button.hasAttribute("data-structured-move")) { const list = currentData(key) || []; const [rawIndex, direction] = button.dataset.structuredMove.split(":"); const index = Number(rawIndex); const target = direction === "up" ? index - 1 : index + 1; if (target < 0 || target >= list.length) return; [list[index], list[target]] = [list[target], list[index]]; list.forEach((item, itemIndex) => { item.sortOrder = itemIndex; if (key === "downloads") item.categoryOrder = itemIndex; }); void saveList(key, list); return; }
    if (button.hasAttribute("data-structured-add-file")) { const form = button.closest("form"); const index = form.querySelectorAll("[data-download-row]").length; const row = document.createElement("div"); row.className = "structured-file-row"; row.dataset.downloadRow = String(index); row.innerHTML = `<div class="field"><label>اسم الملف</label><input name="downloadName${index}" required /></div><div class="field"><label>الملف المرفوع</label>${filePicker("", `downloadFile${index}`)}</div><button class="btn btn-danger btn-small" type="button" data-structured-remove-file="${index}">حذف الملف</button>`; form.querySelector(".structured-download-items")?.append(row); return; }
    if (button.hasAttribute("data-structured-remove-file")) { button.closest("[data-download-row]")?.remove(); return; }
    if (button.hasAttribute("data-structured-upload") || button.hasAttribute("data-structured-file-upload")) { document.querySelector(`#${button.dataset.structuredUpload || button.dataset.structuredFileUpload}`)?.click(); }
  });

  document.addEventListener("input", event => {
    const form = event.target?.closest?.("form[data-structured-settings]");
    if (form) updateSettingsPreview(form);
  });

  document.addEventListener("change", event => {
    const input = event.target;
    const settingsForm = input?.closest?.("form[data-structured-settings]");
    if (settingsForm) updateSettingsPreview(settingsForm);
    if (!input.id || (!input.id.startsWith("structured-") && !input.dataset.structuredUploadKind)) return;
    const file = input.files?.[0];
    if (!file || !admin()) return;
    const kind = input.dataset.structuredUploadKind || "image";
    const maxBytes = kind === "file" ? 7 * 1024 * 1024 : 3 * 1024 * 1024;
    if (file.size > maxBytes) { admin().toast(kind === "file" ? "يجب ألا يتجاوز حجم الملف 7 ميغابايت" : "يجب ألا يتجاوز حجم الصورة 3 ميغابايت"); input.value = ""; return; }
    const upload = kind === "file" ? admin().uploadMedia(file, "تحميلات") : admin().uploadImage(file);
    void upload.then(result => {
      const selector = `[data-media-target="${input.id}"]`;
      const select = document.querySelector(selector);
      if (select) { select.value = result.url; updateSettingsPreview(select.closest("form[data-structured-settings]")); }
      const isLogoTarget = /partner-logo|structured-logo-image|team-photo|team-logo/i.test(input.id);
      if (kind === "file") admin().toast("تم رفع الملف. احفظ التعديلات لربطه بالفئة.");
      else if (isLogoTarget) admin().toast("تم رفع الشعار بنجاح. احفظ التعديلات لتطبيقه.");
      else admin().toast("تم رفع الصورة. احفظ التعديلات لتطبيقها.");
      input.value = "";
    }).catch(error => admin().toast(error instanceof Error ? error.message : "تعذر رفع الصورة"));
  });

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!admin()) return;
    if (form.matches("form[data-structured-settings]")) {
      event.preventDefault();
      const key = form.dataset.structuredSettings;
      const next = currentData(key) || {};
      if (key === "design") Object.assign(next, bindMedia("design", "structured-logo-image", next, selectedMediaValue(form, "structured-logo-image")));
      else new FormData(form).forEach((value, name) => { next[name] = String(value).trim(); });
      void admin().saveCollection("siteSettings", next);
      return;
    }
    if (form.matches("form[data-structured-about]")) {
      event.preventDefault();
      const previous = currentData("about") || {};
      const next = { ...previous, intro: formValue(form, "intro"), vision: formValue(form, "vision"), mission: formValue(form, "mission"), goals: Array.from({ length: 4 }, (_, index) => ({ emoji: formValue(form, `goalEmoji${index}`), title: formValue(form, `goalTitle${index}`), description: formValue(form, `goalDescription${index}`) })).filter(goal => goal.title && goal.description) };
      void admin().saveCollection("aboutContent", next);
      return;
    }
    if (form.matches("form[data-structured-form]")) {
      event.preventDefault();
      const key = form.dataset.structuredForm;
      const index = Number(form.dataset.structuredIndex);
      const list = currentData(key) || [];
      const nextItem = buildItem(key, index < 0 ? editing?.item || defaultsFor(key) : list[index] || defaultsFor(key), form, index);
      if (index < 0) list.push(nextItem); else list[index] = nextItem;
      void saveList(key, list);
    }
  });

  window.WajbatStructuredEditor = { supports: key => structuredKeys.has(key), workspace };
})();
