import { SITE_CONFIG } from "./config.js";
import { saveRecord, recordCloudVisit } from "./supabase.js";
import {
  ARTICLES as INITIAL_ARTICLES, FAQS as INITIAL_FAQS, INSTITUTES as INITIAL_INSTITUTES,
  OTHERS as INITIAL_OTHERS, PLANS as INITIAL_PLANS, REVIEWS as INITIAL_REVIEWS,
  SERVICE_TYPES as INITIAL_SERVICE_TYPES, SERVICES as INITIAL_SERVICES,
  SERVICE_SUBS as INITIAL_SERVICE_SUBS, UNIVERSITIES as INITIAL_UNIVERSITIES,
} from "../../pages/content.js";

let ARTICLES = INITIAL_ARTICLES;
let FAQS = INITIAL_FAQS;
let INSTITUTES = INITIAL_INSTITUTES;
let OTHERS = INITIAL_OTHERS;
let PLANS = INITIAL_PLANS;
let REVIEWS = INITIAL_REVIEWS;
let SERVICE_TYPES = INITIAL_SERVICE_TYPES;
let SERVICES = INITIAL_SERVICES;
let SERVICE_SUBS = INITIAL_SERVICE_SUBS;
let UNIVERSITIES = INITIAL_UNIVERSITIES;
let logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663266205125/c9haZQXaJt4uRTkEadgd4A/photo_AQAD7w1rG_fAmFJ-_4841a962.jpg";
let siteSettings = {};
let socialLinks = { facebook: "", instagram: "", twitter: "", youtube: "" };
let managedAboutContent = null;
let managedTeamMembers = null;
const state = { sidebar: false, servicesOpen: false, selectedService: null, article: null };

const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const wa = (message = "") => `https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
const link = (path, label, className = "") => `<a class="${className}" href="#${path}">${label}</a>`;
const icon = (emoji) => `<span aria-hidden="true">${emoji}</span>`;

function isoDay(date = new Date()) { return date.toISOString().slice(0, 10); }
function recordVisit() {
  recordCloudVisit(currentPath()).catch(() => {});
  void rpcMutation("site.trackVisit", { path: currentPath() }).catch(() => {});
}
function recordContentView(path) {
  void rpcMutation("site.trackVisit", { path }).catch(() => {});
}
function toast(title, description = "") {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `<strong>${esc(title)}</strong><p>${esc(description)}</p>`;
  region.appendChild(item);
  setTimeout(() => item.remove(), 4500);
}
function currentPath() {
  const raw = location.hash.replace(/^#/, "").split("?")[0] || "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}
function queryParams() {
  const raw = location.hash.replace(/^#/, "").split("?")[1] || "";
  return new URLSearchParams(raw);
}
function go(path) { location.hash = path; }

async function rpcQuery(procedure, input = null) {
  const query = encodeURIComponent(JSON.stringify({ json: input }));
  const response = await fetch(`/api/trpc/${procedure}?input=${query}`, { credentials: "same-origin" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.json?.message || "تعذر الاتصال بالخادم");
  return payload?.result?.data?.json ?? payload?.result?.data;
}

async function rpcMutation(procedure, input) {
  const response = await fetch(`/api/trpc/${procedure}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.json?.message || "تعذر حفظ البيانات، يرجى المحاولة مرة أخرى.");
  return payload?.result?.data?.json ?? payload?.result?.data;
}

function applyManagedContent(content) {
  if (!content || typeof content !== "object") return;
  const visible = (items) => Array.isArray(items) ? items.filter((item) => item?.isVisible !== false) : [];
  if (Array.isArray(content.services)) {
    const services = visible(content.services).sort((a, b) => a.sortOrder - b.sortOrder);
    SERVICES = services.map((service, id) => ({ id, emoji: service.emoji, title: service.title, items: service.items || [] }));
    SERVICE_SUBS = services.map((service) => service.title);
    SERVICE_TYPES = services.flatMap((service) => service.items || []);
  }
  if (Array.isArray(content.plans)) PLANS = visible(content.plans).sort((a, b) => a.sortOrder - b.sortOrder).map((plan) => ({ ...plan, features: plan.features || [], popular: Boolean(plan.popular) }));
  if (Array.isArray(content.reviews)) REVIEWS = visible(content.reviews).sort((a, b) => a.sortOrder - b.sortOrder).map((review) => ({ name: review.name, uni: review.university, text: review.body, rating: review.rating || 5 }));
  if (Array.isArray(content.articles)) ARTICLES = visible(content.articles).sort((a, b) => a.sortOrder - b.sortOrder).map((article, id) => ({ id: id + 1, title: article.title, category: article.category, date: article.publishedText, summary: article.summary, content: article.body }));
  if (Array.isArray(content.faqs)) FAQS = visible(content.faqs).sort((a, b) => a.sortOrder - b.sortOrder).map((faq) => ({ q: faq.question, a: faq.answer }));
  if (Array.isArray(content.partners)) {
    const partners = visible(content.partners).sort((a, b) => a.sortOrder - b.sortOrder);
    UNIVERSITIES = partners.filter((item) => item.kind === "جامعة").map((item) => item.name);
    INSTITUTES = partners.filter((item) => item.kind === "معهد").map((item) => item.name);
    OTHERS = partners.filter((item) => item.kind === "جهة تعليمية").map((item) => item.name);
  }
  if (Array.isArray(content.downloads)) files = visible(content.downloads).sort((a, b) => a.categoryOrder - b.categoryOrder).map((category) => [
    category.emoji, category.title,
    visible(category.items).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => [item.name, item.remoteFile]),
  ]);
  if (content.aboutContent && typeof content.aboutContent === "object") managedAboutContent = content.aboutContent;
  if (Array.isArray(content.teamMembers)) managedTeamMembers = visible(content.teamMembers).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  siteSettings = content.siteSettings || {};
  socialLinks = { facebook: siteSettings.facebook || "", instagram: siteSettings.instagram || "", twitter: siteSettings.twitter || "", youtube: siteSettings.youtube || "" };
  logoUrl = siteSettings.logoUrl || logoUrl;
  fileBase = siteSettings.fileBaseUrl || fileBase;
  if (siteSettings.whatsapp) SITE_CONFIG.whatsapp = siteSettings.whatsapp;
  contactItems = [
    ["◉", "واتساب", siteSettings.phone || "+966 56 768 0470", wa()],
    ["☎", "جوال", siteSettings.phone || "+966 56 768 0470", `tel:${(siteSettings.phone || "+966567680470").replace(/\s/g, "")}`],
    ["✉", "البريد الإلكتروني", siteSettings.email || "wajbatbls@gmail.com", `mailto:${siteSettings.email || "wajbatbls@gmail.com"}`],
    ["◷", "ساعات العمل", siteSettings.businessHours || "متواجدون 24/7", ""],
    ["⌖", "العنوان", siteSettings.address || "الرياض، المملكة العربية السعودية", ""],
  ];
  syncSeoMetadata();
}

