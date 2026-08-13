(() => {
  "use strict";

  const procedureUrl = procedure => `/api/trpc/${procedure}`;
  const messageOf = error => error instanceof Error ? error.message : "تعذر إتمام العملية";
  const toast = message => window.WajbatAdmin?.toast?.(message) || window.alert(message);

  async function query(procedure, input) {
    const suffix = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    let response;
    try { response = await fetch(`${procedureUrl(procedure)}${suffix}`, { credentials: "same-origin", cache: "no-store" }); } catch { throw new Error("تعذر الاتصال بالخادم. تحقّق من الإنترنت ثم أعد المحاولة."); }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.json?.message || "تعذر الاتصال بالخادم");
    return payload?.result?.data?.json ?? payload?.result?.data;
  }

  async function mutate(procedure, input) {
    let response;
    try { response = await fetch(procedureUrl(procedure), {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: input }),
    }); } catch { throw new Error("تعذر الاتصال بالخادم. لم تُفقد إعداداتك؛ تحقّق من الإنترنت ثم أعد المحاولة."); }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.json?.message || "تعذر حفظ التغييرات");
    return payload?.result?.data?.json ?? payload?.result?.data;
  }

  function fromBase64url(value) {
    const padded = String(value).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(value).length + 3) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0)).buffer;
  }

  function toBase64url(value) {
    const bytes = new Uint8Array(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function normalizeCredentialDescriptor(descriptor) {
    return { ...descriptor, id: fromBase64url(descriptor.id) };
  }

  function registrationPublicKey(options) {
    return {
      ...options,
      challenge: fromBase64url(options.challenge),
      user: { ...options.user, id: fromBase64url(options.user.id) },
      excludeCredentials: (options.excludeCredentials || []).map(normalizeCredentialDescriptor),
    };
  }

  function authenticationPublicKey(options) {
    return {
      ...options,
      challenge: fromBase64url(options.challenge),
      allowCredentials: (options.allowCredentials || []).map(normalizeCredentialDescriptor),
    };
  }

  function registrationResponse(credential) {
    const response = credential.response;
    return {
      id: credential.id,
      rawId: toBase64url(credential.rawId),
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: {
        clientDataJSON: toBase64url(response.clientDataJSON),
        attestationObject: toBase64url(response.attestationObject),
        transports: typeof response.getTransports === "function" ? response.getTransports() : undefined,
      },
    };
  }

  function authenticationResponse(credential) {
    const response = credential.response;
    return {
      id: credential.id,
      rawId: toBase64url(credential.rawId),
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: {
        clientDataJSON: toBase64url(response.clientDataJSON),
        authenticatorData: toBase64url(response.authenticatorData),
        signature: toBase64url(response.signature),
        userHandle: response.userHandle ? toBase64url(response.userHandle) : undefined,
      },
    };
  }

  function canUsePasskeys() {
    return Boolean(window.PublicKeyCredential && navigator.credentials?.create && navigator.credentials?.get);
  }

  function passkeyMessage(error) {
    if (error?.name === "NotAllowedError") return "تم إلغاء التحقق بالبصمة أو لم تُتح وسيلة دخول مطابقة لهذا الموقع.";
    if (error?.name === "SecurityError") return "تعذر بدء Passkey لأن المتصفح رفض إعداد الأمان. افتح لوحة المالك من رابطها المنشور نفسه عبر HTTPS ثم أعد المحاولة.";
    if (error?.name === "InvalidStateError") return "هذه البصمة أو Passkey مسجلة بالفعل، أو لا يمكن استخدامها على هذا الجهاز حالياً.";
    if (error?.name === "NotSupportedError") return "لا يدعم هذا المتصفح تسجيل البصمة أو Passkeys. جرّب أحدث إصدار من Chrome أو Safari أو Edge.";
    return messageOf(error);
  }

  async function signInWithPasskey() {
    const errorBox = document.querySelector("#login-error");
    if (!canUsePasskeys()) {
      if (errorBox) errorBox.textContent = "هذا المتصفح أو الجهاز لا يدعم تسجيل الدخول بالبصمة أو Passkey.";
      return;
    }
    try {
      if (errorBox) errorBox.textContent = "جارٍ التحقق من وسيلة الدخول الآمنة…";
      const options = await query("adminAuth.passkeyAuthenticationOptions");
      const credential = await navigator.credentials.get({ publicKey: authenticationPublicKey(options) });
      if (!credential) throw new Error("لم يتم اختيار وسيلة دخول آمنة");
      await mutate("adminAuth.verifyPasskeyAuthentication", {
        challenge: options.challenge,
        response: authenticationResponse(credential),
      });
      window.location.reload();
    } catch (error) {
      if (errorBox) errorBox.textContent = passkeyMessage(error);
    }
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "لم يُستخدم بعد";
  }

  function ownerSettingsState() {
    return window.WajbatAdmin?.getState?.() || null;
  }

  function credentialsPanel(account) {
    return `<section class="editor owner-login-security-panel" data-owner-login-security>
      <div class="editor-head"><div><h3>هوية المالك وأمان الوصول</h3><small>تحتاج العمليات الحساسة إلى كلمة المرور الحالية. لا تحفظ كلمة المرور في المتصفح.</small></div><span class="owner-security-badge">تحقق خادمي</span></div>
      <form data-owner-login-credentials class="two-col">
        <div class="field"><label>البريد الإلكتروني للمالك</label><input name="email" type="email" dir="ltr" autocomplete="username" value="${String(account?.email || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" /></div>
        <div class="field"><label>كلمة المرور الحالية للتأكيد</label><input name="currentPassword" type="password" dir="ltr" autocomplete="current-password" required minlength="8" /></div>
        <div class="field"><label>كلمة مرور / رمز جديد</label><input name="newPassword" type="password" dir="ltr" autocomplete="new-password" minlength="8" placeholder="اتركه فارغاً إذا لن يتغير" /></div>
        <div class="field field-actions"><button class="btn" type="submit">حفظ هوية الدخول</button><button class="btn btn-outline" type="button" data-owner-revoke-sessions>إبطال الجلسات الأخرى</button></div>
      </form>
    </section>`;
  }

  function passkeysPanel(passkeys) {
    const supported = canUsePasskeys();
    const rows = passkeys.length
      ? passkeys.map(item => `<li><div><strong>${String(item.label || "Passkey المالك").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</strong><small>أُضيف ${formatDate(item.createdAt)} · آخر استخدام ${formatDate(item.lastUsedAt)}</small></div><button class="btn btn-outline btn-small" type="button" data-owner-passkey-remove="${Number(item.id)}">حذف</button></li>`).join("")
      : `<li class="owner-passkey-empty">لا توجد وسيلة دخول بيومترية مسجلة بعد. يبقى البريد وكلمة المرور متاحين دائماً.</li>`;
    return `<section class="editor owner-login-security-panel" data-owner-passkeys>
      <div class="editor-head"><div><h3>البصمة وPasskeys</h3><small>${supported ? "سجّل وسيلة دخول هذا الجهاز ثم استخدمها من شاشة /admin." : "سيظهر التسجيل عند فتح الموقع من جهاز ومتصفح يدعمان Passkeys."}</small></div><span class="owner-security-badge ${supported ? "is-ready" : ""}">${supported ? "متاح في هذا المتصفح" : "غير مدعوم هنا"}</span></div>
      <div class="two-col owner-passkey-form">
        <input name="passkeyLabel" type="hidden" value="جهاز المالك" />
        <div class="field"><label>كلمة المرور الحالية للتأكيد</label><input name="passkeyCurrentPassword" type="password" dir="ltr" autocomplete="current-password" minlength="8" placeholder="أدخل كلمة المرور مرة واحدة" /><small>لحماية الحساب، أكّد كلمة المرور ثم اضغط الزر. سيطلب الجهاز البصمة أو قفل الشاشة تلقائياً.</small></div>
        <div class="field field-actions"><button class="btn" type="button" data-owner-passkey-register ${supported ? "" : "disabled"}>تفعيل البصمة على هذا الجهاز</button></div>
      </div>
      <ul class="owner-passkey-list">${rows}</ul>
    </section>`;
  }

  function siteLogoPanel() {
    return `<section class="owner-login-site-logo" data-owner-site-logo><p><strong>صور شاشة الدخول:</strong> استخدم حقول الرفع المباشر أعلاه فقط. تظهر هنا الصور التي رفعتها لهذه الشاشة دون خلطها بصور الموقع أو المعرض العام.</p><div class="row-actions"><button class="btn btn-outline btn-small" type="button" data-owner-login-restore-previous>استعادة النسخة السابقة</button></div><small>تُحفظ آخر نسخة قبل كل تعديل، ويمكن التبديل بينها وبين الشكل الحالي دون فقدان أي منهما.</small></section>`;
  }

  function injectOwnerSecurityWorkspace() {
    const state = ownerSettingsState();
    if (!state || state.selected !== "ownerLogin") return;
    const form = document.querySelector("[data-owner-login-settings]");
    if (!form || document.querySelector("[data-owner-login-security]")) return;
    form.insertAdjacentHTML("afterend", `${siteLogoPanel()}${credentialsPanel(state.account)}${passkeysPanel(state.passkeys || [])}`);
  }

  async function saveCredentials(form, revokeSessions) {
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") || "");
    if (!currentPassword) throw new Error("أدخل كلمة المرور الحالية للتأكيد");
    if (revokeSessions) {
      await mutate("adminAuth.revokeOtherSessions", { currentPassword });
      form.elements.currentPassword.value = "";
      toast("تم إبطال الجلسات الأخرى مع إبقاء جلستك الحالية فعالة");
      return;
    }
    const email = String(data.get("email") || "").trim();
    const newPassword = String(data.get("newPassword") || "");
    await mutate("adminAuth.updateCredentials", {
      currentPassword,
      email: email || undefined,
      newPassword: newPassword || undefined,
    });
    toast("تم حفظ بيانات المالك. سجّل الدخول من جديد لحماية الحساب.");
    window.location.reload();
  }

  async function registerPasskey() {
    if (!canUsePasskeys()) throw new Error("هذا المتصفح لا يدعم Passkeys");
    const panel = document.querySelector("[data-owner-passkeys]");
    const password = String(panel?.querySelector('[name="passkeyCurrentPassword"]')?.value || "");
    const label = "جهاز المالك";
    if (!password) throw new Error("أدخل كلمة المرور الحالية قبل تسجيل Passkey");
    const options = await query("adminAuth.passkeyRegistrationOptions");
    const credential = await navigator.credentials.create({ publicKey: registrationPublicKey(options) });
    if (!credential) throw new Error("لم تُسجل وسيلة دخول آمنة");
    await mutate("adminAuth.verifyPasskeyRegistration", {
      challenge: options.challenge,
      response: registrationResponse(credential),
      label,
      currentPassword: password,
    });
    await window.WajbatAdmin.refresh();
    toast("تم تفعيل البصمة لهذا الجهاز. يمكنك استخدامها من شاشة الدخول.");
  }

  async function removePasskey(id) {
    const panel = document.querySelector("[data-owner-passkeys]");
    const password = String(panel?.querySelector('[name="passkeyCurrentPassword"]')?.value || "");
    if (!password) throw new Error("أدخل كلمة المرور الحالية قبل حذف Passkey");
    if (!window.confirm("هل تريد حذف وسيلة الدخول الآمنة المحددة؟")) return;
    await mutate("adminAuth.removePasskey", { id: Number(id), currentPassword: password });
    await window.WajbatAdmin.refresh();
    toast("تم حذف وسيلة الدخول الآمنة");
  }

  async function useSiteLogo() {
    const state = ownerSettingsState();
    const siteSettings = state?.collections?.find(item => item.collectionKey === "siteSettings");
    let content = {};
    try { content = JSON.parse(siteSettings?.content || "{}"); } catch { content = {}; }
    if (!content.logoUrl) throw new Error("لا يوجد شعار محفوظ حالياً في إعدادات الموقع");
    const next = { ...(state.ownerLoginSettings || {}), logoUrl: content.logoUrl, logoMediaId: null };
    const saved = await mutate("adminAuth.saveOwnerLoginSettings", next);
    state.ownerLoginSettings = saved;
    state.loginSettings = saved;
    await window.WajbatAdmin.refresh();
    toast("تم اعتماد شعار الموقع الحالي في شاشة دخول المالك");
  }

  async function restorePreviousLoginSettings() {
    if (!window.confirm("هل تريد استعادة آخر نسخة سابقة لإعدادات شاشة الدخول؟ سيبقى الشكل الحالي محفوظاً كنسخة قابلة للاستعادة.")) return;
    const state = ownerSettingsState();
    const saved = await mutate("adminAuth.restorePreviousOwnerLoginSettings");
    if (state) {
      state.ownerLoginSettings = saved;
      state.loginSettings = saved;
    }
    await window.WajbatAdmin.refresh();
    toast("تمت استعادة النسخة السابقة من إعدادات شاشة الدخول");
  }

  document.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    if (!button) return;
    if (button.matches("[data-login-passkey]")) {
      event.preventDefault();
      void signInWithPasskey();
    }
    if (button.matches("[data-owner-passkey-register]")) {
      event.preventDefault();
      void registerPasskey().catch(error => toast(passkeyMessage(error)));
    }
    if (button.matches("[data-owner-passkey-remove]")) {
      event.preventDefault();
      void removePasskey(button.dataset.ownerPasskeyRemove).catch(error => toast(messageOf(error)));
    }
    if (button.matches("[data-owner-revoke-sessions]")) {
      event.preventDefault();
      const form = button.closest("[data-owner-login-credentials]");
      void saveCredentials(form, true).catch(error => toast(messageOf(error)));
    }
    if (button.matches("[data-owner-use-site-logo]")) {
      event.preventDefault();
      void useSiteLogo().catch(error => toast(messageOf(error)));
    }
    if (button.matches("[data-owner-login-restore-previous]")) {
      event.preventDefault();
      void restorePreviousLoginSettings().catch(error => toast(messageOf(error)));
    }
  });

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!form.matches?.("[data-owner-login-credentials]")) return;
    event.preventDefault();
    void saveCredentials(form, false).catch(error => toast(messageOf(error)));
  });

  const observer = new MutationObserver(injectOwnerSecurityWorkspace);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  injectOwnerSecurityWorkspace();
})();
