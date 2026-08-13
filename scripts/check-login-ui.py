import re

src = open("client/public/assets/js/admin-login-fix-v2.js", encoding="utf-8").read()

checks = [
    ("قوالب التصميم (select template)", r'name="template"[^>]*>.*?professional|template: "professional"|template' ),
]

# Find all select options values
for name in ["template", "backgroundStyle", "cardStyle", "fieldStyle", "buttonStyle",
             "logoPosition", "logoShape", "ownerPhotoShape", "logoAnimation",
             "buttonAnimation", "entranceAnimation"]:
    matches = set(re.findall(rf'<option value="([^"]*)"[^>]*>\s*([^<]*)</option>', src))
    print(f"-- {name}: {sorted(matches)}")

print()
print("contentOrder default:", re.search(r'contentOrder:\s*"([^"]*)"', src))
print("loginDefaults keys:", len(re.findall(r'^  (\w+):', src.split("loginDefaults")[1].split("}")[0], re.M)))

print()
print("أزرار الاستعادة:", sorted(set(re.findall(r'استعادة[^<\"]{0,60}', src))))
print()
print("رفع الشعار:", "upload" in src.lower() or "file" in src.lower() and "logo" in src)
print("رفع صورة المالك:", "ownerPhoto" in src)
print("معاينة:", "preview" in src.lower())
print("renderOwnerLoginPreview:", src.count("renderOwnerLoginPreview"))
print("preview-container:", src.count("preview"))

print()
# sidebar items order
sid = re.search(r'function sidebar\(\)(?:.*?)\{((?:.(?!\}\}))*)\}', src, re.S)
if sid:
    items = re.findall(r'["\']([a-z]{3,})["\']', sid.group(1))
    print("sidebar items:", items)

# ownerLogin workspace presence
print("ownerLoginWorkspace:", src.count("function ownerLoginWorkspace"))
print("accountWorkspace:", src.count("function accountWorkspace"))
print("passkey sections:", len(re.findall(r'data-register-passkey|data-login-passkey|passkey', src)))
