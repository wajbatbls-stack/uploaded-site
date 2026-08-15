import re

path = "/home/ubuntu/uploaded-site/client/public/assets/js/site-app-r31.js"
src = open(path).read()

old = 'const logoUrlOk = item.logoUrl && /^https?:\\/\\//i.test(String(item.logoUrl || ""));'
new = ('const logoUrlStr = String(item.logoUrl || "");\n'
       '    const logoUrlOk = item.logoUrl && (/^https?:\\/\\//i.test(logoUrlStr) || /^\\/manus-storage\\//.test(logoUrlStr));')

assert old in src, "old pattern not found"
src = src.replace(old, new, 1)
open(path, "w").write(src)
print("patched ok")
