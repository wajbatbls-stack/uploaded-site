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
let activeDesign = {};
let socialLinks = { facebook: "", instagram: "", twitter: "", youtube: "" };
let managedAboutContent = null;
let managedTeamMembers = null;
let managedContact = null;  // قنوات «اتصل بنا» الديناميكية من قاعدة البيانات
let managedBlog = null;  // تصنيفات ومقالات المدونة الأكاديمية الديناميكية من قاعدة البيانات
const state = { sidebar: false, servicesOpen: false, selectedService: null, article: null, blogArticleSlug: null, previewArticle: null };

const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const waNumber = (custom = null) => {
  const raw = (custom != null ? String(custom) : (SITE_CONFIG && SITE_CONFIG.whatsapp) || "966542699518").toString();
  // 1) Split on any non-digit separator; each piece is evaluated strictly
  const pieces = raw.split(/[^0-9]+/).filter(Boolean);
  for (const p of pieces) {
    if (/^9665\d{8}$/.test(p)) return p;          // strictly 966 + 9 digits
    if (/^5\d{8}$/.test(p)) return "966" + p;     // local 10-digit
  }
  // 2) Fallback on concatenated digits: find the LAST strictly valid 12-digit 966 sequence
  const digits = raw.replace(/[^0-9]/g, "");
  const m966 = digits.match(/(9665\d{8})(?!966)/);
  if (m966) return m966[1];
  const m5 = digits.match(/(5\d{8})(?!966)/);
  if (m5) return "966" + m5[1];
  return "966542699518";
};
const wa = (message = "", number = null) => `https://wa.me/${waNumber(number)}?text=${encodeURIComponent(message)}`;
const link = (path, label, className = "") => `<a class="${className}" href="#${path}">${label}</a>`;
const icon = (emoji) => `<span aria-hidden="true">${emoji}</span>`;
const safeCss = (value = "") => String(value).replace(/[;{}<>]/g, "");
const safeHref = (value, fallback = "#/") => {
  const raw = String(value || "").trim();
  if (raw === "whatsapp") return wa("أريد طلب خدمة");
  if (raw.startsWith("/")) return `#${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return fallback;
};

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

function visitorLinkTokenFromLocation() {
  const queryToken = new URLSearchParams(location.search).get("link");
  if (queryToken) return queryToken;
  const match = location.hash.match(/^#\/?visit\/([a-zA-Z0-9_-]{16,80})$/);
  return match?.[1] || null;
}

function showVisitorLinkUnavailable(reason) {
  const message = reason === "expired" ? "انتهت صلاحية هذا الرابط." : reason === "disabled" ? "هذا الرابط غير متاح حاليًا." : "رابط الزائر غير صحيح أو لم يعد موجودًا.";
  document.querySelector("#app").innerHTML = `<main class="container section"><section class="card card-pad text-center" style="max-width:640px;margin:4rem auto"><div class="round-icon" aria-hidden="true">🔗</div><h1 class="page-title">الرابط غير متاح</h1><p class="page-intro">${esc(message)}</p><a class="btn btn-primary" href="#/">العودة للصفحة الرئيسية</a></section></main>`;
  document.title = "الرابط غير متاح | واجبات بلس";
}

async function resolveVisitorLinkAtEntry() {
  const token = visitorLinkTokenFromLocation();
  if (!token) return true;
  try {
    const result = await rpcQuery("site.resolveVisitorLink", { token });
    if (!result?.active) { showVisitorLinkUnavailable(result?.reason); return false; }
    const cleanPath = result.targetPath.startsWith("/") ? result.targetPath : "/";
    history.replaceState(null, "", `${location.pathname}#${cleanPath}`);
    return true;
  } catch {
    showVisitorLinkUnavailable("not_found");
    return false;
  }
}

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

