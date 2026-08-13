(() => {
  "use strict";

  const CLOCK_STYLES = [
    ["digital-clean", "رقمية نظيفة"], ["digital-outline", "رقمية بإطار"], ["digital-glow", "رقمية متوهجة"], ["digital-terminal", "طرفية تقنية"],
    ["digital-glass", "رقمية زجاجية"], ["digital-neon", "نيون مضيء"], ["digital-led", "LED نقطية"], ["digital-bold", "رقمية عريضة"],
    ["analog-classic", "عقارب كلاسيكية"], ["analog-minimal", "عقارب بسيطة"], ["analog-royal", "عقارب ملكية"], ["analog-modern", "عقارب عصرية"],
    ["analog-dark", "عقارب داكنة"], ["analog-soft", "عقارب ناعمة"], ["analog-gold", "عقارب ذهبية"], ["analog-blue", "عقارب زرقاء"],
    ["flip-clean", "قلبات نظيفة"], ["flip-dark", "قلبات داكنة"], ["flip-royal", "قلبات ملكية"], ["flip-neon", "قلبات نيون"],
    ["pill", "كبسولة"], ["badge", "شارة"], ["ribbon", "شريط"], ["compact", "مصغرة"],
  ];
  const NUMERIC_FIELDS = new Set([
    "logoSize", "ownerPhotoSize", "cardOpacity", "cardRadius", "cardBlur", "cardWidth", "fieldFontSize", "buttonRadius",
    "logoBorderWidth", "logoGlow", "cardBorderWidth", "fieldBorderWidth", "fieldRadius", "buttonGlow", "animationDuration", "clockSize",
  ]);
  const BOOLEAN_FIELDS = ["clockEnabled", "clockShowSeconds"];
  const MEDIA_FIELDS = ["backgroundImageMediaId", "logoMediaId", "ownerPhotoMediaId"];
  const state = () => window.WajbatAdmin?.getState?.() || {};
  const toast = message => window.WajbatAdmin?.toast?.(message) || window.alert(message);
  const escapeHtml = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const errorMessage = error => error instanceof Error ? error.message : "تعذر إتمام العملية";

  async function mutate(procedure, input) {
    const response = await fetch(`/api/trpc/${procedure}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: input }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.json?.message || "تعذر حفظ التغييرات");
    return payload?.result?.data?.json ?? payload?.result?.data;
  }

  function friendlySaveError(error) {
    const message = errorMessage(error);
    if (/Expected number|invalid_type|Number|invalid input|Expected boolean|Expected enum/i.test(message)) {
      return "تعذر الحفظ: تحقق من قيم الأرقام والاختيارات ثم أعد المحاولة.";
    }
    if (/صورة|وسيط|media/i.test(message)) return "تعذر اعتماد الصورة المختارة. أعد رفعها أو اختر صورة أخرى من المعرض.";
    return message;
  }

  function formValues(form) {
    const current = state();
    const next = { ...(current.ownerLoginSettings || current.loginSettings || {}) };
    for (const [name, raw] of new FormData(form).entries()) {
      if (typeof raw !== "string") continue;
      if (MEDIA_FIELDS.includes(name)) {
        next[name] = raw ? Number(raw) : null;
      } else if (NUMERIC_FIELDS.has(name)) {
        next[name] = Number(raw);
      } else if (!BOOLEAN_FIELDS.includes(name)) {
        next[name] = raw;
      }
    }
    for (const name of BOOLEAN_FIELDS) next[name] = Boolean(form.elements[name]?.checked);
    const media = current.media || [];
    const itemFor = id => media.find(item => Number(item.id) === Number(id));
    next.backgroundImageUrl = itemFor(next.backgroundImageMediaId)?.url || null;
    next.logoUrl = itemFor(next.logoMediaId)?.url || null;
    next.ownerPhotoUrl = itemFor(next.ownerPhotoMediaId)?.url || null;
    return next;
  }

  function clockText(value) {
    const time = new Date();
    return new Intl.DateTimeFormat("ar-SA", {
      hour: "2-digit", minute: "2-digit", second: value.clockShowSeconds ? "2-digit" : undefined,
      hour12: value.clockFormat === "12",
    }).format(time);
  }

  function analogMarkup() {
    return `<span class="owner-clock-face"><i class="owner-clock-hand owner-clock-hour"></i><i class="owner-clock-hand owner-clock-minute"></i><i class="owner-clock-hand owner-clock-second"></i><b></b></span>`;
  }

  function clockMarkup(value) {
    const style = CLOCK_STYLES.some(([id]) => id === value.clockStyle) ? value.clockStyle : "digital-clean";
    const classes = `owner-login-clock owner-clock-${style}`;
    const css = `--owner-clock-color:${escapeHtml(value.clockColor || "#15213d")};--owner-clock-accent:${escapeHtml(value.clockAccentColor || "#4966d6")};--owner-clock-size:${Number(value.clockSize || 52)}px`;
    const face = style.startsWith("analog-") ? analogMarkup() : "";
    return `<div class="${classes}" data-owner-login-clock data-owner-clock-position="${escapeHtml(value.clockPosition || "above_card")}" style="${css}" aria-label="الوقت الحالي">${face}<span class="owner-clock-text" data-owner-clock-text>${clockText(value)}</span></div>`;
  }

  function updateClock(clock, value) {
    const date = new Date();
    const text = clock.querySelector("[data-owner-clock-text]");
    if (text) text.textContent = clockText(value);
    const hour = clock.querySelector(".owner-clock-hour");
    const minute = clock.querySelector(".owner-clock-minute");
    const second = clock.querySelector(".owner-clock-second");
    if (hour && minute && second) {
      hour.style.transform = `rotate(${(date.getHours() % 12) * 30 + date.getMinutes() * .5}deg)`;
      minute.style.transform = `rotate(${date.getMinutes() * 6 + date.getSeconds() * .1}deg)`;
      second.style.transform = `rotate(${date.getSeconds() * 6}deg)`;
      second.hidden = !value.clockShowSeconds;
    }
  }

  function placeClock(view, value) {
    const existing = view.querySelector("[data-owner-login-clock]");
    if (!value.clockEnabled) {
      existing?.remove();
      return;
    }
    const desiredClass = `owner-clock-${value.clockStyle}`;
    if (existing && (!existing.classList.contains(desiredClass) || existing.dataset.ownerClockPosition !== value.clockPosition)) existing.remove();
    const clock = view.querySelector("[data-owner-login-clock]") || (() => {
      const element = document.createRange().createContextualFragment(clockMarkup(value)).firstElementChild;
      const card = view.querySelector(".login-card");
      if (!card) return null;
      if (value.clockPosition === "inside_top") card.prepend(element);
      else if (value.clockPosition === "inside_bottom") card.append(element);
      else if (value.clockPosition === "below_card") card.after(element);
      else card.before(element);
      return element;
    })();
    if (!clock) return;
    clock.style.setProperty("--owner-clock-color", value.clockColor || "#15213d");
    clock.style.setProperty("--owner-clock-accent", value.clockAccentColor || "#4966d6");
    clock.style.setProperty("--owner-clock-size", `${Number(value.clockSize || 52)}px`);
    updateClock(clock, value);
  }

  function syncClocks(settings) {
    const current = settings || state().loginSettings || state().ownerLoginSettings || {};
    document.querySelectorAll(".login-view").forEach(view => placeClock(view, current));
  }

  function clockOptions(selected) {
    return CLOCK_STYLES.map(([id, label]) => `<option value="${id}" ${selected === id ? "selected" : ""}>${label}</option>`).join("");
  }

  function clockEditor(value) {
    return `<section class="editor owner-login-clock-editor" data-owner-login-clock-editor>
      <div class="editor-head"><div><h3>الساعة في شاشة الدخول</h3><small>تظهر الساعة الفعلية وتُحدّث وقتها تلقائياً. اختر من 24 شكلاً مختلفاً بلا كود.</small></div><span class="owner-security-badge is-ready">24 شكلاً</span></div>
      <div class="three-col">
        <label class="field checkbox-field"><input name="clockEnabled" type="checkbox" ${value.clockEnabled ? "checked" : ""} /><span>إظهار الساعة في شاشة الدخول</span></label>
        <div class="field"><label>شكل الساعة</label><select name="clockStyle">${clockOptions(value.clockStyle)}</select></div>
        <div class="field"><label>موضع الساعة</label><select name="clockPosition"><option value="above_card" ${value.clockPosition === "above_card" ? "selected" : ""}>أعلى بطاقة الدخول</option><option value="inside_top" ${value.clockPosition === "inside_top" ? "selected" : ""}>داخل البطاقة بالأعلى</option><option value="inside_bottom" ${value.clockPosition === "inside_bottom" ? "selected" : ""}>داخل البطاقة بالأسفل</option><option value="below_card" ${value.clockPosition === "below_card" ? "selected" : ""}>أسفل بطاقة الدخول</option></select></div>
        <div class="field"><label>صيغة الوقت</label><select name="clockFormat"><option value="24" ${value.clockFormat === "24" ? "selected" : ""}>24 ساعة</option><option value="12" ${value.clockFormat === "12" ? "selected" : ""}>12 ساعة</option></select></div>
        <label class="field checkbox-field"><input name="clockShowSeconds" type="checkbox" ${value.clockShowSeconds ? "checked" : ""} /><span>إظهار الثواني</span></label>
        <div class="field"><label>حجم الساعة</label><input name="clockSize" type="range" min="24" max="140" value="${Number(value.clockSize || 52)}" /></div>
        <div class="field"><label>لون الوقت</label><input name="clockColor" type="color" value="${escapeHtml(value.clockColor || "#15213d")}" /></div>
        <div class="field"><label>لون اللمسة أو العقارب</label><input name="clockAccentColor" type="color" value="${escapeHtml(value.clockAccentColor || "#4966d6")}" /></div>
      </div>
    </section>`;
  }

  function injectClockEditor() {
    const form = document.querySelector("[data-owner-login-settings]");
    if (!form || form.querySelector("[data-owner-login-clock-editor]")) return;
    const current = { clockEnabled: true, clockStyle: "digital-clean", clockPosition: "above_card", clockFormat: "24", clockColor: "#15213d", clockAccentColor: "#4966d6", clockSize: 52, clockShowSeconds: true, ...(state().ownerLoginSettings || {}) };
    form.querySelector(".editor-actions")?.insertAdjacentHTML("beforebegin", clockEditor(current));
  }

  function refreshDecorations() {
    injectClockEditor();
    syncClocks();
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!form?.matches?.("[data-owner-login-settings]")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    void mutate("adminAuth.saveOwnerLoginSettings", formValues(form))
      .then(saved => {
        const current = state();
        current.ownerLoginSettings = saved;
        current.loginSettings = saved;
        syncClocks(saved);
        toast("تم حفظ وتطبيق إعدادات شاشة الدخول بنجاح.");
      })
      .catch(error => toast(friendlySaveError(error)))
      .finally(() => { if (button) button.disabled = false; });
  }, true);

  for (const name of ["input", "change"]) {
    document.addEventListener(name, event => {
      const form = event.target?.closest?.("[data-owner-login-settings]");
      if (!form) return;
      queueMicrotask(() => syncClocks(formValues(form)));
    }, true);
  }

  const observer = new MutationObserver(() => queueMicrotask(refreshDecorations));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => {
    const current = state().loginSettings || state().ownerLoginSettings || {};
    document.querySelectorAll("[data-owner-login-clock]").forEach(clock => updateClock(clock, current));
  }, 1000);
  refreshDecorations();
})();
