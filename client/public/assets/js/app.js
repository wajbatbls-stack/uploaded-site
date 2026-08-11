import { SITE_CONFIG } from "./config.js";
import { saveRecord, recordCloudVisit } from "./supabase.js";
import {
  ARTICLES, FAQS, INSTITUTES, OTHERS, PLANS, REVIEWS, SERVICE_TYPES,
  SERVICES, SERVICE_SUBS, UNIVERSITIES,
} from "../../pages/content.js";

const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663266205125/c9haZQXaJt4uRTkEadgd4A/photo_AQAD7w1rG_fAmFJ-_4841a962.jpg";
const statsKey = "wajbat_stats_v1";
const ownerCode = "773128012737414442";
const ownerPass = "abd";
const state = { sidebar: false, servicesOpen: false, selectedService: null, article: null, statsLoggedIn: false };

const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const wa = (message = "") => `https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
const link = (path, label, className = "") => `<a class="${className}" href="#${path}">${label}</a>`;
const icon = (emoji) => `<span aria-hidden="true">${emoji}</span>`;

const defaultStats = () => ({
  totalVisitors: 0, todayDate: isoDay(), todayVisitors: 0, monthKey: isoMonth(),
  monthVisitors: 0, totalOrders: 0, totalServices: 0, lastVisit: "",
  visitLog: [], orderLog: [], weeklyVisits: {},
});
function isoDay(date = new Date()) { return date.toISOString().slice(0, 10); }
function isoMonth(date = new Date()) { return date.toISOString().slice(0, 7); }
function arabicDate() { return new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" }); }
function arabicTime() { return new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }); }
function loadStats() {
  try { return { ...defaultStats(), ...(JSON.parse(localStorage.getItem(statsKey) || "null") || {}) }; }
  catch { return defaultStats(); }
}
function saveStats(stats) { try { localStorage.setItem(statsKey, JSON.stringify(stats)); } catch { /* Static hosting may block storage. */ } }
function recordVisit() {
  const data = loadStats();
  const day = isoDay(), month = isoMonth();
  if (data.todayDate !== day) { data.todayDate = day; data.todayVisitors = 0; }
  if (data.monthKey !== month) { data.monthKey = month; data.monthVisitors = 0; }
  data.totalVisitors += 1; data.todayVisitors += 1; data.monthVisitors += 1;
  data.lastVisit = `${arabicDate()} — ${arabicTime()}`;
  data.visitLog = [{ date: arabicDate(), time: arabicTime() }, ...data.visitLog].slice(0, 200);
  data.weeklyVisits[day] = (data.weeklyVisits[day] || 0) + 1;
  const keys = Object.keys(data.weeklyVisits).sort().slice(-30);
  data.weeklyVisits = Object.fromEntries(keys.map((key) => [key, data.weeklyVisits[key]]));
  saveStats(data);
  recordCloudVisit(currentPath()).catch(() => {});
}
function recordOrder(service, student) {
  const data = loadStats();
  data.totalOrders += 1; data.totalServices += 1;
  data.orderLog = [{ date: arabicDate(), time: arabicTime(), service, student: student || "غير محدد" }, ...data.orderLog].slice(0, 200);
  saveStats(data);
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

function logoMarkup(className = "brand-mark") {
  return `<span class="${className}"><img src="${logoUrl}" alt="واجبات بلس" onerror="this.remove();this.parentElement.textContent='و';" /></span>`;
}

function header() {
  return `<div class="ticker"><span>مرحباً بكم في واجبات بلس ⭐ نقدم أفضل الخدمات الأكاديمية ⭐ تواصل معنا على واتساب +966567680470</span></div>
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
    ["/about", "ℹ️", "من نحن"], ["/partners", "🌐", "الشركاء"], ["/stats", "📊", "إحصائيات الموقع"],
  ];
  const serviceSubs = state.servicesOpen ? `<div class="nav-sub open">${SERVICE_SUBS.map((item, i) => link(`/services?category=${i}`, `• ${item}`)).join("")}</div>` : "";
  return `<div class="sidebar-backdrop ${state.sidebar ? "open" : ""}" data-action="close-sidebar"></div>
    <aside class="sidebar ${state.sidebar ? "open" : ""}">
      <div class="sidebar-head"><a class="brand" href="#/">${logoMarkup()}<span><span class="brand-title">واجبات بلس</span><span class="brand-subtitle">Wajibat Plus</span></span></a><button class="btn-icon" data-action="close-sidebar">×</button></div>
      <nav class="sidebar-nav">${items.map(([href, emoji, label]) => {
        const active = path === href;
        const owner = href === "/stats";
        const row = `<a class="nav-link ${active ? "active" : ""} ${owner ? "owner" : ""}" href="#${href}">${icon(emoji)}<span>${label}</span>${owner ? '<small style="margin-right:auto">مالك</small>' : ""}</a>`;
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
  </div></section><section class="stats-strip"><div class="container"><h2 class="text-center text-primary">أرقامنا تتحدث</h2><div class="grid grid-4" style="margin-top:2rem">${[["5000+", "طالب راضٍ"], ["75+", "خدمة متميزة"], ["99%", "نسبة الرضا"], ["24/7", "ساعة دعم"]].map(([num, label]) => `<div class="stat-box"><div class="stat-number">${num}</div><div class="stat-label">${label}</div></div>`).join("")}</div></div></section>`;
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