function syncSeoMetadata() {
  const title = String(siteSettings.metaTitle || "واجبات بلس | منصتك الذكية للتعلم والتفوق").trim();
  const description = String(siteSettings.metaDescription || "منصة واجبات بلس للخدمات الأكاديمية والدعم التعليمي.").trim();
  document.title = title;
  const setMeta = (selector, attribute, value) => {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement("meta");
      const [name, key] = attribute;
      element.setAttribute(name, key);
      document.head.appendChild(element);
    }
    element.setAttribute("content", value);
  };
  setMeta('meta[name="description"]', ["name", "description"], description);
  setMeta('meta[property="og:title"]', ["property", "og:title"], title);
  setMeta('meta[property="og:description"]', ["property", "og:description"], description);
}

function logoMarkup(className = "brand-mark") {
  return `<span class="${className}"><img src="${logoUrl}" alt="واجبات بلس" onerror="this.remove();this.parentElement.textContent='و';" /></span>`;
}

function header() {
  return `<div class="ticker"><span>${esc(siteSettings.tickerText || "مرحباً بكم في واجبات بلس ⭐ نقدم أفضل الخدمات الأكاديمية ⭐ تواصل معنا على واتساب +966567680470")}</span></div>
    <header class="site-header">
      <div class="header-actions">
        <button class="btn-icon" data-action="toggle-sidebar" aria-label="فتح القائمة">☰</button>
        <a class="brand" href="#/">${logoMarkup()}<span><span class="brand-title">واجبات بلس</span><span class="brand-subtitle">منصتك الذكية للتعلم</span></span></a>
      </div>
      <div class="header-actions">
        <button class="btn-icon" data-action="toggle-theme" aria-label="تغيير الوضع">${document.body.classList.contains("dark") ? "☀" : "☾"}</button>
        <a class="whatsapp-link" href="${wa()}" target="_blank" rel="noopener">◉ <span>واتساب</span></a>
      </div>
    </header>`;
}

function sidebar() {
  const path = currentPath();
  const items = [
    ["/", "🏠", "الرئيسية"], ["/services", "📚", "الخدمات"], ["/subscriptions", "📦", "الاشتراكات"],
    ["/downloads", "📥", "التحميلات"], ["/testimonials", "💬", "آراء الطلاب"], ["/blog", "📝", "المدونة"],
    ["/faq", "❓", "الأسئلة الشائعة"], ["/assignment", "📤", "تسليم الواجب"], ["/contact", "📞", "اتصل بنا"],
    ["/about", "ℹ️", "من نحن"], ["/partners", "🌐", "الشركاء"],
  ];
  const serviceSubs = state.servicesOpen ? `<div class="nav-sub open">${SERVICE_SUBS.map((item, i) => link(`/services?category=${i}`, `• ${item}`)).join("")}</div>` : "";
  return `<div class="sidebar-backdrop ${state.sidebar ? "open" : ""}" data-action="close-sidebar"></div>
    <aside class="sidebar ${state.sidebar ? "open" : ""}">
      <div class="sidebar-head"><a class="brand" href="#/">${logoMarkup()}<span><span class="brand-title">واجبات بلس</span><span class="brand-subtitle">Wajibat Plus</span></span></a><button class="btn-icon" data-action="close-sidebar">×</button></div>
      <nav class="sidebar-nav">${items.map(([href, emoji, label]) => {
        const active = path === href;
        const row = `<a class="nav-link ${active ? "active" : ""}" href="#${href}">${icon(emoji)}<span>${label}</span></a>`;
        return href === "/services" ? `<div><div style="display:flex;align-items:center"><span style="flex:1">${row}</span><button class="btn-icon" data-action="toggle-services">⌄</button></div>${serviceSubs}</div>` : row;
      }).join("")}</nav>
      <div class="sidebar-foot"><strong style="color:var(--primary)">واجبات بلس | Wajibat Plus</strong><br />📚🎓 منصتك الذكية للتعلم والتفوق</div>
    </aside>`;
}

function footer() {
  const quick = [["/", "الرئيسية"], ["/services", "الخدمات"], ["/subscriptions", "الاشتراكات"], ["/downloads", "التحميلات"], ["/blog", "المدونة"], ["/faq", "الأسئلة الشائعة"], ["/about", "من نحن"], ["/partners", "الشركاء"]];
  const services = ["حل الواجبات الدراسية", "حل التكاليف الجامعية", "إعداد التقارير", "مشاريع التخرج", "التحليل الإحصائي", "البحوث الأكاديمية"];
  return `<footer class="footer"><div class="container footer-grid">
    <div><div class="brand">${logoMarkup()}<span class="brand-title">واجبات بلس</span></div><p>منصة تعليمية سعودية متكاملة تقدم أفضل الخدمات الأكاديمية ودعم الطلاب في حل الواجبات وإعداد البحوث والمشاريع.</p>
      <form class="newsletter" data-form="newsletter"><input type="email" name="email" placeholder="البريد الإلكتروني" required /><button class="btn btn-primary" type="submit">➤</button></form><small class="text-muted">اشترك في النشرة البريدية</small></div>
    <div><h3>روابط سريعة</h3><ul>${quick.map(([path, label]) => `<li>${link(path, `• ${label}`)}</li>`).join("")}</ul></div>
    <div><h3>خدماتنا</h3><ul>${services.map((item) => `<li>${link("/services", `• ${item}`)}</li>`).join("")}</ul></div>
  </div><div class="copyright">© ${new Date().getFullYear()} واجبات بلس — جميع الحقوق محفوظة</div></footer>`;
}

