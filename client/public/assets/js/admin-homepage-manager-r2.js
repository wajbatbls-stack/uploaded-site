(function () {
  "use strict";

  const DEFAULT = {
    version: 2,
    hero: {
      title: "واجبات بلس", subtitle: "منصتك الذكية للتعلم والتفوق", description: "خدمات أكاديمية موثوقة للطلاب الجامعيين في السعودية.", additionalText: "⭐ ضمان الجودة 100% · سرية تامة · دعم 24/7 ⭐",
      template: "classic", align: "center", textColor: "#ffffff", headingColor: "#ffffff", fontFamily: "Cairo", fontWeight: "800", titleSize: 46, descriptionSize: 17, spacing: 18,
      imageUrl: "", imageVisible: false, imagePosition: "side", animation: "fade-up", animationSpeed: 500, animationDelay: 0, animationRepeat: "once",
      buttons: [
        { id: "request", label: "🚀 اطلب خدمتك الآن", link: "whatsapp", visible: true, style: "gradient", color: "#25D366", textColor: "#ffffff", size: "medium", radius: 14, shadow: "soft", animation: "none" },
        { id: "services", label: "📚 تصفح الخدمات", link: "/services", visible: true, style: "outline", color: "#ffffff", textColor: "#ffffff", size: "medium", radius: 14, shadow: "none", animation: "none" },
      ],
    },
    background: { type: "classic", color1: "#0f2a62", color2: "#195a9e", color3: "#123b78", direction: "135deg", opacity: 82, dim: 20, imageUrl: "", imageSize: "cover", imagePosition: "center", imageRepeat: "no-repeat", animated: false },
    logo: { url: "", visible: true, width: 94, height: 94, position: "center" },
    sections: [
      { id: "hero", label: "Hero", visible: true }, { id: "stats", label: "الإحصائيات", visible: false }, { id: "services", label: "الخدمات", visible: true }, { id: "features", label: "المميزات", visible: true }, { id: "cta", label: "الدعوة لاتخاذ إجراء", visible: true },
    ],
    stats: [],
    services: { title: "خدماتنا الأكاديمية", description: "اختر الخدمة المناسبة لاحتياجك الأكاديمي.", limit: 6, selectedIds: [], layout: "grid", cardStyle: "soft", cardColor: "#ffffff", borderColor: "#e6edf8", shadow: "soft", size: "medium", titleColor: "#123b78", visible: true },
    features: { title: "لماذا تختار واجبات بلس؟", description: "دعم أكاديمي موثوق يراعي الجودة والخصوصية.", visible: true, items: ["دعم سريع", "خصوصية تامة", "جودة موثوقة"] },
    cta: { title: "هل تحتاج إلى مساعدة أكاديمية؟", description: "تواصل معنا الآن وسنساعدك في اختيار الخدمة المناسبة.", buttonLabel: "تواصل عبر واتساب", buttonLink: "whatsapp", visible: true },
  };
  const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const merge = (base, value) => {
    if (Array.isArray(base)) return Array.isArray(value) ? value.map((item, index) => merge(base[index] || {}, item)) : clone(base);
    if (!base || typeof base !== "object") return value === undefined ? base : value;
    const output = { ...base };
    if (value && typeof value === "object") Object.keys(value).forEach(key => { output[key] = key in base ? merge(base[key], value[key]) : value[key]; });
    return output;
  };
  const getAdmin = () => window.WajbatAdmin;
  const getSettings = () => clone(getAdmin()?.getContent("siteSettings") || {});
  const normalizeLegacyConfig = config => {
    const merged = merge(DEFAULT, config || {});
    if (Number(merged.version || 1) >= 2) return merged;
    const restoredSections = new Set(["services", "features", "cta"]);
    merged.sections = merged.sections.map(section => restoredSections.has(section.id) ? { ...section, visible: true } : section);
    merged.version = 2;
    return merged;
  };
  const current = () => normalizeLegacyConfig(getSettings().homePageConfig);
  let draft = null;
  let draggedSection = null;

  const field = (label, key, value, options = {}) => {
    const tag = options.textarea ? "textarea" : "input";
    const type = options.type || "text";
    return `<label class="hp-field"><span>${esc(label)}</span><${tag} data-hp="${esc(key)}" ${options.textarea ? "" : `type="${type}"`} ${options.min !== undefined ? `min="${options.min}"` : ""} ${options.max !== undefined ? `max="${options.max}"` : ""} ${options.step ? `step="${options.step}"` : ""} value="${options.textarea ? "" : esc(value ?? "")}" ${options.dir ? `dir="${options.dir}"` : ""}>${options.textarea ? esc(value ?? "") : ""}</${tag}></label>`;
  };
  const select = (label, key, value, entries) => `<label class="hp-field"><span>${esc(label)}</span><select data-hp="${esc(key)}">${entries.map(([id, name]) => `<option value="${esc(id)}" ${String(value) === String(id) ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label>`;
  const toggle = (label, key, checked) => `<label class="hp-toggle"><input data-hp="${esc(key)}" type="checkbox" ${checked ? "checked" : ""} /><span>${esc(label)}</span></label>`;
  const tabs = () => [["hero", "الواجهة الرئيسية"], ["background", "الخلفية والقوالب"], ["logo", "الشعار"], ["stats", "الإحصائيات"], ["services", "الخدمات"], ["sections", "الأقسام والترتيب"], ["motion", "الحركة والمعاينة"]].map(([id, label], index) => `<button type="button" class="hp-tab ${index === 0 ? "active" : ""}" data-hp-tab="${id}">${label}</button>`).join("");
  const imageControl = (label, key, value, hint) => `<div class="hp-image-control"><span>${esc(label)}</span><div class="hp-image-line"><img data-hp-image="${esc(key)}" src="${esc(value || "")}" alt="" ${value ? "" : "hidden"}/><p data-hp-image-placeholder="${esc(key)}" ${value ? "hidden" : ""}>${esc(hint)}</p></div><div class="row-actions"><button class="btn btn-outline btn-small" type="button" data-hp-upload="${esc(key)}">رفع صورة من الجهاز</button><button class="btn btn-outline btn-small" type="button" data-hp-clear-image="${esc(key)}">حذف الصورة</button><input data-hp-file="${esc(key)}" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden /></div></div>`;

  function heroPanel(config) {
    const hero = config.hero;
    const buttons = hero.buttons.map((button, index) => `<article class="hp-button-card" draggable="true" data-hp-button-index="${index}"><div class="hp-card-head"><b>زر ${index + 1}</b><span class="hp-drag">↕ اسحب للترتيب</span></div><div class="hp-grid">${field("نص الزر", `hero.buttons.${index}.label`, button.label)}${select("الوجهة", `hero.buttons.${index}.link`, button.link, [["whatsapp", "واتساب"], ["/services", "الخدمات"], ["/assignment", "تسليم واجب"], ["/contact", "اتصل بنا"], ["/subscriptions", "الاشتراكات"], ["#custom", "رابط مخصص"]])}${button.link === "#custom" ? field("الرابط", `hero.buttons.${index}.customLink`, button.customLink || "", { dir: "ltr" }) : ""}${select("شكل الزر", `hero.buttons.${index}.style`, button.style, [["square", "مربع"], ["rounded", "مستدير"], ["round", "دائري"], ["glass", "زجاجي"], ["gradient", "متدرج"], ["luxury", "فاخر"], ["outline", "حدودي"], ["three-d", "ثلاثي الأبعاد"]])}${field("لون الزر", `hero.buttons.${index}.color`, button.color, { type: "color" })}${field("لون النص", `hero.buttons.${index}.textColor`, button.textColor, { type: "color" })}${select("الحجم", `hero.buttons.${index}.size`, button.size, [["small", "صغير"], ["medium", "متوسط"], ["large", "كبير"]])}${field("استدارة الحافة", `hero.buttons.${index}.radius`, button.radius, { type: "number", min: 0, max: 50 })}${select("الظل", `hero.buttons.${index}.shadow`, button.shadow, [["none", "بدون"], ["soft", "ناعم"], ["strong", "قوي"]])}${select("الحركة", `hero.buttons.${index}.animation`, button.animation, [["none", "بدون"], ["pulse", "نبض"], ["float", "عائم"], ["glow", "توهج"]])}</div>${toggle("إظهار الزر للزوار", `hero.buttons.${index}.visible`, button.visible)}</article>`).join("");
    return `<section class="hp-panel active" data-hp-panel="hero"><div class="hp-section-intro"><h3>تحكم كامل في الواجهة الرئيسية</h3><p>عدّل النصوص والصورة والأزرار مباشرة؛ التغييرات تظهر في المعاينة قبل الحفظ.</p></div><div class="hp-grid">${field("العنوان الرئيسي", "hero.title", hero.title)}${field("العنوان الفرعي", "hero.subtitle", hero.subtitle)}${field("الوصف", "hero.description", hero.description, { textarea: true })}${field("نص إضافي / شارة الجودة", "hero.additionalText", hero.additionalText, { textarea: true })}${select("قالب Hero", "hero.template", hero.template, [["classic", "كلاسيكي"], ["modern", "عصري"], ["luxury", "فاخر"], ["academic", "أكاديمي"], ["glass", "زجاجي Glass"], ["gradient", "متدرج"], ["side-image", "صورة جانبية"], ["background-image", "صورة خلفية"], ["minimal", "بسيط"], ["professional", "احترافي"]])}${select("محاذاة النص", "hero.align", hero.align, [["center", "توسيط"], ["right", "يمين"], ["left", "يسار"]])}${field("لون العنوان", "hero.headingColor", hero.headingColor, { type: "color" })}${field("لون النص", "hero.textColor", hero.textColor, { type: "color" })}${select("نوع الخط", "hero.fontFamily", hero.fontFamily, [["Cairo", "Cairo"], ["Tajawal", "Tajawal"], ["Almarai", "Almarai"], ["Arial", "Arial"]])}${select("وزن الخط", "hero.fontWeight", hero.fontWeight, [["400", "عادي"], ["500", "متوسط"], ["700", "عريض"], ["800", "ثقيل"]])}${field("حجم العنوان", "hero.titleSize", hero.titleSize, { type: "number", min: 24, max: 84 })}${field("حجم الوصف", "hero.descriptionSize", hero.descriptionSize, { type: "number", min: 12, max: 32 })}${field("المسافة بين العناصر", "hero.spacing", hero.spacing, { type: "number", min: 0, max: 80 })}</div>${imageControl("صورة Hero", "hero.imageUrl", hero.imageUrl, "ارفع صورة من هاتفك أو جهازك؛ لا تحتاج إلى رابط.")}<div class="hp-grid">${toggle("إظهار صورة Hero", "hero.imageVisible", hero.imageVisible)}${select("موضع الصورة", "hero.imagePosition", hero.imagePosition, [["side", "جانبية"], ["background", "خلفية"], ["top", "أعلى"]])}</div><div class="hp-subhead"><h4>أزرار Hero</h4><p>يمكنك سحب الأزرار لتغيير ترتيبها.</p></div><div class="hp-button-list">${buttons}</div></section>`;
  }

  function backgroundPanel(config) {
    const bg = config.background;
    return `<section class="hp-panel" data-hp-panel="background"><div class="hp-section-intro"><h3>الخلفية والقوالب</h3><p>اختَر نمطاً جاهزاً أو خصّص الألوان والصورة وطبقتها الشفافة.</p></div><div class="hp-template-grid">${[["classic", "الكلاسيكي"], ["modern", "حديث"], ["academic", "أكاديمي"], ["luxury", "فاخر"], ["simple", "بسيط"], ["gradient", "متدرج"], ["image", "صورة"], ["animated", "متحرك"]].map(([id, label]) => `<button type="button" class="hp-template hp-bg-${id} ${bg.type === id ? "selected" : ""}" data-hp-bg-template="${id}"><span></span><b>${label}</b></button>`).join("")}</div><div class="hp-grid">${select("نوع الخلفية", "background.type", bg.type, [["classic", "خلفية كلاسيكية"], ["simple", "لون واحد"], ["gradient", "لونان متدرجان"], ["multi", "تدرج متعدد الألوان"], ["image", "صورة"], ["overlay", "صورة بطبقة شفافة"], ["animated", "خلفية متحركة"], ["luxury", "فاخرة"], ["academic", "أكاديمية"], ["modern", "حديثة"]])}${field("اللون الأول", "background.color1", bg.color1, { type: "color" })}${field("اللون الثاني", "background.color2", bg.color2, { type: "color" })}${field("اللون الثالث", "background.color3", bg.color3, { type: "color" })}${select("اتجاه التدرج", "background.direction", bg.direction, [["0deg", "أفقي"], ["90deg", "عمودي"], ["135deg", "مائل"], ["45deg", "قطري"]])}${field("شفافية طبقة الصورة %", "background.opacity", bg.opacity, { type: "number", min: 0, max: 100 })}${field("درجة التعتيم %", "background.dim", bg.dim, { type: "number", min: 0, max: 100 })}${select("حجم الصورة", "background.imageSize", bg.imageSize, [["cover", "تغطية"], ["contain", "احتواء"], ["auto", "الحجم الطبيعي"]])}${select("موضع الصورة", "background.imagePosition", bg.imagePosition, [["center", "توسيط"], ["top", "أعلى"], ["bottom", "أسفل"], ["right", "يمين"], ["left", "يسار"]])}${select("تكرار الصورة", "background.imageRepeat", bg.imageRepeat, [["no-repeat", "بدون تكرار"], ["repeat", "تكرار"], ["repeat-x", "أفقي"], ["repeat-y", "عمودي"]])}${toggle("حركة لطيفة للخلفية", "background.animated", bg.animated)}</div>${imageControl("صورة الخلفية", "background.imageUrl", bg.imageUrl, "ارفع صورة خلفية من الجهاز مباشرة.")}</section>`;
  }

  function logoPanel(config) {
    const logo = config.logo;
    return `<section class="hp-panel" data-hp-panel="logo"><div class="hp-section-intro"><h3>شعار الصفحة الرئيسية</h3><p>هذه الإعدادات تخص الشعار الظاهر داخل Hero فقط ولا تعدّل شعار الترويسة العامة.</p></div>${imageControl("شعار Hero", "logo.url", logo.url, "ارفع شعاراً جديداً أو استبدله من جهازك.")}<div class="hp-grid">${toggle("إظهار الشعار", "logo.visible", logo.visible)}${field("العرض", "logo.width", logo.width, { type: "number", min: 28, max: 260 })}${field("الارتفاع", "logo.height", logo.height, { type: "number", min: 28, max: 260 })}${select("موضع الشعار", "logo.position", logo.position, [["center", "توسيط"], ["right", "يمين"], ["left", "يسار"]])}</div></section>`;
  }

  function statsPanel(config) {
    const cards = config.stats.map((item, index) => `<article class="hp-stat-card" data-hp-stat-index="${index}" draggable="true"><div class="hp-card-head"><b>إحصائية ${index + 1}</b><div><button class="btn btn-outline btn-small" type="button" data-hp-stat-move="${index}:up">↑</button><button class="btn btn-outline btn-small" type="button" data-hp-stat-move="${index}:down">↓</button><button class="btn btn-danger btn-small" type="button" data-hp-stat-delete="${index}">حذف</button></div></div><div class="hp-grid">${field("الرقم", `stats.${index}.number`, item.number)}${field("العنوان", `stats.${index}.title`, item.title)}${field("الأيقونة أو الرمز", `stats.${index}.icon`, item.icon || "✦")}${field("اللون", `stats.${index}.color`, item.color || "#1d6cbd", { type: "color" })}</div>${toggle("إظهار الإحصائية", `stats.${index}.visible`, item.visible !== false)}</article>`).join("");
    return `<section class="hp-panel" data-hp-panel="stats"><div class="hp-section-intro"><h3>إحصائيات الصفحة</h3><p>أضف عدداً غير محدود من الإحصائيات، ثم اسحبها أو حرّكها لتغيير الترتيب.</p></div><div class="row-actions"><button class="btn" type="button" data-hp-add-stat>+ إضافة إحصائية</button>${toggle("إظهار قسم الإحصائيات", "sections.stats.visible", config.sections.find(section => section.id === "stats")?.visible)}</div><div class="hp-stat-list">${cards || `<div class="hp-empty">لا توجد إحصائيات بعد. أضف أول إحصائية من الزر أعلاه.</div>`}</div></section>`;
  }

  function servicesPanel(config) {
    const services = config.services;
    const available = Array.isArray(getAdmin()?.getContent("services")) ? getAdmin().getContent("services") : [];
    const selected = new Set(services.selectedIds || []);
    return `<section class="hp-panel" data-hp-panel="services"><div class="hp-section-intro"><h3>عرض الخدمات في الصفحة الرئيسية</h3><p>يتم استخدام الخدمات الفعلية الموجودة في الموقع؛ لا يؤدي هذا القسم إلى حذفها أو تعديلها.</p></div><div class="hp-grid">${field("عنوان القسم", "services.title", services.title)}${field("وصف القسم", "services.description", services.description, { textarea: true })}${field("عدد الخدمات الظاهرة", "services.limit", services.limit, { type: "number", min: 1, max: Math.max(1, available.length || 12) })}${select("قالب العرض", "services.layout", services.layout, [["grid", "شبكة"], ["large", "بطاقات كبيرة"], ["small", "بطاقات صغيرة"], ["horizontal", "أفقي"], ["vertical", "عمودي"], ["glass", "بطاقات زجاجية"], ["animated", "بطاقات متحركة"], ["luxury", "تصميم فاخر"]])}${select("شكل البطاقة", "services.cardStyle", services.cardStyle, [["soft", "ناعم"], ["outline", "بإطار"], ["glass", "زجاجي"], ["flat", "مسطح"], ["luxury", "فاخر"]])}${field("لون البطاقة", "services.cardColor", services.cardColor, { type: "color" })}${field("لون الإطار", "services.borderColor", services.borderColor, { type: "color" })}${select("الظل", "services.shadow", services.shadow, [["none", "بدون"], ["soft", "ناعم"], ["strong", "قوي"]])}${select("حجم البطاقات", "services.size", services.size, [["small", "صغيرة"], ["medium", "متوسطة"], ["large", "كبيرة"]])}${field("لون عنوان القسم", "services.titleColor", services.titleColor, { type: "color" })}${toggle("إظهار قسم الخدمات", "sections.services.visible", config.sections.find(section => section.id === "services")?.visible)}</div><div class="hp-picker"><b>اختر الخدمات التي تظهر</b><small>إذا لم تختر خدمة، سيُعرض العدد المحدد وفق ترتيب الخدمات الحالي.</small><div class="hp-service-checks">${available.map((item, index) => `<label><input type="checkbox" data-hp-service="${esc(String(item.title || index))}" ${selected.has(String(item.title || index)) ? "checked" : ""}/> <span>${esc(item.emoji || "📚")} ${esc(item.title || `خدمة ${index + 1}`)}</span></label>`).join("") || `<p>لا توجد خدمات متاحة حالياً.</p>`}</div></div></section>`;
  }

  function sectionsPanel(config) {
    return `<section class="hp-panel" data-hp-panel="sections"><div class="hp-section-intro"><h3>إظهار وترتيب الأقسام</h3><p>اسحب القسم أو استخدم الأسهم؛ لا يمكن حذف أي قسم من هذه القائمة.</p></div><div class="hp-section-list">${config.sections.map((section, index) => `<article class="hp-section-row" draggable="true" data-hp-section-index="${index}"><span class="hp-drag">⠿</span><b>${esc(section.label)}</b><span class="status ${section.visible ? "" : "hidden"}">${section.visible ? "ظاهر" : "مخفي"}</span><div><button class="btn btn-outline btn-small" type="button" data-hp-section-move="${index}:up">↑</button><button class="btn btn-outline btn-small" type="button" data-hp-section-move="${index}:down">↓</button><button class="btn btn-soft btn-small" type="button" data-hp-section-toggle="${index}">${section.visible ? "إخفاء" : "إظهار"}</button></div></article>`).join("")}</div><div class="hp-title-editor"><h4>عناوين الأقسام الإضافية</h4><p>تخصيص النص واللون والخط والمحاذاة للأقسام التي تختار إظهارها.</p><div class="hp-grid">${field("عنوان المميزات", "features.title", config.features.title)}${field("وصف المميزات", "features.description", config.features.description, { textarea: true })}${toggle("إظهار المميزات", "sections.features.visible", config.sections.find(section => section.id === "features")?.visible)}${field("عنوان CTA", "cta.title", config.cta.title)}${field("وصف CTA", "cta.description", config.cta.description, { textarea: true })}${field("نص زر CTA", "cta.buttonLabel", config.cta.buttonLabel)}${select("رابط زر CTA", "cta.buttonLink", config.cta.buttonLink, [["whatsapp", "واتساب"], ["/services", "الخدمات"], ["/assignment", "تسليم واجب"], ["/contact", "اتصل بنا"]])}${toggle("إظهار CTA", "sections.cta.visible", config.sections.find(section => section.id === "cta")?.visible)}</div></div></section>`;
  }

  function motionPanel(config) {
    const hero = config.hero;
    return `<section class="hp-panel" data-hp-panel="motion"><div class="hp-section-intro"><h3>الحركة والمعاينة</h3><p>اختَر حركة الواجهة، ثم راجع النتيجة قبل الحفظ.</p></div><div class="hp-grid">${select("نوع الحركة", "hero.animation", hero.animation, [["none", "بدون"], ["fade", "Fade"], ["fade-up", "Fade Up"], ["fade-down", "Fade Down"], ["fade-left", "Fade Left"], ["fade-right", "Fade Right"], ["zoom", "Zoom"], ["bounce", "Bounce"], ["float", "Float"], ["slide", "Slide"], ["rotate", "Rotate"], ["pulse", "Pulse"], ["glow", "Glow"]])}${field("سرعة الحركة (مللي ثانية)", "hero.animationSpeed", hero.animationSpeed, { type: "number", min: 120, max: 4000 })}${field("تأخير الحركة (مللي ثانية)", "hero.animationDelay", hero.animationDelay, { type: "number", min: 0, max: 3000 })}${select("تكرار الحركة", "hero.animationRepeat", hero.animationRepeat, [["once", "مرة واحدة"], ["infinite", "باستمرار"]])}</div><div class="hp-live-preview" data-hp-preview></div><div class="row-actions"><button type="button" class="btn btn-outline" data-hp-preview-page>معاينة الصفحة</button><a class="btn btn-outline" href="/" target="_blank" rel="noopener">👤 عرض الموقع كزائر</a></div></section>`;
  }

  function view() {
    const config = draft || current();
    return `<section class="workspace homepage-manager"><div class="workspace-head"><div><h2>🏠 إدارة الصفحة الرئيسية</h2><p>تحكم مرئي كامل في Hero والخلفيات والشعار والإحصائيات والخدمات وترتيب الأقسام، دون كتابة أي كود.</p></div><span class="hp-save-state" data-hp-save-state>تعديلات غير محفوظة</span></div><div class="hp-tabs">${tabs()}</div><form class="homepage-manager-form" data-homepage-manager novalidate>${heroPanel(config)}${backgroundPanel(config)}${logoPanel(config)}${statsPanel(config)}${servicesPanel(config)}${sectionsPanel(config)}${motionPanel(config)}<div class="row-actions hp-footer-actions"><button class="btn" type="submit">حفظ التغييرات</button><button class="btn btn-outline" type="button" data-hp-cancel>إلغاء التغييرات</button><button class="btn btn-outline" type="button" data-hp-reset>إعادة إعدادات هذا القسم</button><a class="btn btn-outline" href="/" target="_blank" rel="noopener">👤 عرض الموقع كزائر</a></div></form></section>`;
  }

  function pathSet(target, key, value) {
    const parts = key.split("."); let ref = target;
    parts.forEach((part, index) => { if (index === parts.length - 1) ref[part] = value; else { if (!ref[part] || typeof ref[part] !== "object") ref[part] = /^\d+$/.test(parts[index + 1]) ? [] : {}; ref = ref[part]; } });
  }
  function valueOf(input) { if (input.type === "checkbox") return input.checked; if (input.type === "number") return Number(input.value || 0); return input.value; }
  function readDraft(form) { form.querySelectorAll("[data-hp]").forEach(input => pathSet(draft, input.dataset.hp, valueOf(input))); }
  function section(id) { return draft.sections.find(item => item.id === id); }
  function move(list, index, next) { if (next < 0 || next >= list.length) return; [list[index], list[next]] = [list[next], list[index]]; }
  function previewHtml() {
    const c = draft || current(); const h = c.hero; const bg = c.background;
    const background = bg.imageUrl && ["image", "overlay"].includes(bg.type) ? `linear-gradient(rgba(0,0,0,${Number(bg.dim || 0) / 100}),rgba(0,0,0,${Number(bg.dim || 0) / 100})),url('${String(bg.imageUrl).replace(/["']/g, "")}') center/${bg.imageSize}` : `linear-gradient(${bg.direction},${bg.color1},${bg.color2},${bg.color3})`;
    return `<div class="hp-preview-device"><div class="hp-preview-hero hp-preview-template-${esc(h.template)}" style="background:${esc(background)};color:${esc(h.textColor)};text-align:${esc(h.align)};font-family:${esc(h.fontFamily)}"><span>معاينة حية</span>${c.logo.visible && (c.logo.url || h.imageUrl) ? `<img src="${esc(c.logo.url || h.imageUrl)}" alt="شعار" style="width:${Number(c.logo.width)}px;height:${Number(c.logo.height)}px"/>` : ""}<h2 style="color:${esc(h.headingColor)};font-size:${Number(h.titleSize) / 2}px">${esc(h.title)}</h2><b>${esc(h.subtitle)}</b><p style="font-size:${Number(h.descriptionSize)}px">${esc(h.description)}</p><div>${h.buttons.filter(button => button.visible).map(button => `<i style="background:${esc(button.color)};color:${esc(button.textColor)};border-radius:${Number(button.radius)}px">${esc(button.label)}</i>`).join("")}</div></div></div>`;
  }
  function updatePreview() { document.querySelectorAll("[data-hp-preview]").forEach(node => { node.innerHTML = previewHtml(); }); }
  function rerender() { const body = document.querySelector("#admin-root"); if (!body) return; const workspace = document.querySelector(".homepage-manager"); if (!workspace) return; workspace.outerHTML = view(); updatePreview(); }
  async function save() { const admin = getAdmin(); if (!admin) return; const settings = getSettings(); try { const state = document.querySelector("[data-hp-save-state]"); if (state) state.textContent = "جارٍ الحفظ…"; await admin.saveCollection("siteSettings", { ...settings, homePageConfig: draft }); const saved = document.querySelector("[data-hp-save-state]"); if (saved) saved.textContent = "تم الحفظ في قاعدة البيانات"; admin.toast("تم حفظ إعدادات الصفحة الرئيسية وتطبيقها على الزوار."); } catch (error) { admin.toast(error instanceof Error ? error.message : "تعذر حفظ إعدادات الصفحة الرئيسية"); } }

  function bind() {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-hp-tab],[data-hp-upload],[data-hp-clear-image],[data-hp-add-stat],[data-hp-stat-delete],[data-hp-stat-move],[data-hp-section-move],[data-hp-section-toggle],[data-hp-cancel],[data-hp-reset],[data-hp-preview-page],[data-hp-bg-template]");
      if (!button || !document.querySelector(".homepage-manager")) return;
      if (button.dataset.hpTab) { document.querySelectorAll(".hp-tab").forEach(item => item.classList.toggle("active", item === button)); document.querySelectorAll(".hp-panel").forEach(item => item.classList.toggle("active", item.dataset.hpPanel === button.dataset.hpTab)); return; }
      if (button.dataset.hpUpload) { document.querySelector(`[data-hp-file="${CSS.escape(button.dataset.hpUpload)}"]`)?.click(); return; }
      if (button.dataset.hpClearImage) { pathSet(draft, button.dataset.hpClearImage, ""); rerender(); return; }
      if (button.dataset.hpAddStat !== undefined) { draft.stats.push({ number: "0", title: "إحصائية جديدة", icon: "✦", color: "#1d6cbd", visible: true }); rerender(); return; }
      if (button.dataset.hpStatDelete !== undefined) { draft.stats.splice(Number(button.dataset.hpStatDelete), 1); rerender(); return; }
      if (button.dataset.hpStatMove) { const [index, direction] = button.dataset.hpStatMove.split(":"); move(draft.stats, Number(index), direction === "up" ? Number(index) - 1 : Number(index) + 1); rerender(); return; }
      if (button.dataset.hpSectionMove) { const [index, direction] = button.dataset.hpSectionMove.split(":"); move(draft.sections, Number(index), direction === "up" ? Number(index) - 1 : Number(index) + 1); rerender(); return; }
      if (button.dataset.hpSectionToggle !== undefined) { const item = draft.sections[Number(button.dataset.hpSectionToggle)]; if (item) item.visible = !item.visible; rerender(); return; }
      if (button.dataset.hpCancel !== undefined) { draft = current(); rerender(); return; }
      if (button.dataset.hpReset !== undefined) { if (window.confirm("هل أنت متأكد من إعادة الإعدادات؟ سيعود قسم الصفحة الرئيسية إلى التصميم الافتراضي الحالي.")) { draft = clone(DEFAULT); rerender(); } return; }
      if (button.dataset.hpPreviewPage !== undefined) { const dialog = document.createElement("div"); dialog.className = "hp-preview-dialog"; dialog.innerHTML = `<div><button type="button" aria-label="إغلاق">×</button>${previewHtml()}<p>هذه معاينة فورية للتعديلات غير المحفوظة. استخدم «حفظ التغييرات» لتطبيقها على الزوار.</p></div>`; dialog.addEventListener("click", e => { if (e.target === dialog || e.target.closest("button")) dialog.remove(); }); document.body.append(dialog); return; }
      if (button.dataset.hpBgTemplate) { const presets = { classic: ["#0f2a62", "#195a9e", "#123b78"], modern: ["#5b4bc4", "#2196d3", "#55c6b7"], academic: ["#123b78", "#2475b7", "#0f8e9a"], luxury: ["#171c3d", "#725223", "#c49a43"], simple: ["#123b78", "#123b78", "#123b78"], gradient: ["#234fab", "#7e50c5", "#f1a05a"], image: ["#123b78", "#2c5ea6", "#5e93c9"], animated: ["#114881", "#4c39ae", "#14a19a"] }; draft.background.type = button.dataset.hpBgTemplate; [draft.background.color1, draft.background.color2, draft.background.color3] = presets[button.dataset.hpBgTemplate] || presets.classic; draft.background.animated = button.dataset.hpBgTemplate === "animated"; rerender(); }
    });
    document.addEventListener("input", event => { const input = event.target; if (!input.matches?.("[data-hp]")) return; readDraft(input.closest("form")); updatePreview(); });
    document.addEventListener("change", event => {
      const input = event.target;
      if (input.matches?.("[data-hp-file]")) { const file = input.files?.[0]; if (!file || !getAdmin()) return; if (file.size > 3 * 1024 * 1024) { getAdmin().toast("يجب ألا يتجاوز حجم الصورة 3 ميغابايت"); input.value = ""; return; } getAdmin().uploadImage(file).then(result => { pathSet(draft, input.dataset.hpFile, result.url); rerender(); getAdmin().toast("تم رفع الصورة. احفظ التغييرات لتطبيقها."); }).catch(error => getAdmin().toast(error instanceof Error ? error.message : "تعذر رفع الصورة")); return; }
      if (input.matches?.("[data-hp-service]")) { const id = input.dataset.hpService; const list = new Set(draft.services.selectedIds || []); input.checked ? list.add(id) : list.delete(id); draft.services.selectedIds = [...list]; updatePreview(); return; }
      if (input.matches?.("[data-hp]")) { readDraft(input.closest("form")); updatePreview(); }
    });
    document.addEventListener("submit", event => { const form = event.target; if (!form.matches?.("[data-homepage-manager]")) return; event.preventDefault(); readDraft(form); void save(); });
    document.addEventListener("dragstart", event => { const item = event.target.closest?.("[data-hp-section-index]"); if (item) { draggedSection = Number(item.dataset.hpSectionIndex); event.dataTransfer.effectAllowed = "move"; } });
    document.addEventListener("dragover", event => { if (event.target.closest?.("[data-hp-section-index]")) event.preventDefault(); });
    document.addEventListener("drop", event => { const target = event.target.closest?.("[data-hp-section-index]"); if (!target || draggedSection === null) return; event.preventDefault(); const to = Number(target.dataset.hpSectionIndex); const [item] = draft.sections.splice(draggedSection, 1); draft.sections.splice(to, 0, item); draggedSection = null; rerender(); });
  }

  function register() {
    const original = window.WajbatStructuredEditor;
    if (!original || original.__homepageManager) return;
    draft = current();
    window.WajbatStructuredEditor = { ...original, __homepageManager: true, workspace: key => key === "homePage" ? view() : original.workspace(key) };
    bind();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", register); else register();
})();