const files = [
  ["📝", "نماذج واجبات", [["نموذج واجب 1", "xBCtuEPnzwmjWUaY.pdf"], ["نموذج واجب 2", "ZQWIFqsYHIosworf.pdf"], ["نموذج واجب 3", "uLgCcgITrWNppCLi.pdf"], ["نموذج واجب 4", "ZNKYWKvxzeBjutAI.pdf"]]],
  ["🖥️", "نماذج عروض بوربوينت", [["عرض تقديمي 1", "HYpjmoxQISxaWmTa.pdf"], ["عرض تقديمي 2", "PCSGNdLiEhfmHkJy.pdf"], ["عرض تقديمي 3", "oFISCrxRecNNNMsU.pdf"], ["عرض تقديمي 4", "AqByvIVrwkpjRLUI.pdf"]]],
  ["👤", "نماذج سيرة ذاتية CV", [["سيرة ذاتية 1", "LGcZWkdZaZEccakJ.pdf"], ["سيرة ذاتية 2", "FTIwhNHHDuZDyfaF.pdf"], ["سيرة ذاتية 3", "LGcZWkdZaZEccakJ.pdf"]]],
  ["💡", "نماذج خرائط ذهنية", [["خريطة ذهنية 1", "tmRNhKXOpXtPGOVA.pdf"], ["خريطة ذهنية 2", "xcBhFMtXpwFeXHSm.pdf"], ["خريطة ذهنية 3", "rXslVZzUshZOuHGO.pdf"]]],
  ["📊", "نماذج جداول بيانات", [["جدول بيانات 1", "QyTGDZEbaZMPFHgq.pdf"], ["جدول بيانات 2", "lDZIJADMXorrEgsE.pdf"]]],
  ["📋", "نماذج تقارير", [["تقرير تدريب 1", "yKCFvIHAFfVHPXNL.pdf"], ["تقرير تدريب 2", "ZGQdWqamjnNVbOTz.pdf"]]],
  ["📚", "نماذج بحوث", [["نموذج بحث 1", "xBCtuEPnzwmjWUaY.pdf"], ["نموذج بحث 2", "ZQWIFqsYHIosworf.pdf"]]],
  ["📄", "نماذج اختبارات", [["نموذج اختبار 1", "uLgCcgITrWNppCLi.pdf"], ["نموذج اختبار 2", "ZNKYWKvxzeBjutAI.pdf"]]],
];
const fileBase = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/";
function downloadsPage() {
  return `<div class="container section"><div class="text-center"><h1 class="page-title">مركز التحميلات</h1><p class="page-intro">مكتبة شاملة من النماذج والملفات الأكاديمية الجاهزة للتحميل والاستخدام المباشر — 8 فئات، مجاناً للجميع.</p></div>${files.map(([emoji, title, items], category) => `<section class="download-section"><div class="section-heading"><span>${emoji}</span><h2>${title}</h2><span class="count">${items.length} ملف</span></div><div class="grid grid-4">${items.map(([name, file], i) => `<div class="card file-card"><div class="file-info"><span class="file-icon">▤</span><div><div class="file-name">${name}</div><div class="file-meta">تحميل: ${100 + ((category + 1) * (i + 3) * 17)}+ مرة</div></div></div><a class="btn btn-outline" style="padding:.4rem .6rem;font-size:.72rem" href="${fileBase + file}" target="_blank" rel="noopener">⇩ تحميل</a></div>`).join("")}</div></section>`).join("")}</div>`;
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
  return `<div class="container section" style="max-width:950px"><div class="text-center"><div class="round-icon">🎓</div><h1 class="page-title">نموذج تسليم الواجب</h1><p class="page-intro">أكمل البيانات أدناه وسيتم إرسال طلبك تلقائياً عبر واتساب ليتم التواصل معك فوراً.</p></div><div class="card form-shell"><div class="form-banner">▣ تعبئة بيانات الطلب</div><form class="form-body" data-form="assignment"><section class="form-section"><h3>👤 بيانات الطالب</h3><div class="grid grid-2"><div class="field"><label>اسم الطالب *</label><input name="studentName" required placeholder="محمد أحمد العمري" /></div><div class="field"><label>الرقم الجامعي *</label><input name="studentId" required placeholder="123456789" /></div></div></section><section class="form-section"><h3>🏛️ البيانات الأكاديمية</h3><div class="grid grid-2"><div class="field"><label>اسم الجامعة *</label><select name="university" required><option value="">اختر جامعتك...</option>${UNIVERSITIES.map((u) => `<option>${u}</option>`).join("")}<option>جامعة أخرى</option></select></div><div class="field"><label>الكلية *</label><input name="college" required placeholder="مثال: كلية الحاسب والمعلومات" /></div><div class="field"><label>القسم</label><input name="department" placeholder="مثال: قسم علوم الحاسب" /></div><div class="field"><label>اسم المقرر *</label><input name="course" required placeholder="مثال: برمجة 1 - CS101" /></div><div class="field"><label>دكتور المقرر *</label><input name="professor" required placeholder="مثال: د. عبدالله محمد" /></div></div></section><section class="form-section"><h3>📋 تفاصيل الطلب</h3><div class="grid grid-2"><div class="field"><label>نوع الخدمة المطلوبة *</label><select name="serviceType" required><option value="">اختر نوع الخدمة...</option>${SERVICE_TYPES.map((s, i) => `<option>${i + 1}. ${s}</option>`).join("")}</select></div><div class="field"><label>الموعد النهائي للتسليم *</label><input type="date" name="deadline" required min="${isoDay()}" /></div><div class="field"><label>وصف الواجب بالتفصيل *</label><textarea name="description" required placeholder="اكتب هنا جميع تفاصيل الواجب والشروط المطلوبة بدقة لضمان أعلى جودة ممكنة..."></textarea></div><div class="field"><label>إرفاق ملف <small class="text-muted">(اختياري)</small></label><label class="file-drop">⇧<span>اضغط لرفع ملف (PDF, Word, صورة)</span><input name="attachment" type="file" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" /></label><small class="text-muted text-center">سيُطلب إرسال الملفات عبر واتساب بعد الإرسال</small></div></div></section><button class="btn btn-green" style="width:100%;min-height:3.5rem;font-size:1.05rem" type="submit">➤ إرسال الطلب عبر واتساب</button></form></div></div>`;
}

