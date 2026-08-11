import fs from "node:fs";
import path from "node:path";

const originalRoot = "/home/ubuntu/website";
const contentSource = fs.readFileSync(path.join(originalRoot, "pages/content.js"), "utf8");
const appSource = fs.readFileSync(path.join(originalRoot, "assets/js/app.js"), "utf8");

function extractArray(source, token) {
  const start = source.indexOf(token);
  if (start < 0) throw new Error(`Missing source data: ${token}`);
  const opening = source.indexOf("[", start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = opening; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      const rawArray = source.slice(opening, index + 1).replace(/,\s*\]$/, "]");
      return JSON.parse(rawArray);
    }
  }
  throw new Error(`Unclosed array for ${token}`);
}

function textFrom(regex) {
  const found = appSource.match(regex);
  if (!found?.[1]) throw new Error(`Missing source value: ${regex}`);
  return found[1];
}

const services = extractArray(contentSource, "export const SERVICES =").map(([emoji, title, items], index) => ({
  sortOrder: index,
  emoji,
  title,
  items,
  isVisible: true,
}));
const plans = extractArray(contentSource, "export const PLANS =").map(([title, emoji, duration, features, popular, color], index) => ({
  sortOrder: index,
  title,
  emoji,
  duration,
  features,
  popular,
  color,
  isVisible: true,
}));
const reviews = extractArray(contentSource, "export const REVIEWS =").map(([name, university, body], index) => ({
  sortOrder: index,
  name,
  university,
  body,
  rating: 5,
  isVisible: true,
}));
const articles = extractArray(contentSource, "export const ARTICLES =").map(([title, category, publishedText, summary, body], index) => ({
  sortOrder: index,
  title,
  category,
  publishedText,
  summary,
  body,
  isVisible: true,
}));
const faqs = extractArray(contentSource, "export const FAQS =").map(([question, answer], index) => ({
  sortOrder: index,
  question,
  answer,
  isVisible: true,
}));
const downloads = extractArray(appSource, "const files =").map(([emoji, title, items], categoryOrder) => ({
  categoryOrder,
  emoji,
  title,
  items: items.map(([name, remoteFile], sortOrder) => ({ name, remoteFile, sortOrder, isVisible: true })),
  isVisible: true,
}));

const seed = {
  services,
  plans,
  reviews,
  articles,
  faqs,
  partners: [
    ...extractArray(contentSource, "export const UNIVERSITIES =").map((name, sortOrder) => ({ name, kind: "جامعة", sortOrder, isVisible: true })),
    ...extractArray(contentSource, "export const INSTITUTES =").map((name, index) => ({ name, kind: "معهد", sortOrder: index + 100, isVisible: true })),
    ...extractArray(contentSource, "export const OTHERS =").map((name, index) => ({ name, kind: "جهة تعليمية", sortOrder: index + 200, isVisible: true })),
  ],
  downloads,
  siteSettings: {
    logoUrl: textFrom(/const logoUrl = "([^"]+)"/),
    fileBaseUrl: textFrom(/const fileBase = "([^"]+)"/),
    whatsapp: "966567680470",
    phone: "+966 56 768 0470",
    email: "wajbatbls@gmail.com",
    businessHours: "متواجدون 24/7",
    address: "الرياض، المملكة العربية السعودية",
    tickerText: "مرحباً بكم في واجبات بلس ⭐ نقدم أفضل الخدمات الأكاديمية ⭐ تواصل معنا على واتساب +966567680470",
    announcementText: "",
    heroVoiceText: "مرحباً بك في واجبات بلس، منصتك الذكية للتعلم والخدمات الأكاديمية. كيف يمكننا مساعدتك اليوم؟",
    serviceVoiceTemplate: "أهلاً بك في خدمة {service}. نوفر لك دعماً أكاديمياً متخصصاً مع جودة وخصوصية تامة. اختر الخدمة الفرعية المناسبة لك، وسنسعد بخدمتك.",
  },
};

const output = path.resolve("server/siteSeed.ts");
fs.writeFileSync(output, `// يُولّد من ملفات الموقع الأصلية — لا تُعدّل هذه البيانات يدوياً.\nexport const SITE_SEED = ${JSON.stringify(seed, null, 2)} as const;\n`, "utf8");
console.log(`Extracted original site content to ${output}`);