function layout(content) {
  return `${header()}<div class="main-shell">${sidebar()}<main class="page-content">${content}</main>${footer()}</div><button class="back-top" data-action="top" aria-label="العودة للأعلى">↑</button>`;
}

function homePage() {
  const particles = Array.from({ length: 18 }, (_, i) => `<i class="particle" style="width:${40 + (i * 37) % 100}px;height:${40 + (i * 37) % 100}px;left:${(i * 29) % 100}%;top:${(i * 43) % 100}%;animation-delay:${i * -.6}s"></i>`).join("");
  return `<section class="hero"><div class="particles">${particles}</div><div class="hero-rings"></div><div class="hero-inner">
    <div class="clock"><p class="clock-date" id="clock-date"></p><div class="clock-time"><span class="clock-unit" id="clock-hour">00</span><b>:</b><span class="clock-unit" id="clock-minute">00</span><b>:</b><span class="clock-unit" id="clock-second">00</span><span class="clock-ampm" id="clock-ampm">ص</span></div><div class="clock-labels"><span>ساعة</span><span>دقيقة</span><span>ثانية</span></div></div>
    <img class="hero-logo" src="${logoUrl}" alt="واجبات بلس" onerror="this.style.display='none'" />
    <div><h1>واجبات بلس</h1><p class="typing"><span id="typing-text"></span><span class="typing-cursor">|</span></p></div>
    <div class="hero-actions"><a class="btn btn-green" href="${wa("أريد طلب خدمة")}" target="_blank" rel="noopener">🚀 اطلب خدمتك الآن</a>${link("/services", "📚 تصفح الخدمات", "btn btn-outline")}</div>
    <div class="hero-badge">⭐ ضمان الجودة 100% · سرية تامة · دعم 24/7 ⭐</div>
  </div></section>`;
}

function servicesPage() {
  const categoryParam = queryParams().get("category");
  const category = categoryParam === null ? null : Number(categoryParam);
  if (Number.isInteger(category) && SERVICES[category]) state.selectedService = category;
  if (categoryParam === null) state.selectedService = null;
  const active = state.selectedService === null ? null : SERVICES[state.selectedService];
  if (!active) return `<div class="container section"><div class="text-center"><h1 class="page-title">خدماتنا الأكاديمية</h1><p class="page-intro">اختر القسم المطلوب لعرض الخدمات الفرعية المتاحة</p></div><div class="grid grid-5 service-grid">${SERVICES.map((srv) => `<button class="service-card" data-action="select-service" data-service="${srv.id}"><span class="service-emoji">${srv.emoji}</span><h3>${srv.title}</h3></button>`).join("")}</div></div>`;
  return `<div class="container section"><button class="btn btn-outline" data-action="back-services">← العودة للأقسام</button><div class="service-detail-head"><span class="emoji">${active.emoji}</span><div><h2>${active.title}</h2><p class="text-muted">اختر الخدمة المطلوبة واضغط "اطلب الخدمة" للتواصل الفوري</p></div></div><div class="grid">${active.items.map((item, i) => `<div class="card service-item"><div class="service-item-main"><span class="number">${i + 1}</span><span>${item}</span></div><a class="btn btn-green" href="${wa(`أريد طلب خدمة: ${item} (من قسم: ${active.title})`)}" target="_blank" rel="noopener">◉ اطلب الخدمة</a></div>`).join("")}</div><div class="text-center" style="margin-top:2rem"><a class="btn btn-primary" href="${wa(`أريد الاستفسار عن قسم: ${active.title}`)}" target="_blank" rel="noopener">◉ تواصل لجميع خدمات هذا القسم</a></div></div>`;
}

function subscriptionsPage() {
  return `<div class="container section"><div class="text-center"><h1 class="page-title">باقات الاشتراك</h1><p class="page-intro">اختر الباقة المناسبة لاحتياجاتك الأكاديمية واستفد من خدماتنا المستمرة. تواصل معنا عبر واتساب للحصول على السعر المناسب.</p></div><div class="grid grid-5">${PLANS.map((plan) => `<article class="card plan-card ${plan.popular ? "popular" : ""}"><div class="plan-head">${plan.popular ? '<span class="hero-badge" style="display:inline-block;background:var(--primary);color:#fff;border:0">الأكثر طلباً</span>' : ""}<div class="plan-emoji">${plan.emoji}</div><h3>${plan.title}</h3><span class="plan-duration">${plan.duration}</span></div><div class="plan-body"><ul class="check-list">${plan.features.map((f) => `<li>${f}</li>`).join("")}</ul><a class="btn ${plan.popular ? "btn-primary" : "btn-muted"}" href="${wa(`أريد الاشتراك في باقة: ${plan.title} ${plan.emoji}`)}" target="_blank" rel="noopener">◉ اطلب الاشتراك</a></div></article>`).join("")}</div><div class="card card-pad text-center" style="max-width:700px;margin:3rem auto 0;background:linear-gradient(to right,var(--primary-soft),color-mix(in srgb,var(--accent) 8%,transparent))"><h2 class="text-primary">هل تحتاج سعراً مخصصاً؟</h2><p class="text-muted">تواصل معنا مباشرة عبر واتساب وسنقدم لك أفضل عرض يناسب احتياجاتك وميزانيتك.</p><a class="btn btn-green" href="${wa("أريد الاستفسار عن الأسعار والباقات")}" target="_blank" rel="noopener">◉ استفسر عن الأسعار الآن</a></div></div>`;
}