const contactItems = [["◉", "واتساب", "+966 56 768 0470", wa()], ["☎", "جوال", "+966 56 768 0470", "tel:+966567680470"], ["✉", "البريد الإلكتروني", "wajbatbls@gmail.com", "mailto:wajbatbls@gmail.com"], ["◷", "ساعات العمل", "متواجدون 24/7", ""], ["⌖", "العنوان", "الرياض، المملكة العربية السعودية", ""]];
function contactPage() {
  return `<div class="container section" style="max-width:1200px"><div class="text-center"><h1 class="page-title">اتصل بنا</h1><p class="page-intro">نحن هنا دائماً لخدمتك والإجابة على جميع استفساراتك الأكاديمية.</p></div><div class="grid grid-2" style="grid-template-columns:2fr 3fr;align-items:start"><div class="grid">${contactItems.map(([ico, label, value, href]) => `<div class="card contact-item"><span class="contact-icon">${ico}</span><div><small class="text-muted">${label}</small>${href ? `<a class="contact-value" href="${href}" ${href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${value}</a>` : `<div class="contact-value">${value}</div>`}</div></div>`).join("")}<div class="card card-pad"><h3>وسائل التواصل الاجتماعي</h3><div class="social-row"><a class="social" href="${wa()}" target="_blank" rel="noopener">◉</a><a class="social" href="#" aria-label="فيسبوك">f</a><a class="social" href="#" aria-label="إنستغرام">◎</a><a class="social" href="#" aria-label="تويتر">𝕏</a><a class="social" href="#" aria-label="يوتيوب">▶</a></div></div><a class="btn btn-green" href="${wa("أريد التواصل مع فريق واجبات بلس")}" target="_blank" rel="noopener">◉ تواصل فوري عبر واتساب</a></div><div class="grid"><div class="card card-pad"><h2>أرسل لنا رسالة</h2><form data-form="contact" class="grid"><div class="grid grid-2"><div class="field"><label>الاسم الكريم *</label><input name="name" required placeholder="محمد أحمد" /></div><div class="field"><label>رقم الجوال *</label><input name="phone" required placeholder="05XXXXXXXX" /></div></div><div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" placeholder="example@email.com" dir="ltr" /></div><div class="field"><label>الموضوع *</label><input name="subject" required placeholder="استفسار عن خدمة..." /></div><div class="field"><label>الرسالة *</label><textarea name="message" required placeholder="اكتب رسالتك أو استفسارك هنا..."></textarea></div><button class="btn btn-primary" type="submit">➤ إرسال الرسالة</button></form></div><div class="card" style="overflow:hidden"><div class="card-pad" style="padding-bottom:.6rem"><b>⌖ موقعنا — الرياض، المملكة العربية السعودية</b></div><iframe class="map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.674!2d46.6753!3d24.7136!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2f03890d489399%3A0xba974d1c98e79fd5!2sRiyadh%2C%20Saudi%20Arabia!5e0!3m2!1sen!2ssa!4v1234567890" loading="lazy" title="موقعنا على الخريطة"></iframe></div></div></div></div>`;
}

