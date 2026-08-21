import "./site-app-r38.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

let downloads = [];
let reviews = [];
let scheduled = false;

async function readPublicData(procedure) {
  const input = encodeURIComponent(JSON.stringify({ json: null }));
  const response = await fetch(`/api/trpc/${procedure}?input=${input}`, { credentials: "same-origin" });
  if (!response.ok) throw new Error("تعذر تحميل البيانات العامة");
  const payload = await response.json();
  return payload?.result?.data?.json ?? payload?.result?.data;
}

function scheduleHomeRefresh() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhanceHome();
  });
}

function downloadsMarkup() {
  const cards = downloads.slice(0, 3).map((file) => `
    <a class="home-download-card" href="#/downloads" aria-label="عرض ${escapeHtml(file.name)} في مكتبة التحميلات">
      <span class="home-download-file-icon" aria-hidden="true">${escapeHtml(file.emoji || "↧")}</span>
      <span class="home-download-card-body"><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.category || "ملف دراسي")}</small></span>
      <span class="home-download-arrow" aria-hidden="true">←</span>
    </a>`).join("");
  if (!cards) return "";
  return `<section class="home-download-spotlight home-home-section" data-sv31-section="downloads"><div class="home-section-heading"><span class="home-eyebrow">مكتبة الطالب</span><h2>ابدأ من <em>تحميلات جاهزة</em></h2><p>ملفات مرتبة تساعدك على البدء بخطوة أوضح.</p></div><div class="home-download-grid">${cards}</div><a class="home-text-link" href="#/downloads">استكشف كل التحميلات <span aria-hidden="true">←</span></a></section>`;
}

function reviewsMarkup() {
  if (!reviews.length) return "";
  const cards = reviews.slice(0, 3).map((review) => `<article class="home-review-card"><div class="home-review-top"><span class="home-review-avatar" aria-hidden="true">${escapeHtml((review.name || "ط").trim().charAt(0) || "ط")}</span><span><strong>${escapeHtml(review.name || "طالب")}</strong><small>${escapeHtml(review.university || "طالب واجبات بلس")}</small></span></div><p>“${escapeHtml(review.body || review.text || "")}”</p></article>`).join("");
  return `<section class="home-review-spotlight home-home-section" data-sv31-section="reviews"><div class="home-section-heading"><span class="home-eyebrow">تجارب حقيقية</span><h2>آراء من <em>طلاب المنصة</em></h2><p>تعليقات منشورة من بيانات الموقع الحالية فقط.</p></div><div class="home-review-grid">${cards}</div><a class="home-text-link" href="#/reviews">شاهد كل الآراء <span aria-hidden="true">←</span></a></section>`;
}

function enhanceHome() {
  const home = document.querySelector(".home-managed-stack");
  if (!home || !location.hash.startsWith("#/")) return;
  const page = home.closest(".page-content") || home;
  const hero = home.querySelector(".home-managed-hero, .home-hero");
  const stats = home.querySelector(".home-stats");
  const services = home.querySelector("#home-services, .home-services, .home-services-section");
  const features = home.querySelector("#home-features, .home-features, .home-features-section");
  if (!hero || !services) return;

  home.classList.add("home-sv31");
  page.classList.add("home-sv31");
  const previousDownloads = home.querySelector("[data-sv31-section='downloads']");
  const previousReviews = home.querySelector("[data-sv31-section='reviews']");
  previousDownloads?.remove();
  previousReviews?.remove();

  const downloadsBlock = downloadsMarkup();
  if (downloadsBlock) services.insertAdjacentHTML("beforebegin", downloadsBlock);
  const reviewsBlock = reviewsMarkup();
  if (reviewsBlock) (features || services).insertAdjacentHTML("afterend", reviewsBlock);
  if (stats && stats.nextElementSibling !== services && !downloadsBlock) stats.insertAdjacentElement("afterend", services);
}

const observer = new MutationObserver(scheduleHomeRefresh);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleHomeRefresh);

Promise.allSettled([readPublicData("site.downloads.publicList"), readPublicData("site.publicContent")]).then(([downloadsResult, contentResult]) => {
  if (downloadsResult.status === "fulfilled") {
    const categories = Array.isArray(downloadsResult.value?.categories) ? downloadsResult.value.categories : [];
    const nestedFiles = categories.flatMap((category) => (Array.isArray(category.files) ? category.files : []).map((file) => ({
      ...file,
      name: file.fileName || file.name || file.originalName || "ملف دراسي",
      category: category.title || category.name || "تحميلات",
      emoji: category.emoji || "↧",
    })));
    const directFiles = Array.isArray(downloadsResult.value?.files) ? downloadsResult.value.files.map((file) => ({
      ...file,
      name: file.fileName || file.name || file.originalName || "ملف دراسي",
      category: file.categoryName || "تحميلات",
      emoji: file.emoji || "↧",
    })) : [];
    downloads = (nestedFiles.length ? nestedFiles : directFiles).filter((file) => file?.name && file.isVisible !== false);
  }
  if (contentResult.status === "fulfilled") {
    reviews = Array.isArray(contentResult.value?.reviews) ? contentResult.value.reviews.filter((review) => review?.isVisible !== false && (review.body || review.text)) : [];
  }
  scheduleHomeRefresh();
});

scheduleHomeRefresh();