let files = [
  ["📝", "نماذج واجبات", [["نموذج واجب 1", "xBCtuEPnzwmjWUaY.pdf"], ["نموذج واجب 2", "ZQWIFqsYHIosworf.pdf"], ["نموذج واجب 3", "uLgCcgITrWNppCLi.pdf"], ["نموذج واجب 4", "ZNKYWKvxzeBjutAI.pdf"]]],
  ["🖥️", "نماذج عروض بوربوينت", [["عرض تقديمي 1", "HYpjmoxQISxaWmTa.pdf"], ["عرض تقديمي 2", "PCSGNdLiEhfmHkJy.pdf"], ["عرض تقديمي 3", "oFISCrxRecNNNMsU.pdf"], ["عرض تقديمي 4", "AqByvIVrwkpjRLUI.pdf"]]],
  ["👤", "نماذج سيرة ذاتية CV", [["سيرة ذاتية 1", "LGcZWkdZaZEccakJ.pdf"], ["سيرة ذاتية 2", "FTIwhNHHDuZDyfaF.pdf"], ["سيرة ذاتية 3", "LGcZWkdZaZEccakJ.pdf"]]],
  ["💡", "نماذج خرائط ذهنية", [["خريطة ذهنية 1", "tmRNhKXOpXtPGOVA.pdf"], ["خريطة ذهنية 2", "xcBhFMtXpwFeXHSm.pdf"], ["خريطة ذهنية 3", "rXslVZzUshZOuHGO.pdf"]]],
  ["📊", "نماذج جداول بيانات", [["جدول بيانات 1", "QyTGDZEbaZMPFHgq.pdf"], ["جدول بيانات 2", "lDZIJADMXorrEgsE.pdf"]]],
  ["📋", "نماذج تقارير", [["تقرير تدريب 1", "yKCFvIHAFfVHPXNL.pdf"], ["تقرير تدريب 2", "ZGQdWqamjnNVbOTz.pdf"]]],
  ["📚", "نماذج بحوث", [["نموذج بحث 1", "xBCtuEPnzwmjWUaY.pdf"], ["نموذج بحث 2", "ZQWIFqsYHIosworf.pdf"]]],
  ["📄", "نماذج اختبارات", [["نموذج اختبار 1", "uLgCcgITrWNppCLi.pdf"], ["نموذج اختبار 2", "ZNKYWKvxzeBjutAI.pdf"]]],
];
let fileBase = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/";
function downloadsPage() {
  return `<div class="container section"><div class="text-center"><h1 class="page-title">مركز التحميلات</h1><p class="page-intro">مكتبة شاملة من النماذج والملفات الأكاديمية الجاهزة للتحميل والاستخدام المباشر — 8 فئات، مجاناً للجميع.</p></div>${files.map(([emoji, title, items], category) => `<section class="download-section"><div class="section-heading"><span>${emoji}</span><h2>${title}</h2><span class="count">${items.length} ملف</span></div><div class="grid grid-4">${items.map(([name, file], i) => `<div class="card file-card"><div class="file-info"><span class="file-icon">▤</span><div><div class="file-name">${name}</div><div class="file-meta">تحميل: ${100 + ((category + 1) * (i + 3) * 17)}+ مرة</div></div></div><a class="btn btn-outline" style="padding:.4rem .6rem;font-size:.72rem" href="${fileBase + file}" target="_blank" rel="noopener" data-action="track-download" data-download="${encodeURIComponent(name)}">⇩ تحميل</a></div>`).join("")}</div></section>`).join("")}</div>`;
}

function testimonialsPage() {
  return `<div class="container section"><div class="text-center"><h1 class="page-title">آراء طلابنا</h1><p class="page-intro">نفخر بثقة طلابنا ونعتز بتقييماتهم التي تدفعنا لتقديم الأفضل دائماً.</p></div><div class="grid grid-3" style="margin-bottom:4rem">${REVIEWS.map((rev) => `<article class="card review-card"><div class="stars">★★★★★</div><p class="review-text">"${rev.text}"</p><div class="review-author"><span class="avatar">${rev.name.charAt(0)}</span><div><b>${rev.name}</b><small class="text-muted" style="display:block">${rev.uni}</small></div></div></article>`).join("")}</div><div class="card card-pad" style="max-width:700px;margin:auto;background:color-mix(in srgb,var(--muted) 40%,transparent)"><h2 class="text-center">شاركنا رأيك</h2><form data-form="review" class="grid"><div class="grid grid-2"><div class="field"><input name="name" placeholder="الاسم الكريم" required /></div><div class="field"><input name="university" placeholder="الجامعة" required /></div></div><div class="field"><textarea name="review" placeholder="اكتب رأيك هنا..." required></textarea></div><button class="btn btn-primary" type="submit">إرسال التقييم</button></form></div></div>`;
}

function blogPage() {
  const active = new URLSearchParams(location.hash.split("?")[1] || "").get("category") || "الكل";
  const cats = ["الكل", "البحث العلمي", "نصائح دراسية", "مشاريع تخرج"];
  const filtered = active === "الكل" ? ARTICLES : ARTICLES.filter((a) => a.category === active);
  return `<div class="container section"><div class="text-center"><h1 class="page-title">المدونة الأكاديمية</h1><p class="page-intro">مقالات ونصائح قيمة لدعم مسيرتك التعليمية وتطوير مهاراتك.</p></div><div class="category-pills">${cats.map((cat) => `<a class="btn ${cat === active ? "btn-primary" : "btn-outline"}" href="#/blog?category=${encodeURIComponent(cat)}">${cat}</a>`).join("")}</div><div class="grid grid-3">${filtered.map((a) => `<article class="card article-card"><div class="article-cover">▤</div><div class="article-body"><div class="article-meta"><span>◷ ${a.date}</span><span>◈ ${a.category}</span></div><h3>${a.title}</h3><p>${a.summary}</p><button class="btn btn-outline" data-action="open-article" data-article="${a.id}">اقرأ المزيد</button></div></article>`).join("")}</div>${articleModal()}</div>`;
}
function articleModal() {
  if (!state.article) return "";
  const a = state.article;
  return `<div class="modal open" data-action="close-modal"><article class="modal-card" data-modal-card><div class="modal-head"><div><span class="btn btn-muted" style="min-height:auto;padding:.25rem .5rem;font-size:.7rem">${a.category}</span><small class="text-muted" style="display:block;margin-top:.4rem">◷ ${a.date}</small><h2>${a.title}</h2></div><button class="modal-close" data-action="close-modal">×</button></div><div class="modal-content"><p>${a.content}</p><div class="share-row"><b>شارك المقال:</b><span><a class="btn btn-outline" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener">تويتر</a> <a class="btn btn-outline" href="${wa(a.title)}" target="_blank" rel="noopener">واتساب</a></span></div></div></article></div>`;
}