function aboutPage() {
  const goals = [["🛡", "جودة المخرجات", "ضمان أعلى معايير الجودة الأكاديمية في جميع الخدمات المقدمة."], ["♟", "رضا الطلاب", "تحقيق أعلى معدلات الرضا لعملائنا من الطلاب والطالبات."], ["🏆", "التميز المهني", "استقطاب أفضل الكفاءات الأكاديمية لتقديم خدماتنا."], ["▤", "التطور المستمر", "مواكبة أحدث التطورات في المناهج وأساليب التعليم."]];
  const team = [["أحمد عبدالله", "المدير التنفيذي"], ["سارة محمد", "مدير الشؤون الأكاديمية"], ["محمد فهد", "مدير التقنية"], ["نورة خالد", "مدير خدمة العملاء"]];
  return `<div class="container section"><div class="text-center"><h1 class="page-title">من نحن</h1><p class="page-intro">واجبات بلس هي منصة تعليمية سعودية رائدة، تأسست بهدف تقديم الدعم الأكاديمي الشامل للطلاب والطالبات في مختلف المراحل الدراسية، من خلال نخبة من الخبراء والأكاديميين المتخصصين.</p></div><div class="grid grid-2"><div class="card about-box" style="border-top:4px solid var(--primary)"><div class="round-icon">◉</div><h2>رؤيتنا</h2><p class="text-muted">أن نكون المنصة الأكاديمية الرائدة والموثوقة الأولى في المملكة العربية السعودية، والوجهة المفضلة لكل طالب يبحث عن التميز والنجاح الأكاديمي.</p></div><div class="card about-box" style="border-top:4px solid var(--accent)"><div class="round-icon">◎</div><h2>رسالتنا</h2><p class="text-muted">تقديم خدمات أكاديمية احترافية وعالية الجودة تدعم مسيرة الطلاب العلمية، وتساهم في تذليل الصعاب التي تواجههم، بأسعار تنافسية وبسرية تامة.</p></div></div><section class="section"><h2 class="text-center">أهدافنا الاستراتيجية</h2><div class="grid grid-4" style="margin-top:2rem">${goals.map(([ico, title, desc]) => `<div class="card goal-card"><div class="goal-icon">${ico}</div><h3>${title}</h3><p>${desc}</p></div>`).join("")}</div></section><div class="card card-pad" style="color:#fff;background:var(--primary)"><div class="grid grid-4 text-center">${[["5000+", "طالب مستفيد"], ["99%", "نسبة الرضا"], ["50+", "خدمة متخصصة"], ["3+", "سنوات خبرة"]].map(([num, label]) => `<div><b style="font-size:2.3rem;display:block">${num}</b><span style="opacity:.75">${label}</span></div>`).join("")}</div></div><section class="section"><h2 class="text-center">فريق الإدارة</h2><div class="grid grid-4" style="margin-top:2rem">${team.map(([name, role]) => `<div class="team"><div class="team-avatar">♟</div><h3>${name}</h3><p style="color:var(--accent);font-size:.85rem;font-weight:700">${role}</p></div>`).join("")}</div></section></div>`;
}

