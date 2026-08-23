import "./site-app-r47.js";

/* sv33 — الصفحة الرئيسية ترحيبية فقط، والقائمة تبدأ بالرئيسية ثم الخدمات. */
let scheduled = false;
let selectedDownloadCategory = null;

function navUnit(navigation, link) {
  let unit = link;
  while (unit.parentElement && unit.parentElement !== navigation) unit = unit.parentElement;
  return unit.parentElement === navigation ? unit : null;
}

function placeHomeThenServices() {
  const navigation = document.querySelector(".sidebar-nav");
  if (!navigation) return;
  const links = Array.from(navigation.querySelectorAll("a.nav-link"));
  const home = navUnit(navigation, links.find((link) => link.getAttribute("href") === "#/"));
  const services = navUnit(navigation, links.find((link) => link.getAttribute("href") === "#/services"));
  if (!home || !services) return;
  navigation.prepend(services);
  navigation.prepend(home);
}

function focusHomeWelcome() {
  const home = document.querySelector(".home-managed-stack");
  if (!home) return;
  const page = home.closest(".page-content") || home;
  home.classList.add("home-sv31", "home-sv32");
  page.classList.add("home-sv31", "home-sv32");
  home.querySelectorAll("[data-sv31-section='downloads'], [data-sv31-section='reviews']").forEach((section) => section.remove());
  home.querySelectorAll(".home-managed-section").forEach((section) => {
    if (!section.classList.contains("home-stat-section")) section.remove();
  });
}

function chooseDownloadCategory(id) {
  const sections = Array.from(document.querySelectorAll(".dl10-section[data-dl10-cat-id]"));
  if (!sections.length) return;
  const selected = sections.some((section) => String(section.dataset.dl10CatId) === String(id))
    ? String(id)
    : String(sections[0].dataset.dl10CatId);
  selectedDownloadCategory = selected;
  sections.forEach((section) => {
    const isSelected = String(section.dataset.dl10CatId) === selected;
    section.hidden = !isSelected;
    section.style.display = isSelected ? "" : "none";
    section.setAttribute("aria-hidden", isSelected ? "false" : "true");
  });
  document.querySelectorAll(".dl10-tab[data-dl10-filter]").forEach((tab) => {
    const isSelected = String(tab.dataset.dl10Filter) === selected;
    tab.classList.toggle("dl10-tab-active", isSelected);
    tab.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function focusDownloadSection() {
  const library = document.querySelector(".dl10-hero")?.closest(".container.section");
  if (!library) return;
  library.classList.add("dl11-library");
  const tabs = library.querySelector("#dl10-tabs");
  if (!tabs) return;
  tabs.querySelector("[data-dl10-filter='all']")?.remove();
  if (!tabs.previousElementSibling?.classList.contains("dl11-picker-note")) {
    tabs.insertAdjacentHTML("beforebegin", "<div class=\"dl11-picker-note\"><span>01</span><div><b>اختر قسمك</b><small>ستظهر ملفات القسم المحدد فقط، لتبقى المكتبة مرتبة وواضحة.</small></div></div>");
  }
  const available = Array.from(tabs.querySelectorAll("[data-dl10-filter]"));
  if (!available.length) return;
  chooseDownloadCategory(selectedDownloadCategory || available[0].dataset.dl10Filter);
}

function applySv33Layout() {
  scheduled = false;
  placeHomeThenServices();
  focusHomeWelcome();
  focusDownloadSection();
}

function scheduleSv33Layout() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(applySv33Layout);
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest?.(".dl10-tab[data-dl10-filter]");
  if (!tab || tab.dataset.dl10Filter === "all") return;
  chooseDownloadCategory(tab.dataset.dl10Filter);
}, { capture: true });

const observer = new MutationObserver(scheduleSv33Layout);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleSv33Layout);
scheduleSv33Layout();