function faqPage() {
  return `<div class="container section" style="max-width:900px"><div class="text-center"><h1 class="page-title">الأسئلة الشائعة</h1><p class="page-intro">إجابات على أكثر الأسئلة التي يطرحها طلابنا.</p><div class="field" style="max-width:430px;margin:0 auto 2rem"><input data-action="faq-search" placeholder="ابحث عن سؤالك هنا..." /></div></div><div class="card faq-list" id="faq-list">${faqItems(FAQS)}</div><div class="card card-pad text-center" style="margin-top:3rem;background:var(--primary-soft)"><h3>لم تجد إجابة لسؤالك؟</h3><p class="text-muted">نحن هنا لمساعدتك والإجابة على كافة استفساراتك.</p><a class="btn btn-primary" href="${wa()}" target="_blank" rel="noopener">تحدث معنا مباشرة</a></div></div>`;
}
function faqItems(items) {
  return items.length ? items.map((faq, i) => `<div class="faq-item"><button class="faq-question" data-action="toggle-faq">${faq.q}<span>⌄</span></button><div class="faq-answer">${faq.a}</div></div>`).join("") : `<div class="text-center text-muted" style="padding:3rem">لم نتمكن من العثور على سؤال يطابق بحثك. يرجى تجربة كلمات أخرى أو التواصل مع الدعم.</div>`;
}

function assignmentPage() {
  return `<div class="container section" style="max-width:950px"><div class="text-center"><div class="round-icon">🎓</div><h1 class="page-title">نموذج تسليم الواجب</h1><p class="page-intro">أكمل البيانات أدناه لحفظ طلبك بأمان، وسيتواصل معك الفريق فور مراجعته.</p></div><div class="card form-shell"><div class="form-banner">▣ تعبئة بيانات الطلب</div><form class="form-body" data-form="assignment"><section class="form-section"><h3>👤 بيانات الطالب</h3><div class="grid grid-2"><div class="field"><label>اسم الطالب *</label><input name="studentName" required placeholder="محمد أحمد العمري" /></div><div class="field"><label>الرقم الجامعي *</label><input name="studentId" required placeholder="123456789" /></div><div class="field"><label>رقم الجوال</label><input name="phone" inputmode="tel" placeholder="05XXXXXXXX" /></div><div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" dir="ltr" placeholder="example@email.com" /></div></div></section><section class="form-section"><h3>🏛️ البيانات الأكاديمية</h3><div class="grid grid-2"><div class="field"><label>اسم الجامعة *</label><select name="university" required><option value="">اختر جامعتك...</option>${UNIVERSITIES.map((u) => `<option>${u}</option>`).join("")}<option>جامعة أخرى</option></select></div><div class="field"><label>الكلية *</label><input name="college" required placeholder="مثال: كلية الحاسب والمعلومات" /></div><div class="field"><label>القسم</label><input name="department" placeholder="مثال: قسم علوم الحاسب" /></div><div class="field"><label>اسم المقرر *</label><input name="course" required placeholder="مثال: برمجة 1 - CS101" /></div><div class="field"><label>دكتور المقرر *</label><input name="professor" required placeholder="مثال: د. عبدالله محمد" /></div></div></section><section class="form-section"><h3>📋 تفاصيل الطلب</h3><div class="grid grid-2"><div class="field"><label>نوع الخدمة المطلوبة *</label><select name="serviceType" required><option value="">اختر نوع الخدمة...</option>${SERVICE_TYPES.map((s, i) => `<option>${i + 1}. ${s}</option>`).join("")}</select></div><div class="field"><label>الموعد النهائي للتسليم *</label><input type="date" name="deadline" required min="${isoDay()}" /></div><div class="field"><label>وصف الواجب بالتفصيل *</label><textarea name="description" required placeholder="اكتب هنا جميع تفاصيل الواجب والشروط المطلوبة بدقة لضمان أعلى جودة ممكنة..."></textarea></div><div class="field"><label>إرفاق ملف <small class="text-muted">(اختياري)</small></label><label class="file-drop">⇧<span>اضغط لرفع ملف (PDF, Word, صورة)</span><input name="attachment" type="file" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" /></label><small class="text-muted text-center">الحد الأقصى: 8 ميغابايت للملف و3 ميغابايت للصورة</small></div></div></section><button class="btn btn-green" style="width:100%;min-height:3.5rem;font-size:1.05rem" type="submit">➤ حفظ وإرسال الطلب</button></form></div></div>`;
}