function partnersPage() {
  const section = (title, emoji, data, countLabel) => `<section class="download-section"><div class="section-heading"><span>${emoji}</span><h2>${title}</h2><span class="count">${data.length} ${countLabel}</span></div><div class="grid grid-5">${data.map((item) => { const [name, location] = item.split(" - "); return `<div class="card partner-card"><div><div class="partner-icon">${emoji}</div><h3>${name}</h3><p>${location || ""}</p></div></div>`; }).join("")}</div></section>`;
  return `<div class="container section"><div class="text-center"><h1 class="page-title">شركاء النجاح</h1><p class="page-intro">نفخر بخدمة طلاب وطالبات أعرق الجامعات السعودية والمعاهد التعليمية ونسعى دائماً لدعم مسيرتهم الأكاديمية.</p></div>${section("الجامعات السعودية", "▣", UNIVERSITIES, "جامعة")}${section("المعاهد التعليمية", "▤", INSTITUTES, "معهد")}${section("جهات أخرى", "🤝", OTHERS, "جهات")}<div class="card card-pad text-center" style="max-width:800px;margin:2rem auto;background:linear-gradient(to right,var(--primary-soft),color-mix(in srgb,var(--accent) 8%,transparent))"><h2>هل جامعتك غير مدرجة؟</h2><p class="text-muted">نحن نقدم خدماتنا لجميع الطلاب في مختلف الجامعات والكليات داخل وخارج المملكة. لا تتردد في التواصل معنا.</p><a class="btn btn-primary" href="${wa("أريد الاستفسار عن خدماتكم")}" target="_blank" rel="noopener">تواصل معنا الآن</a></div></div>`;
}

