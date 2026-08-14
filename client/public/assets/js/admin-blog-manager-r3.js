/**
 * مدير «المدونة الأكاديمية» — لوحة المالك (إصدار r1)
 * يدير تصنيفات المدونة ومقالاتها (جداول blog_categories / blog_articles)
 * مع رفع صور من الجهاز مباشرة، محرر كامل، معاينة، ونوافذ تأكيد داخلية.
 */
(function () {
  "use strict";

  const TRPC = "/api/trpc";

  /** ترقيم بصمة الأصول لتجاوز تخزين CDN المؤقت. */
  const FINGERPRINT = "blog-r1";

  const manager = {
    state: {
      categories: [],
      articles: [],
      tab: "articles", // "articles" | "categories"
      loaded: false,
      loading: false,
      editingArticle: null, // null | {} (form)
      editingCategory: null, // null | {}
      previewArticle: null,
      toastTimer: null,
      categoryToast: null,
    },
    container: null,



    activate() {
      const target = this.container || document.querySelector("[data-blog-workspace]");
      if (!target) return;
      this.container = target;
      this.state.loaded = false;
      void this.load();
    }    /* --------------------- الاتصال بالخادم --------------------- */
    async request(procedure, input) {
      const suffix = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
      const response = await fetch(`${TRPC}/${procedure}${suffix}`, { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload?.error?.json?.message) || "تعذر الاتصال بالخادم");
      return payload?.result?.data ?? payload?.result;
    },
    async mutate(procedure, input) {
      const response = await fetch(`${TRPC}/${procedure}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ json: input }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload?.error?.json?.message) || "تعذر حفظ التعديلات");
      return payload?.result?.data ?? payload?.result;
    },
    esc(value = "") {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
    },
    toast(message) {
      const element = document.createElement("div");
      element.className = "toast";
      element.textContent = message;
      document.body.append(element);
      window.setTimeout(() => element.remove(), 3200);
    },
    messageOf(error) {
      return error && (error.message || (typeof error === "string" ? error : "حدث خطأ غير متوقع"));
    },

    /* --------------------- التحميل --------------------- */
    async load() {
      if (this.state.loaded || this.state.loading) return;
      this.state.loading = true;
      this.render();
      try {
        const [categories, articles] = await Promise.all([
          this.request("admin.blog.categories"),
          this.request("admin.blog.articles"),
        ]);
        this.state.categories = Array.isArray(categories) ? categories : [];
        this.state.articles = Array.isArray(articles) ? articles : [];
        this.state.loaded = true;
      } finally {
        this.state.loading = false;
        this.render();
      }
    },

    refresh() {
      this.state.loaded = false;
      this.state.loading = false;
      this.state.editingArticle = null;
      this.state.previewArticle = null;
      void this.load();
    },

    /* --------------------- رفع صور المقالات --------------------- */
    async fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("تعذر قراءة الملف من جهازك"));
        reader.readAsDataURL(file);
      });
    },

    async uploadArticleImage(file, articleId) {
      if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
        throw new Error("صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP أو GIF أو SVG.");
      }
      if (file.size > 4 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 4 ميغابايت");
      const dataUrl = await this.fileToDataUrl(file);
      return this.mutate("admin.blog.uploadArticleImage", {
        id: articleId, mimeType: file.type, dataUrl,
      });
    },

    /* --------------------- التصنيفات --------------------- */
    startNewCategory() {
      this.state.editingCategory = { name: "" };
      this.render();
    },
    cancelCategory() {
      this.state.editingCategory = null;
      this.render();
    },
    async saveCategory() {
      const form = this.state.editingCategory;
      if (!form || !form.name.trim()) { this.toast("اكتب اسم التصنيف أولًا"); return; }
      try {
        if (form.id) {
          await this.mutate("admin.blog.updateCategory", { id: form.id, name: form.name.trim() });
        } else {
          await this.mutate("admin.blog.createCategory", { name: form.name.trim() });
        }
        this.state.editingCategory = null;
        this.toast("تم حفظ التصنيف في قاعدة البيانات");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async deleteCategory(id) {
      try {
        await this.mutate("admin.blog.deleteCategory", { id });
        this.toast("تم حذف التصنيف");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    confirmDeleteCategory(id) {
      void this.confirmDialog("حذف هذا التصنيف؟", "سيُحذف التصنيف نهائيًا. المقالات المرتبطة به تبقى دون تغيير.", "حذف التصنيف", () => this.deleteCategory(id));
    },
    async toggleCategory(id, isVisible) {
      try {
        await this.mutate("admin.blog.setCategoryVisibility", { id, isVisible });
        this.toast(isVisible ? "تم إظهار التصنيف للزوار" : "تم إخفاء التصنيف عن الزوار");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async moveCategory(id, direction) {
      try {
        await this.mutate("admin.blog.moveCategory", { id, direction });
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    startEditCategory(category) {
      this.state.editingCategory = { id: category.id, name: category.name };
      this.render();
    },

    /* --------------------- المقالات --------------------- */
    emptyArticleForm() {
      const firstVisibleCategory = this.state.categories.find(c => c.isVisible !== false);
      return {
        id: null, title: "", summary: "", body: "", author: "", publishedText: "",
        categoryId: firstVisibleCategory ? firstVisibleCategory.id : null,
        imageUrl: null, imageKey: null,
      };
    },
    startNewArticle() {
      this.state.editingArticle = this.emptyArticleForm();
      this.render();
    },
    cancelArticle() {
      this.state.editingArticle = null;
      this.render();
    },
    startEditArticle(article) {
      this.state.editingArticle = {
        id: article.id, title: article.title || "", summary: article.summary || "", body: article.body || "",
        author: article.author || "", publishedText: article.publishedText || "",
        categoryId: article.categoryId ?? null,
        imageUrl: article.imageUrl || null, imageKey: article.imageKey || null,
      };
      this.render();
    },
    async deleteArticle(id) {
      try {
        await this.mutate("admin.blog.deleteArticle", { id });
        this.toast("تم حذف المقال");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    confirmDeleteArticle(id) {
      void this.confirmDialog("حذف هذا المقال؟", "سيُحذف المقال نهائيًا من قاعدة البيانات.", "حذف المقال", () => this.deleteArticle(id));
    },
    async toggleArticle(id, isVisible) {
      try {
        await this.mutate("admin.blog.setArticleVisibility", { id, isVisible });
        this.toast(isVisible ? "تم نشر المقال للزوار" : "تم إخفاء المقال عن الزوار");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async moveArticle(id, direction) {
      try {
        await this.mutate("admin.blog.moveArticle", { id, direction });
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },
    async uploadArticleCover(file) {
      const form = this.state.editingArticle;
      if (!form || !form.id) { this.toast("احفظ المقال أولًا قبل رفع الصورة"); return; }
      try {
        const result = await this.uploadArticleImage(file, form.id);
        form.imageUrl = result?.url || null;
        form.imageKey = result?.key || form.imageKey;
        this.toast("تم رفع صورة المقال");
        this.render();
      } catch (error) { this.toast(this.messageOf(error)); }
    },

    async saveArticle() {
      const form = this.state.editingArticle;
      if (!form) return;
      if (!form.title.trim()) { this.toast("اكتب عنوان المقال أولًا"); return; }
      if (!form.body || !form.body.trim()) { this.toast("اكتب محتوى المقال أولًا"); return; }
      const input = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        body: form.body,
        author: form.author.trim() || null,
        publishedText: form.publishedText.trim() || null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        imageKey: form.imageKey,
        imageUrl: form.imageUrl,
      };
      try {
        if (form.id) {
          await this.mutate("admin.blog.updateArticle", { id: form.id, ...input });
        } else {
          await this.mutate("admin.blog.createArticle", input);
        }
        this.state.editingArticle = null;
        this.toast("تم حفظ المقال في قاعدة البيانات");
        this.refresh();
      } catch (error) { this.toast(this.messageOf(error)); }
    },

    openPreview(articleId) {
      const article = this.state.articles.find(a => a.id === articleId);
      if (!article) return;
      this.state.previewArticle = article;
      this.render();
    },
    closePreview() {
      this.state.previewArticle = null;
      this.render();
    },

    /* --------------------- نوافذ التأكيد الداخلية --------------------- */
    confirmDialog(title, body, confirmLabel, onConfirm) {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay blog-confirm-overlay";
      overlay.innerHTML = `<div class="modal-card blog-confirm" role="dialog" aria-modal="true">
        <h4>${this.esc(title)}</h4><p>${this.esc(body)}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-soft" data-blog-confirm-cancel>إلغاء</button>
          <button type="button" class="btn btn-danger" data-blog-confirm-ok>${this.esc(confirmLabel)}</button>
        </div></div>`;
      document.body.append(overlay);
      const close = () => overlay.remove();
      overlay.querySelector("[data-blog-confirm-cancel]").addEventListener("click", close);
      overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
      overlay.querySelector("[data-blog-confirm-ok]").addEventListener("click", () => { close(); onConfirm(); });
    },

    /* --------------------- البناء --------------------- */
    setTab(tab) {
      this.state.tab = tab;
      this.state.editingArticle = null;
      this.state.editingCategory = null;
      this.state.previewArticle = null;
      this.render();
    },

    render() {
      if (!this.container) return;
      const { state } = this;
      const root = this.container;

      const head = `
        <div class="workspace-head">
          <div><p class="eyebrow">إدارة المحتوى</p>
            <h2>📰 المدونة الأكاديمية</h2>
            <p>صنّف مقالاتك ومدّها بصور من جهازك مباشرة، ثم تظهر للزوار بنفس الشكل والترتيب.</p>
          </div>
          <div class="workspace-tabs">
            <button class="btn btn-soft ${state.tab === "articles" ? "btn-active" : ""}" data-blog-tab="articles">المقالات</button>
            <button class="btn btn-soft ${state.tab === "categories" ? "btn-active" : ""}" data-blog-tab="categories">التصنيفات</button>
          </div>
        </div>`;

      if (state.loading || !state.loaded) {
        root.innerHTML = `<section class="workspace side-workspace" data-blog-workspace>${head}<div class="workspace-body"><div class="empty">جارٍ تحميل المدونة من قاعدة البيانات...</div></div></section>`;
        return;
      }

      const body = state.tab === "categories" ? this.categoriesSection() : this.articlesSection();
      const preview = state.previewArticle ? this.previewSection(state.previewArticle) : "";
      const editing = state.editingArticle ? this.articleForm(state.editingArticle) : "";
      root.innerHTML = `<section class="workspace side-workspace" data-blog-workspace>${head}<div class="workspace-body">${editing}${preview ? `<div class="blog-preview-wrap">${preview}</div>` : ""}${body}</div></section>`;

      root.querySelectorAll("[data-blog-tab]").forEach(btn => btn.addEventListener("click", () => this.setTab(btn.dataset.blogTab)));
      root.querySelectorAll("[data-blog-add-article]").forEach(btn => btn.addEventListener("click", () => this.startNewArticle()));
      root.querySelectorAll("[data-blog-add-category]").forEach(btn => btn.addEventListener("click", () => this.startNewCategory()));
      root.querySelectorAll("[data-blog-cancel-article]").forEach(btn => btn.addEventListener("click", () => this.cancelArticle()));
      root.querySelectorAll("[data-blog-cancel-category]").forEach(btn => btn.addEventListener("click", () => this.cancelCategory()));
      root.querySelectorAll("[data-blog-save-article]").forEach(btn => btn.addEventListener("click", () => this.saveArticle()));
      root.querySelectorAll("[data-blog-prop]").forEach(el => {
        const key = el.dataset.blogProp;
        if (!key) return;
        const handler = () => {
          const form = this.state.editingArticle || this.state.editingCategory;
          if (!form) return;
          if (el.matches("select")) {
            form[key] = el.value === "" ? null : (key === "categoryId" ? Number(el.value) : el.value);
          } else {
            form[key] = el.value;
          }
        };
        el.addEventListener("input", handler);
        el.addEventListener("change", handler);
      });
            root.querySelectorAll("[data-blog-cat-name]").forEach(el => {
        el.addEventListener("input", () => {
          if (this.state.editingCategory) this.state.editingCategory.name = el.value;
        });
        el.addEventListener("change", () => {
          if (this.state.editingCategory) this.state.editingCategory.name = el.value;
        });
      });
root.querySelectorAll("[data-blog-save-category]").forEach(btn => btn.addEventListener("click", () => this.saveCategory()));
      root.querySelectorAll("[data-blog-edit]").forEach(btn => btn.addEventListener("click", () => {
        const item = this.state.articles.find(a => a.id === Number(btn.dataset.blogEdit));
        if (item) this.startEditArticle(item);
      }));
      root.querySelectorAll("[data-blog-toggle]").forEach(btn => btn.addEventListener("click", () => {
        const item = this.state.articles.find(a => a.id === Number(btn.dataset.blogToggle));
        if (item) void this.toggleArticle(item.id, item.isVisible === false);
      }));
      root.querySelectorAll("[data-blog-move]").forEach(btn => btn.addEventListener("click", () => {
        const [raw, direction] = btn.dataset.blogMove.split(":");
        void this.moveArticle(Number(raw), direction);
      }));
      root.querySelectorAll("[data-blog-delete]").forEach(btn => btn.addEventListener("click", () => this.confirmDeleteArticle(Number(btn.dataset.blogDelete))));
      root.querySelectorAll("[data-blog-preview]").forEach(btn => btn.addEventListener("click", () => this.openPreview(Number(btn.dataset.blogPreview))));
      root.querySelectorAll("[data-blog-cover]").forEach(btn => btn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
        input.addEventListener("change", () => { const file = input.files?.[0]; if (file) void this.uploadArticleCover(file); });
        input.click();
      }));
      root.querySelectorAll("[data-blog-close-preview]").forEach(btn => btn.addEventListener("click", () => this.closePreview()));

      /* أزرار التصنيفات */
      root.querySelectorAll("[data-blog-cat-edit]").forEach(btn => btn.addEventListener("click", () => {
        const item = this.state.categories.find(c => c.id === Number(btn.dataset.blogCatEdit));
        if (item) this.startEditCategory(item);
      }));
      root.querySelectorAll("[data-blog-cat-toggle]").forEach(btn => btn.addEventListener("click", () => {
        const item = this.state.categories.find(c => c.id === Number(btn.dataset.blogCatToggle));
        if (item) void this.toggleCategory(item.id, item.isVisible === false);
      }));
      root.querySelectorAll("[data-blog-cat-move]").forEach(btn => btn.addEventListener("click", () => {
        const [raw, direction] = btn.dataset.blogCatMove.split(":");
        void this.moveCategory(Number(raw), direction);
      }));
      root.querySelectorAll("[data-blog-cat-delete]").forEach(btn => btn.addEventListener("click", () => this.confirmDeleteCategory(Number(btn.dataset.blogCatDelete))));
      root.querySelectorAll("[data-blog-seed-categories]").forEach(btn => btn.addEventListener("click", async () => {
        try {
          await this.mutate("admin.blog.seedDefaultCategories");
          this.toast("تمت إضافة التصنيفات الافتراضية");
          this.refresh();
        } catch (error) { this.toast(this.messageOf(error)); }
      }));
    },

    /* --------------------- قسم التصنيفات --------------------- */
    categoriesSection() {
      const { categories, editingCategory } = this.state;
      const form = editingCategory ? `<article class="item-row item-editor">
        <div class="editor-fields">
          <label><span>اسم التصنيف</span><input type="text" maxlength="120" value="${this.esc(editingCategory.name)}" data-blog-cat-name></label>
        </div>
        <div class="row-actions">
          <button class="btn btn-soft btn-small" data-blog-cancel-category>إلغاء</button>
          <button class="btn btn-small" data-blog-save-category>حفظ التصنيف</button>
        </div>
      </article>` : "";

      const rows = categories.map(category => `<article class="item-row">
        <div class="item-title"><span>📂</span>
          <div><b>${this.esc(category.name)}</b><br><small>الترتيب: ${category.sortOrder}</small></div>
          <span class="status ${category.isVisible === false ? "hidden" : ""}">${category.isVisible === false ? "مخفي" : "ظاهر"}</span>
        </div>
        <div class="row-actions">
          <button class="btn btn-outline btn-small" data-blog-cat-move="${category.id}:up">↑</button>
          <button class="btn btn-outline btn-small" data-blog-cat-move="${category.id}:down">↓</button>
          <button class="btn btn-soft btn-small" data-blog-cat-edit="${category.id}">تعديل</button>
          <button class="btn btn-soft btn-small" data-blog-cat-toggle="${category.id}">${category.isVisible === false ? "إظهار" : "إخفاء"}</button>
          <button class="btn btn-danger btn-small" data-blog-cat-delete="${category.id}">حذف</button>
        </div>
      </article>`).join("");

      return `<div class="blog-section">
        <div class="section-heading">
          <h3>تصنيفات المدونة</h3>
          <div class="section-actions">
            <button class="btn btn-outline btn-small" data-blog-seed-categories>+ التصنيفات الافتراضية</button>
            <button class="btn btn-small" data-blog-add-category>+ تصنيف جديد</button>
          </div>
        </div>
        ${form}
        ${rows ? `<div class="item-list">${rows}</div>` : `<div class="empty">لا توجد تصنيفات بعد. أضف تصنيفًا أو استورد التصنيفات الافتراضية.</div>`}
      </div>`;
    },

    /* --------------------- قسم المقالات --------------------- */
    articlesSection() {
      const { articles, categories, editingArticle } = this.state;
      const visibleCount = articles.filter(a => a.isVisible !== false).length;
      const rows = articles.map(article => `<article class="item-row">
        <div class="item-title">
          ${article.imageUrl ? `<img src="${this.esc(article.imageUrl)}" alt="" class="blog-row-thumb">` : `<span>📄</span>`}
          <div><b>${this.esc(article.title)}</b>
            <br><small>${article.categoryText ? `📂 ${this.esc(article.categoryText)}` : "دون تصنيف"}${article.publishedText ? ` · ${this.esc(article.publishedText)}` : ""}${article.author ? ` · ${this.esc(article.author)}` : ""}</small></div>
          <span class="status ${article.isVisible === false ? "hidden" : ""}">${article.isVisible === false ? "مخفي" : "منشور"}</span>
        </div>
        <div class="row-actions">
          <button class="btn btn-outline btn-small" data-blog-move="${article.id}:up">↑</button>
          <button class="btn btn-outline btn-small" data-blog-move="${article.id}:down">↓</button>
          <button class="btn btn-soft btn-small" data-blog-preview="${article.id}">معاينة</button>
          <button class="btn btn-soft btn-small" data-blog-edit="${article.id}">تعديل</button>
          <button class="btn btn-soft btn-small" data-blog-toggle="${article.id}">${article.isVisible === false ? "نشر" : "إخفاء"}</button>
          <button class="btn btn-danger btn-small" data-blog-delete="${article.id}">حذف</button>
        </div>
      </article>`).join("");

      const stats = `<p class="blog-stats">المقالات المحفوظة: <b>${articles.length}</b> · الظاهرة للزوار: <b>${visibleCount}</b></p>`;

      return `<div class="blog-section">
        <div class="section-heading">
          <h3>مقالات المدونة</h3>
          <button class="btn btn-small" data-blog-add-article>+ مقال جديد</button>
        </div>
        ${stats}
        ${rows ? `<div class="item-list">${rows}</div>` : `<div class="empty">لا توجد مقالات بعد. أضف أول مقال أكاديمي.</div>`}
      </div>`;
    },

    /* --------------------- نموذج المقال --------------------- */
    articleForm(form) {
      const { categories } = this.state;
      const categoryOptions = [`<option value="">دون تصنيف</option>`].concat(
        categories.filter(c => c.isVisible !== false).map(c =>
          `<option value="${c.id}" ${form.categoryId === c.id ? "selected" : ""}>${this.esc(c.name)}</option>`),
      ).join("");
      return `<article class="item-row item-editor blog-article-editor">
        <div class="editor-fields">
          <label><span>عنوان المقال *</span><input type="text" maxlength="300" value="${this.esc(form.title)}" data-blog-prop="title" placeholder="مثال: كيف تذاكر بفعالية قبل الاختبارات"></label>
          <div class="editor-row">
            <label><span>التصنيف</span><select data-blog-prop="categoryId">${categoryOptions}</select></label>
            <label><span>تاريخ/نص النشر</span><input type="text" maxlength="60" value="${this.esc(form.publishedText)}" data-blog-prop="publishedText" placeholder="14 أغسطس 2026"></label>
            <label><span>الكاتب</span><input type="text" maxlength="160" value="${this.esc(form.author)}" data-blog-prop="author" placeholder="اسم الكاتب"></label>
          </div>
          <label><span>ملخص المقال (يظهر في البطاقة)</span><textarea maxlength="6000" rows="2" data-blog-prop="summary" placeholder="سطران يلخصان فكرة المقال...">${this.esc(form.summary)}</textarea></label>
          <label><span>محتوى المقال * (يدعم Markdown)</span><textarea maxlength="200000" rows="14" data-blog-prop="body" placeholder="# مقدمة المقال&#10;اكتب المحتوى هنا...">${this.esc(form.body)}</textarea></label>
          <div class="editor-row">
            <label><span>صورة المقال</span>
              <div class="blog-cover-box">
                ${form.imageUrl ? `<img src="${this.esc(form.imageUrl)}" alt="صورة المقال" class="blog-cover-preview">` : `<span class="blog-cover-placeholder">لا توجد صورة</span>`}
                <button type="button" class="btn btn-outline btn-small" data-blog-cover>${form.imageUrl ? "استبدال الصورة" : "رفع صورة من الجهاز"}</button>
                <p class="blog-cover-note">PNG / JPG / WEBP / GIF / SVG — حتى 4 ميغابايت</p>
              </div>
            </label>
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-soft btn-small" data-blog-cancel-article>إلغاء</button>
          <button class="btn btn-small" data-blog-save-article>${form.id ? "حفظ التعديلات" : "نشر المقال"}</button>
        </div>
      </article>`;
    },

    /* --------------------- معاينة المقال --------------------- */
    previewSection(article) {
      const category = article.categoryText ? `<span class="blog-cat-chip">📂 ${this.esc(article.categoryText)}</span>` : "";
      const published = article.publishedText ? `<span>${this.esc(article.publishedText)}</span>` : "";
      const author = article.author ? `<span>بقلم: ${this.esc(article.author)}</span>` : "";
      return `<div class="blog-preview">
        <div class="blog-preview-head">
          <h3>معاينة المقال كما يظهر للزائر</h3>
          <button class="btn btn-soft btn-small" data-blog-close-preview>إغلاق</button>
        </div>
        ${article.imageUrl ? `<img src="${this.esc(article.imageUrl)}" alt="" class="blog-preview-image">` : ""}
        <div class="blog-preview-meta">${category}${published}${author}</div>
        <h4 class="blog-preview-title">${this.esc(article.title)}</h4>
        ${article.summary ? `<p class="blog-preview-summary">${this.esc(article.summary)}</p>` : ""}
        <div class="blog-preview-body">${this.renderMarkdown(article.body || "")}</div>
      </div>`;
    },

    /** عرض مبسط لمحتوى Markdown داخل المعاينة (عناوين/فقرة/قائمة/غليظ/خط مائل). */
    renderMarkdown(text) {
      const esc = value => this.esc(value);
      const inline = line => line
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/__(.+?)__/g, "<b>$1</b>")
        .replace(/\*(.+?)\*/g, "<i>$1</i>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
      return text.split(/\r?\n/).map(line => {
        if (!line.trim()) return "";
        if (/^#{1,6}\s/.test(line)) {
          const level = Math.min(6, (line.match(/^#+/) || [""])[0].length);
          return `<h${level}>${inline(line.replace(/^#+\s*/, ""))}</h${level}>`;
        }
        if (/^\s*[-*]\s/.test(line)) return `<li>${inline(line.replace(/^\s*[-*]\s/, ""))}</li>`;
        return `<p>${inline(line)}</p>`;
      }).join("");
    },

    /* --------------------- التسجيل --------------------- */
    mountCompatible() {
      if (typeof window.WajbatBlogManager !== "undefined") return;
      window.WajbatBlogManager = manager;
      document.addEventListener("DOMContentLoaded", () => manager.autoBind());
      if (document.readyState !== "loading") manager.autoBind();
    },
    autoBind() {
      if (this.container && this.container.querySelector("[data-blog-workspace]")) {
        void this.load();
      }
    },
  };

  manager.mountCompatible();
})();