let contactItems = [["◉", "واتساب", "+966 56 768 0470", wa()], ["☎", "جوال", "+966 56 768 0470", "tel:+966567680470"], ["✉", "البريد الإلكتروني", "wajbatbls@gmail.com", "mailto:wajbatbls@gmail.com"], ["◷", "ساعات العمل", "متواجدون 24/7", ""], ["⌖", "العنوان", "الرياض، المملكة العربية السعودية", ""]];
function contactPage() {
  return `<div class="container section" style="max-width:1200px"><div class="text-center"><h1 class="page-title">اتصل بنا</h1><p class="page-intro">نحن هنا دائماً لخدمتك والإجابة على جميع استفساراتك الأكاديمية.</p></div><div class="grid grid-2" style="grid-template-columns:2fr 3fr;align-items:start"><div class="grid">${contactItems.map(([ico, label, value, href]) => `<div class="card contact-item"><span class="contact-icon">${ico}</span><div><small class="text-muted">${label}</small>${href ? `<a class="contact-value" href="${href}" ${href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${value}</a>` : `<div class="contact-value">${value}</div>`}</div></div>`).join("")}<div class="card card-pad"><h3>وسائل التواصل الاجتماعي</h3><div class="social-row"><a class="social" href="${wa()}" target="_blank" rel="noopener">◉</a><a class="social" href="#" aria-label="فيسبوك">f</a><a class="social" href="#" aria-label="إنستغرام">◎</a><a class="social" href="#" aria-label="تويتر">𝕏</a><a class="social" href="#" aria-label="يوتيوب">▶</a></div></div><a class="btn btn-green" href="${wa("أريد التواصل مع فريق واجبات بلس")}" target="_blank" rel="noopener">◉ تواصل فوري عبر واتساب</a></div><div class="grid"><div class="card card-pad"><h2>أرسل لنا رسالة</h2><form data-form="contact" class="grid"><div class="grid grid-2"><div class="field"><label>الاسم الكريم *</label><input name="name" required placeholder="محمد أحمد" /></div><div class="field"><label>رقم الجوال *</label><input name="phone" required placeholder="05XXXXXXXX" /></div></div><div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" placeholder="example@email.com" dir="ltr" /></div><div class="field"><label>الموضوع *</label><input name="subject" required placeholder="استفسار عن خدمة..." /></div><div class="field"><label>الرسالة *</label><textarea name="message" required placeholder="اكتب رسالتك أو استفسارك هنا..."></textarea></div><button class="btn btn-primary" type="submit">➤ إرسال الرسالة</button></form></div><div class="card" style="overflow:hidden"><div class="card-pad" style="padding-bottom:.6rem"><b>⌖ موقعنا — الرياض، المملكة العربية السعودية</b></div><iframe class="map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.674!2d46.6753!3d24.7136!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2f03890d489399%3A0xba974d1c98e79fd5!2sRiyadh%2C%20Saudi%20Arabia!5e0!3m2!1sen!2ssa!4v1234567890" loading="lazy" title="موقعنا على الخريطة"></iframe></div></div></div></div>`;
}

function aboutPage() {
  const goals = [["🛡", "جودة المخرجات", "ضمان أعلى معايير الجودة الأكاديمية في جميع الخدمات المقدمة."], ["♟", "رضا الطلاب", "تحقيق أعلى معدلات الرضا لعملائنا من الطلاب والطالبات."], ["🏆", "التميز المهني", "استقطاب أفضل الكفاءات الأكاديمية لتقديم خدماتنا."], ["▤", "التطور المستمر", "مواكبة أحدث التطورات في المناهج وأساليب التعليم."]];
  const team = [["أحمد عبدالله", "المدير التنفيذي"], ["سارة محمد", "مدير الشؤون الأكاديمية"], ["محمد فهد", "مدير التقنية"], ["نورة خالد", "مدير خدمة العملاء"]];
  return `<div class="container section"><div class="text-center"><h1 class="page-title">من نحن</h1><p class="page-intro">واجبات بلس هي منصة تعليمية سعودية رائدة، تأسست بهدف تقديم الدعم الأكاديمي الشامل للطلاب والطالبات في مختلف المراحل الدراسية، من خلال نخبة من الخبراء والأكاديميين المتخصصين.</p></div><div class="grid grid-2"><div class="card about-box" style="border-top:4px solid var(--primary)"><div class="round-icon">◉</div><h2>رؤيتنا</h2><p class="text-muted">أن نكون المنصة الأكاديمية الرائدة والموثوقة الأولى في المملكة العربية السعودية، والوجهة المفضلة لكل طالب يبحث عن التميز والنجاح الأكاديمي.</p></div><div class="card about-box" style="border-top:4px solid var(--accent)"><div class="round-icon">◎</div><h2>رسالتنا</h2><p class="text-muted">تقديم خدمات أكاديمية احترافية وعالية الجودة تدعم مسيرة الطلاب العلمية، وتساهم في تذليل الصعاب التي تواجههم، بأسعار تنافسية وبسرية تامة.</p></div></div><section class="section"><h2 class="text-center">أهدافنا الاستراتيجية</h2><div class="grid grid-4" style="margin-top:2rem">${goals.map(([ico, title, desc]) => `<div class="card goal-card"><div class="goal-icon">${ico}</div><h3>${title}</h3><p>${desc}</p></div>`).join("")}</div></section><section class="section"><h2 class="text-center">فريق الإدارة</h2><div class="grid grid-4" style="margin-top:2rem">${team.map(([name, role]) => `<div class="team"><div class="team-avatar">♟</div><h3>${name}</h3><p style="color:var(--accent);font-size:.85rem;font-weight:700">${role}</p></div>`).join("")}</div></section></div>`;
}

function partnersPage() {
  const section = (title, emoji, data, countLabel) => `<section class="download-section"><div class="section-heading"><span>${emoji}</span><h2>${title}</h2><span class="count">${data.length} ${countLabel}</span></div><div class="grid grid-5">${data.map((item) => { const [name, location] = item.split(" - "); return `<div class="card partner-card"><div><div class="partner-icon">${emoji}</div><h3>${name}</h3><p>${location || ""}</p></div></div>`; }).join("")}</div></section>`;
  return `<div class="container section"><div class="text-center"><h1 class="page-title">شركاء النجاح</h1><p class="page-intro">نفخر بخدمة طلاب وطالبات أعرق الجامعات السعودية والمعاهد التعليمية ونسعى دائماً لدعم مسيرتهم الأكاديمية.</p></div>${section("الجامعات السعودية", "▣", UNIVERSITIES, "جامعة")}${section("المعاهد التعليمية", "▤", INSTITUTES, "معهد")}${section("جهات أخرى", "🤝", OTHERS, "جهات")}<div class="card card-pad text-center" style="max-width:800px;margin:2rem auto;background:linear-gradient(to right,var(--primary-soft),color-mix(in srgb,var(--accent) 8%,transparent))"><h2>هل جامعتك غير مدرجة؟</h2><p class="text-muted">نحن نقدم خدماتنا لجميع الطلاب في مختلف الجامعات والكليات داخل وخارج المملكة. لا تتردد في التواصل معنا.</p><a class="btn btn-primary" href="${wa("أريد الاستفسار عن خدماتكم")}" target="_blank" rel="noopener">تواصل معنا الآن</a></div></div>`;
}