function statsPage() {
  return state.statsLoggedIn ? statsDashboard() : `<div class="stats-page"><div class="container"><div class="glass login-panel"><div class="round-icon" style="background:rgba(0,201,167,.2);color:var(--accent)">▣</div><h2>📊 إحصائيات الموقع</h2><p>للمالك فقط — تسجيل الدخول مطلوب</p><form class="form" data-form="stats-login"><div class="field"><label>🔑 الرمز السري</label><input name="code" type="password" required placeholder="أدخل الرمز..." dir="ltr" autocomplete="off" /></div><div class="field"><label>🔒 كلمة المرور</label><input name="pass" type="password" required placeholder="أدخل كلمة المرور..." autocomplete="off" /></div><div class="login-error"></div><button class="btn" style="color:#0f2b5b;background:linear-gradient(90deg,#00c9a7,#ffd700)" type="submit">🔓 دخول</button></form></div></div></div>`;
}
function statsDashboard() {
  const stats = loadStats();
  const date = new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const chart = getLast7Days(stats);
  const max = Math.max(...chart.map((d) => d.visitors), 1);
  const row = (values) => `<tr>${values.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`;
  return `<div class="stats-page"><div class="container"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:2rem;flex-wrap:wrap"><div><h1 style="margin:0">▥ لوحة إحصائيات الموقع</h1><p style="color:rgba(255,255,255,.5);margin:.3rem 0">${date}</p><small style="color:var(--accent)">📊 جميع الأرقام حقيقية من زوار الموقع الفعليين</small></div><div class="header-actions print-hide"><button class="btn btn-outline" data-action="print">▣ طباعة</button><button class="btn" style="color:#0f2b5b;background:linear-gradient(90deg,#00c9a7,#ffd700)" data-action="export">⇩ تصدير PDF</button><button class="btn btn-outline" style="color:#fecaca;border-color:rgba(255,100,100,.4)" data-action="stats-logout">خروج</button></div></div><div id="stats-dashboard"><div class="grid grid-3" style="margin-bottom:2rem">${[["👥 إجمالي الزوار", stats.totalVisitors], ["📅 زوار اليوم", stats.todayVisitors], ["📆 زوار هذا الشهر", stats.monthVisitors], ["📝 إجمالي الطلبات", stats.totalOrders], ["🛠️ إجمالي الخدمات", stats.totalServices], ["⏳ آخر زيارة", stats.lastVisit || "—"]].map(([label, value]) => `<div class="glass stat-glass"><span class="stat-glass-icon">${label.split(" ")[0]}</span><div><label>${label.slice(2)}</label><strong style="${typeof value === "string" ? "font-size:.8rem" : ""}">${esc(value)}</strong></div></div>`).join("")}</div><div class="glass card-pad" style="margin-bottom:2rem"><h2 style="margin-top:0;font-size:1.05rem">▥ الزوار — آخر 7 أيام (بيانات حقيقية)</h2><div class="chart">${chart.map((item) => `<div class="bar"><span class="bar-value">${item.visitors}</span><span class="bar-fill" style="height:${Math.max((item.visitors / max) * 100, 3)}%"></span><span class="bar-day">${item.day}</span></div>`).join("")}</div></div><div class="glass" style="margin-bottom:2rem;overflow:hidden"><div class="card-pad"><h2 style="margin:0;font-size:1.05rem">◉ سجل الزيارات <small style="float:left;color:rgba(255,255,255,.45)">${stats.visitLog.length} زيارة مسجلة</small></h2></div>${stats.visitLog.length ? `<div style="max-height:260px;overflow:auto"><table class="stats-table"><thead>${row(["الرقم", "التاريخ", "الوقت"])}</thead><tbody>${stats.visitLog.map((v, i) => row([i + 1, v.date, v.time])).join("")}</tbody></table></div>` : '<div class="card-pad" style="color:rgba(255,255,255,.4);text-align:center">لا توجد زيارات مسجلة بعد</div>'}</div><div class="glass" style="overflow:hidden"><div class="card-pad"><h2 style="margin:0;font-size:1.05rem">▤ سجل الطلبات المقدمة <small style="float:left;color:rgba(255,255,255,.45)">${stats.orderLog.length} طلب مسجل</small></h2></div>${stats.orderLog.length ? `<div style="max-height:260px;overflow:auto"><table class="stats-table"><thead>${row(["التاريخ", "الوقت", "اسم الطالب", "نوع الخدمة"])}</thead><tbody>${stats.orderLog.map((o) => row([o.date, o.time, o.student, o.service])).join("")}</tbody></table></div>` : '<div class="card-pad" style="color:rgba(255,255,255,.4);text-align:center">لا توجد طلبات مسجلة بعد — ستظهر هنا عند إرسال نماذج تسليم الواجب</div>'}</div></div></div></div>`;
}
function getLast7Days(stats) {
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return { day: date.toLocaleDateString("ar-SA", { weekday: "short" }), visitors: stats.weeklyVisits[isoDay(date)] || 0 }; });
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
    case "/about": return aboutPage();
    case "/partners": return partnersPage();
    case "/stats": return statsPage();
    default: return notFound();
  }
}

