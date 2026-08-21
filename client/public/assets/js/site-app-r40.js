import "./site-app-r38.js";

/* sv32 — صفحة رئيسية ترحيبية فقط، وخدمات أولًا في القائمة الجانبية. */
let scheduled = false;

function placeServicesFirst() {
  const navigation = document.querySelector(".sidebar-nav");
  if (!navigation) return;

  const servicesLink = Array.from(navigation.querySelectorAll("a.nav-link"))
    .find((link) => link.getAttribute("href") === "#/services");
  if (!servicesLink) return;

  let servicesItem = servicesLink;
  while (servicesItem.parentElement && servicesItem.parentElement !== navigation) {
    servicesItem = servicesItem.parentElement;
  }
  if (servicesItem.parentElement === navigation && navigation.firstElementChild !== servicesItem) {
    navigation.prepend(servicesItem);
  }
}

function focusHomeWelcome() {
  const home = document.querySelector(".home-managed-stack");
  if (!home) return;

  const page = home.closest(".page-content") || home;
  home.classList.add("home-sv31", "home-sv32");
  page.classList.add("home-sv31", "home-sv32");

  /* حماية من بقايا مكتبة التخزين المؤقت للحزم القديمة. */
  home.querySelectorAll("[data-sv31-section='downloads'], [data-sv31-section='reviews']").forEach((section) => section.remove());

  /* الواجهة الترحيبية تقتصر على البطل والإحصاءات الموثوقة إن وُجدت. */
  home.querySelectorAll(".home-managed-section").forEach((section) => {
    if (!section.classList.contains("home-stat-section")) section.remove();
  });
}

function applySv32Layout() {
  scheduled = false;
  placeServicesFirst();
  focusHomeWelcome();
}

function scheduleSv32Layout() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(applySv32Layout);
}

const observer = new MutationObserver(scheduleSv32Layout);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleSv32Layout);
scheduleSv32Layout();