function notFound() {
  return `<div class="container section"><div class="card card-pad text-center"><h1>404 Page Not Found</h1><p class="text-muted">Did you forget to add the page to the router?</p><a class="btn btn-primary" href="#/">العودة للرئيسية</a></div></div>`;
}

function pageContent() {
  switch (currentPath()) {
    case "/": return homePage();
    case "/services": return servicesPage();
    case "/subscriptions": return subscriptionsPage();
    case "/downloads": return downloadsPage();
    case "/testimonials": return testimonialsPage();
    case "/blog": return blogPage();
    case "/faq": return faqPage();
    case "/assignment": return assignmentPage();
    case "/contact": return contactPage();
    case "/about": return managedAboutPage();
    case "/partners": return partnersPage();
    default: return notFound();
  }
}

function render() {
  const path = currentPath();
  if (path === "/") syncSeoMetadata();
  else document.title = ({ "/services": "الخدمات الأكاديمية | واجبات بلس", "/subscriptions": "باقات الاشتراك | واجبات بلس", "/downloads": "مركز التحميلات | واجبات بلس", "/blog": "المدونة الأكاديمية | واجبات بلس", "/contact": "اتصل بنا | واجبات بلس" }[path] || "واجبات بلس");
  document.querySelector("#app").innerHTML = layout(pageContent());
  if (currentPath() === "/contact") {
    const managedSocial = { "فيسبوك": socialLinks.facebook, "إنستغرام": socialLinks.instagram, "تويتر": socialLinks.twitter, "يوتيوب": socialLinks.youtube };
    Object.entries(managedSocial).forEach(([label, href]) => {
      const anchor = document.querySelector(`.social[aria-label="${label}"]`);
      if (!anchor) return;
      if (href) { anchor.href = href; anchor.target = "_blank"; anchor.rel = "noopener"; }
      else anchor.remove();
    });
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  if (currentPath() === "/") { startClock(); startTyping(); }
}

function startClock() {
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const update = () => {
    const d = new Date(); let h = d.getHours(); const ap = h >= 12 ? "م" : "ص"; h = h % 12 || 12;
    const set = (id, value) => { const element = document.querySelector(`#${id}`); if (element) element.textContent = value; };
    set("clock-date", `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`);
    set("clock-hour", String(h).padStart(2, "0")); set("clock-minute", String(d.getMinutes()).padStart(2, "0")); set("clock-second", String(d.getSeconds()).padStart(2, "0")); set("clock-ampm", ap);
  };
  update(); clearInterval(window.clockTimer); window.clockTimer = setInterval(update, 1000);
}
function startTyping() {
  const phrases = ["منصتك الذكية للتعلم والتفوق", "حل الواجبات باحتراف", "بحوث وعروض ومشاريع تخرج", "دعم أكاديمي على مدار الساعة"];
  let phrase = 0, position = 0, deleting = false;
  clearInterval(window.typingTimer);
  const tick = () => {
    const el = document.querySelector("#typing-text"); if (!el) return clearInterval(window.typingTimer);
    const current = phrases[phrase]; position += deleting ? -1 : 1; el.textContent = current.slice(0, position);
    if (!deleting && position === current.length) { deleting = true; clearInterval(window.typingTimer); window.typingTimer = setInterval(tick, 1800); }
    else if (deleting && position === 0) { deleting = false; phrase = (phrase + 1) % phrases.length; clearInterval(window.typingTimer); window.typingTimer = setInterval(tick, 60); }
  };
  window.typingTimer = setInterval(tick, 60);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function handleForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === "newsletter") {
    const result = await saveRecord("newsletter_subscribers", { email: data.email });
    toast("تم الاشتراك بنجاح!", result.error ? "تعذر الحفظ السحابي، لكن يمكنك المتابعة." : "شكراً لاشتراكك في نشرتنا البريدية."); form.reset(); return;
  }
  if (form.dataset.form === "review") {
    await rpcMutation("site.submitReview", { name: data.name, university: data.university, review: data.review, rating: 5 });
    toast("تم إرسال تقييمك", "شكراً لمشاركتك رأيك معنا، سيتم مراجعته ونشره قريباً."); form.reset(); return;
  }
  if (form.dataset.form === "contact") {
    await rpcMutation("site.submitContact", { name: data.name, phone: data.phone, email: data.email || undefined, subject: data.subject, message: data.message });
    toast("تم إرسال رسالتك ✓", "سنقوم بالرد عليك في أقرب وقت ممكن."); form.reset(); return;
  }
  if (form.dataset.form === "assignment") {
    const description = String(data.description || "").trim();
    if (description.length < 8) {
      const descriptionField = form.elements.description;
      descriptionField?.focus();
      toast("أكمل وصف الواجب", "يرجى كتابة وصف الواجب بالتفصيل، بما لا يقل عن 8 أحرف.");
      return;
    }
    const attachment = form.elements.attachment?.files?.[0];
    let attachmentMediaId;
    if (attachment) {
      const uploaded = await rpcMutation("site.uploadRequestAttachment", { mimeType: attachment.type, dataUrl: await fileToDataUrl(attachment), originalName: attachment.name });
      attachmentMediaId = uploaded.id;
    }
    const payload = { studentName: data.studentName, studentId: data.studentId, university: data.university, college: data.college, department: data.department || undefined, course: data.course, professor: data.professor, serviceType: data.serviceType.replace(/^\d+\.\s*/, ""), deadline: data.deadline, description, email: data.email || undefined, phone: data.phone || undefined, attachmentMediaId };
    const saved = await rpcMutation("site.submitAssignment", payload);
    toast("تم حفظ طلبك بنجاح", `رقم الطلب: #${saved.requestId}. سيتواصل معك الفريق قريباً.`); form.reset(); return;
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "toggle-sidebar") { state.sidebar = !state.sidebar; render(); }
  if (action === "close-sidebar") { state.sidebar = false; render(); }
  if (action === "toggle-services") { state.servicesOpen = !state.servicesOpen; render(); }
  if (action === "toggle-theme") { document.body.classList.toggle("dark"); localStorage.setItem("wajbat-theme", document.body.classList.contains("dark") ? "dark" : "light"); render(); }
  if (action === "select-service") { state.selectedService = Number(target.dataset.service); recordContentView(`/services/${encodeURIComponent(String(state.selectedService))}`); go(`/services?category=${state.selectedService}`); }
  if (action === "back-services") { state.selectedService = null; go("/services"); }
  if (action === "open-article") { state.article = ARTICLES.find((a) => a.id === Number(target.dataset.article)); recordContentView(`/blog/articles/${encodeURIComponent(String(target.dataset.article || ""))}`); render(); }
  if (action === "track-download") recordContentView(`/downloads/files/${String(target.dataset.download || "")}`);
  if (action === "close-modal" && (target.classList.contains("modal-close") || !target.closest("[data-modal-card]"))) { state.article = null; render(); }
  if (action === "toggle-faq") { target.parentElement.classList.toggle("open"); }
  if (action === "top") window.scrollTo({ top: 0, behavior: "smooth" });
});
document.addEventListener("submit", (event) => { const form = event.target.closest("form[data-form]"); if (form) { event.preventDefault(); handleForm(form).catch((error) => {
  const rawMessage = String(error?.message || "");
  const validationFailure = /description|too_small|expected string to have|validation/i.test(rawMessage);
  toast("تعذر الإرسال", validationFailure ? "يرجى التحقق من جميع الحقول المطلوبة وإكمال وصف الواجب بالتفصيل." : "تعذر حفظ الطلب حالياً. يرجى المحاولة مرة أخرى.");
}); } });
document.addEventListener("input", (event) => {
  if (event.target.dataset.action !== "faq-search") return;
  const query = event.target.value.trim();
  const list = document.querySelector("#faq-list");
  if (list) list.innerHTML = faqItems(FAQS.filter((faq) => `${faq.q} ${faq.a}`.includes(query)));
});
window.addEventListener("hashchange", () => { state.article = null; state.sidebar = false; render(); recordVisit(); });
window.addEventListener("scroll", () => document.querySelector(".back-top")?.classList.toggle("visible", window.scrollY > 300));