function render() {
  document.title = ({ "/": "واجبات بلس | منصتك الذكية للتعلم", "/services": "الخدمات الأكاديمية | واجبات بلس", "/subscriptions": "باقات الاشتراك | واجبات بلس", "/downloads": "مركز التحميلات | واجبات بلس", "/blog": "المدونة الأكاديمية | واجبات بلس", "/contact": "اتصل بنا | واجبات بلس" }[currentPath()] || "واجبات بلس");
  document.querySelector("#app").innerHTML = layout(pageContent());
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

async function handleForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === "newsletter") {
    const result = await saveRecord("newsletter_subscribers", { email: data.email });
    toast("تم الاشتراك بنجاح!", result.error ? "تعذر الحفظ السحابي، لكن يمكنك المتابعة." : "شكراً لاشتراكك في نشرتنا البريدية."); form.reset(); return;
  }
  if (form.dataset.form === "review") {
    const result = await saveRecord("student_reviews", { name: data.name, university: data.university, review: data.review });
    toast("تم إرسال تقييمك", result.error ? "تعذر الحفظ السحابي، لكن تم استلام النموذج." : "شكراً لمشاركتك رأيك معنا، سيتم مراجعته ونشره قريباً."); form.reset(); return;
  }
  if (form.dataset.form === "contact") {
    const result = await saveRecord("contact_messages", { name: data.name, phone: data.phone, email: data.email || null, subject: data.subject, message: data.message });
    toast("تم إرسال رسالتك ✓", result.error ? "تعذر الحفظ السحابي، يرجى التواصل عبر واتساب." : "سنقوم بالرد عليك في أقرب وقت ممكن."); form.reset(); return;
  }
  if (form.dataset.form === "assignment") {
    const payload = { university: data.university, college: data.college, department: data.department || null, student_name: data.studentName, student_id: data.studentId, course: data.course, professor: data.professor, service_type: data.serviceType.replace(/^\d+\.\s*/, ""), deadline: data.deadline, description: data.description };
    await saveRecord("assignment_requests", payload);
    recordOrder(payload.service_type, payload.student_name);
    const message = `🎓 *طلب خدمة أكاديمية جديد — واجبات بلس*\n━━━━━━━━━━━━━━━━━━\n\n👤 *بيانات الطالب:*\n• الاسم: ${data.studentName}\n• الرقم الجامعي: ${data.studentId}\n\n🏛️ *البيانات الأكاديمية:*\n• الجامعة: ${data.university}\n• الكلية: ${data.college}\n• القسم: ${data.department}\n• المقرر: ${data.course}\n• الدكتور: ${data.professor}\n\n📋 *تفاصيل الطلب:*\n• نوع الخدمة: ${payload.service_type}\n• الموعد النهائي: ${data.deadline}\n\n📝 *الوصف:*\n${data.description}`;
    toast("✅ تم تجهيز الطلب!", "سيتم تحويلك إلى واتساب لإتمام الطلب."); setTimeout(() => window.open(wa(message), "_blank", "noopener"), 500); form.reset(); return;
  }
  if (form.dataset.form === "stats-login") {
    const error = form.querySelector(".login-error");
    if (data.code === ownerCode && data.pass === ownerPass) { state.statsLoggedIn = true; render(); }
    else { error.textContent = "الرمز أو كلمة المرور غير صحيحة"; error.className = "login-error error"; }
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
  if (action === "select-service") { state.selectedService = Number(target.dataset.service); go(`/services?category=${state.selectedService}`); }
  if (action === "back-services") { state.selectedService = null; go("/services"); }
  if (action === "open-article") { state.article = ARTICLES.find((a) => a.id === Number(target.dataset.article)); render(); }
  if (action === "close-modal" && (target.classList.contains("modal-close") || !target.closest("[data-modal-card]"))) { state.article = null; render(); }
  if (action === "toggle-faq") { target.parentElement.classList.toggle("open"); }
  if (action === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  if (action === "stats-logout") { state.statsLoggedIn = false; render(); }
  if (action === "print") window.print();
  if (action === "export") { toast("تصدير PDF", "يمكنك اختيار حفظ كملف PDF من نافذة الطباعة."); setTimeout(() => window.print(), 250); }
});
document.addEventListener("submit", (event) => { const form = event.target.closest("form[data-form]"); if (form) { event.preventDefault(); handleForm(form); } });
document.addEventListener("input", (event) => {
  if (event.target.dataset.action !== "faq-search") return;
  const query = event.target.value.trim();
  const list = document.querySelector("#faq-list");
  if (list) list.innerHTML = faqItems(FAQS.filter((faq) => `${faq.q} ${faq.a}`.includes(query)));
});
window.addEventListener("hashchange", () => { state.article = null; state.sidebar = false; render(); if (currentPath() !== "/stats") recordVisit(); });
window.addEventListener("scroll", () => document.querySelector(".back-top")?.classList.toggle("visible", window.scrollY > 300));

if (localStorage.getItem("wajbat-theme") === "dark") document.body.classList.add("dark");
const hasInitialHash = Boolean(location.hash);
if (!hasInitialHash) {
  location.hash = "/";
} else {
  render();
  if (currentPath() !== "/stats") recordVisit();
}