function applySiteDesign(config = {}) {
  activeDesign = config && typeof config === "object" ? config : {};
  const root = document.documentElement;
  const set = (name, value) => { if (typeof value === "string" && value.trim()) root.style.setProperty(name, value.trim()); };
  const px = (name, value, fallback) => root.style.setProperty(name, `${Number.isFinite(Number(value)) ? Number(value) : fallback}px`);
  const alpha = (hex, amount) => {
    const value = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(255,255,255,${amount})`;
    return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${amount})`;
  };
  set("--primary", activeDesign.primaryColor);
  set("--secondary", activeDesign.secondaryColor);
  set("--accent", activeDesign.accentColor);
  set("--site-background", activeDesign.backgroundColor);
  set("--site-text", activeDesign.textColor);
  set("--site-heading", activeDesign.headingColor);
  set("--site-button", activeDesign.buttonColor);
  set("--site-button-hover", activeDesign.buttonHoverColor);
  set("--site-button-text", activeDesign.buttonTextColor);
  set("--site-link", activeDesign.linkColor);
  set("--site-card", activeDesign.cardColor);
  set("--site-border", activeDesign.borderColor);
  set("--site-header", activeDesign.headerColor);
  set("--site-footer", activeDesign.footerColor);
  set("--site-frame-color", activeDesign.frameColor);
  set("--site-radius", activeDesign.radius ? `${Number(activeDesign.radius)}px` : "");
  set("--site-font", activeDesign.fontFamily);
  set("--site-heading-font", activeDesign.headingFont || activeDesign.fontFamily);
  set("--site-body-font", activeDesign.bodyFont || activeDesign.fontFamily);
  set("--site-line-height", String(activeDesign.lineHeight || ""));
  set("--site-font-weight", String(activeDesign.fontWeight || ""));
  px("--site-heading-size", activeDesign.headingSize, 32);
  px("--site-body-size", activeDesign.bodySize, 16);
  px("--site-header-height", activeDesign.headerHeight, 68);
  px("--site-logo-width", activeDesign.logoWidth, 40);
  px("--site-logo-height", activeDesign.logoHeight, 40);
  px("--site-logo-radius", activeDesign.logoRadius, 10);
  px("--site-frame-width", activeDesign.frameWidth, 1);
  px("--site-motion-speed", activeDesign.motionSpeed, 220);
  px("--site-motion-delay", activeDesign.motionDelay, 0);
  document.body.classList.toggle("site-design-compact", activeDesign.spacing === "compact");
  document.body.classList.toggle("site-design-spacious", activeDesign.spacing === "spacious");
  document.body.classList.toggle("site-design-no-motion", activeDesign.motion === "off" || activeDesign.reveal === false);
  document.body.classList.toggle("site-design-high-contrast", Boolean(activeDesign.highContrast));
  document.body.dataset.siteHeader = activeDesign.headerStyle || "standard";
  document.body.dataset.siteCards = activeDesign.cardStyle || "soft";
  document.body.dataset.siteFrame = activeDesign.frameStyle || "none";
  document.body.dataset.siteButtons = activeDesign.buttonStyle || "rounded";
  document.body.dataset.siteButtonSize = activeDesign.buttonSize || "medium";
  document.body.dataset.siteCardTarget = activeDesign.cardTarget || "all";
  document.body.dataset.siteCardShadow = activeDesign.cardShadow || "soft";
  document.body.dataset.siteFrameHover = activeDesign.frameHover || "none";
  document.body.dataset.siteHeaderShadow = activeDesign.headerShadow || "soft";
  document.body.dataset.siteLogoPosition = activeDesign.logoPosition || "right";
  document.body.dataset.siteLogoBorder = activeDesign.logoBorder || "none";
  document.body.dataset.siteLogoShadow = activeDesign.logoShadow || "none";
  document.body.dataset.siteClockStyle = activeDesign.clockStyle || "digital";
  document.body.dataset.siteClockMotion = activeDesign.clockMotion || "none";
  document.body.dataset.siteMotionType = activeDesign.motionType || "fade-up";
  document.body.dataset.siteMotionLevel = activeDesign.motionLevel || "subtle";
  document.body.style.fontFamily = activeDesign.fontFamily || "";
  const backgroundType = activeDesign.backgroundType || (activeDesign.backgroundImageUrl ? "image" : "color");
  const overlay = alpha(activeDesign.backgroundOverlay || "#ffffff", Math.max(0, Math.min(100, Number(activeDesign.backgroundOpacity ?? 92))) / 100);
  const imageUrl = String(activeDesign.backgroundImageUrl || "").replace(/["\\]/g, "");
  document.body.style.backgroundColor = backgroundType === "none" ? "transparent" : (activeDesign.backgroundColor || "");
  document.body.style.backgroundImage = backgroundType === "image" && imageUrl ? `linear-gradient(${overlay}, ${overlay}), url("${imageUrl}")` : backgroundType === "gradient" ? `linear-gradient(${activeDesign.backgroundGradientDirection || "135deg"}, ${activeDesign.backgroundGradientStart || activeDesign.backgroundColor || "#f7fafc"}, ${activeDesign.backgroundGradientEnd || "#e8f1ff"})` : "";
  document.body.style.backgroundPosition = backgroundType === "image" ? (activeDesign.backgroundPosition || "center") : "";
  document.body.style.backgroundSize = backgroundType === "image" ? (activeDesign.backgroundSize || "cover") : "";
  document.body.style.backgroundRepeat = backgroundType === "image" ? (activeDesign.backgroundRepeat || "no-repeat") : "";
  document.body.style.backgroundAttachment = backgroundType === "image" && activeDesign.backgroundFixed ? "fixed" : "";
  if (activeDesign.logoUrl) logoUrl = activeDesign.logoUrl;
}

function applyRenderedDesign() {
  const config = activeDesign || {};
  const app = document.querySelector("#app");
  if (!app) return;
  app.querySelectorAll(".card, .service-card, .price-card").forEach((item) => {
    item.style.borderRadius = config.radius ? `${Number(config.radius)}px` : "";
    item.classList.toggle("site-card-outline", config.cardStyle === "outline");
    item.classList.toggle("site-card-flat", config.cardStyle === "flat");
  });
  app.querySelectorAll(".site-header").forEach((header) => {
    header.style.minHeight = config.headerHeight ? `${Number(config.headerHeight)}px` : "";
    header.style.backgroundColor = config.headerColor || "";
    header.style.opacity = config.headerOpacity ? `${Math.max(.25, Math.min(1, Number(config.headerOpacity) / 100))}` : "";
    header.style.backgroundImage = config.headerImageUrl ? `linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,.1)),url("${String(config.headerImageUrl).replace(/["\\]/g, "")}")` : "";
    header.style.backgroundSize = config.headerImageUrl ? "cover" : "";
    header.style.backgroundPosition = config.headerImageUrl ? "center" : "";
    header.classList.toggle("site-header-sticky", config.headerSticky !== false);
  });
  app.querySelectorAll(".brand-mark, .hero-logo").forEach((logo) => {
    logo.style.width = config.logoWidth ? `${Number(config.logoWidth)}px` : "";
    logo.style.height = config.logoHeight ? `${Number(config.logoHeight)}px` : "";
    logo.style.borderRadius = config.logoRadius !== undefined ? `${Number(config.logoRadius)}px` : "";
  });
  const hidden = Array.isArray(config.hiddenSections) ? config.hiddenSections : [];
  app.querySelectorAll(".sidebar-nav a, .footer a, .page-content").forEach((item) => { item.hidden = false; });
  const activeRoute = (location.hash.replace(/^#/, "").split("?")[0] || "/");
  hidden.filter((entry) => String(entry).startsWith("/")).forEach((path) => {
    app.querySelectorAll(`a[href="#${path}"]`).forEach((item) => { item.hidden = true; });
    if (path === activeRoute) app.querySelectorAll(".page-content").forEach((item) => { item.hidden = true; });
  });
  hidden.filter((entry) => !String(entry).startsWith("/")).forEach((selector) => app.querySelectorAll(selector).forEach((item) => { item.hidden = true; }));
  const requestedOrder = Array.isArray(config.sectionOrder) ? config.sectionOrder : [];
  const nav = app.querySelector(".sidebar-nav");
  if (nav && requestedOrder.length) {
    const groups = [...nav.children];
    const findGroup = (path) => groups.find((group) => group.querySelector(`a[href="#${path}"]`));
    requestedOrder.map(findGroup).filter(Boolean).forEach((group) => nav.append(group));
  }
  if (config.showClock) {
    let clock = document.querySelector("#site-design-clock");
    if (!clock) { clock = document.createElement("div"); clock.id = "site-design-clock"; clock.setAttribute("aria-label", "الوقت الحالي"); document.body.append(clock); }
    const update = () => { clock.textContent = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: config.clockSeconds ? "2-digit" : undefined }); };
    update(); clearInterval(window.__siteDesignClock); window.__siteDesignClock = setInterval(update, 1000);
    clock.dataset.position = config.clockPosition || "bottom-left";
    clock.dataset.style = config.clockStyle || "digital";
    clock.dataset.motion = config.clockMotion || "none";
    clock.style.color = config.clockColor || "";
    clock.style.background = config.clockBackground || "";
    clock.style.fontSize = config.clockSize ? `${Number(config.clockSize)}px` : "";
  } else document.querySelector("#site-design-clock")?.remove();
}

function applyManagedContent(content) {
  if (!content || typeof content !== "object") return;
  const visible = (items) => Array.isArray(items) ? items.filter((item) => item?.isVisible !== false) : [];
  if (Array.isArray(content.services)) {
    const services = visible(content.services).sort((a, b) => a.sortOrder - b.sortOrder);
    SERVICES = services.map((service, id) => ({ ...service, id, emoji: service.emoji || "📚", iconUrl: service.iconImageUrl || service.iconUrl || "", color: service.iconColor || service.color || "#4966d6", title: service.title || "خدمة", items: visible(service.items).sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0)).map(item => typeof item === "string" ? { title: item, emoji: "•", buttonText: "اطلب الخدمة", buttonLink: "whatsapp" } : ({ ...item, iconUrl: item.iconImageUrl || item.iconUrl || "", color: item.iconColor || item.color || service.iconColor || service.color || "#4966d6" })) }));
    SERVICE_SUBS = services.map((service) => service.title);
    SERVICE_TYPES = SERVICES.flatMap((service) => service.items || []).map(item => item.title || item);
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
  applySiteDesign(siteSettings.designConfig || {});
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

function renderTickerText(text) {
  // Wrap each phone/plus-prefixed token in dir=ltr spans so bidirectional
  // text in a single-line RTL ticker never renders the "+" after the digits
  // (e.g. "+966..." appearing as "966...+").
  return String(text).split(/(\+\d[\d\s]{6,})/g).map(part => {
    if (/^\+\d[\d\s]{6,}$/.test(part)) {
      return '<span class="ticker-num" dir="ltr">' + esc(part) + '</span>';
    }
    return esc(part);
  }).join('');
}
function header() {
  return `<div class="ticker ticker-pro"><span>${renderTickerText(siteSettings.tickerText || "مرحباً بكم في واجبات بلس ⭐ نقدم أفضل الخدمات الأكاديمية ⭐ تواصل معنا على واتساب +966567680470")}</span></div>
    <header class="site-header">
      <div class="header-actions">
        <button class="btn-icon" data-action="toggle-sidebar" aria-label="فتح القائمة">☰</button>
        <a class="brand" href="#/"><span class="brand-wordmark"><span class="brand-title">واجبات بلس</span><span class="brand-subtitle">منصتك الذكية للتعلم</span></span></a>
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
</div>
  </div><div class="copyright">© ${new Date().getFullYear()} واجبات بلس — جميع الحقوق محفوظة</div></footer>`;
}

function layout(content) {
  return `${header()}<div class="main-shell">${sidebar()}<main class="page-content">${content}</main>${footer()}</div><button class="back-top" data-action="top" aria-label="العودة للأعلى">↑</button>`;
}

function homePage() {
  const home = siteSettings.homePageConfig && typeof siteSettings.homePageConfig === "object" ? siteSettings.homePageConfig : null;
  const particles = Array.from({ length: 18 }, (_, i) => `<i class="particle" style="width:${40 + (i * 37) % 100}px;height:${40 + (i * 37) % 100}px;left:${(i * 29) % 100}%;top:${(i * 43) % 100}%;animation-delay:${i * -.6}s"></i>`).join("");
  if (!home) return `<section class="hero"><div class="particles">${particles}</div><div class="hero-rings"></div><div class="hero-inner">
    <div class="clock"><p class="clock-date" id="clock-date"></p><div class="clock-time"><span class="clock-unit" id="clock-hour">00</span><b>:</b><span class="clock-unit" id="clock-minute">00</span><b>:</b><span class="clock-unit" id="clock-second">00</span><span class="clock-ampm" id="clock-ampm">ص</span></div><div class="clock-labels"><span>ساعة</span><span>دقيقة</span><span>ثانية</span></div></div>
    <div><h1>واجبات بلس</h1><p class="typing"><span id="typing-text"></span><span class="typing-cursor">|</span></p></div>
    <div class="hero-actions"><a class="btn btn-green" href="${wa("أريد طلب خدمة")}" target="_blank" rel="noopener">🚀 اطلب خدمتك الآن</a>${link("/services", "📚 تصفح الخدمات", "btn btn-outline")}</div>
    <div class="hero-badge">⭐ ضمان الجودة 100% · سرية تامة · دعم 24/7 ⭐</div>
  </div></section>`;
  const hero = home.hero || {};
  const bg = home.background || {};
  const sections = Array.isArray(home.sections) ? home.sections : [];
  // كانت إعدادات الإصدار الأول تخفي الخدمات والمميزات افتراضياً رغم وجود
  // محتواهما. لا نغيّر السجل المخزن تلقائياً؛ نعرضهما كتوافق مع التصميم الجديد.
  // أما الإعدادات المحفوظة بالإصدار 2 فما زالت تحترم اختيار المالك كاملاً.
  const isLegacyHomeConfig = Number(home.version || 1) < 2;
  const legacySectionVisible = id => isLegacyHomeConfig && ["services", "features"].includes(id);
  const visible = id => {
    const section = sections.find(item => item.id === id);
    if (legacySectionVisible(id)) return true;
    return section?.visible !== false;
  };
  const background = (bg.imageUrl && ["image", "overlay"].includes(bg.type))
    ? `linear-gradient(rgba(4,20,44,${Math.max(0, Math.min(100, Number(bg.dim || 0))) / 100}),rgba(4,20,44,${Math.max(0, Math.min(100, Number(bg.dim || 0))) / 100})),url("${safeCss(bg.imageUrl)}")`
    : ["gradient", "multi", "modern", "academic", "luxury", "animated"].includes(bg.type) ? `linear-gradient(${safeCss(bg.direction || "135deg")},${safeCss(bg.color1 || "#0f2a62")},${safeCss(bg.color2 || "#195a9e")},${safeCss(bg.color3 || bg.color2 || "#123b78")})` : "";
  const buttonMarkup = (button, index) => {
    if (button?.visible === false) return "";
    const target = button.link === "whatsapp" || /^https?:\/\//i.test(button.customLink || "") ? `target="_blank" rel="noopener"` : "";
    const href = button.link === "#custom" ? safeHref(button.customLink) : safeHref(button.link);
    const style = `--home-button-bg:${safeCss(button.color || "#25D366")};--home-button-text:${safeCss(button.textColor || "#ffffff")};--home-button-radius:${Number(button.radius || 14)}px`;
    return `<a class="home-hero-button home-button-${esc(button.style || "gradient")} home-button-${esc(button.size || "medium")} home-shadow-${esc(button.shadow || "none")} home-motion-${esc(button.animation || "none")}" style="${style}" href="${esc(href)}" ${target}>${esc(button.label || `زر ${index + 1}`)}</a>`;
  };
  const heroStyle = `--home-hero-text:${safeCss(hero.textColor || "#ffffff")};--home-hero-heading:${safeCss(hero.headingColor || "#ffffff")};--home-hero-font:${safeCss(hero.fontFamily || "Cairo")};--home-hero-weight:${Number(hero.fontWeight || 800)};--home-hero-title-size:${Number(hero.titleSize || 46)}px;--home-hero-description-size:${Number(hero.descriptionSize || 17)}px;--home-hero-gap:${Number(hero.spacing || 18)}px;${background ? `background-image:${background};background-size:${safeCss(bg.imageSize || "cover")};background-position:${safeCss(bg.imagePosition || "center")};background-repeat:${safeCss(bg.imageRepeat || "no-repeat")}` : ""}`;
  const heroMarkup = `<section class="hero home-managed-hero home-hero-template-${esc(hero.template || "classic")} home-hero-align-${esc(hero.align || "center")}" data-home-animation="${esc(hero.animation || "fade-up")}" data-home-repeat="${esc(hero.animationRepeat || "once")}" style="${heroStyle}"><div class="particles">${particles}</div><div class="hero-rings"></div><div class="hero-inner">
    <div class="clock"><p class="clock-date" id="clock-date"></p><div class="clock-time"><span class="clock-unit" id="clock-hour">00</span><b>:</b><span class="clock-unit" id="clock-minute">00</span><b>:</b><span class="clock-unit" id="clock-second">00</span><span class="clock-ampm" id="clock-ampm">ص</span></div><div class="clock-labels"><span>ساعة</span><span>دقيقة</span><span>ثانية</span></div></div>
    ${hero.imageVisible && hero.imageUrl && hero.imagePosition !== "background" ? `<img class="home-hero-image image-${esc(hero.imagePosition || "side")}" src="${esc(hero.imageUrl)}" alt="صورة الواجهة الرئيسية" />` : ""}
    <div class="home-hero-copy"><h1>${esc(hero.title || "واجبات بلس")}</h1>${hero.subtitle ? `<p class="typing home-hero-subtitle"><span>${esc(hero.subtitle)}</span></p>` : ""}${hero.description ? `<p class="home-hero-description">${esc(hero.description)}</p>` : ""}</div>
    <div class="hero-actions home-hero-actions">${(Array.isArray(hero.buttons) ? hero.buttons : []).map(buttonMarkup).join("")}</div>
    ${hero.additionalText ? `<div class="hero-badge">${esc(hero.additionalText)}</div>` : ""}
  </div></section>`;
  const stats = (Array.isArray(home.stats) ? home.stats : []).filter(item => item?.visible !== false);
  const statsMarkup = visible("stats") && stats.length ? `<section class="home-managed-section home-stat-section"><div class="container"><div class="home-stat-grid">${stats.map(item => `<article class="home-stat-card" style="--home-stat-color:${safeCss(item.color || "#1d6cbd")}"><span>${esc(item.icon || "✦")}</span><b>${esc(item.number || "0")}</b><p>${esc(item.title || "إحصائية")}</p></article>`).join("")}</div></div></section>` : "";
  const managedServicesStyle = SERVICES[0]?.sectionStyle || {};
  const serviceConfig = { ...managedServicesStyle, ...(home.services || {}) };
  const selectedIds = new Set(Array.isArray(serviceConfig.selectedIds) ? serviceConfig.selectedIds : []);
  const displayServices = SERVICES.filter(item => !selectedIds.size || selectedIds.has(String(item.title))).slice(0, Math.max(1, Number(serviceConfig.limit || 6)));
  const servicesMarkup = visible("services") && (legacySectionVisible("services") || serviceConfig.visible !== false) ? `<section class="home-managed-section home-services-section" data-home-services-layout="${esc(serviceConfig.layout || "grid")}" data-home-card-style="${esc(serviceConfig.cardStyle || "soft")}" data-home-card-size="${esc(serviceConfig.size || "medium")}"><div class="container"><header class="home-section-heading"><h2 style="color:${safeCss(serviceConfig.titleColor || "#123b78")}">${esc(serviceConfig.title || "خدماتنا الأكاديمية")}</h2><p>${esc(serviceConfig.description || "")}</p></header><div class="home-services-grid">${displayServices.map(service => `<a class="home-service-card" href="#/services" style="--home-card-bg:${safeCss(service.backgroundColor || serviceConfig.cardColor || "#fff")};--home-card-border:${safeCss(service.borderColor || serviceConfig.borderColor || "#e6edf8")};--home-service-accent:${safeCss(service.color || "#4966d6")};"><span>${service.iconUrl ? `<img src="${esc(service.iconUrl)}" alt="" />` : esc(service.emoji || "📚")}</span><h3>${esc(service.title)}</h3><p>${esc((service.items || []).slice(0, 2).map(item => item.title || item).join(" · "))}</p></a>`).join("")}</div></div></section>` : "";
  const featureConfig = home.features || {};
  const featuresMarkup = visible("features") && (legacySectionVisible("features") || featureConfig.visible !== false) ? `<section class="home-managed-section home-features-section"><div class="container"><header class="home-section-heading"><h2>${esc(featureConfig.title || "لماذا تختار واجبات بلس؟")}</h2><p>${esc(featureConfig.description || "")}</p></header><div class="home-features-grid">${(Array.isArray(featureConfig.items) ? featureConfig.items : []).map((item, index) => `<article><span>${["✓", "◈", "✦"][index % 3]}</span><b>${esc(item)}</b></article>`).join("")}</div></div></section>` : "";
  const cta = home.cta || {};
  const ctaMarkup = visible("cta") && cta.visible !== false ? `<section class="home-managed-section home-cta-section"><div class="container"><div><h2>${esc(cta.title || "هل تحتاج إلى مساعدة أكاديمية؟")}</h2><p>${esc(cta.description || "")}</p><a class="home-hero-button home-button-gradient" style="--home-button-bg:#25D366;--home-button-text:#fff;--home-button-radius:14px" href="${esc(safeHref(cta.buttonLink || "whatsapp"))}" target="_blank" rel="noopener">${esc(cta.buttonLabel || "تواصل عبر واتساب")}</a></div></div></section>` : "";
  const rendered = { hero: visible("hero") ? heroMarkup : "", stats: statsMarkup, services: servicesMarkup, features: featuresMarkup, cta: ctaMarkup };
  const order = sections.map(section => section.id).filter(id => id in rendered);
  return `<div class="home-managed-stack">${[...order, ...Object.keys(rendered).filter(id => !order.includes(id))].map(id => rendered[id]).join("")}</div>`;
}

function serviceButtonHref(item, title, parentTitle) {
  if (!item.buttonLink || item.buttonLink === "whatsapp") return { href: wa(`أريد طلب خدمة: ${title} (من قسم: ${parentTitle})`), external: true };
  if (item.buttonLink === "request") return { href: `#/submit?service=${encodeURIComponent(title)}`, external: false };
  if (item.buttonLink === "contact") return { href: "#/contact", external: false };
  if (item.buttonLink === "services") return { href: "#/services", external: false };
  return { href: safeHref(item.buttonLink), external: /^https?:/i.test(item.buttonLink) };
}

function serviceSurfaceStyle(item, section = {}) {
  const background = item.backgroundType === "image" && item.backgroundImageUrl ? `url('${safeCss(item.backgroundImageUrl)}') center/cover` : item.backgroundType === "gradient" ? safeCss(item.backgroundGradient || "#fff") : safeCss(item.backgroundColor || "#fff");
  const frame = item.frameStyle === "none" ? "0" : `${Math.max(0, Number(item.borderWidth ?? 1))}px ${safeCss(item.frameStyle || "solid")} ${safeCss(item.borderColor || "#e4eaf5")}`;
  return `--service-accent:${safeCss(item.iconColor || item.color || "#4966d6")};--service-bg:${background};--service-border:${safeCss(item.borderColor || "#e4eaf5")};--service-card-border:${frame};--service-card-radius:${Math.max(0, Number(item.borderRadius ?? 16))}px;--service-card-padding:${Math.max(0, Number(item.padding ?? 18))}px;--service-title-color:${safeCss(item.titleColor || "#284677")};--service-text-color:${safeCss(item.textColor || "#6a7890")};--service-title-size:${Math.max(12, Number(item.titleSize || 20))}px;--service-description-size:${Math.max(10, Number(item.descriptionSize || 14))}px;--service-shadow:${safeCss(item.shadow || "soft")};`;
}

function servicesPage() {
  const categoryParam = queryParams().get("category");
  const category = categoryParam === null ? null : Number(categoryParam);
  if (Number.isInteger(category) && SERVICES[category]) state.selectedService = category;
  if (categoryParam === null) state.selectedService = null;
  const active = state.selectedService === null ? null : SERVICES[state.selectedService];
  const servicesStyle = SERVICES[0]?.sectionStyle || {};
  const sectionBackground = servicesStyle.backgroundType === "image" && servicesStyle.backgroundImageUrl ? `url('${safeCss(servicesStyle.backgroundImageUrl)}') center/cover` : servicesStyle.backgroundType === "gradient" ? safeCss(servicesStyle.backgroundGradient || "transparent") : safeCss(servicesStyle.backgroundColor || "transparent");
  const sectionFrame = servicesStyle.frameStyle === "none" ? "0" : `${Math.max(0, Number(servicesStyle.borderWidth || 0))}px ${safeCss(servicesStyle.frameStyle || "solid")} ${safeCss(servicesStyle.borderColor || "transparent")}`;
  const sectionStyle = `--services-section-bg:${sectionBackground};--services-columns:${Math.max(1, Math.min(4, Number(servicesStyle.columns || 3)))};--services-gap:${Math.max(0, Number(servicesStyle.gap || 18))}px;--services-section-border:${sectionFrame};--services-section-radius:${Math.max(0, Number(servicesStyle.borderRadius || 18))}px;`;
  const svcCount = SERVICES.reduce((t, s) => t + (s.items || []).length, 0);
  if (!active) {
    const svc24Css = svc24Styles();
    const cards = SERVICES.map((srv, idx) => {
      const n = (idx % 6) + 1;
      const itemPreview = (srv.items || []).slice(0, 3).map(it => esc(it.title || it)).join(" · ");
      return `<button class="svc24-card" data-service-animation="${esc(srv.animation || servicesStyle.mainAnimation || "none")}" style="${serviceSurfaceStyle(srv, servicesStyle)}" data-action="select-service" data-service="${srv.id}">
        <div class="svc24-glow svc24-glow-${n}"></div>
        <div class="svc24-card-inner">
          <div class="svc24-icon" style="--svc24-accent:${safeCss(srv.iconColor || srv.color || ['#4f46e5','#0891b2','#7c3aed','#2563eb','#059669','#d97706'][idx % 6] || '#4f46e5')}">
            ${srv.iconUrl ? `<img src="${esc(srv.iconUrl)}" alt="" />` : `<span class="svc24-emoji">${esc(srv.emoji)}</span>`}
          </div>
          <h3>${esc(srv.title)}</h3>
          ${itemPreview ? `<p class="svc24-preview">${esc(itemPreview)}${(srv.items || []).length > 3 ? " · +" + ((srv.items || []).length - 3) : ""}</p>` : ""}
          <div class="svc24-badge"><span>${esc((srv.items || []).length)}</span> خدمة فرعية</div>
        </div>
        <svg class="svc24-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>`;
    }).join("");
    return `${svc24Css}<div class="svc24-wrap" data-services-layout="${esc(servicesStyle.layout || "grid")}" style="${sectionStyle}">
      <div class="svc24-hero">
        <div class="svc24-hero-inner">
          ${servicesStyle.sectionImageUrl ? `<img class="svc24-hero-img" src="${esc(servicesStyle.sectionImageUrl)}" alt="" />` : ""}
          ${servicesStyle.showTitle !== false ? `<h1 class="svc24-title">${esc(servicesStyle.title || "خدماتنا الأكاديمية")}</h1>` : ""}
          ${servicesStyle.showDescription !== false ? `<p class="svc24-subtitle">${esc(servicesStyle.description || "اختر القسم المطلوب لعرض الخدمات الفرعية المتاحة")}</p>` : ""}
          <div class="svc24-stats">
            <span class="svc24-stat"><b>${SERVICES.length}</b> قسم تخصصي</span>
            <span class="svc24-stat svc24-dot"></span>
            <span class="svc24-stat"><b>${svcCount}</b> خدمة فرعية</span>
          </div>
        </div>
      </div>
      <div class="container section svc24-grid-container">
        <div class="svc24-grid">${cards}</div>
      </div>
    </div>`;
  }
  const subs = active.items.map((item, i) => {
    const title = item.title || item;
    const target = serviceButtonHref(item, title, active.title);
    const buttonStyle = `--service-button-bg:${safeCss(item.buttonColor || "#25D366")};--service-button-text:${safeCss(item.buttonTextColor || "#fff")};`;
    return `<div class="svc24-sub" data-service-animation="${esc(item.animation || servicesStyle.subAnimation || "none")}" style="${serviceSurfaceStyle(item, servicesStyle)}">
      ${item.imageUrl ? `<img class="svc24-sub-img" src="${esc(item.imageUrl)}" alt="" />` : ""}
      <div class="svc24-sub-main">
        <span class="svc24-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="svc24-sub-ico">${item.iconUrl ? `<img src="${esc(item.iconUrl)}" alt="" />` : esc(item.emoji || "◈")}</span>
        <div class="svc24-sub-text"><b>${esc(title)}</b>${item.description ? `<small>${esc(item.description)}</small>` : ""}</div>
      </div>
      <a class="svc24-order ${esc(item.buttonStyle || "rounded")} ${esc(item.buttonSize || "medium")}" data-button-animation="${esc(item.buttonAnimation || "none")}" style="${buttonStyle}" href="${esc(target.href)}" ${target.external ? 'target="_blank" rel="noopener"' : ""}>
        ${esc(item.buttonIcon || "◉")} ${esc(item.buttonText || "اطلب الخدمة")}
      </a>
    </div>`;
  }).join("");
  return `${svc24Styles()}<div class="svc24-detail">
    <div class="svc24-detail-head">
      <button class="svc24-back" data-action="back-services">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        العودة للأقسام
      </button>
      <div class="svc24-head-card">
        <span class="svc24-head-emoji">${active.iconUrl ? `<img src="${esc(active.iconUrl)}" alt="" />` : esc(active.emoji)}</span>
        <div><h2>${esc(active.title)}</h2>
        <p>${esc(active.description || "اختر الخدمة المطلوبة واضغط زر الطلب للتواصل الفوري")}</p>
        <div class="svc24-head-count">${esc(active.items.length)} خدمة فرعية في هذا القسم</div></div>
      </div>
    </div>
    <div class="container section">
      <div class="svc24-sub-grid">${subs}</div>
      <div class="svc24-cta">
        <a class="btn btn-primary" href="${wa(`أريد الاستفسار عن قسم: ${active.title}`)}" target="_blank" rel="noopener">◉ تواصل لجميع خدمات هذا القسم</a>
      </div>
    </div>
  </div>`;
}


function subscriptionsPage() {
  return `<section class="pricing-editorial"><div class="pricing-intro"><span class="pricing-kicker">اشتراكات مرنة للدراسة</span><h1>اختر الباقة التي <em>تناسب إيقاعك</em></h1><p>باقات مرنة لخدماتك الأكاديمية المستمرة. اختر ما يناسبك وتواصل معنا عبر واتساب لتبدأ بسهولة.</p></div><div class="pricing-grid">${PLANS.map((plan) => `<article class="card plan-card pricing-tier ${plan.popular ? "popular featured" : ""}">${plan.popular ? '<div class="tier-ribbon">الأكثر طلباً</div>' : ""}<div class="tier-top"><div class="tier-icon">${plan.emoji}</div><h2>${plan.title}</h2><span class="tier-cycle">${plan.duration}</span></div><div class="tier-rule"></div><div class="tier-body"><ul class="check-list">${plan.features.map((f) => `<li>${f}</li>`).join("")}</ul><a class="btn ${plan.popular ? "btn-primary" : "btn-muted"}" href="${wa(`أريد الاشتراك في باقة: ${plan.title} ${plan.emoji}`)}" target="_blank" rel="noopener">◉ اختر هذه الباقة</a></div></article>`).join("")}</div><div class="pricing-tail"><div class="pricing-tail-inner"><div><h2>هل تحتاج باقة مصمّمة لك؟</h2><p>تواصل معنا مباشرة وسنجهّز عرضاً يتوافق مع احتياجاتك الأكاديمية.</p></div><a class="btn btn-green" href="${wa("أريد الاستفسار عن الأسعار والباقات")}" target="_blank" rel="noopener">◉ اطلب عرضاً مخصصاً</a></div></div></section>`;
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
let siteDownloads = null;
async function loadSiteDownloads() {
  try {
    siteDownloads = await rpcQuery("site.downloads.publicList");
    if (!Array.isArray(siteDownloads?.categories)) siteDownloads = null;
  } catch (e) {
    console.warn("[downloads] dynamic load failed, keeping static files", e);
    siteDownloads = null;
  }
}
const DL10_GLYPHS = { "image/": "🖼", "video/": "🎥", "audio/": "🎵", pdf: "📕", zip: "🗜", rar: "🗜", "7z": "🗜", word: "📘", msword: "📘", document: "📘", sheet: "📗", excel: "📗", presentation: "📙", powerpoint: "📙" };
function dl10Glyph(mime) {
  for (const key of Object.keys(DL10_GLYPHS)) if (String(mime || "").includes(key)) return DL10_GLYPHS[key];
  return "📄";
}
function dl10Styles() {
  return `<style>
    .dl10-hero{background:linear-gradient(135deg,#0f1631 0%,#1b2558 55%,#3b3199 100%);border-radius:22px;padding:2.6rem 1.8rem;color:#fff;text-align:center;position:relative;overflow:hidden;margin-bottom:1.8rem;box-shadow:0 22px 55px rgba(17,24,64,.35)}
    .dl10-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 55% at 80% 10%,rgba(124,98,255,.35),transparent 60%),radial-gradient(45% 50% at 12% 90%,rgba(38,198,218,.22),transparent 65%);pointer-events:none}
    .dl10-hero>*{position:relative}
    .dl10-hero h1{margin:0;font-size:2rem;font-weight:900;letter-spacing:-.5px}
    .dl10-hero p{margin:.6rem auto 0;max-width:620px;font-size:.98rem;opacity:.85;line-height:1.8}
    .dl10-hero .dl10-stats{display:flex;justify-content:center;gap:2rem;margin-top:1.4rem;flex-wrap:wrap}
    .dl10-hero .dl10-stat b{display:block;font-size:1.6rem;font-weight:900;font-feature-settings:"tnum"}
    .dl10-hero .dl10-stat span{font-size:.78rem;opacity:.75}
    .dl10-tabs{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-bottom:1.6rem}
    .dl10-tab{padding:9px 17px;border-radius:999px;border:1.5px solid #e4e8f5;background:#fff;color:#4a5677;font-family:inherit;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .18s cubic-bezier(.23,1,.32,1);display:inline-flex;align-items:center;gap:7px}
    .dl10-tab:hover{border-color:#a5b0d8;transform:translateY(-1px)}
    .dl10-tab-active{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border-color:transparent;box-shadow:0 8px 20px rgba(79,70,229,.35)}
    .dl10-section{margin-bottom:2.4rem;scroll-margin-top:6rem}
    .dl10-section-head{display:flex;align-items:center;gap:13px;margin-bottom:1rem}
    .dl10-section-emoji{width:50px;height:50px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;color:#fff;flex:0 0 auto;box-shadow:0 10px 24px rgba(17,24,64,.25)}
    .dl10-section-head h2{margin:0;font-size:1.35rem;font-weight:900;color:#10182b}
    .dl10-section-head p{margin:3px 0 0;font-size:.82rem;color:#7d87a6}
    .dl10-section-head .dl10-count{margin-right:auto;font-size:.75rem;font-weight:800;background:#eef1fd;color:#4f46e5;border-radius:999px;padding:4px 13px;white-space:nowrap}
    .dl10-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1rem}
    .dl10-file{background:#fff;border:1.5px solid #e9edf7;border-radius:16px;padding:1.1rem;display:flex;flex-direction:column;gap:.85rem;transition:all .2s cubic-bezier(.23,1,.32,1);position:relative;overflow:hidden}
    .dl10-file:hover{border-color:#c4cdef;transform:translateY(-4px);box-shadow:0 18px 40px rgba(30,40,90,.14)}
    .dl10-file-top{display:flex;align-items:center;gap:11px}
    .dl10-file-glyph{width:44px;height:44px;border-radius:12px;background:linear-gradient(160deg,#f2f4ff,#e7ebfb);display:inline-flex;align-items:center;justify-content:center;font-size:1.25rem;flex:0 0 auto}
    .dl10-file-title{font-size:.95rem;font-weight:800;color:#10182b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px}
    .dl10-file-desc{font-size:.77rem;color:#7d87a6;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dl10-file-meta{display:flex;align-items:center;gap:.6rem;font-size:.72rem;color:#a1a9c4}
    .dl10-file-desc{display:block}
    .dl10-dl-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:.65rem 1rem;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-family:inherit;font-size:.85rem;font-weight:800;text-decoration:none;cursor:pointer;border:none;transition:all .18s cubic-bezier(.23,1,.32,1);box-shadow:0 8px 20px rgba(79,70,229,.3)}
    .dl10-dl-btn:hover{box-shadow:0 12px 28px rgba(79,70,229,.45);transform:translateY(-1px);color:#fff}
    .dl10-dl-btn:active{transform:scale(.97)}
    .dl10-empty{text-align:center;padding:3rem 1.5rem;color:#7d87a6}
    .dl10-empty .glyph{font-size:2.6rem;display:block;margin-bottom:.6rem}
    @media (max-width:760px){.dl10-hero{padding:1.8rem 1rem}.dl10-hero h1{font-size:1.5rem}.dl10-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}}
  </style>`;
}
function dl10FileCard(file) {
  const url = String(file.directUrl || "").replace(/["\\]/g, "");
  const count = Number(file?.downloadCount ?? 0);
  const meta = count > 0 ? `⇩ ${count.toLocaleString("ar-SA-u-nu-latn")} تحميل` : "⇩ جاهز للتحميل";
  const desc = file.description != null && String(file.description).trim() && String(file.description).trim().toLowerCase() !== "null" ? `<span class="dl10-file-desc">${esc(String(file.description).slice(0, 55))}</span>` : "";
  return `<article class="dl10-file">
    <div class="dl10-file-top">
      <span class="dl10-file-glyph">${dl10Glyph(file.mimeType)}</span>
      <div style="min-width:0;flex:1">
        <div class="dl10-file-title" title="${esc(file.originalName || file.fileName)}">${esc(file.originalName || file.fileName)}</div>
        ${desc}
      </div>
    </div>
    <div class="dl10-file-meta">${meta}</div>
    <a class="dl10-dl-btn" href="${url}" target="_blank" rel="noopener" data-action="track-download" data-file-id="${file.id}">⇩ تحميل الملف</a>
  </article>`;
}
function downloadsPage() {
  const heading = `<div class="dl10-hero"><h1>📂 مركز التحميلات</h1><p>مكتبة شاملة من النماذج والملفات الأكاديمية — واجبات، سيَر ذاتية، عروض تقديمية وأكثر — جاهزة للتحميل والاستخدام المباشر.</p><div class="dl10-stats" id="dl10-hero-stats"></div></div>`;
  if (Array.isArray(siteDownloads?.categories) && siteDownloads.categories.some(cat => Array.isArray(cat.files) && cat.files.length)) {
    const categories = siteDownloads.categories.filter(cat => Array.isArray(cat.files) && cat.files.length);
    const totalFiles = categories.reduce((s, c) => s + c.files.length, 0);
    const totalDl = siteDownloads.categories.reduce((s, c) => s + (Array.isArray(c.files) ? c.files.reduce((a, f) => a + Number(f.downloadCount || 0), 0) : 0), 0);
    setTimeout(() => {
      const statsEl = document.getElementById("dl10-hero-stats");
      if (statsEl) statsEl.innerHTML = `<div class="dl10-stat"><b>${categories.length.toLocaleString("ar-SA-u-nu-latn")}</b><span>قسم</span></div><div class="dl10-stat"><b>${totalFiles.toLocaleString("ar-SA-u-nu-latn")}</b><span>ملف متاح</span></div><div class="dl10-stat"><b>${totalDl.toLocaleString("ar-SA-u-nu-latn")}</b><span>تحميل</span></div>`;
    }, 50);
    const tabs = `<div class="dl10-tabs" id="dl10-tabs">${["all", ...categories.map(c => c.id)].map(id => {
      const cat = id === "all" ? null : categories.find(c => Number(c.id) === Number(id));
      return `<button type="button" class="dl10-tab ${id === "all" ? "dl10-tab-active" : ""}" data-dl10-filter="${id}">${id === "all" ? "🗂 كل الأقسام" : `${esc(cat.emoji || "📁")} ${esc(cat.name)}`}<span style="opacity:.75;font-weight:600">${id === "all" ? totalFiles : cat.files.length}</span></button>`;
    }).join("")}</div>`;
    const sections = categories.map(cat => `<section class="dl10-section" id="dl10-sec-${cat.id}" data-dl10-cat-id="${cat.id}">
      <div class="dl10-section-head">
        <span class="dl10-section-emoji" style="background:linear-gradient(135deg,${esc(cat.color || "#4f46e5")},${esc(cat.color ? shadeColor(cat.color, 35) : "#6366f1")})">${esc(cat.emoji || "📁")}</span>
        <div><h2>${esc(cat.name)}</h2>${cat.description ? `<p>${esc(String(cat.description).slice(0, 120))}</p>` : ""}</div>
        <span class="dl10-count">${cat.files.length} ملف</span>
      </div>
      <div class="dl10-grid">${cat.files.map(dl10FileCard).join("")}</div>
    </section>`).join("");
    return `<div class="container section">${dl10Styles()}${heading}${tabs}${sections}</div>`;
  }
  return `<div class="container section">${dl10Styles()}${heading}<div class="dl10-empty"><span class="glyph">📥</span><b>تجهّز المكتبة حالياً</b><p>لا توجد ملفات متاحة بعد. نتابع رفع أحدث النماذج والملفات الأكاديمية لتجدها هنا قريباً.</p></div></div>`;
}
function shadeColor(hex, percent) {
  let color = String(hex || "#4f46e5").replace("#", "");
  if (color.length === 3) color = color.split("").map(ch => ch + ch).join("");
  const num = parseInt(color, 16);
  const r = Math.min(255, (num >> 16) + percent), g = Math.min(255, ((num >> 8) & 255) + percent), b = Math.min(255, (num & 255) + percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
function bindDl10Tabs() {
  document.addEventListener("click", e => {
    const tab = e.target.closest ? e.target.closest("[data-dl10-filter]") : null;
    if (!tab) return;
    const id = tab.getAttribute("data-dl10-filter");
    document.querySelectorAll(".dl10-tab").forEach(t => t.classList.toggle("dl10-tab-active", t === tab));
    document.querySelectorAll(".dl10-section").forEach(sec => {
      sec.style.display = id === "all" || String(sec.dataset.dl10CatId) === String(id) ? "" : "none";
    });
  }, { capture: true });
}
if (typeof window !== "undefined" && !window.__dl10TabsBound) { window.__dl10TabsBound = true; bindDl10Tabs(); }
async function trackPublicDownload(fileId) {
  try { await rpcMutation("site.downloads.trackDownload", { id: Number(fileId) }); } catch (e) { console.warn("[downloads] track failed", e); }
}

function testimonialsPage() {
  return `<div class="container section"><div class="text-center"><h1 class="page-title">آراء طلابنا</h1><p class="page-intro">نفخر بثقة طلابنا ونعتز بتقييماتهم التي تدفعنا لتقديم الأفضل دائماً.</p></div><div class="grid grid-3" style="margin-bottom:4rem">${REVIEWS.map((rev) => `<article class="card review-card"><div class="stars">★★★★★</div><p class="review-text">"${rev.text}"</p><div class="review-author"><span class="avatar">${rev.name.charAt(0)}</span><div><b>${rev.name}</b><small class="text-muted" style="display:block">${rev.uni}</small></div></div></article>`).join("")}</div><div class="card card-pad" style="max-width:700px;margin:auto;background:color-mix(in srgb,var(--muted) 40%,transparent)"><h2 class="text-center">شاركنا رأيك</h2><form data-form="review" class="grid"><div class="grid grid-2"><div class="field"><input name="name" placeholder="الاسم الكريم" required /></div><div class="field"><input name="university" placeholder="الجامعة" required /></div></div><div class="field"><textarea name="review" placeholder="اكتب رأيك هنا..." required></textarea></div><button class="btn btn-primary" type="submit">إرسال التقييم</button></form></div></div>`;
}

function blogPage() {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const active = params.get("category") || "الكل";
  const search = (managedBlogSearch || "").trim();
  let categories = [];
  let articles = [];
  if (managedBlog && managedBlog.categories.length > 0) {
    categories = ["الكل", ...managedBlog.categories.filter((c) => c.isVisible !== false).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)).map((c) => c.name)];
    articles = managedBlog.articles.filter((a) => a.isVisible !== false).map((a, index) => ({ id: a.id, slug: a.slug, title: a.title, category: a.categoryName || "عام", date: a.publishedText || a.publishedAt || "", summary: a.summary || "", content: a.body || a.summary || "", imageUrl: a.imageUrl || null, sortOrder: a.sortOrder, legacyId: index + 1 }));
  }
  if (articles.length === 0) {
    categories = ["الكل", "البحث العلمي", "نصائح دراسية", "مشاريع تخرج"];
    articles = ARTICLES.filter((a) => a.isVisible !== false).map((a, index) => ({ id: a.id, slug: null, title: a.title, category: a.category || "عام", date: a.date || "", summary: a.summary || "", content: a.content || "", imageUrl: null, sortOrder: index, legacyId: index + 1 }));
  }
  let filtered = active === "الكل" ? articles : articles.filter((a) => a.category === active);
  if (search) filtered = filtered.filter((a) => `${a.title} ${a.summary} ${a.content}`.includes(search));
  return `<div class="container section"><div class="text-center"><h1 class="page-title">المدونة الأكاديمية</h1><p class="page-intro">مقالات ونصائح قيمة لدعم مسيرتك التعليمية وتطوير مهاراتك.</p></div><div class="grid" style="grid-template-columns:1fr 280px;align-items:start;gap:1.5rem;margin-bottom:1.5rem"><div class="category-pills">${categories.map((cat) => `<a class="btn ${cat === active ? "btn-primary" : "btn-outline"}" href="#/blog?category=${encodeURIComponent(cat)}">${cat}</a>`).join("")}</div><div class="field"><input data-action="blog-search" placeholder="ابحث في المقالات..." /></div></div>${filtered.length ? `<div class="grid grid-3">${filtered.map((a) => `<article class="card article-card"><div class="article-cover">${a.imageUrl ? `<img src="${esc(a.imageUrl)}" alt="${esc(a.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" loading="lazy" />` : "▤"}</div><div class="article-body"><div class="article-meta"><span>◷ ${esc(a.date)}</span><span>◈ ${esc(a.category)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><button class="btn btn-outline" data-action="open-article" data-article="${a.id}">اقرأ المزيد</button></div></article>`).join("")}</div>` : `<div class="text-center text-muted" style="padding:3rem">لم نتمكن من العثور على مقالات تطابق بحثك أو تصنيفك. يرجى تجربة كلمات أخرى أو تصفح التصنيفات.</div>`}${articleModal()}</div>`;
}
let managedBlogSearch = "";
function renderMarkdown(body) {
  const safe = esc(String(body || ""));
  const lines = safe.split(/\r?\n/);
  const blocks = [];
  let buffer = [];
  const flush = () => { if (buffer.length) { blocks.push(`<p>${buffer.join("<br/>")}</p>`); buffer = []; } };
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,6}\s/.test(trimmed)) { const level = /^#+/.exec(trimmed)[0].length; flush(); blocks.push(`<h${Math.min(level + 2, 5)} class="article-h">${trimmed.replace(/^#+\s*/, "")}</h${Math.min(level + 2, 5)}>`); continue; }
    if (/^[\-\*]\s/.test(trimmed)) { flush(); if (!inList) { blocks.push("<ul class=\"article-ul\">"); inList = true; } blocks.push(`<li>${applyInline(trimmed.replace(/^[\-\*]\s/, ""))}</li>`); continue; }
    if (/^\d+\.\s/.test(trimmed)) { flush(); if (!inList) { blocks.push("<ol class=\"article-ul\">"); inList = true; } blocks.push(`<li>${applyInline(trimmed.replace(/^\d+\.\s/, ""))}</li>`); continue; }
    if (inList) { blocks.push("</ul>"); inList = false; }
    if (trimmed === "" || /^\*{3,}$/.test(trimmed)) { flush(); continue; }
    buffer.push(applyInline(trimmed));
  }
  flush();
  if (inList) blocks.push("</ul>");
  return blocks.join("");
}
function applyInline(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<i>$1</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
function articleModal() {
  if (!state.article) return "";
  const a = state.article;
  const shareUrl = location.origin + "/#/blog/article/" + encodeURIComponent(a.slug || String(a.id));
  const shareTitle = encodeURIComponent(String(a.title || ""));
  return `<div class="modal open" data-action="close-modal"><article class="modal-card" data-modal-card style="max-width:720px"><div class="modal-head"><div><span class="btn btn-muted" style="min-height:auto;padding:.25rem .5rem;font-size:.7rem">${esc(a.category)}</span><small class="text-muted" style="display:block;margin-top:.4rem">◷ ${esc(a.date)}</small><h2>${esc(a.title)}</h2></div><button class="modal-close" data-action="close-modal">×</button></div>${a.imageUrl ? `<img src="${esc(a.imageUrl)}" alt="${esc(a.title)}" style="width:100%;border-radius:12px;max-height:300px;object-fit:cover" loading="lazy" />` : ""}<div class="modal-content">${a.body || a.content ? renderMarkdown(a.body || a.content) : `<p>${esc(a.summary || a.content || "")}</p>`}<div class="share-row" style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:1.5rem"><b>شارك المقال:</b><span><a class="btn btn-outline" href="https://twitter.com/intent/tweet?text=${shareTitle}" target="_blank" rel="noopener">تويتر</a> <a class="btn btn-outline" href="${wa(a.title)}" target="_blank" rel="noopener">واتساب</a> <a class="btn btn-outline" href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareTitle}" target="_blank" rel="noopener">تيليجرام</a> <button class="btn btn-outline" data-action="copy-article-link" data-article-link="${shareUrl}">⧉ نسخ الرابط</button></span></div></div></article></div>`;
}
function blogArticlePage() {
  const slug = decodeURIComponent(currentPath().replace(/^\/blog\/article\//, ""));
  const article = managedBlog?.articles?.find((a) => a.slug === slug) || managedBlog?.articles?.find((a) => String(a.id) === slug);
  if (!article) return notFound();
  const shareUrl = location.origin + "/#/blog/article/" + encodeURIComponent(String(article.slug || article.id));
  const shareTitle = encodeURIComponent(String(article.title || ""));
  return `<div class="container section" style="max-width:880px"><article class="card card-pad" style="padding:2rem"><div class="article-meta" style="margin-bottom:1rem"><span>◷ ${esc(article.publishedText || "")}</span><span>◈ ${esc(article.categoryName || "عام")}</span></div>${article.imageUrl ? `<img src="${esc(article.imageUrl)}" alt="${esc(article.title)}" style="width:100%;border-radius:12px;max-height:380px;object-fit:cover;margin-bottom:1.5rem" loading="lazy" />` : ""}<h1 class="page-title" style="font-size:1.7rem">${esc(article.title)}</h1>${article.summary ? `<p class="text-muted" style="font-size:1.02rem;margin:1rem 0">${esc(article.summary)}</p>` : ""}<div class="article-body-full">${renderMarkdown(article.body || article.summary || "")}</div><div class="share-row" style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:2rem"><b>شارك المقال:</b><span><a class="btn btn-outline" href="https://twitter.com/intent/tweet?text=${shareTitle}" target="_blank" rel="noopener">تويتر</a> <a class="btn btn-outline" href="${wa(article.title)}" target="_blank" rel="noopener">واتساب</a> <a class="btn btn-outline" href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareTitle}" target="_blank" rel="noopener">تيليجرام</a> <button class="btn btn-outline" data-action="copy-article-link" data-article-link="${shareUrl}">⧉ نسخ الرابط</button></span></div><a class="btn btn-muted" href="#/blog" style="margin-top:1.5rem;display:inline-block">← العودة للمدونة</a></article></div>`;
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

function buildContactCards() {
  const cards = [];
  const channels = (managedContact?.channels || []).filter((c) => c.type !== "social");
  if (channels.length > 0) {
    for (const channel of channels) {
      const ico = { whatsapp: "◉", mobile: "☎", email: "✉", address: "⌖" }[channel.type] || "•";
      let value = "";
      let href = "";
      if (channel.type === "whatsapp") {
        const number = (channel.number || "").replace(/\s/g, "");
        value = "+" + number; href = wa("");
      } else if (channel.type === "mobile") {
        const number = (channel.number || "").replace(/\s/g, "");
        const tel = number.startsWith("+") ? number : "+" + number;
        value = tel; href = "tel:" + tel;
      } else if (channel.type === "email") {
        value = channel.email || ""; href = "mailto:" + (channel.email || "");
      } else if (channel.type === "address") {
        value = channel.address || ""; href = "";
      }
      if (!value) continue;
      cards.push([ico, channel.label || value, value, href, channel.imageUrl || null]);
    }
  }
  if (cards.length === 0) {
    const phone = siteSettings.phone || "+966 56 768 0470";
    cards.push(
      ["◉", "واتساب", phone, wa(), null],
      ["☎", "جوال", phone, "tel:" + phone.replace(/\s/g, ""), null],
      ["✉", "البريد الإلكتروني", siteSettings.email || "wajbatbls@gmail.com", "mailto:" + (siteSettings.email || "wajbatbls@gmail.com"), null],
      ["⌖", "العنوان", siteSettings.address || "الرياض، المملكة العربية السعودية", "", null],
    );
  }
  return cards;
}

function fallbackSocialRow() {
  return `<a class="social" href="${wa()}" target="_blank" rel="noopener">◉</a><a class="social" href="#" aria-label="فيسبوك">f</a><a class="social" href="#" aria-label="إنستغرام">◎</a><a class="social" href="#" aria-label="تويتر">𝕏</a><a class="social" href="#" aria-label="يوتيوب">▶</a>`;
}

function dynamicSocialRow() {
  const channels = (managedContact?.channels || []).filter((c) => c.type === "social").sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  if (channels.length > 0) {
    return channels.map((channel) => {
      const accent = safeCss(channel.accentColor || "");
      const bg = safeCss(channel.backgroundColor || "");
      const border = safeCss(channel.borderColor || "");
      const text = safeCss(channel.textColor || "");
      const platformKey = (channel.platform || "").toLowerCase();
      const PLATFORM_SYMBOLS = { twitter: "𝕏", x: "𝕏", facebook: "f", instagram: "◉", snapchat: "◧", tiktok: "♪", youtube: "▶", linkedin: "in", telegram: "✈", whatsapp: "◉" };
      const storedIcon = (channel.icon || "").trim();
      const iconChar = PLATFORM_SYMBOLS[platformKey] || (storedIcon.length === 1 ? storedIcon : (storedIcon || channel.platformName || channel.platform || "🔗").slice(0, 2));
      const showName = ["rectangle", "card", "large-card"].includes(channel.shape);
      const layout = channel.shape === "circle" ? "border-radius:50%;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;"
        : channel.shape === "square" ? "border-radius:10px;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;"
        : channel.shape === "rectangle" ? "border-radius:10px;padding:8px 14px;display:inline-flex;align-items:center;gap:8px;height:44px;"
        : channel.shape === "card" ? "border-radius:12px;padding:8px 16px;display:inline-flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);height:44px;"
        : channel.shape === "large-card" ? "border-radius:16px;padding:12px 20px;display:inline-flex;align-items:center;gap:12px;box-shadow:0 3px 12px rgba(0,0,0,.1);"
        : "border-radius:50%;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;";
      const colors = `${accent ? "color:" + accent + ";" : ""}${bg ? "background:" + bg + ";" : ""}${border ? "border:1px solid " + border + ";" : ""}${text && !accent ? "color:" + text + ";" : ""}`;
      return `<a class="social social-dynamic" href="${safeHref(channel.link || "#")}" target="_blank" rel="noopener" aria-label="${esc(channel.platformName || channel.platform || "")}" style="${colors}${layout}">${esc(iconChar)}${showName ? `<span style="font-weight:600">${esc((channel.platformName || channel.platform || "").slice(0, 30))}</span>` : ""}</a>`;
    }).join("");
  }
  return "";
}

async function loadSiteContact() {
  try {
    const result = await rpcQuery("site.contact.publicList");
    managedContact = result || { channels: [] };
  } catch {
    managedContact = { channels: [] };
  }
  if (currentPath() === "/contact") render();
}

let contactItems = [["◉", "واتساب", "+966 56 768 0470", wa()], ["☎", "جوال", "+966 56 768 0470", "tel:+966567680470"], ["✉", "البريد الإلكتروني", "wajbatbls@gmail.com", "mailto:wajbatbls@gmail.com"], ["◷", "ساعات العمل", "متواجدون 24/7", ""], ["⌖", "العنوان", "الرياض، المملكة العربية السعودية", ""]];
function contactPage() {
  const waLink = wa("أريد التواصل مع فريق واجبات بلس");
  const cards = buildContactCards();
  const [waCard, mobCard, emailCard, addrCard] = [
    cards.find((c) => c[0] === "◉"),
    cards.find((c) => c[0] === "☎"),
    cards.find((c) => c[0] === "✉"),
    cards.find((c) => c[0] === "⌖"),
  ];
  const chip = (card, kind) => {
    if (!card) return "";
    const [, label, value, href] = card;
    const inner = href ? `<a class="contact-chip-link" href="${href}" ${href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${esc(value)}</a>` : `<span class="contact-chip-value">${esc(value)}</span>`;
    return `<div class="contact-chip ${kind}"><span class="contact-chip-icon">${card[0]}</span><div class="contact-chip-body"><small class="contact-chip-label">${esc(label)}</small>${inner}</div></div>`;
  };
  const SOCIAL_META = { whatsapp: { icon: "◉", color: "#25D366", aria: "واتساب" }, telegram: { icon: "✈", color: "#26A5E4", aria: "تيليجرام" }, facebook: { icon: "f", color: "#1877F2", aria: "فيسبوك" }, twitter: { icon: "𝕏", color: "#1D9BF0", aria: "تويتر" } };
  const socialIcons = (() => {
    const socials = (managedContact?.channels || []).filter((c) => c.type === "social").sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    if (!socials.length) return "";
    return socials.map((ch) => {
      const key = (ch.platform || "").toLowerCase();
      const meta = SOCIAL_META[key];
      const icon = (meta ? meta.icon : (ch.icon || "🔗")).trim();
      const color = ch.backgroundColor || (meta ? meta.color : "#64748b");
      const aria = meta ? meta.aria : esc(ch.platformName || key || "رابط");
      return `<a class="contact-social-icon" href="${safeHref(ch.link || "#")}" target="_blank" rel="noopener" aria-label="${aria}" style="background:${color}">${esc(icon)}</a>`;
    }).join("");
  })();
  const waChip = waCard
    ? chip(waCard, "wa")
    : `<a class="contact-chip wa" href="${waLink}" target="_blank" rel="noopener"><span class="contact-chip-icon">◉</span><div class="contact-chip-body"><small class="contact-chip-label">واتساب</small><span class="contact-chip-value">${esc(siteSettings.phone || "+966 56 768 0470")}</span></div></a>`;
  const phoneNum = (siteSettings.phone || "+966 56 768 0470").replace(/\s/g, "");
  const mobChip = mobCard
    ? chip(mobCard, "mob")
    : `<a class="contact-chip mob" href="tel:+${phoneNum}"><span class="contact-chip-icon">☎</span><div class="contact-chip-body"><small class="contact-chip-label">رقم الجوال</small><span class="contact-chip-value">+${phoneNum}</span></div></a>`;
  const emailChip = emailCard
    ? chip(emailCard, "email")
    : `<a class="contact-chip email" href="mailto:${esc(siteSettings.email || "wajbatbls@gmail.com")}"><span class="contact-chip-icon">✉</span><div class="contact-chip-body"><small class="contact-chip-label">البريد الإلكتروني</small><span class="contact-chip-value">${esc(siteSettings.email || "wajbatbls@gmail.com")}</span></div></a>`;
  const addrChip = addrCard
    ? chip(addrCard, "addr")
    : `<div class="contact-chip addr"><span class="contact-chip-icon">⌖</span><div class="contact-chip-body"><small class="contact-chip-label">العنوان</small><span class="contact-chip-value">${esc(siteSettings.address || "الرياض، المملكة العربية السعودية")}</span></div></div>`;
  return `<div class="container section contact-page">
    <div class="text-center"><h1 class="page-title">اتصل بنا</h1><p class="page-intro">نحن هنا دائماً لخدمتك والإجابة على جميع استفساراتك الأكاديمية.</p></div>
    <div class="card card-pad contact-info-card"><h2 class="contact-info-title">معلومات التواصل المباشرة</h2><div class="contact-chips">${waChip}${mobChip}${emailChip}${addrChip}</div><div class="contact-social-strip">${socialIcons || `<span class="text-muted" style="font-size:.85rem">لا توجد روابط تواصل اجتماعي بعد</span>`}</div><a class="btn btn-primary contact-send-btn" href="javascript:void(0)" data-action="contact-scroll">أرسل لنا رسالة</a></div>
    <div class="contact-main-grid">
      <div class="contact-form-col">
        <div class="card card-pad"><h2 class="contact-form-title">أرسل لنا رسالة</h2><p class="text-muted contact-form-hint">املأ النموذج أدناه وسنرد عليك في أقرب وقت ممكن.</p><form data-form="contact" class="contact-form"><div class="grid grid-2"><div class="field"><label>الاسم الكريم *</label><input name="name" required placeholder="محمد أحمد" /></div><div class="field"><label>رقم الجوال *</label><input name="phone" required placeholder="05XXXXXXXX" /></div></div><div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" placeholder="example@email.com" dir="ltr" /></div><div class="field"><label>الموضوع *</label><input name="subject" required placeholder="استفسار عن خدمة..." /></div><div class="field"><label>الرسالة *</label><textarea name="message" required placeholder="اكتب رسالتك أو استفسارك هنا..."></textarea></div><button class="btn btn-primary" type="submit">➤ إرسال الرسالة</button></form></div>
      </div>
      <div class="contact-side-col">
        <div class="card card-pad contact-side-card"><h3 class="contact-side-title">تواصل فوري</h3><p class="text-muted" style="font-size:.85rem;margin-bottom:.8rem">للاستجابة الأسرع يفضل التواصل عبر الواتساب مباشرة.</p><div class="social-row" style="margin-bottom:1rem">${dynamicSocialRow() || fallbackSocialRow()}</div><a class="btn btn-green contact-wa-btn" href="${waLink}" target="_blank" rel="noopener">◉ تواصل فوري عبر واتساب</a></div>
      </div>
    </div>
    
  </div>`;
}
let managedTeam = null; // فريق الإدارة من قاعدة البيانات (team_members)
let managedPartners = null; // شركاء النجاح من قاعدة البيانات (partners)
async function loadSiteTeamPartners() {
  try {
    const team = await rpcQuery("site.team.listPublic");
    if (Array.isArray(team)) managedTeam = team;
  } catch { managedTeam = null; }
  try {
    const partnersList = await rpcQuery("site.partners.listPublic");
    if (Array.isArray(partnersList)) managedPartners = partnersList.filter(p => p && p.name && String(p.link || "") !== "NULL" && String(p.logoUrl || "") !== "NULL");
  } catch { managedPartners = null; }
  if (currentPath() === "/about" || currentPath() === "/partners") render();
}
function aboutPage() {
  const goals = [["🛡", "جودة المخرجات", "ضمان أعلى معايير الجودة الأكاديمية في جميع الخدمات المقدمة."], ["♟", "رضا الطلاب", "تحقيق أعلى معدلات الرضا لعملائنا من الطلاب والطالبات."], ["🏆", "التميز المهني", "استقطاب أفضل الكفاءات الأكاديمية لتقديم خدماتنا."], ["▤", "التطور المستمر", "مواكبة أحدث التطورات في المناهج وأساليب التعليم."]];
  const fallbackTeam = [["أحمد عبدالله", "المدير التنفيذي"], ["سارة محمد", "مدير الشؤون الأكاديمية"], ["محمد فهد", "مدير التقنية"], ["نورة خالد", "مدير خدمة العملاء"]];
  const managedTeam = Array.isArray(managedTeam) && managedTeam.length ? managedTeam : fallbackTeam.map(([name, role]) => ({ name, role, description: "", photoUrl: "" }));
  return `<div class="container section"><div class="text-center"><h1 class="page-title">من نحن</h1><p class="page-intro">واجبات بلس هي منصة تعليمية سعودية رائدة، تأسست بهدف تقديم الدعم الأكاديمي الشامل للطلاب والطالبات في مختلف المراحل الدراسية، من خلال نخبة من الخبراء والأكاديميين المتخصصين.</p></div><div class="grid grid-2"><div class="card about-box" style="border-top:4px solid var(--primary)"><div class="round-icon">◉</div><h2>رؤيتنا</h2><p class="text-muted">أن نكون المنصة الأكاديمية الرائدة والموثوقة الأولى في المملكة العربية السعودية، والوجهة المفضلة لكل طالب يبحث عن التميز والنجاح الأكاديمي.</p></div><div class="card about-box" style="border-top:4px solid var(--accent)"><div class="round-icon">◎</div><h2>رسالتنا</h2><p class="text-muted">تقديم خدمات أكاديمية احترافية وعالية الجودة تدعم مسيرة الطلاب العلمية، وتساهم في تذليل الصعاب التي تواجههم، بأسعار تنافسية وبسرية تامة.</p></div></div><section class="section"><h2 class="text-center">أهدافنا الاستراتيجية</h2><div class="grid grid-4" style="margin-top:2rem">${goals.map(([ico, title, desc]) => `<div class="card goal-card"><div class="goal-icon">${ico}</div><h3>${title}</h3><p>${desc}</p></div>`).join("")}</div></section><section class="section"><h2 class="text-center">فريق الإدارة</h2><div class="grid grid-4" style="margin-top:2rem">${managedTeam.map(member => `<div class="team"><div class="team-avatar">${member.photoUrl ? `<img src="${esc(member.photoUrl)}" alt="${esc(member.name)}" />` : "♟"}</div><h3>${esc(member.name)}</h3><p style="color:var(--accent);font-size:.85rem;font-weight:700">${esc(member.role)}</p>${member.description ? `<p class="text-muted" style="font-size:.8rem;margin-top:.4rem">${esc(member.description)}</p>` : ""}</div>`).join("")}</div></section></div>`;
}

function partnersPage() {
  const shapeStyles = (item) => ({
    "--partner-bg": item.backgroundColor || "#eef1f8",
    "--partner-text": item.textColor || "#3f4254",
    "--partner-accent": item.accentColor || "#4966d6",
    "--partner-border": item.borderColor || item.accentColor || "#4966d6",
  });
  const initialOf = (name) => (name || "؟").split(" ").map(w => w.charAt(0)).filter(Boolean).slice(0, 2).join("");
  const isWebsiteUrl = (v) => /^https?:\/\/[^\s]+$/i.test(String(v || ""));
  const isWhatsAppNumber = (v) => /^(\+?[\d][\d\s\-]{7,24})$/.test(String(v || ""));
  const partnerCard = (item) => {
    const rawLink = String(item.link || "").trim();
    const hasWebsite = isWebsiteUrl(rawLink);
    /* لا واتساب إطلاقًا من بطاقة الجامعة — الموقع الرسمي فقط */
    const href = hasWebsite ? esc(rawLink) : "javascript:void(0)";
    const styles = Object.entries(shapeStyles(item)).map(([k, v]) => k + ":" + v).join(";");
    const logoUrlStr = String(item.logoUrl || "");
    const logoUrlOk = item.logoUrl && (/^https?:\/\//i.test(logoUrlStr) || /^\/manus-storage\//.test(logoUrlStr));
    const logo = logoUrlOk
      ? `<img src="${esc(item.logoUrl)}" alt="${esc(item.name)}" loading="lazy" />`
      : `<span class="partner-pro-initial">${esc(initialOf(item.name))}</span>`;
    const hasDescription = Boolean(item.description);
    const noLinkNote = hasWebsite ? "" : `<span class="partner-pro-nolink">لم يتوفر رابط الموقع بعد</span>`;
    const buttons = hasWebsite
      ? `<span class="partner-pro-actions"><a class="partner-pro-btn partner-pro-btn-site" href="${esc(rawLink)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🌐 زيارة موقع الجامعة</a></span>`
      : "";
    return `<a class="partner-pro-card ${hasWebsite ? "" : "partner-pro-card-nolink"}" href="${href}" target="${hasWebsite ? "_blank" : "_self"}" rel="noopener" style="${styles}" ${hasWebsite ? "" : 'onclick="return false"'}>
      <span class="partner-pro-badge">${logo}</span>
      <span class="partner-pro-name">${esc(item.name)}</span>
      <span class="partner-pro-meta">${[item.city, item.kind].filter(Boolean).join(" · ") || "شريك نجاح"}</span>
      ${hasDescription ? `<span class="partner-pro-desc">${esc(item.description)}</span>` : ""}
      ${noLinkNote}
      ${buttons}
    </a>`;
  };
  const dynamicPartners = Array.isArray(managedPartners) && managedPartners.length ? managedPartners : null;
  const rows = dynamicPartners ? dynamicPartners.map(partnerCard).join("") : "";
  const count = dynamicPartners ? dynamicPartners.length : 0;
  const empty = `<div class="empty-state" style="padding:3rem 1rem"><div class="round-icon" style="width:4.5rem;height:4.5rem;font-size:2rem">🤝</div><h3 style="margin-top:1rem">لم تُضف الجهات بعد</h3><p class="text-muted">تتولى إدارة الموقع إضافة الجامعات والشركاء من لوحة الإدارة.</p></div>`;
  return `<div class="container section">
    <div class="partners-hero-banner"><h1 class="page-title" style="color:#fff">شركاء النجاح</h1><p class="page-intro">نفخر بخدمة طلاب وطالبات أعرق الجامعات السعودية والمعاهد التعليمية ونسعى دائماً لدعم مسيرتهم الأكاديمية.</p></div>
    <div class="partners-stats-strip">
      <div class="partners-stat"><div class="partners-stat-num">${count}</div><div class="partners-stat-label">جهة تعليمية شريكة</div></div>
      <div class="partners-stat"><div class="partners-stat-num">كلها</div><div class="partners-stat-label">جامعات ومناطق المملكة</div></div>
      <div class="partners-stat"><div class="partners-stat-num">+24</div><div class="partners-stat-label">ساعة دعم يومي</div></div>
    </div>
    ${dynamicPartners ? `<div class="partner-grid-pro">${rows}</div>` : empty}
    <div class="card card-pad text-center" style="max-width:800px;margin:2rem auto;background:linear-gradient(to right,var(--primary-soft),color-mix(in srgb,var(--accent) 8%,transparent))"><h2>هل جامعتك غير مدرجة؟</h2><p class="text-muted">نحن نقدم خدماتنا لجميع الطلاب في مختلف الجامعات والكليات داخل وخارج المملكة. لا تتردد في التواصل معنا.</p><a class="btn btn-primary" href="${wa("أريد الاستفسار عن خدماتكم")}" target="_blank" rel="noopener">تواصل معنا الآن</a></div>
  </div>`;
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
    default: if (currentPath().startsWith("/blog/article/")) return blogArticlePage(); return notFound();
  }
}

function render() {
  const path = currentPath();
  if (path === "/") syncSeoMetadata();
  else document.title = (path.startsWith("/blog/article/") ? "المقال | المدونة الأكاديمية | واجبات بلس" : { "/services": "الخدمات الأكاديمية | واجبات بلس", "/subscriptions": "باقات الاشتراك | واجبات بلس", "/downloads": "مركز التحميلات | واجبات بلس", "/blog": "المدونة الأكاديمية | واجبات بلس", "/contact": "اتصل بنا | واجبات بلس" }[path] || "واجبات بلس");
  document.querySelector("#app").innerHTML = layout(pageContent());
  applyRenderedDesign();
  if (currentPath() === "/contact") {
    const socialAnchors = Array.from(document.querySelectorAll(".social[aria-label]"));
    const managedSocial = { "فيسبوك": socialLinks.facebook, "إنستغرام": socialLinks.instagram, "تويتر": socialLinks.twitter, "يوتيوب": socialLinks.youtube };
    Object.entries(managedSocial).forEach(([label, href]) => {
      const anchor = socialAnchors.find((a) => a.getAttribute("aria-label") === label);
      if (!anchor) return;
      if (href) { anchor.href = href; anchor.target = "_blank"; anchor.rel = "noopener"; }
      else anchor.remove();
    });
    if ((managedContact?.channels || []).some((c) => c.type === "social")) {
      const row = document.querySelector(".social-row");
      if (row && !row.querySelector(".social-dynamic")) row.innerHTML = dynamicSocialRow() || row.innerHTML;
    }
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
  if (action === "open-article") {
    const articleId = Number(target.dataset.article);
    state.article = (managedBlog?.articles || []).find((a) => a.id === articleId) || ARTICLES.find((a) => a.id === articleId) || null;
    if (state.article) {
      const articleSlug = state.article.slug || String(state.article.id);
      go(`/blog/article/${encodeURIComponent(articleSlug)}`);
    }
  }
  if (action === "track-download") { const fileId = target.dataset.fileId; if (fileId) void trackPublicDownload(fileId).catch(() => {}); else recordContentView(`/downloads/files/${String(target.dataset.download || "")}`); }
  if (action === "close-modal" && (target.classList.contains("modal-close") || !target.closest("[data-modal-card]"))) { state.article = null; render(); }
  if (action === "toggle-faq") { target.parentElement.classList.toggle("open"); }
  if (action === "copy-article-link") {
    const url = target.dataset.articleLink || "";
    const copy = () => { if (navigator.clipboard) return navigator.clipboard.writeText(url); return Promise.resolve().then(() => { const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }); };
    copy().then(() => toast("تم نسخ رابط المقال", "يمكنك الآن مشاركته مع الآخرين.")).catch(() => toast("تعذر النسخ", "يرجى النسخ يدويًا من شريط العنوان."));
  }
  if (action === "contact-scroll") { const fc = document.querySelector("[data-form=contact]"); if (fc) fc.scrollIntoView({ behavior: "smooth", block: "center" }); }
  if (action === "top") window.scrollTo({ top: 0, behavior: "smooth" });
});
document.addEventListener("submit", (event) => { const form = event.target.closest("form[data-form]"); if (form) { event.preventDefault(); handleForm(form).catch((error) => {
  const rawMessage = String(error?.message || "");
  const validationFailure = /description|too_small|expected string to have|validation/i.test(rawMessage);
  toast("تعذر الإرسال", validationFailure ? "يرجى التحقق من جميع الحقول المطلوبة وإكمال وصف الواجب بالتفصيل." : "تعذر حفظ الطلب حالياً. يرجى المحاولة مرة أخرى.");
}); } });
document.addEventListener("input", (event) => {
  if (event.target.dataset.action === "faq-search") {
    const query = event.target.value.trim();
    const list = document.querySelector("#faq-list");
    if (list) list.innerHTML = faqItems(FAQS.filter((faq) => `${faq.q} ${faq.a}`.includes(query)));
  }
  if (event.target.dataset.action === "blog-search") {
    managedBlogSearch = event.target.value;
    const grid = event.target.closest(".container.section, .section")?.querySelector(".grid.grid-3");
    if (grid) {
      const params = new URLSearchParams(location.hash.split("?")[1] || "");
      const active = params.get("category") || "الكل";
      const search = (managedBlogSearch || "").trim();
      let articles = (managedBlog?.articles || []).filter((a) => a.isVisible !== false).map((a, index) => ({ id: a.id, slug: a.slug, title: a.title, category: a.categoryName || "عام", date: a.publishedText || a.publishedAt || "", summary: a.summary || "", content: a.body || a.summary || "", imageUrl: a.imageUrl || null, sortOrder: a.sortOrder, legacyId: index + 1 }));
      if (articles.length === 0) articles = ARTICLES.filter((a) => a.isVisible !== false).map((a, index) => ({ id: a.id, slug: null, title: a.title, category: a.category || "عام", date: a.date || "", summary: a.summary || "", content: a.content || "", imageUrl: null, sortOrder: index, legacyId: index + 1 }));
      const filtered = (active === "الكل" ? articles : articles.filter((a) => a.category === active)).filter((a) => `${a.title} ${a.summary} ${a.content}`.includes(search));
      grid.outerHTML = filtered.length ? `<div class="grid grid-3">${filtered.map((a) => `<article class="card article-card"><div class="article-cover">${a.imageUrl ? `<img src="${esc(a.imageUrl)}" alt="${esc(a.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" loading="lazy" />` : "▤"}</div><div class="article-body"><div class="article-meta"><span>◷ ${esc(a.date)}</span><span>◈ ${esc(a.category)}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><button class="btn btn-outline" data-action="open-article" data-article="${a.id}">اقرأ المزيد</button></div></article>`).join("")}</div>` : `<div class="text-center text-muted" style="padding:3rem">لم نتمكن من العثور على مقالات تطابق بحثك. يرجى تجربة كلمات أخرى.</div>`;
    }
  }
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


async function loadSiteBlog() {
  try {
    const result = await rpcQuery("site.blog.publicList");
    if (Array.isArray(result?.categories) && Array.isArray(result?.articles)) managedBlog = result;
    else managedBlog = { categories: [], articles: [] };
  } catch {
    managedBlog = { categories: [], articles: [] };
  }
}
async function bootSite() {
  try { applyManagedContent(await rpcQuery("site.publicContent")); } catch { /* تُستخدم البيانات الأصلية المرفقة إذا تعذر الاتصال. */ }
  void Promise.all([loadSiteDownloads(), loadSiteContact(), loadSiteBlog(), loadSiteTeamPartners()]).then(() => { if (location.hash.startsWith("#/downloads") || location.hash.startsWith("#/blog") || location.hash.startsWith("#/about") || location.hash.startsWith("#/partners")) render(); }).catch(() => {});
  if (localStorage.getItem("wajbat-theme") === "dark") document.body.classList.add("dark");
  if (!(await resolveVisitorLinkAtEntry())) return;
  const hasInitialHash = Boolean(location.hash);
  if (!hasInitialHash) location.hash = "/";
  else {
    render();
    recordVisit();
  }
}

void bootSite();
function svc24Styles() {
  return `<style data-name="svc24-styles">
.svc24-wrap{min-height:100vh;background:linear-gradient(135deg,#0f1b3d 0%,#14295c 45%,#0a1f4a 100%);color:#e9f0ff}
.svc24-hero{position:relative;padding:3.5rem 1.2rem 2.4rem;overflow:hidden}
.svc24-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(600px 300px at 78% -10%,rgba(99,102,241,.35),transparent 70%),radial-gradient(500px 300px at 12% 110%,rgba(6,182,212,.28),transparent 70%);pointer-events:none}
.svc24-hero-inner{position:relative;max-width:860px;margin:0 auto;text-align:center}
.svc24-hero-img{width:min(100%,720px);max-height:210px;object-fit:cover;display:block;margin:0 auto 1.4rem;border-radius:20px;box-shadow:0 22px 60px rgba(0,0,0,.45)}
.svc24-title{font-size:clamp(1.7rem,4vw,2.6rem);font-weight:800;background:linear-gradient(90deg,#fff,#a5b4fc 55%,#67e8f9);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.02em;line-height:1.35;margin:0 0 .55rem}
.svc24-subtitle{color:#b9c6e8;font-size:clamp(.95rem,2vw,1.15rem);margin:0 auto;max-width:640px;line-height:1.8}
.svc24-stats{display:flex;align-items:center;justify-content:center;gap:.8rem;margin-top:1.3rem;flex-wrap:wrap}
.svc24-stat{display:inline-flex;align-items:center;gap:.45rem;font-size:.95rem;color:#cfd9f2}
.svc24-stat b{background:linear-gradient(90deg,#818cf8,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:1.35rem}
.svc24-dot{width:6px;height:6px;border-radius:50%;background:#4f5dd1;margin:0}
.svc24-grid-container{padding-top:0}
.svc24-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr));gap:1.35rem;padding:0 .5rem 3.5rem;max-width:1180px;margin:0 auto}
.svc24-card{position:relative;text-align:right;background:rgba(255,255,255,.055);border:1px solid rgba(148,163,230,.22);border-radius:22px;padding:1.6rem 1.45rem 1.4rem;cursor:pointer;color:#e9f0ff;overflow:hidden;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .22s cubic-bezier(.23,1,.32,1),box-shadow .22s ease,border-color .22s ease;box-shadow:0 10px 30px rgba(0,0,0,.28);display:flex;flex-direction:column;min-height:190px}
.svc24-glow{position:absolute;width:150px;height:150px;border-radius:50%;filter:blur(55px);opacity:.32;pointer-events:none;top:-40px;right:-30px;transition:opacity .3s ease}
.svc24-glow-1{background:#6366f1}.svc24-glow-2{background:#06b6d4}.svc24-glow-3{background:#8b5cf6}
.svc24-glow-4{background:#3b82f6}.svc24-glow-5{background:#10b981}.svc24-glow-6{background:#f59e0b}
.svc24-card-inner{position:relative;display:flex;flex-direction:column;gap:.65rem;flex:1}
.svc24-icon{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.7rem;background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.22);box-shadow:0 0 22px color-mix(in srgb,var(--svc24-accent) 40%,transparent),inset 0 1px 0 rgba(255,255,255,.25);margin-bottom:.2rem}
.svc24-icon img{width:40px;height:40px;object-fit:cover;border-radius:11px}
.svc24-card h3{font-size:1.18rem;font-weight:800;color:#fff;margin:0;line-height:1.45}
.svc24-preview{color:#aab8dc;font-size:.85rem;line-height:1.65;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.svc24-badge{margin-top:auto;align-self:flex-start;display:inline-flex;align-items:center;gap:.35rem;font-size:.78rem;color:#93b3f5;background:rgba(99,102,241,.16);border:1px solid rgba(99,102,230,.32);border-radius:999px;padding:.28rem .75rem;margin-top:1rem}
.svc24-badge span{color:#a5b4fc;font-weight:800}
.svc24-arrow{position:absolute;left:1.35rem;top:50%;transform:translateY(-50%) rotate(180deg);width:20px;height:20px;color:#7c88c0;opacity:.7;transition:transform .22s cubic-bezier(.23,1,.32,1),opacity .22s ease,color .22s ease}
.svc24-card:hover{transform:translateY(-7px);border-color:color-mix(in srgb,var(--svc24-accent,#6366f1) 55%,transparent);box-shadow:0 24px 55px rgba(0,0,0,.38),0 0 45px color-mix(in srgb,var(--svc24-accent,#6366f1) 28%,transparent)}
.svc24-card:hover .svc24-arrow{transform:translateY(-50%) rotate(180deg) translateX(5px);opacity:1;color:#fff}
.svc24-card:hover .svc24-glow{opacity:.55}
.svc24-card:active{transform:translateY(-3px) scale(.985)}
.svc24-detail{min-height:100vh;background:linear-gradient(160deg,#0f1b3d 0%,#162a5f 55%,#0a1f4a 100%);color:#e9f0ff;padding-bottom:3rem}
.svc24-detail-head{padding:1.1rem .8rem 0;max-width:980px;margin:0 auto}
.svc24-back{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.07);border:1px solid rgba(148,163,230,.25);color:#dbe4ff;font-size:.92rem;font-weight:600;border-radius:12px;padding:.55rem 1rem;cursor:pointer;transition:background .18s ease,transform .14s ease}
.svc24-back svg{width:16px;height:16px}
.svc24-back:hover{background:rgba(255,255,255,.14)}
.svc24-back:active{transform:scale(.96)}
.svc24-head-card{display:flex;align-items:center;gap:1.1rem;background:rgba(255,255,255,.06);border:1px solid rgba(148,163,230,.2);border-radius:22px;padding:1.35rem 1.5rem;margin-top:1rem;box-shadow:0 12px 36px rgba(0,0,0,.25)}
.svc24-head-emoji{flex:none;width:64px;height:64px;border-radius:17px;display:flex;align-items:center;justify-content:center;font-size:2rem;background:linear-gradient(135deg,rgba(99,102,241,.35),rgba(6,182,212,.28));border:1px solid rgba(255,255,255,.2);box-shadow:0 0 26px rgba(99,102,241,.35)}
.svc24-head-emoji img{width:50px;height:50px;object-fit:cover;border-radius:12px}
.svc24-head-card h2{color:#fff;font-size:1.35rem;font-weight:800;margin:0}
.svc24-head-card p{color:#b9c6e8;margin:.3rem 0 0;font-size:.92rem;line-height:1.7}
.svc24-head-count{display:inline-block;margin-top:.5rem;font-size:.78rem;color:#93e2f0;background:rgba(6,182,212,.14);border:1px solid rgba(6,182,212,.3);border-radius:999px;padding:.22rem .7rem}
.svc24-sub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:1.1rem;padding-top:1.6rem}
.svc24-sub{display:flex;align-items:center;gap:.9rem;background:rgba(255,255,255,.07);border:1px solid rgba(148,163,230,.2);border-radius:18px;padding:1.05rem 1.1rem;transition:transform .2s cubic-bezier(.23,1,.32,1),box-shadow .2s ease,border-color .2s ease;box-shadow:0 8px 24px rgba(0,0,0,.22)}
.svc24-sub:hover{transform:translateY(-4px);border-color:rgba(99,102,241,.5);box-shadow:0 16px 38px rgba(0,0,0,.32)}
.svc24-num{flex:none;font-size:1.05rem;font-weight:800;color:#7c8bd4;letter-spacing:.05em;min-width:24px}
.svc24-sub-ico{flex:none;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16)}
.svc24-sub-ico img{width:30px;height:30px;object-fit:cover;border-radius:8px}
.svc24-sub-main{flex:1;display:flex;align-items:center;gap:.7rem;min-width:0}
.svc24-num{flex:none;font-size:1rem;font-weight:800;color:#7c8bd4;letter-spacing:.06em}
.svc24-sub-img{width:62px;height:62px;border-radius:13px;object-fit:cover;flex:none;border:1px solid rgba(255,255,255,.18)}
.svc24-head-emoji img{width:50px;height:50px;object-fit:cover;border-radius:12px}
.svc24-sub-text{flex:1;display:grid;gap:2px;min-width:0}
.svc24-sub-text b{color:#fff;font-size:.98rem}
.svc24-sub-text small{color:#9fb0d4;font-size:.8rem}
.svc24-order{flex:none;position:relative;z-index:1;background:var(--service-button-bg,#25D366)!important;color:var(--service-button-text,#fff)!important;border:1px solid transparent!important;font-weight:700;font-size:.82rem;border-radius:14px;padding:.62rem 1rem;white-space:nowrap;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .2s ease;box-shadow:0 6px 18px rgba(37,211,102,.25)}
.svc24-order:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(37,211,102,.4)}
.svc24-order:active{transform:scale(.95)}
.svc24-order.pill{border-radius:999px}
.svc24-order.square{border-radius:5px}
.svc24-order.small{font-size:.76rem;padding:.44rem .7rem}
.svc24-order.large{font-size:.92rem;padding:.8rem 1.15rem}
.svc24-sub-img{width:58px;height:58px;border-radius:12px;object-fit:cover;flex:none}
.svc24-cta{text-align:center;margin-top:2.2rem;padding-top:1rem}
@media(max-width:700px){
  .svc24-grid{grid-template-columns:1fr;gap:1rem}
  .svc24-sub-grid{grid-template-columns:1fr}
  .svc24-sub{flex-wrap:wrap}
  .svc24-order{width:100%;text-align:center}
  .svc24-head-card{flex-direction:column;text-align:center}
  .svc24-title{font-size:1.6rem}
}
@media(prefers-reduced-motion:reduce){
  .svc24-card,.svc24-sub,.svc24-arrow,.svc24-back,.svc24-order{transition:none!important;animation:none!important}
  .svc24-card:hover{transform:none}
}
</style>`;
}