function managedAboutPage() {
  const fallbackGoals = [["🛡", "جودة المخرجات", "ضمان أعلى معايير الجودة الأكاديمية في جميع الخدمات المقدمة."], ["♟", "رضا الطلاب", "تحقيق أعلى معدلات الرضا لعملائنا من الطلاب والطالبات."], ["🏆", "التميز المهني", "استقطاب أفضل الكفاءات الأكاديمية لتقديم خدماتنا."], ["▤", "التطور المستمر", "مواكبة أحدث التطورات في المناهج وأساليب التعليم."]];
  const fallbackTeam = [["أحمد عبدالله", "المدير التنفيذي"], ["سارة محمد", "مدير الشؤون الأكاديمية"], ["محمد فهد", "مدير التقنية"], ["نورة خالد", "مدير خدمة العملاء"]];
  const about = managedAboutContent && typeof managedAboutContent === "object" ? managedAboutContent : {};
  const goals = Array.isArray(about.goals) && about.goals.length ? about.goals.map(goal => [goal.emoji || "◉", goal.title || "", goal.description || ""]) : fallbackGoals;
  const team = Array.isArray(managedTeamMembers) && managedTeamMembers.length ? managedTeamMembers : fallbackTeam.map(([name, role]) => ({ name, role, photoUrl: "" }));
  const intro = about.intro || "واجبات بلس هي منصة تعليمية سعودية رائدة، تأسست بهدف تقديم الدعم الأكاديمي الشامل للطلاب والطالبات في مختلف المراحل الدراسية، من خلال نخبة من الخبراء والأكاديميين المتخصصين.";
  const vision = about.vision || "أن نكون المنصة الأكاديمية الرائدة والموثوقة الأولى في المملكة العربية السعودية، والوجهة المفضلة لكل طالب يبحث عن التميز والنجاح الأكاديمي.";
  const mission = about.mission || "تقديم خدمات أكاديمية احترافية وعالية الجودة تدعم مسيرة الطلاب العلمية، وتساهم في تذليل الصعاب التي تواجههم، بأسعار تنافسية وبسرية تامة.";
  return `<div class="container section"><div class="text-center"><h1 class="page-title">من نحن</h1><p class="page-intro">${esc(intro)}</p></div><div class="grid grid-2"><div class="card about-box" style="border-top:4px solid var(--primary)"><div class="round-icon">◉</div><h2>رؤيتنا</h2><p class="text-muted">${esc(vision)}</p></div><div class="card about-box" style="border-top:4px solid var(--accent)"><div class="round-icon">◎</div><h2>رسالتنا</h2><p class="text-muted">${esc(mission)}</p></div></div><section class="section"><h2 class="text-center">أهدافنا الاستراتيجية</h2><div class="grid grid-4" style="margin-top:2rem">${goals.map(([emoji, title, description]) => `<div class="card goal-card"><div class="goal-icon">${esc(emoji)}</div><h3>${esc(title)}</h3><p>${esc(description)}</p></div>`).join("")}</div></section><section class="section"><h2 class="text-center">فريق الإدارة</h2><div class="grid grid-4" style="margin-top:2rem">${team.map(member => `<div class="team"><div class="team-avatar">${member.photoUrl ? `<img src="${esc(member.photoUrl)}" alt="${esc(member.name)}" />` : "♟"}</div><h3>${esc(member.name)}</h3><p style="color:var(--accent);font-size:.85rem;font-weight:700">${esc(member.role)}</p></div>`).join("")}</div></section></div>`;
}

async function bootSite() {
  try { applyManagedContent(await rpcQuery("site.publicContent")); } catch { /* تُستخدم البيانات الأصلية المرفقة إذا تعذر الاتصال. */ }
  if (localStorage.getItem("wajbat-theme") === "dark") document.body.classList.add("dark");
  const hasInitialHash = Boolean(location.hash);
  if (!hasInitialHash) location.hash = "/";
  else {
    render();
    recordVisit();
  }
}

void bootSite();
