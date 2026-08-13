import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const chromePort = 9227;
const chromeProfile = "/tmp/wajbat-owner-login-browser";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const evidenceDir = "/tmp/wajbat-admin-redesign-evidence";

if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured for this test");

function removeProfile() {
  try {
    rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  } catch {}
}

removeProfile();
rmSync(evidenceDir, { recursive: true, force: true });
mkdirSync(evidenceDir, { recursive: true });
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${chromePort}`,
  `--user-data-dir=${chromeProfile}`, "--window-size=1280,900", "about:blank",
], { stdio: "ignore" });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getDebuggerUrl() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${chromePort}/json/list`)).json();
      if (pages[0]?.webSocketDebuggerUrl) return pages[0].webSocketDebuggerUrl;
    } catch {}
    await wait(250);
  }
  throw new Error("Could not start Chromium test session");
}

function createCdp(url) {
  const socket = new WebSocket(url);
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve({ socket, command }), { once: true });
    socket.addEventListener("error", () => reject(new Error("Could not connect to Chromium")), { once: true });
  });
}

async function runInteractiveLogin(command, viewport) {
  await command("Network.clearBrowserCookies");
  await command("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.scale, mobile: viewport.mobile });
  await command("Page.navigate", { url: `${baseUrl}/admin` });
  await wait(900);
  const inputCheck = await command("Runtime.evaluate", { expression: `(() => {
    window.__ownerLoginRequests = [];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      window.__ownerLoginRequests.push({ url: String(args[0]), status: response.status });
      return response;
    };
    const form = document.querySelector('#login-form');
    const field = form?.elements.email;
    return JSON.stringify({ form: !!form, type: field?.type, inputMode: field?.inputMode, noValidate: form?.noValidate });
  })()`, returnByValue: true });
  const values = JSON.parse(inputCheck.result.value);
  if (!values.form || values.type !== "text" || values.inputMode !== "email" || !values.noValidate) throw new Error(`Mobile-safe login field checks failed: ${JSON.stringify(values)}`);
  const formReady = await command("Runtime.evaluate", { expression: `(() => {
    const form = document.querySelector('#login-form');
    const emailField = form.elements.email;
    const passwordField = form.elements.password;
    emailField.focus();
    return JSON.stringify({ valid: form.noValidate, emailField: !!emailField, passwordField: !!passwordField });
  })()`, returnByValue: true });
  const fields = JSON.parse(formReady.result.value);
  if (!fields.valid || !fields.emailField || !fields.passwordField) throw new Error("The login form is not ready for browser input");
  await command("Input.insertText", { text: email });
  await command("Runtime.evaluate", { expression: "document.querySelector('#login-form').elements.password.focus()" });
  await command("Input.insertText", { text: password });
  const submit = await command("Runtime.evaluate", { expression: `(() => {
    const form = document.querySelector('#login-form');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.focus();
    form.requestSubmit(submitButton);
    return JSON.stringify({ valid: form.checkValidity(), emailValue: form.elements.email.value });
  })()`, returnByValue: true });
  const submitted = JSON.parse(submit.result.value);
  if (!submitted.valid || submitted.emailValue !== email) throw new Error("The browser did not accept the configured owner email for submission");
  let result = { dashboard: false, browserValidation: false, error: "" };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(350);
    const outcome = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({ dashboard: !!document.querySelector('.admin-shell'), browserValidation: document.querySelector('#login-form')?.matches(':invalid') ?? false, error: document.querySelector('#login-error')?.textContent?.trim() || '', requests: window.__ownerLoginRequests || [] }))()`, returnByValue: true });
    result = JSON.parse(outcome.result.value);
    if (result.dashboard || result.browserValidation || result.error) break;
  }
  if (!result.dashboard || result.browserValidation || result.error) throw new Error(`Interactive login failed: ${JSON.stringify(result)}`);

  const capture = async name => {
    const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(`${evidenceDir}/${name}.png`, Buffer.from(screenshot.data, "base64"));
  };
  const navigation = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
    shell: !!document.querySelector('.admin-shell'),
    sidebar: !!document.querySelector('.admin-sidebar, .admin-nav, aside'),
    links: [...document.querySelectorAll('[data-select]')].map(el => el.dataset.select).filter(Boolean)
  }))()`, returnByValue: true });
  const navState = JSON.parse(navigation.result.value);
  const requiredCmsLinks = ["homePage", "design", "universities", "team", "gallery", "analytics", "requests", "siteSettings", "account"];
  if (!navState.shell || !navState.sidebar || !requiredCmsLinks.every(key => navState.links.includes(key))) {
    throw new Error(`Redesigned dashboard navigation is incomplete: ${JSON.stringify(navState)}`);
  }
  const suffix = viewport.mobile ? "mobile" : "desktop";
  await capture(`${suffix}-dashboard`);
  if (viewport.mobile) {
    const menuState = await command("Runtime.evaluate", { expression: `(() => {
      document.querySelector('[data-sidebar-toggle]')?.click();
      return JSON.stringify({ open: document.querySelector('.admin-shell')?.classList.contains('nav-open') || false });
    })()`, returnByValue: true });
    if (!JSON.parse(menuState.result.value).open) throw new Error("Mobile navigation did not open");
    await capture(`${suffix}-navigation`);
  } else {
    const alertsView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      hasAlerts: !!document.querySelector('.alert-panel, .alert-action'),
      alertActions: document.querySelectorAll('.alert-action').length
    }))()`, returnByValue: true });
    const alertsState = JSON.parse(alertsView.result.value);
    const dashboardSummary = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({ cards: document.querySelectorAll('.stat-card').length, labels: [...document.querySelectorAll('.stat-card span')].map(node => node.textContent?.trim()), recentTitles: [...document.querySelectorAll('.recent-card h4')].map(node => node.textContent?.trim()) }))()`, returnByValue: true });
    const summaryState = JSON.parse(dashboardSummary.result.value);
    const requiredStats = ["الخدمات الرئيسية", "الخدمات الفرعية", "ملفات التحميل", "المقالات", "آراء الطلاب", "الجامعات", "شركاء النجاح"];
    const requiredRecentTitles = ["آخر الطلبات", "آخر الرسائل", "آخر التقييمات", "آخر الملفات", "آخر المقالات"];
    if (!alertsState.hasAlerts || summaryState.cards < 10 || !requiredStats.every(label => summaryState.labels.includes(label)) || !requiredRecentTitles.every(title => summaryState.recentTitles.includes(title))) {
      throw new Error(`Dashboard summary cards did not render: ${JSON.stringify({ alertsState, summaryState })}`);
    }
    const articleOrderView = await command("Runtime.evaluate", { expression: `(() => {
      const card = [...document.querySelectorAll('.recent-card')].find(node => node.querySelector('h4')?.textContent?.trim() === 'آخر المقالات');
      const texts = [...(card?.querySelectorAll('li small') || [])].map(node => node.textContent?.trim() || '');
      const months = { يناير: 0, فبراير: 1, مارس: 2, أبريل: 3, مايو: 4, يونيو: 5, يوليو: 6, أغسطس: 7, سبتمبر: 8, أكتوبر: 9, نوفمبر: 10, ديسمبر: 11 };
      const dates = texts.map(text => { const match = text.match(/^(\\d{1,2})\\s+(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\\s+(\\d{4})$/); return match ? Date.UTC(Number(match[3]), months[match[2]], Number(match[1])) : 0; });
      return JSON.stringify({ texts, dates, descending: dates.every((date, index) => index === 0 || date <= dates[index - 1]) });
    })()`, returnByValue: true });
    const articleOrderState = JSON.parse(articleOrderView.result.value);
    if (!articleOrderState.texts.length || articleOrderState.dates.includes(0) || !articleOrderState.descending) throw new Error(`Recent articles are not visibly ordered by publication date: ${JSON.stringify(articleOrderState)}`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="analytics"]')?.click()` });
    await wait(300);
    const analyticsView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({ title: document.querySelector('.workspace h2')?.textContent?.trim() || '', cards: document.querySelectorAll('.analytics-card').length, metrics: document.querySelectorAll('.analytics-metrics article').length, labels: [...document.querySelectorAll('.analytics-card h3')].map(node => node.textContent?.trim()) }))()`, returnByValue: true });
    const analyticsState = JSON.parse(analyticsView.result.value);
    const requiredAnalytics = ["أكثر الخدمات مشاهدة", "أكثر المقالات مشاهدة", "أكثر الملفات تحميلاً"];
    if (!analyticsState.title.includes("الإحصاءات المتقدمة") || analyticsState.cards < 7 || analyticsState.metrics !== 4 || !requiredAnalytics.every(label => analyticsState.labels.includes(label))) throw new Error(`Advanced analytics workspace did not render: ${JSON.stringify(analyticsState)}`);
    await capture(`${suffix}-alerts`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="messages"]')?.click()` });
    await wait(300);
    const emptyView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      hasMessagesView: !!document.querySelector('.workspace, .admin-content, .admin-main'),
      hasEmptyState: !!document.querySelector('.empty'),
      emptyText: document.querySelector('.empty')?.textContent?.trim() || ''
    }))()`, returnByValue: true });
    const emptyState = JSON.parse(emptyView.result.value);
    if (!emptyState.hasMessagesView || !emptyState.hasEmptyState) throw new Error(`Messages empty state did not render: ${JSON.stringify(emptyState)}`);
    await capture(`${suffix}-empty-messages`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="requests"]')?.click()` });
    await wait(300);
    const requestsView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      title: document.querySelector('.admin-content h1, .admin-main h1, main h1')?.textContent?.trim() || '',
      hasRequestControls: !!document.querySelector('[data-request-status], [data-save-request], select')
    }))()`, returnByValue: true });
    const requestsState = JSON.parse(requestsView.result.value);
    if (!requestsState.hasRequestControls) throw new Error(`Requests module did not render after navigation: ${JSON.stringify(requestsState)}`);
    await capture(`${suffix}-requests`);
    const managedLists = ["requests", "messages", "submittedReviews", "gallery"];
    const expectedFilterKinds = { requests: "status", messages: "message-status", submittedReviews: "status", gallery: "media-category" };
    const verifiedFilterKinds = new Set();
    for (const key of managedLists) {
      await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="${key}"]')?.click()` });
      await wait(250);
      const listControls = await command("Runtime.evaluate", { expression: `(() => {
        const scope = document.querySelector('.workspace');
        const controls = scope?.querySelector('.list-controls-managed');
        const search = controls?.querySelector('input[type="search"]');
        const selects = [...(controls?.querySelectorAll('select') || [])];
        const beforeRequests = (window.__ownerLoginRequests || []).length;
        if (search) { search.value = '__إثبات_بحث_غير_متلف__'; search.dispatchEvent(new Event('input', { bubbles: true })); }
        const emptyState = controls?.querySelector('[data-page-current]')?.textContent?.trim() || '';
        if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); }
        const statusFilter = selects[0];
        const sort = selects[1];
        const beforeFilterVisible = [...(scope?.querySelectorAll('.item-list > .item-row:not([hidden]), .item-list > .editor:not([hidden])') || [])].length;
        const filterValue = statusFilter?.options.length > 1 ? statusFilter.options[1].value : '';
        if (filterValue) { statusFilter.value = filterValue; statusFilter.dispatchEvent(new Event('change', { bubbles: true })); }
        const afterFilterVisible = [...(scope?.querySelectorAll('.item-list > .item-row:not([hidden]), .item-list > .editor:not([hidden])') || [])].length;
        const filterKind = controls?.dataset.filterKind || '';
        const filterMatches = !filterValue || [...(scope?.querySelectorAll('.item-list > .item-row:not([hidden])') || [])].every(row => {
          if (filterKind === 'message-status') return row.querySelector('[data-message-status]')?.value === filterValue;
          if (filterKind === 'media-category') return row.dataset.mediaCategory === filterValue;
          return row.querySelector('.status')?.textContent?.trim() === filterValue;
        });
        if (filterValue) { statusFilter.value = ''; statusFilter.dispatchEvent(new Event('change', { bubbles: true })); }
        const next = controls?.querySelector('[data-page="next"]');
        const previous = controls?.querySelector('[data-page="previous"]');
        const beforePage = controls?.querySelector('[data-page-current]')?.textContent?.trim() || '';
        if (next && !next.disabled) { next.click(); }
        const afterNextPage = controls?.querySelector('[data-page-current]')?.textContent?.trim() || '';
        if (previous && !previous.disabled) { previous.click(); }
        const afterPreviousPage = controls?.querySelector('[data-page-current]')?.textContent?.trim() || '';
        if (sort) { sort.value = 'name-asc'; sort.dispatchEvent(new Event('change', { bubbles: true })); }
        return JSON.stringify({
          controls: !!controls,
          search: !!search,
          filter: selects.length >= 1,
          sort: sort?.value || '',
          pagination: !!controls?.querySelector('[data-page-current]'),
          noResultFeedback: emptyState,
          filterActivated: Boolean(filterValue),
          filterKind,
          filterMatches,
          filterVisible: { before: beforeFilterVisible, after: afterFilterVisible },
          paginationState: { before: beforePage, afterNext: afterNextPage, afterPrevious: afterPreviousPage, nextDisabled: next?.disabled ?? true },
          networkDelta: (window.__ownerLoginRequests || []).length - beforeRequests
        });
      })()`, returnByValue: true });
      const listState = JSON.parse(listControls.result.value);
      if (listState.filterKind === expectedFilterKinds[key]) verifiedFilterKinds.add(key);
      const paginationVerified = listState.paginationState.nextDisabled || (listState.paginationState.afterNext !== listState.paginationState.before && listState.paginationState.afterPrevious === listState.paginationState.before);
      if (!listState.controls || !listState.search || !listState.filter || listState.sort !== "name-asc" || !listState.pagination || !listState.noResultFeedback.includes("لا توجد نتائج") || !listState.filterMatches || !paginationVerified || listState.networkDelta !== 0) {
        throw new Error(`Managed list controls failed for ${key}: ${JSON.stringify(listState)}`);
      }
    }
    if (verifiedFilterKinds.size !== managedLists.length) throw new Error(`Managed list filter semantics are incomplete: ${JSON.stringify([...verifiedFilterKinds])}`);
    const isolatedDomFilters = await command("Runtime.evaluate", { expression: `(async () => {
      const cases = [
        { title: 'طلبات العملاء', kind: 'status', first: '<article class="item-row" data-case="match"><span class="status">جديد</span><b>طلب جديد</b></article>', second: '<article class="item-row" data-case="other"><span class="status">مكتمل</span><b>طلب مكتمل</b></article>' },
        { title: 'رسائل التواصل', kind: 'message-status', first: '<article class="item-row" data-case="match"><select data-message-status="1"><option value="new" selected>جديد</option><option value="read">مقروءة</option></select><b>رسالة جديدة</b></article>', second: '<article class="item-row" data-case="other"><select data-message-status="2"><option value="new">جديد</option><option value="read" selected>مقروءة</option></select><b>رسالة مقروءة</b></article>' },
        { title: 'تقييمات بانتظار المراجعة', kind: 'status', first: '<article class="item-row" data-case="match"><span class="status">منشور</span><b>تقييم منشور</b></article>', second: '<article class="item-row" data-case="other"><span class="status">مخفي</span><b>تقييم مخفي</b></article>' },
        { title: 'معرض الصور والوسائط', kind: 'media-category', first: '<article class="item-row" data-case="match" data-media-category="image"><b>صورة</b></article>', second: '<article class="item-row" data-case="other" data-media-category="file"><b>ملف</b></article>' }
      ];
      const beforeRequests = (window.__ownerLoginRequests || []).length;
      const results = [];
      for (const item of cases) {
        const fixture = document.createElement('section');
        fixture.className = 'workspace';
        fixture.innerHTML = '<div class="workspace-head"><div><h2>' + item.title + '</h2></div></div><div class="item-list">' + item.first + item.second + '</div>';
        document.body.append(fixture);
        await new Promise(resolve => setTimeout(resolve, 30));
        const controls = fixture.querySelector('.list-controls-managed');
        const filter = controls?.querySelector('.list-filter select');
        const value = filter?.options?.[1]?.value || '';
        if (filter && value) { filter.value = value; filter.dispatchEvent(new Event('change', { bubbles: true })); }
        const visible = [...fixture.querySelectorAll('.item-row:not([hidden])')].map(row => row.dataset.case);
        const hidden = [...fixture.querySelectorAll('.item-row[hidden]')].map(row => row.dataset.case);
        results.push({ kind: controls?.dataset.filterKind || '', selected: value, visible, hidden });
        fixture.remove();
      }
      return JSON.stringify({ results, networkDelta: (window.__ownerLoginRequests || []).length - beforeRequests });
    })()`, returnByValue: true, awaitPromise: true });
    const isolatedDomFilterState = JSON.parse(isolatedDomFilters.result.value);
    if (isolatedDomFilterState.networkDelta !== 0 || isolatedDomFilterState.results.length !== 4 || !isolatedDomFilterState.results.every(result => result.selected && result.visible.length === 1 && result.visible[0] === 'match' && result.hidden.includes('other'))) {
      throw new Error(`Isolated DOM filters did not hide only non-matching rows: ${JSON.stringify(isolatedDomFilterState)}`);
    }
    const structuredEditorView = await command("Runtime.evaluate", { expression: `(async () => {
      const inspect = async key => {
        document.querySelector('[data-select="' + key + '"]')?.click();
        await new Promise(resolve => setTimeout(resolve, 200));
        const root = document.querySelector('.workspace');
        return {
          key,
          title: root?.querySelector('h2')?.textContent?.trim() || '',
          rawJson: !!root?.querySelector('textarea[name="content"], textarea[data-json]'),
          settings: !!root?.querySelector('form[data-structured-settings]'),
          list: !!root?.querySelector('[data-structured-add]'),
          about: !!root?.querySelector('form[data-structured-about]'),
          mediaPicker: !!root?.querySelector('[data-media-target]'),
          uploadButton: !!root?.querySelector('[data-structured-upload]'),
          textInputs: root?.querySelectorAll('input:not([type="file"]), textarea, select').length || 0
        };
      };
      const beforeRequests = (window.__ownerLoginRequests || []).length;
      const screens = [];
      for (const key of ['homePage', 'design', 'contact', 'about', 'team', 'plans', 'downloads', 'articles', 'reviews', 'faqs', 'universities', 'partners']) screens.push(await inspect(key));
      document.querySelector('[data-select="homePage"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 120));
      const homePreviewInput = document.querySelector('form[data-structured-settings="homePage"] [name="tickerText"]');
      if (homePreviewInput) { homePreviewInput.value = 'معاينة محلية معزولة قبل الحفظ'; homePreviewInput.dispatchEvent(new Event('input', { bubbles: true })); }
      const homePreview = { exists: !!document.querySelector('[data-structured-preview="homePage"]'), text: document.querySelector('[data-structured-preview-text]')?.textContent?.trim() || '' };
      document.querySelector('[data-select="design"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 120));
      const designPicker = document.querySelector('form[data-structured-settings="design"] [data-media-target="structured-logo-image"]');
      const previewLogoUrl = [...(designPicker?.options || [])].find(option => option.value)?.value || '';
      if (designPicker && previewLogoUrl) { designPicker.value = previewLogoUrl; designPicker.dispatchEvent(new Event('change', { bubbles: true })); }
      const designPreview = { exists: !!document.querySelector('[data-structured-preview="design"]'), logoUrl: document.querySelector('[data-structured-preview-logo]')?.getAttribute('src') || '', visible: !document.querySelector('[data-structured-preview-logo]')?.hidden };
      document.querySelector('[data-select="team"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 120));
      document.querySelector('[data-structured-add][data-structured-key="team"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 120));
      const teamPicker = document.querySelector('.workspace [data-media-target]');
      const selectedImage = [...(teamPicker?.options || [])].find(option => option.value)?.value || '';
      if (teamPicker && selectedImage) { teamPicker.value = selectedImage; teamPicker.dispatchEvent(new Event('change', { bubbles: true })); }
      const teamDraft = { mediaPicker: !!teamPicker, uploadButton: !!document.querySelector('.workspace [data-structured-upload]'), selectedImage, selectedValue: teamPicker?.value || '', cancel: !!document.querySelector('.workspace [data-structured-cancel]') };
      document.querySelector('.workspace [data-structured-cancel]')?.click();
      await new Promise(resolve => setTimeout(resolve, 80));
      document.querySelector('[data-select="downloads"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 120));
      document.querySelector('[data-structured-add][data-structured-key="downloads"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 120));
      const fileInput = document.querySelector('.workspace input[data-structured-upload-kind="file"]');
      const fileSelect = document.querySelector('.workspace [data-media-target]');
      const downloadForm = document.querySelector('.workspace form[data-structured-form="downloads"]');
      const originalUploadMedia = window.WajbatAdmin.uploadMedia;
      const originalSaveCollection = window.WajbatAdmin.saveCollection;
      const uploadProbe = { called: false, name: '', category: '', type: '', selected: '' };
      const saveProbe = { called: false, key: '', downloadName: '', remoteFile: '' };
      if (fileInput && fileSelect) {
        window.WajbatAdmin.uploadMedia = async (file, category) => {
          uploadProbe.called = true;
          uploadProbe.name = file.name;
          uploadProbe.type = file.type;
          uploadProbe.category = category;
          return { url: 'https://isolated.test/verification-download.pdf' };
        };
        const files = new DataTransfer();
        files.items.add(new File(['verification'], 'verification-download.pdf', { type: 'application/pdf' }));
        Object.defineProperty(fileInput, 'files', { configurable: true, value: files.files });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 120));
        uploadProbe.selected = fileSelect.value;
        if (downloadForm) {
          const nameField = downloadForm.querySelector('input[name^="downloadName"]');
          const titleField = downloadForm.querySelector('input[name="title"]');
          if (nameField) nameField.value = 'ملف تحقق معزول';
          if (titleField) titleField.value = 'تصنيف تحقق معزول';
          window.WajbatAdmin.saveCollection = async (key, next) => {
            const firstDownload = next?.at(-1)?.items?.[0] || {};
            saveProbe.called = true;
            saveProbe.key = key;
            saveProbe.downloadName = firstDownload.name || '';
            saveProbe.remoteFile = firstDownload.remoteFile || '';
          };
          downloadForm.requestSubmit();
          await new Promise(resolve => setTimeout(resolve, 80));
          window.WajbatAdmin.saveCollection = originalSaveCollection;
        }
        window.WajbatAdmin.uploadMedia = originalUploadMedia;
      }
      const downloadDraft = { mediaPicker: !!fileSelect, fileUploadButton: !!document.querySelector('.workspace [data-structured-file-upload]'), fileInput: fileInput?.getAttribute('accept') || '', cancel: !!document.querySelector('.workspace [data-structured-cancel]'), uploadProbe, saveProbe };
      document.querySelector('.workspace [data-structured-cancel]')?.click();
      await new Promise(resolve => setTimeout(resolve, 80));
      return JSON.stringify({ screens, homePreview, designPreview, teamDraft, downloadDraft, networkDelta: (window.__ownerLoginRequests || []).length - beforeRequests });
    })()`, returnByValue: true, awaitPromise: true });
    const structuredEditorState = JSON.parse(structuredEditorView.result.value);
    const screensByKey = Object.fromEntries(structuredEditorState.screens.map(screen => [screen.key, screen]));
    const settingsKeys = ['homePage', 'design', 'contact'];
    const listKeys = ['team', 'plans', 'downloads', 'articles', 'reviews', 'faqs', 'universities', 'partners'];
    if (structuredEditorState.networkDelta !== 0 || structuredEditorState.screens.some(screen => screen.rawJson || screen.textInputs < 1) || !settingsKeys.every(key => screensByKey[key]?.settings) || !listKeys.every(key => screensByKey[key]?.list) || !screensByKey.about?.about || !screensByKey.design?.mediaPicker || !screensByKey.design?.uploadButton || !structuredEditorState.homePreview?.exists || structuredEditorState.homePreview.text !== 'معاينة محلية معزولة قبل الحفظ' || !structuredEditorState.designPreview?.exists || !structuredEditorState.designPreview?.logoUrl || !structuredEditorState.designPreview?.visible || !structuredEditorState.teamDraft?.mediaPicker || !structuredEditorState.teamDraft?.uploadButton || !structuredEditorState.teamDraft?.selectedImage || structuredEditorState.teamDraft.selectedValue !== structuredEditorState.teamDraft.selectedImage || !structuredEditorState.teamDraft?.cancel || !structuredEditorState.downloadDraft?.mediaPicker || !structuredEditorState.downloadDraft?.fileUploadButton || !structuredEditorState.downloadDraft?.fileInput.includes('application/pdf') || !structuredEditorState.downloadDraft?.uploadProbe?.called || structuredEditorState.downloadDraft.uploadProbe.name !== 'verification-download.pdf' || structuredEditorState.downloadDraft.uploadProbe.category !== 'تحميلات' || structuredEditorState.downloadDraft.uploadProbe.selected !== 'https://isolated.test/verification-download.pdf' || !structuredEditorState.downloadDraft?.saveProbe?.called || structuredEditorState.downloadDraft.saveProbe.key !== 'downloads' || structuredEditorState.downloadDraft.saveProbe.downloadName !== 'ملف تحقق معزول' || structuredEditorState.downloadDraft.saveProbe.remoteFile !== 'https://isolated.test/verification-download.pdf' || !structuredEditorState.downloadDraft?.cancel) {
      throw new Error(`Structured CMS editors did not render without raw JSON: ${JSON.stringify(structuredEditorState)}`);
    }
    await capture(`${suffix}-structured-editor`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="siteSettings"]')?.click()` });
    await wait(300);
    const settingsView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      hasSettings: !!document.querySelector('[data-setting], #seo-title, input[name*="seo"], textarea')
    }))()`, returnByValue: true });
    if (!JSON.parse(settingsView.result.value).hasSettings) throw new Error("Settings module did not render after navigation");
    await capture(`${suffix}-settings`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="account"]')?.click()` });
    await wait(350);
    const accountSecurityView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      hasAccountForm: !!document.querySelector('form[data-account-form]'),
      hasSecurityControl: !!document.querySelector('#other-sessions-control'),
      hasRevokeButton: !!document.querySelector('[data-revoke-other-sessions]')
    }))()`, returnByValue: true });
    const accountSecurityState = JSON.parse(accountSecurityView.result.value);
    if (!accountSecurityState.hasAccountForm || !accountSecurityState.hasSecurityControl || !accountSecurityState.hasRevokeButton) {
      throw new Error(`Owner session-security control did not render: ${JSON.stringify(accountSecurityState)}`);
    }
    const passwordGuardView = await command("Runtime.evaluate", { expression: `(() => {
      document.querySelector('[data-revoke-other-sessions]')?.click();
      return JSON.stringify({
        feedback: document.querySelector('[data-session-feedback]')?.textContent?.trim() || '',
        revokeRequests: (window.__ownerLoginRequests || []).filter(item => item.url.includes('adminAuth.revokeOtherSessions')).length
      });
    })()`, returnByValue: true });
    const passwordGuardState = JSON.parse(passwordGuardView.result.value);
    if (!passwordGuardState.feedback.includes("أدخل كلمة المرور الحالية") || passwordGuardState.revokeRequests !== 0) {
      throw new Error(`Session-security password guard failed: ${JSON.stringify(passwordGuardState)}`);
    }
    await capture(`${suffix}-account-security`);
    if (!viewport.mobile) {
      await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="homePage"]')?.click()` });
      await wait(250);
      const saveUnchangedSettings = await command("Runtime.evaluate", { expression: `(async () => {
        const form = document.querySelector('form[data-structured-settings="homePage"]');
        const ticker = form?.elements.tickerText?.value || '';
        const beforeRequests = (window.__ownerLoginRequests || []).length;
        form?.requestSubmit();
        await new Promise(resolve => setTimeout(resolve, 450));
        const source = await fetch('/api/trpc/site.publicContent?batch=1').then(response => response.json());
        const payload = JSON.stringify(source);
        return JSON.stringify({ form: !!form, ticker, requests: (window.__ownerLoginRequests || []).length - beforeRequests, reflected: payload.includes(JSON.stringify(ticker)) });
      })()`, returnByValue: true, awaitPromise: true });
      const savedSettingsState = JSON.parse(saveUnchangedSettings.result.value);
      if (!savedSettingsState.form || savedSettingsState.requests < 1 || !savedSettingsState.reflected) {
        throw new Error(`Structured settings did not persist the existing values through the public API: ${JSON.stringify(savedSettingsState)}`);
      }
      const saveRemainingSettings = await command("Runtime.evaluate", { expression: `(async () => {
        const results = [];
        for (const key of ['design', 'contact']) {
          document.querySelector('[data-select="' + key + '"]')?.click();
          await new Promise(resolve => setTimeout(resolve, 220));
          const form = document.querySelector('form[data-structured-settings="' + key + '"]');
          const namedValues = form ? [...form.elements]
            .filter(element => element.name && !['file', 'submit', 'button', 'reset'].includes(element.type) && String(element.value || '').trim())
            .map(element => [element.name, String(element.value)]) : [];
          const mediaValues = form ? [...form.querySelectorAll('[data-media-target]')]
            .filter(element => String(element.value || '').trim())
            .map(element => ['media', String(element.value)]) : [];
          const values = [...namedValues, ...mediaValues];
          const beforeRequests = (window.__ownerLoginRequests || []).length;
          form?.requestSubmit();
          await new Promise(resolve => setTimeout(resolve, 450));
          const source = await fetch('/api/trpc/site.publicContent?batch=1').then(response => response.json());
          const payload = JSON.stringify(source);
          results.push({ key, form: !!form, values: values.map(([, value]) => value), requests: (window.__ownerLoginRequests || []).length - beforeRequests, reflected: values.every(([, value]) => payload.includes(JSON.stringify(value))) });
        }
        return JSON.stringify(results);
      })()`, returnByValue: true, awaitPromise: true });
      const remainingSettingsState = JSON.parse(saveRemainingSettings.result.value);
      if (remainingSettingsState.length !== 2 || !remainingSettingsState.every(item => item.form && (item.key === 'design' || item.values.length > 0) && item.requests >= 1 && item.reflected)) {
        throw new Error(`Design or contact settings did not persist their existing values through the public API: ${JSON.stringify(remainingSettingsState)}`);
      }
      const publicContentContract = await command("Runtime.evaluate", { expression: `(async () => {
        const source = await fetch('/api/trpc/site.publicContent?batch=1').then(response => response.json());
        return JSON.stringify({ ticker: ${JSON.stringify(savedSettingsState.ticker)}, reflected: JSON.stringify(source).includes(${JSON.stringify(JSON.stringify(savedSettingsState.ticker))}) });
      })()`, returnByValue: true, awaitPromise: true });
      const publicContentState = JSON.parse(publicContentContract.result.value);
      if (!publicContentState.reflected) throw new Error(`Saved home-page setting is missing from the public content contract: ${JSON.stringify(publicContentState)}`);
      const expectedText = [savedSettingsState.ticker].filter(Boolean);
      const expectedImages = remainingSettingsState.find(item => item.key === 'design')?.values || [];
      await command("Page.navigate", { url: `${baseUrl}/?cms-dom-check=${Date.now()}` });
      let visitorDomState = { ready: false, textMatches: [], imageMatches: [] };
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await wait(300);
        const visitorDom = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
          ready: document.querySelector('#app')?.innerText?.length > 100,
          textMatches: ${JSON.stringify(expectedText)}.map(value => document.body?.innerText?.includes(value)),
          imageMatches: ${JSON.stringify(expectedImages)}.map(value => [...document.images].some(image => image.src === value || image.getAttribute('src') === value))
        }))()`, returnByValue: true });
        visitorDomState = JSON.parse(visitorDom.result.value);
        if (visitorDomState.ready) break;
      }
      if (!visitorDomState.ready || visitorDomState.textMatches.some(match => !match) || visitorDomState.imageMatches.some(match => !match)) {
        throw new Error(`Saved CMS values did not render in the visitor DOM after reload: ${JSON.stringify({ expectedText, expectedImages, visitorDomState })}`);
      }
      const expectedContactText = remainingSettingsState.find(item => item.key === 'contact')?.values || [];
      await command("Page.navigate", { url: `${baseUrl}/#/contact?cms-dom-check=${Date.now()}` });
      let contactDomState = { ready: false, textMatches: [] };
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await wait(300);
        const contactDom = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
          ready: document.querySelector('#app')?.innerText?.length > 100,
          textMatches: ${JSON.stringify(expectedContactText)}.map(value => document.body?.innerText?.includes(value))
        }))()`, returnByValue: true });
        contactDomState = JSON.parse(contactDom.result.value);
        if (contactDomState.ready) break;
      }
      if (!contactDomState.ready || contactDomState.textMatches.some(match => !match)) {
        throw new Error(`Saved contact settings did not render in the visitor DOM: ${JSON.stringify({ expectedContactText, contactDomState })}`);
      }
      result.visitorDomReload = { home: visitorDomState, contact: contactDomState };
    }
  }
  result.redesign = { navigation: navState, screenshots: suffix };
  return result;
}

try {
  const cdp = await createCdp(await getDebuggerUrl());
  await cdp.command("Page.enable");
  const desktop = await runInteractiveLogin(cdp.command, { width: 1280, height: 900, scale: 1, mobile: false });
  const android = await runInteractiveLogin(cdp.command, { width: 375, height: 812, scale: 3, mobile: true });
  console.log(JSON.stringify({ desktop, android, status: "OWNER_LOGIN_INTERACTIVE_BROWSER_TEST_PASSED" }));
  cdp.socket.close();
} finally {
  chrome.kill("SIGTERM");
  await wait(500);
  removeProfile();
}
