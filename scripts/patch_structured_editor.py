#!/usr/bin/env python3
"""ترقية admin-structured-editor-r2.js بنموذج شركاء كامل."""
import re

path = "client/public/assets/js/admin-structured-editor-r2.js"
src = open(path, encoding="utf-8").read()

# 1) استبدال السطر الافتراضي في itemForm (النموذج العام للجهات) بنموذج partners كامل
old_default_form = 'return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field(key === "universities" ? "اسم الجامعة" : "اسم الجهة", "name", item.name, { required: true })}<div class="field"><label>نوع الجهة</label><select name="kind">${["جامعة", "معهد", "جهة تعليمية"].map(kind => `<option value="${kind}" ${item.kind === kind ? "selected" : ""}>${kind}</option>`).join("")}</select></div></div>${common}</form>`;'

new_partners_form = '''if (key === "partners") return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field("اسم الجهة", "name", item.name, { required: true })}<div class="field"><label>نوع الجهة</label><select name="kind">${["جامعة", "معهد", "جهة تعليمية"].map(kind => `<option value="${kind}" ${item.kind === kind ? "selected" : ""}>${kind}</option>`).join("")}</select></div></div><div class="two-col">${field("المدينة", "city", item.city || "", { placeholder: "مثال: الرياض" })}<div class="field"><label>رابط الموقع</label><input name="link" type="text" dir="ltr" maxlength="512" placeholder="https://example.com" value="${esc(item.link || "")}" /></div></div>${field("وصف مختصر", "description", item.description || "", { multiline: true, placeholder: "سطر واحد عن الشراكة" })}<div class="two-col"><div class="field"><label>شعار الجهة — رفع من الجهاز</label>${imagePicker(item.logoUrl, `partner-logo-${index}`)}</div><div class="field"><label>قالب العرض في موقع الزائر</label><select name="shape">${[["card", "بطاقة رسمية (Card)"], ["circle", "دائرة أنيقة (Circle)"], ["square", "مربع بارز (Square)"], ["pill", "كبسولة (Pill)"], ["badge", "شارة نصية (Badge)"], ["banner", "شريط كبير (Banner)"]].map(([value, label]) => `<option value="${value}" ${item.shape === value ? "selected" : ""}>${label}</option>`).join("")}</select></div></div><div class="two-col"><div class="field"><label>لون الشعار</label><input name="accentColor" type="color" value="${esc(item.accentColor || "#4966d6")}" /></div><div class="field"><label>لون النص</label><input name="textColor" type="color" value="${esc(item.textColor || "#ffffff")}" /></div><div class="field"><label>لون الخلفية</label><input name="backgroundColor" type="color" value="${esc(item.backgroundColor || "#eef1f8")}" /></div><div class="field"><label>لون الإطار</label><input name="borderColor" type="color" value="${esc(item.borderColor || item.accentColor || "#4966d6")}" /></div></div><small>اختر قالب العرض وحدد الألوان؛ يظهر التغيير فورًا للزوار بعد الحفظ.</small>${common}</form>`;
  return `<form class="editor structured-item-form" data-structured-form="${key}" data-structured-index="${index}"><div class="two-col">${field(key === "universities" ? "اسم الجامعة" : "اسم الجهة", "name", item.name, { required: true })}<div class="field"><label>نوع الجهة</label><select name="kind">${["جامعة", "معهد", "جهة تعليمية"].map(kind => `<option value="${kind}" ${item.kind === kind ? "selected" : ""}>${kind}</option>`).join("")}</select></div></div>${common}</form>`;'''

assert old_default_form in src, "old_default_form not found"
src = src.replace(old_default_form, new_partners_form)

# 2) استبدال فرع buildItem الافتراضي بفرع partners كامل
old_default_build = 'return { ...item, name: formValue(form, "name"), kind: formValue(form, "kind") || "جهة تعليمية" };'
new_partners_build = '''if (key === "partners") return bindMedia("partners", `partner-logo-${index}`, { ...item, name: formValue(form, "name"), kind: formValue(form, "kind") || "جهة تعليمية", city: formValue(form, "city") || "", link: formValue(form, "link") || "", description: formValue(form, "description") || "", shape: formValue(form, "shape") || "card", accentColor: formValue(form, "accentColor") || "#4966d6", textColor: formValue(form, "textColor") || "#ffffff", backgroundColor: formValue(form, "backgroundColor") || "#eef1f8", borderColor: formValue(form, "borderColor") || "" }, selectedMediaValue(form, `partner-logo-${index}`));
  return { ...item, name: formValue(form, "name"), kind: formValue(form, "kind") || "جهة تعليمية" };'''

assert old_default_build in src, "old_default_build not found"
src = src.replace(old_default_build, new_partners_build)

open(path, "w", encoding="utf-8").write(src)
print("patched ok")
