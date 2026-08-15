#!/usr/bin/env bash
# سكربت ترقية بصمات الملفات الثابتة الأسماء لكسر كاش CDN/المتصفح.
# الاستخدام: ./scripts/bump-cache-assets.sh
# ينشئ نسخًا جديدة من الملفات ويرقّي الإحالات في index.htmls وصفحتي الإدارة.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${1:-}" ]; then
  # وسيط اختياري: بادئة الإصدار الجديد (مثال 22 → site-app-r22)
  NEXT=$1
else
  NEXT=$(( $(ls client/public/assets/js/site-app-r*.js | sed 's/.*r\([0-9]*\)\.js/\1/' | sort -n | tail -1) + 1 ))
fi
echo "Next site-app version: r$NEXT"

python3 - "$NEXT" - <<'PYEOF'
import re, sys
n = int(sys.argv[1])

def bump(path, repls):
    src = open(path, encoding='utf-8').read()
    for pat, rep in repls:
        src = re.sub(pat, rep, src)
    open(path, 'w', encoding='utf-8').write(src)

# نسخ الملفات بنسخة جديدة
import shutil
shutil.copy(f'client/public/assets/js/site-app-r{n-1}.js', f'client/public/assets/js/site-app-r{n}.js')
shutil.copy(f'client/public/assets/js/admin-app-r{n-1}.js', f'client/public/assets/js/admin-app-r{n}.js')
shutil.copy('client/public/assets/js/admin-partners-manager-r3.js', 'client/public/assets/js/admin-partners-manager-r4.js')
shutil.copy('client/public/assets/js/admin-downloads-manager-r3.js', 'client/public/assets/js/admin-downloads-manager-r4.js')
shutil.copy('client/public/assets/css/style-r5.css', 'client/public/assets/css/style-r6.css')

for html in ['client/public/index.html', 'client/index.html']:
    bump(html, [
        (rf'site-app-r{n-1}\.js', f'site-app-r{n}.js'),
    ])

for html in ['client/public/admin.html', 'client/public/admin-dashboard.html']:
    bump(html, [
        (rf'admin-app-r{n-1}\.js', f'admin-app-r{n}.js'),
        ('admin-partners-manager-r4\.js', 'admin-partners-manager-r4.js'),
        ('admin-downloads-manager-r4\.js', 'admin-downloads-manager-r4.js'),
    ])
print('bumped')
PYEOF
echo "Done."
