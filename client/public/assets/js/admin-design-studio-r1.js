(() => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const admin = () => window.WajbatAdmin;
  const defaults = {
    template: "academic", primaryColor: "#123d79", secondaryColor: "#ffffff", accentColor: "#d7a83d", fontFamily: "Cairo, sans-serif",
    radius: 16, spacing: "normal", headerStyle: "standard", cardStyle: "soft", frameStyle: "none", motion: "soft",
    backgroundImageUrl: "", backgroundOverlay: "rgba(255,255,255,.92)", logoUrl: "", showClock: false, clockPosition: "bottom-left", clockColor: "#ffffff", clockSeconds: false,
    hiddenSections: [], sectionOrder: [".hero", ".services", ".plans", ".blog", ".faq"], updatedAt: 0,
  };
  const templates = [
    ["academic", "أكاديمي احترافي", "#123d79", "#d7a83d"], ["saudi", "هوية سعودية", "#0b6b54", "#c7a64a"], ["minimal", "هادئ وبسيط", "#243447", "#37a2a7"],
    ["royal", "ملكي أنيق", "#35215f", "#d6a84b"], ["sky", "سماء تعليمية", "#1769aa", "#ec8f45"], ["warm", "دافئ", "#9a3d23", "#e6a54c"],
  ];
  const sectionChoices = [[".hero", "الواجهة الترحيبية"], [".services", "الخدمات"], [".plans", "الباقات"], [".blog", "المدونة"], [".faq", "الأسئلة الشائعة"]];
  let tab = "identity";
  let draft = null;

  const getSettings = () => admin()?.getContent?.("siteSettings") || {};
  const current = () => ({ ...defaults, ...(getSettings().designConfig || {}) });
  const color = (label, name, value, help = "") => `<label class="design-field"><span>${label}</span><input type="color" name="${name}" value="${esc(value)}" /><small>${help}</small></label>`;
  const select = (label, name, value, items) => `<label class="design-field"><span>${label}</span><select name="${name}">${items.map(([key, text]) => `<option value="${esc(key)}" ${String(value) === String(key) ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  const checkbox = (label, name, checked, note = "") => `<label class="design-check"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} /><span><b>${label}</b><small>${note}</small></span></label>`;
  const swatch = (item) => `<button type="button" class="design-template ${draft.template === item[0] ? "is-selected" : ""}" data-design-template="${item[0]}" data-primary="${item[2]}" data-accent="${item[3]}"><i style="background:${item[2]}"></i><i style="background:${item[3]}"></i><strong>${item[1]}</strong></button>`;

  function previewStyle(data) {
    return `--d-primary:${esc(data.primaryColor)};--d-accent:${esc(data.accentColor)};--d-radius:${Number(data.radius) || 16}px;--d-font:${esc(data.fontFamily)}`;
  }

  function preview(data) {
    return `<div class="design-preview-shell" data-design-preview style="${previewStyle(data)}"><div class="design-preview-toolbar"><button type="button" data-design-device="desktop" class="active">كمبيوتر</button><button type="button" data-design-device="tablet">تابلت</button><button type="button" data-design-device="mobile">هاتف</button><em>معاينة محلية قبل الحفظ</em></div><div class="design-preview-frame" data-frame="desktop"><div class="design-mini-site"><header><span class="design-mini-logo">${data.logoUrl ? `<img src="${esc(data.logoUrl)}" alt="" />` : "و"}</span><b>واجبات بلس</b><nav>الرئيسية　 الخدمات　 تواصل</nav></header><main><section><p>منصة الدعم الأكاديمي</p><h2>تصميم واضح ومريح للطلاب</h2><button>أرسل طلبك الآن</button></section><div class="design-mini-cards"><article>خدمات أكاديمية</article><article>باقات مرنة</article><article>دعم سريع</article></div></main></div></div></div>`;
  }

  function tabContent(data) {
    if (tab === "identity") return `<div class="design-grid"><div class="design-panel"><h3>القالب والهوية</h3><p>اختر نقطة بداية مرئية؛ ويمكنك تعديل جميع تفاصيلها لاحقاً.</p><div class="design-templates">${templates.map(swatch).join("")}</div>${select("نمط الهيدر", "headerStyle", data.headerStyle, [["standard", "قياسي"], ["glass", "زجاجي"], ["minimal", "بسيط"], ["bold", "بارز"]])}${select("أسلوب البطاقات", "cardStyle", data.cardStyle, [["soft", "ناعم"], ["outline", "إطار واضح"], ["flat", "مسطح"]])}${select("الإطار العام", "frameStyle", data.frameStyle, [["none", "بدون إطار"], ["soft", "إطار ناعم"], ["double", "إطار مزدوج"]])}</div><div class="design-panel"><h3>الشعار</h3><p>ارفع شعاراً من جهازك. لا تظهر هنا صور المعرض العام.</p><input type="hidden" name="logoUrl" value="${esc(data.logoUrl)}" /><input id="design-logo-upload" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-design-upload="logoUrl" /><button type="button" class="btn btn-secondary" data-design-upload-trigger="design-logo-upload">رفع شعار من الجهاز</button><div class="design-upload-state" data-design-upload-state="logoUrl">${data.logoUrl ? `<img src="${esc(data.logoUrl)}" alt="الشعار المرفوع" /><span>تم اختيار الشعار</span>` : "لم يُرفع شعار مخصص؛ سيبقى شعار الموقع الحالي."}</div>${checkbox("إظهار الساعة للزوار", "showClock", data.showClock, "ساعة صغيرة لا تؤثر في المحتوى.")}${select("مكان الساعة", "clockPosition", data.clockPosition, [["bottom-left", "أسفل يسار"], ["bottom-right", "أسفل يمين"], ["top-left", "أعلى يسار"], ["top-right", "أعلى يمين"]])}${color("لون الساعة", "clockColor", data.clockColor)}</div></div>`;
    if (tab === "colors") return `<div class="design-grid"><div class="design-panel"><h3>ألوان الهوية</h3>${color("اللون الأساسي", "primaryColor", data.primaryColor, "الأزرار والعناوين الأساسية")}${color("اللون الثانوي", "secondaryColor", data.secondaryColor, "الخلفيات الهادئة")}${color("لون التمييز", "accentColor", data.accentColor, "الحالات المهمة والعناصر البارزة")}${color("طبقة الخلفية", "backgroundOverlay", data.backgroundOverlay, "تحافظ على وضوح النص فوق الصورة")}</div><div class="design-panel"><h3>الخطوط والمسافات</h3>${select("الخط", "fontFamily", data.fontFamily, [["Cairo, sans-serif", "Cairo"], ["Tajawal, sans-serif", "Tajawal"], ["Arial, sans-serif", "Arial"]])}<label class="design-field"><span>استدارة العناصر: <output data-radius-output>${Number(data.radius) || 16}px</output></span><input name="radius" type="range" min="0" max="32" value="${Number(data.radius) || 16}" /></label>${select("كثافة المسافات", "spacing", data.spacing, [["compact", "مضغوطة"], ["normal", "متوازنة"], ["spacious", "واسعة"]])}${select("الحركة", "motion", data.motion, [["off", "بدون حركة"], ["soft", "ناعمة"], ["lively", "واضحة"]])}</div></div>`;
    if (tab === "background") return `<div class="design-grid"><div class="design-panel"><h3>صورة الخلفية</h3><p>ارفع صورة خلفية من جهازك. لا روابط ولا صور افتراضية.</p><input type="hidden" name="backgroundImageUrl" value="${esc(data.backgroundImageUrl)}" /><input id="design-background-upload" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" data-design-upload="backgroundImageUrl" /><button type="button" class="btn btn-secondary" data-design-upload-trigger="design-background-upload">رفع خلفية من الجهاز</button><div class="design-upload-state" data-design-upload-state="backgroundImageUrl">${data.backgroundImageUrl ? `<img src="${esc(data.backgroundImageUrl)}" alt="الخلفية المرفوعة" /><span>تم اختيار الخلفية</span>` : "لم تُرفع خلفية مخصصة."}</div></div><div class="design-panel"><h3>ضبط الخلفية</h3>${select("عرض الخلفية", "backgroundMode", data.backgroundMode || "cover", [["cover", "تغطي كامل الشاشة"], ["contain", "تظهر كاملة"], ["repeat", "نقش متكرر"]])}${checkbox("إظهار الثواني في الساعة", "clockSeconds", data.clockSeconds)}</div></div>`;
    if (tab === "sections") return `<div class="design-grid"><div class="design-panel wide"><h3>إظهار الأقسام</h3><p>الإخفاء لا يحذف المحتوى؛ ويمكن إعادته في أي وقت.</p><div class="design-section-list">${sectionChoices.map(([selector, label]) => checkbox(label, `section:${selector}`, !data.hiddenSections.includes(selector), "أوقف الخيار لإخفاء القسم من الصفحة الرئيسية")).join("")}</div></div><div class="design-panel wide"><h3>ترتيب الأولويات</h3><p>اختر ترتيب عرض العناصر الرئيسية في المعاينة. لا يحذف ذلك أي خدمة أو نص.</p><ol class="design-order">${sectionChoices.map(([, label], index) => `<li><span>${index + 1}</span>${label}<button type="button" aria-label="رفع" data-order-move="${index}:up">↑</button><button type="button" aria-label="خفض" data-order-move="${index}:down">↓</button></li>`).join("")}</ol></div></div>`;
    return `<div class="design-grid"><div class="design-panel"><h3>المعاينة والتطبيق</h3><p>تُطبّق المعاينة داخل هذه اللوحة فقط حتى تضغط حفظ التصميم.</p>${checkbox("تفعيل تأثيرات الظهور الناعمة", "reveal", data.reveal !== false)}${checkbox("تفضيل تباين أوضح", "highContrast", data.highContrast)}</div><div class="design-panel"><h3>الإدارة والاستعادة</h3><p>يحفظ النظام النسخة السابقة تلقائياً عند تطبيق تصميم جديد.</p><button class="btn btn-secondary" type="button" data-design-action="restore-previous">استعادة آخر تصميم محفوظ</button><button class="btn btn-danger" type="button" data-design-action="restore-default">إعادة الإعداد الافتراضي</button></div></div>`;
  }

  function studio() {
    draft = draft || current();
    const tabs = [["identity", "الهوية والشعار"], ["colors", "الألوان والخطوط"], ["background", "الخلفية والساعة"], ["sections", "الأقسام"], ["preview", "المعاينة والتطبيق"]];
    return `<section class="design-studio"><div class="workspace-head"><div><p class="eyebrow">استوديو مرئي</p><h2>إعدادات تصميم الموقع</h2><p>تحكّم من لوحة المالك فقط؛ لا حاجة لأي كود.</p></div><span class="design-dirty" data-design-dirty>لم تُحفظ تغييرات</span></div><form data-design-studio><div class="design-tabs">${tabs.map(([id, label]) => `<button type="button" class="${tab === id ? "active" : ""}" data-design-tab="${id}">${label}</button>`).join("")}</div><div class="design-stage"><div class="design-controls">${tabContent(draft)}</div>${preview(draft)}</div><footer class="design-actions"><button class="btn btn-primary" type="submit">تطبيق وحفظ التصميم</button><button class="btn btn-secondary" type="button" data-design-action="cancel">إلغاء التغييرات</button><button class="btn btn-secondary" type="button" data-design-action="undo">تراجع عن التعديل المحلي</button></footer></form></section>`;
  }

  function dataFrom(form) {
    const next = { ...draft };
    new FormData(form).forEach((value, key) => { if (!key.startsWith("section:")) next[key] = String(value); });
    ["showClock", "clockSeconds", "reveal", "highContrast"].forEach(key => { next[key] = form.elements[key]?.checked || false; });
    next.radius = Number(next.radius) || 16;
    next.hiddenSections = sectionChoices.filter(([selector]) => !form.elements[`section:${selector}`]?.checked).map(([selector]) => selector);
    next.updatedAt = Date.now();
    return next;
  }

  function sync(form) {
    draft = dataFrom(form);
    const pre = $("[data-design-preview]", form);
    if (pre) pre.setAttribute("style", previewStyle(draft));
    const output = $("[data-radius-output]", form); if (output) output.textContent = `${draft.radius}px`;
    $("[data-design-dirty]")?.classList.add("is-dirty");
  }

  function install() {
    if (!window.WajbatStructuredEditor || !admin()) return setTimeout(install, 80);
    if (window.WajbatDesignStudioInstalled) return;
    window.WajbatDesignStudioInstalled = true;
    const original = window.WajbatStructuredEditor.workspace;
    window.WajbatStructuredEditor.workspace = (key) => key === "design" ? studio() : original(key);

    document.addEventListener("click", event => {
      const button = event.target.closest("button"); if (!button) return;
      if (button.dataset.designTab) { tab = button.dataset.designTab; admin().dashboard(); return; }
      if (button.dataset.designTemplate) { draft = { ...draft, template: button.dataset.designTemplate, primaryColor: button.dataset.primary, accentColor: button.dataset.accent }; admin().dashboard(); return; }
      if (button.dataset.designDevice) { const form = button.closest("form"); form.querySelectorAll("[data-design-device]").forEach(item => item.classList.toggle("active", item === button)); form.querySelector("[data-frame]").dataset.frame = button.dataset.designDevice; return; }
      if (button.dataset.designUploadTrigger) { $(`#${button.dataset.designUploadTrigger}`)?.click(); return; }
      const action = button.dataset.designAction;
      if (!action) return;
      if (action === "cancel") { draft = current(); admin().dashboard(); return; }
      if (action === "undo") { draft = { ...defaults, ...(getSettings().designConfig || {}) }; admin().dashboard(); return; }
      if (action === "restore-default") { if (window.confirm("هل تريد إعادة تصميم الموقع إلى الإعدادات الافتراضية؟")) { draft = { ...defaults }; admin().dashboard(); } return; }
      if (action === "restore-previous") { const previous = getSettings().previousDesignConfig; if (!previous) { admin().toast("لا توجد نسخة تصميم سابقة بعد."); return; } draft = { ...defaults, ...previous }; admin().dashboard(); }
    });

    document.addEventListener("input", event => { const form = event.target.closest?.("form[data-design-studio]"); if (form) sync(form); });
    document.addEventListener("change", event => {
      const input = event.target; const form = input.closest?.("form[data-design-studio]");
      if (form) sync(form);
      if (!input.matches?.("input[data-design-upload]")) return;
      const file = input.files?.[0]; if (!file || !admin()) return;
      if (file.size > 3 * 1024 * 1024) { admin().toast("يجب ألا تتجاوز الصورة 3 ميغابايت"); input.value = ""; return; }
      admin().uploadImage(file).then(result => {
        const target = input.dataset.designUpload; const hidden = form.elements[target]; hidden.value = result.url; draft[target] = result.url;
        const state = $(`[data-design-upload-state="${target}"]`, form); if (state) state.innerHTML = `<img src="${esc(result.url)}" alt="الصورة المرفوعة" /><span>تم رفع ${esc(file.name)} بنجاح</span>`;
        sync(form); admin().toast("تم رفع الصورة. اضغط حفظ التصميم لتطبيقها."); input.value = "";
      }).catch(error => admin().toast(error instanceof Error ? error.message : "تعذر رفع الصورة"));
    });
    document.addEventListener("submit", event => {
      const form = event.target; if (!form.matches?.("form[data-design-studio]") || !admin()) return;
      event.preventDefault(); const config = dataFrom(form); const settings = getSettings();
      admin().saveCollection("siteSettings", { ...settings, logoUrl: config.logoUrl || settings.logoUrl || "", previousDesignConfig: settings.designConfig || null, designConfig: config });
      draft = config; admin().toast("تم حفظ التصميم وتطبيقه على واجهة الزوار.");
    });
  }

  const style = document.createElement("style");
  style.textContent = `.design-studio{padding:20px}.workspace-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.workspace-head h2{margin:0;color:#153b73}.eyebrow{color:#0b7655;font-weight:800;margin:0 0 5px}.design-dirty{font-size:.78rem;background:#e8edf5;padding:7px 10px;border-radius:999px}.design-dirty.is-dirty{background:#fff1cf;color:#7e5611}.design-tabs{display:flex;gap:8px;overflow:auto;padding-bottom:9px;border-bottom:1px solid #e2e8f0}.design-tabs button{white-space:nowrap;border:0;background:#f1f5f9;color:#345;padding:9px 12px;border-radius:10px;font:inherit;font-weight:700}.design-tabs button.active{background:#153b73;color:#fff}.design-stage{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:16px;margin-top:18px}.design-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.design-panel{padding:16px;border:1px solid #dbe5f2;background:#fff;border-radius:16px}.design-panel.wide{grid-column:1/-1}.design-panel h3{margin:0 0 5px;color:#173b72}.design-panel p{margin:0 0 14px;color:#64748b;font-size:.87rem}.design-field{display:grid;gap:6px;margin:12px 0;font-weight:700;color:#243b5a}.design-field small,.design-check small{display:block;font-size:.75rem;font-weight:500;color:#6b7b91}.design-field input:not([type=color]),.design-field select{width:100%;min-height:39px;border:1px solid #cbd8e8;border-radius:9px;padding:7px;background:#fff}.design-field input[type=color]{width:100%;height:39px;border:1px solid #cbd8e8;border-radius:9px;padding:3px}.design-check{display:flex;gap:9px;align-items:flex-start;margin:12px 0;color:#203a62}.design-check input{margin-top:4px}.design-templates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.design-template{display:grid;grid-template-columns:18px 18px 1fr;gap:5px;align-items:center;border:1px solid #d7e2ef;background:#fff;padding:8px;border-radius:10px;font:inherit;font-size:.75rem;text-align:right}.design-template.is-selected{border-color:#153b73;box-shadow:0 0 0 2px #dbeafe}.design-template i{display:block;width:16px;height:16px;border-radius:50%}.design-upload-state{min-height:50px;margin:10px 0;border:1px dashed #b9c9dd;border-radius:10px;padding:8px;display:flex;gap:9px;align-items:center;font-size:.8rem;color:#567}.design-upload-state img{width:40px;height:40px;object-fit:cover;border-radius:8px}.design-preview-shell{position:sticky;top:14px;background:#f7fafc;border:1px solid #dbe5f2;border-radius:16px;padding:10px}.design-preview-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:9px}.design-preview-toolbar button{border:0;border-radius:8px;background:#e4edf7;padding:6px 8px;font:inherit;font-size:.72rem}.design-preview-toolbar button.active{background:#153b73;color:#fff}.design-preview-toolbar em{font-size:.7rem;color:#76869a;margin-inline-start:auto}.design-preview-frame{margin:auto;background:#fff;box-shadow:0 10px 26px rgba(15,38,74,.1);transition:.2s;width:100%;overflow:hidden}.design-preview-frame[data-frame=tablet]{width:78%}.design-preview-frame[data-frame=mobile]{width:46%}.design-mini-site{font-family:var(--d-font);font-size:9px}.design-mini-site header{display:flex;align-items:center;gap:6px;padding:10px;background:var(--d-primary);color:#fff}.design-mini-site nav{margin-inline-start:auto;font-size:7px}.design-mini-logo{display:grid;place-items:center;width:18px;height:18px;background:#fff;color:var(--d-primary);border-radius:5px}.design-mini-logo img{width:100%;height:100%;object-fit:contain}.design-mini-site main{padding:16px;background:#f8fbff}.design-mini-site section{padding:15px;border-radius:var(--d-radius);background:linear-gradient(135deg,var(--d-primary),#315d9d);color:#fff}.design-mini-site h2{font-size:15px;margin:5px 0}.design-mini-site button{background:var(--d-accent);border:0;border-radius:7px;padding:6px;color:#1e293b;font-size:8px}.design-mini-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}.design-mini-cards article{background:#fff;padding:9px 4px;border-radius:var(--d-radius);text-align:center;box-shadow:0 2px 6px #dbe5f2}.design-actions{display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:16px}.design-order{padding:0;list-style:none}.design-order li{display:flex;gap:9px;align-items:center;padding:8px;border-bottom:1px solid #eef2f7}.design-order li span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#e4edf7;font-size:.72rem}.design-order button{margin-inline-start:auto;border:0;background:#edf4fb;border-radius:7px;padding:3px 7px}.design-order button+button{margin-inline-start:0}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:900px){.design-stage{grid-template-columns:1fr}.design-preview-shell{position:static}.design-preview-frame[data-frame=mobile]{width:60%}}@media(max-width:600px){.design-studio{padding:12px}.workspace-head{display:block}.design-dirty{display:inline-block;margin-top:8px}.design-grid{grid-template-columns:1fr}.design-panel.wide{grid-column:auto}.design-preview-frame[data-frame=mobile]{width:72%}.design-actions{position:sticky;bottom:0;background:#fff;padding:12px 0;justify-content:stretch}.design-actions .btn{flex:1;font-size:.78rem;padding-inline:7px}.design-tabs{margin-inline:-12px;padding-inline:12px}}`;
  document.head.append(style);
  install();
})();
