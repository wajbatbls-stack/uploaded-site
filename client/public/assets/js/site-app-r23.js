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
const wa = (message = "") => `https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
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
    <img class="hero-logo" src="${logoUrl}" alt="واجبات بلس" onerror="this.style.display='none'" />
    <div><h1>واجبات بلس</h1><p class="typing"><span id="typing-text"></span><span class="typing-cursor">|</span></p></div>
    <div class="hero-actions"><a class="btn btn-green" href="${wa("أريد طلب خدمة")}" target="_blank" rel="noopener">🚀 اطلب خدمتك الآن</a>${link("/services", "📚 تصفح الخدمات", "btn btn-outline")}</div>
    <div class="hero-badge">⭐ ضمان الجودة 100% · سرية تامة · دعم 24/7 ⭐</div>
  </div></section>`;
  const hero = home.hero || {};
  const bg = home.background || {};
  const sections = Array.isArray(home.sections) ? home.sections : [];
  const visible = id => sections.find(section => section.id === id)?.visible !== false;
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
  const heroLogo = home.logo?.url || logoUrl;
  const heroStyle = `--home-hero-text:${safeCss(hero.textColor || "#ffffff")};--home-hero-heading:${safeCss(hero.headingColor || "#ffffff")};--home-hero-font:${safeCss(hero.fontFamily || "Cairo")};--home-hero-weight:${Number(hero.fontWeight || 800)};--home-hero-title-size:${Number(hero.titleSize || 46)}px;--home-hero-description-size:${Number(hero.descriptionSize || 17)}px;--home-hero-gap:${Number(hero.spacing || 18)}px;${background ? `background-image:${background};background-size:${safeCss(bg.imageSize || "cover")};background-position:${safeCss(bg.imagePosition || "center")};background-repeat:${safeCss(bg.imageRepeat || "no-repeat")}` : ""}`;
  const heroMarkup = `<section class="hero home-managed-hero home-hero-template-${esc(hero.template || "classic")} home-hero-align-${esc(hero.align || "center")}" data-home-animation="${esc(hero.animation || "fade-up")}" data-home-repeat="${esc(hero.animationRepeat || "once")}" style="${heroStyle}"><div class="particles">${particles}</div><div class="hero-rings"></div><div class="hero-inner">
    <div class="clock"><p class="clock-date" id="clock-date"></p><div class="clock-time"><span class="clock-unit" id="clock-hour">00</span><b>:</b><span class="clock-unit" id="clock-minute">00</span><b>:</b><span class="clock-unit" id="clock-second">00</span><span class="clock-ampm" id="clock-ampm">ص</span></div><div class="clock-labels"><span>ساعة</span><span>دقيقة</span><span>ثانية</span></div></div>
    ${home.logo?.visible === false ? "" : `<img class="hero-logo" src="${esc(heroLogo)}" alt="واجبات بلس" style="width:${Number(home.logo?.width || 94)}px;height:${Number(home.logo?.height || 94)}px" onerror="this.style.display='none'" />`}
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
  const servicesMarkup = visible("services") && serviceConfig.visible !== false ? `<section class="home-managed-section home-services-section" data-home-services-layout="${esc(serviceConfig.layout || "grid")}" data-home-card-style="${esc(serviceConfig.cardStyle || "soft")}" data-home-card-size="${esc(serviceConfig.size || "medium")}"><div class="container"><header class="home-section-heading"><h2 style="color:${safeCss(serviceConfig.titleColor || "#123b78")}">${esc(serviceConfig.title || "خدماتنا الأكاديمية")}</h2><p>${esc(serviceConfig.description || "")}</p></header><div class="home-services-grid">${displayServices.map(service => `<a class="home-service-card" href="#/services" style="--home-card-bg:${safeCss(service.backgroundColor || serviceConfig.cardColor || "#fff")};--home-card-border:${safeCss(service.borderColor || serviceConfig.borderColor || "#e6edf8")};--home-service-accent:${safeCss(service.color || "#4966d6")};"><span>${service.iconUrl ? `<img src="${esc(service.iconUrl)}" alt="" />` : esc(service.emoji || "📚")}</span><h3>${esc(service.title)}</h3><p>${esc((service.items || []).slice(0, 2).map(item => item.title || item).join(" · "))}</p></a>`).join("")}</div></div></section>` : "";
  const featureConfig = home.features || {};
  const featuresMarkup = visible("features") && featureConfig.visible !== false ? `<section class="home-managed-section home-features-section"><div class="container"><header class="home-section-heading"><h2>${esc(featureConfig.title || "لماذا تختار واجبات بلس؟")}</h2><p>${esc(featureConfig.description || "")}</p></header><div class="home-features-grid">${(Array.isArray(featureConfig.items) ? featureConfig.items : []).map((item, index) => `<article><span>${["✓", "◈", "✦"][index % 3]}</span><b>${esc(item)}</b></article>`).join("")}</div></div></section>` : "";
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
  if (!active) return `<div class="container section services-page-managed" data-services-layout="${esc(servicesStyle.layout || "grid")}" style="${sectionStyle}">${servicesStyle.sectionImageUrl ? `<img class="services-section-image" src="${esc(servicesStyle.sectionImageUrl)}" alt="" />` : ""}<div class="text-center">${servicesStyle.showTitle !== false ? `<h1 class="page-title">${esc(servicesStyle.title || "خدماتنا الأكاديمية")}</h1>` : ""}${servicesStyle.showDescription !== false ? `<p class="page-intro">${esc(servicesStyle.description || "اختر القسم المطلوب لعرض الخدمات الفرعية المتاحة")}</p>` : ""}</div><div class="grid service-grid service-managed-grid">${SERVICES.map((srv) => `<button class="service-card service-template-${esc(srv.template || servicesStyle.mainTemplate || "elevated")}" data-service-animation="${esc(srv.animation || servicesStyle.mainAnimation || "none")}" style="${serviceSurfaceStyle(srv,servicesStyle)}" data-action="select-service" data-service="${srv.id}">${srv.imageUrl ? `<img class="service-card-image" src="${esc(srv.imageUrl)}" alt="" />` : ""}<span class="service-emoji">${srv.iconUrl ? `<img src="${esc(srv.iconUrl)}" alt="" />` : esc(srv.emoji)}</span><h3>${esc(srv.title)}</h3>${srv.description ? `<p>${esc(srv.description)}</p>` : ""}</button>`).join("")}</div></div>`;
  return `<div class="container section services-detail-managed"><button class="btn btn-outline" data-action="back-services">← العودة للأقسام</button><div class="service-detail-head"><span class="emoji">${active.iconUrl ? `<img src="${esc(active.iconUrl)}" alt="" />` : esc(active.emoji)}</span><div><h2>${esc(active.title)}</h2><p class="text-muted">${esc(active.description || "اختر الخدمة المطلوبة واضغط زر الطلب للتواصل الفوري")}</p></div></div><div class="grid">${active.items.map((item, i) => { const title = item.title || item; const target = serviceButtonHref(item,title,active.title); const buttonStyle = `--service-button-bg:${safeCss(item.buttonColor || "#25D366")};--service-button-text:${safeCss(item.buttonTextColor || "#fff")};`; return `<div class="card service-item service-sub-template-${esc(item.template || servicesStyle.subTemplate || "line")}" data-service-animation="${esc(item.animation || servicesStyle.subAnimation || "none")}" style="${serviceSurfaceStyle(item,servicesStyle)}">${item.imageUrl ? `<img class="service-sub-image" src="${esc(item.imageUrl)}" alt="" />` : ""}<div class="service-item-main"><span class="number">${i + 1}</span><span>${item.iconUrl ? `<img src="${esc(item.iconUrl)}" alt="" />` : esc(item.emoji || "•")}</span><div><b>${esc(title)}</b>${item.description ? `<small>${esc(item.description)}</small>` : ""}</div></div><a class="btn service-order-button service-button-${esc(item.buttonStyle || "rounded")} service-button-${esc(item.buttonSize || "medium")}" data-button-animation="${esc(item.buttonAnimation || "none")}" style="${buttonStyle}" href="${esc(target.href)}" ${target.external ? 'target="_blank" rel="noopener"' : ""}>${esc(item.buttonIcon || "◉")} ${esc(item.buttonText || "اطلب الخدمة")}</a></div>`; }).join("")}</div><div class="text-center" style="margin-top:2rem"><a class="btn btn-primary" href="${wa(`أريد الاستفسار عن قسم: ${active.title}`)}" target="_blank" rel="noopener">◉ تواصل لجميع خدمات هذا القسم</a></div></div>`;
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
function fileCardHtml(file) {
  const count = Number(file?.downloadCount ?? 0);
  const meta = count > 0 ? `تحميل: ${count.toLocaleString("ar-SA")} مرة` : "جاهز للتحميل";
  const desc = file?.description ? ` · <small>${esc(file.description)}</small>` : "";
  return `<div class="card file-card"><div class="file-info"><span class="file-icon">▤</span><div><div class="file-name">${esc(file.name)}</div><div class="file-meta">${meta}${desc}</div></div></div><a class="btn btn-outline" style="padding:.4rem .6rem;font-size:.72rem" href="${String(file.directUrl || "").replace(/["\\]/g, "")}" target="_blank" rel="noopener" data-action="track-download" data-file-id="${file.id}">⇩ تحميل</a></div>`;
}
function dynamicDownloadsPageHtml() {
  if (!siteDownloads) return null;
  const categories = siteDownloads.categories.filter((cat) => Array.isArray(cat.files));
  const heading = `<div class="text-center"><h1 class="page-title">مركز التحميلات</h1><p class="page-intro">مكتبة شاملة من النماذج والملفات الأكاديمية الجاهزة للتحميل والاستخدام المباشر.</p></div>`;
  if (!categories.length) return `<div class="container section">${heading}<p class="text-center text-muted">لا توجد ملفات متاحة حالياً. تابعنا قريباً!</p></div>`;
  const sections = categories.map((cat) => `<section class="download-section"><div class="section-heading"><span>${cat.emoji || "▤"}</span><h2>${esc(cat.name)}</h2><span class="count">${cat.files.length} ملف</span></div><div class="grid grid-4">${cat.files.map(fileCardHtml).join("")}</div></section>`);
  return `<div class="container section">${heading}${sections.join("")}</div>`;
}
function downloadsPage() {
  const dynamic = dynamicDownloadsPageHtml();
  if (dynamic) return dynamic;
  return `<div class="container section"><div class="text-center"><h1 class="page-title">مركز التحميلات</h1><p class="page-intro">مكتبة شاملة من النماذج والملفات الأكاديمية الجاهزة للتحميل والاستخدام المباشر — 8 فئات، مجاناً للجميع.</p></div>${files.map(([emoji, title, items], category) => `<section class="download-section"><div class="section-heading"><span>${emoji}</span><h2>${title}</h2><span class="count">${items.length} ملف</span></div><div class="grid grid-4">${items.map(([name, file], i) => `<div class="card file-card"><div class="file-info"><span class="file-icon">▤</span><div><div class="file-name">${name}</div><div class="file-meta">تحميل: ${100 + ((category + 1) * (i + 3) * 17)}+ مرة</div></div></div><a class="btn btn-outline" style="padding:.4rem .6rem;font-size:.72rem" href="${fileBase + file}" target="_blank" rel="noopener" data-action="track-download" data-download="${encodeURIComponent(name)}">⇩ تحميل</a></div>`).join("")}</div></section>`).join("")}</div>`;
}
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
    if (Array.isArray(partnersList)) managedPartners = partnersList;
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
  const template = (siteSettings && siteSettings.partnersTemplate) || "glass";
  const gridClass = template === "banner" ? "partner-grid-banner" : template === "circles" ? "partner-grid-circles" : "partner-grid-card";
  const shapeStyles = (item) => ({
    "--partner-bg": item.backgroundColor || "#eef1f8",
    "--partner-text": item.textColor || "#3f4254",
    "--partner-accent": item.accentColor || "#4966d6",
    "--partner-border": item.borderColor || item.accentColor || "#4966d6",
  });
  const shapeClass = (item) => `partner-shape-${item.shape || "card"}`;
  const partnerCard = (item) => `<a class="partner-card ${shapeClass(item)}" href="${item.link ? esc(item.link) : wa("أريد الاستفسار عن " + item.name)}" target="_blank" rel="noopener" style="${Object.entries(shapeStyles(item)).map(([k, v]) => k + ":" + v).join(";")}">
    <span class="partner-logo-wrap">${item.logoUrl ? `<img src="${esc(item.logoUrl)}" alt="${esc(item.name)}" loading="lazy" />` : '<span class="partner-fallback-logo">' + (item.kind === "معهد" ? "▤" : "▣") + "</span>"}</span>
    <span class="partner-name">${esc(item.name)}</span>
    <span class="partner-meta">${[item.city, item.kind].filter(Boolean).join(" · ")}</span>
    ${item.description ? `<span class="partner-desc">${esc(item.description)}</span>` : ""}
  </a>`;
  const dynamicPartners = Array.isArray(managedPartners) && managedPartners.length ? managedPartners : null;
  const rows = dynamicPartners ? dynamicPartners.map(partnerCard).join("") : "";
  const empty = `<div class="empty-state" style="padding:3rem 1rem"><div class="round-icon" style="width:4.5rem;height:4.5rem;font-size:2rem">🤝</div><h3 style="margin-top:1rem">لم تُضاف الجهات بعد</h3><p class="text-muted">تتولى إدارة الموقع إضافة الجامعات والشركاء من لوحة الإدارة.</p></div>`;
  return `<div class="container section"><div class="text-center"><h1 class="page-title">شركاء النجاح</h1><p class="page-intro">نفخر بخدمة طلاب وطالبات أعرق الجامعات السعودية والمعاهد التعليمية ونسعى دائماً لدعم مسيرتهم الأكاديمية.</p></div>${dynamicPartners ? `<div class="${gridClass} ${template === "circles" ? "partner-circles-template" : ""}">${rows}</div>` : empty}<div class="card card-pad text-center" style="max-width:800px;margin:2rem auto;background:linear-gradient(to right,var(--primary-soft),color-mix(in srgb,var(--accent) 8%,transparent))"><h2>هل جامعتك غير مدرجة؟</h2><p class="text-muted">نحن نقدم خدماتنا لجميع الطلاب في مختلف الجامعات والكليات داخل وخارج المملكة. لا تتردد في التواصل معنا.</p><a class="btn btn-primary" href="${wa("أريد الاستفسار عن خدماتكم")}" target="_blank" rel="noopener">تواصل معنا الآن</a></div></div>`;
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
