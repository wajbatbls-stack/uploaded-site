/* تحكم إضافي غير متداخل مع تطبيق لوحة المالك: إدارة الجلسات الأخرى من حساب المالك. */
(() => {
  const endpoint = "/api/trpc/adminAuth.revokeOtherSessions";
  const controlId = "other-sessions-control";

  function feedback(container, message, kind) {
    let node = container.querySelector("[data-session-feedback]");
    if (!node) {
      node = document.createElement("p");
      node.dataset.sessionFeedback = "true";
      node.className = "admin-inline-feedback";
      container.append(node);
    }
    node.className = `admin-inline-feedback ${kind === "success" ? "is-success" : "is-error"}`;
    node.textContent = message;
  }

  function addControl() {
    const form = document.querySelector("form[data-account-form]");
    if (!form || document.getElementById(controlId)) return;

    const section = document.createElement("section");
    section.id = controlId;
    section.className = "admin-security-card";
    section.innerHTML = `
      <div class="security-card-copy">
        <span class="security-card-kicker">أمان الجلسات</span>
        <strong>إنهاء الجلسات الأخرى</strong>
        <p>سيبقى هذا الجهاز مسجلاً، وسيُطلب من أي جهاز آخر تسجيل الدخول من جديد.</p>
      </div>
      <button type="button" class="btn btn-outline danger-action" data-revoke-other-sessions>إنهاء الجلسات الأخرى</button>`;

    form.insertAdjacentElement("afterend", section);
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-revoke-other-sessions]");
    if (!button) return;

    const form = document.querySelector("form[data-account-form]");
    const password = form?.querySelector('input[name="currentPassword"]')?.value?.trim();
    const panel = document.getElementById(controlId);
    if (!password) {
      feedback(panel, "أدخل كلمة المرور الحالية أولاً لتأكيد هذا الإجراء الأمني.", "error");
      return;
    }
    if (!window.confirm("هل تريد إنهاء كل الجلسات الأخرى؟ ستبقى الجلسة الحالية على هذا الجهاز نشطة.")) return;

    button.disabled = true;
    const previous = button.textContent;
    button.textContent = "جارٍ إنهاء الجلسات…";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-trpc-source": "admin-security-controls" },
        body: JSON.stringify({ json: { currentPassword: password } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error?.json?.message || payload?.error?.message || "تعذر إنهاء الجلسات الأخرى. تحقق من كلمة المرور وحاول مجدداً.";
        throw new Error(message);
      }
      feedback(panel, "تم إنهاء الجلسات الأخرى بنجاح. بقيت الجلسة الحالية نشطة.", "success");
    } catch (error) {
      feedback(panel, error instanceof Error ? error.message : "تعذر إتمام العملية الآن.", "error");
    } finally {
      button.disabled = false;
      button.textContent = previous;
    }
  });

  const observer = new MutationObserver(addControl);
  observer.observe(document.body, { childList: true, subtree: true });
  addControl();
})();
