import re
js = open('client/public/assets/js/admin-login-fix-v2.js', encoding='utf-8').read()
css = open('client/public/assets/css/admin.css', encoding='utf-8').read()

print('=== 1. LOGIN TEMPLATE SELECTOR (قوالب) ===')
for m in re.finditer(r'template[^"<]*', js):
    ctx = js[max(0, m.start()-80):m.end()+80].replace('\n', ' ')
    print('  ', ctx[:200])

print('\n=== 2. background options ===')
for kw in ['backgroundStyle', 'backgroundGradient', 'backgroundImage', 'LOGIN_BACKGROUNDS', 'backgrounds']:
    idxs = [mm.start() for mm in re.finditer(re.escape(kw), js)]
    print(kw, len(idxs))

print('\n=== 3. uploadOwnerLoginImage + uploadLogo + media ===')
pos = js.find('function uploadOwnerLoginImage(')
end = js.find('\nfunction ', pos+1) if pos != -1 else pos+1500
if pos != -1:
    print(js[pos:end][:1200])

print('\n=== 4. restore previous ===')
for kw in ['restorePreviousOwnerLoginSettings', 'restoreOwnerLoginSettings', 'restoreDefault', 'استعادة']:
    idxs = [mm.start() for mm in re.finditer(re.escape(kw), js)]
    print(kw, len(idxs))

print('\n=== 5. sidebar order in admin-login-fix-v2.js ===')
pos = js.find('function sidebar(')
end = js.find('\nfunction ', pos+1) if pos != -1 else pos+5000
if pos != -1:
    seg = js[pos:end]
    for m in re.finditer(r'data-[\w-]+|label[^>]*>[^<]*<', seg):
        t = m.group(0)
        if re.search(r'ownerLogin|حساب|أمان|دخول|الإعدادات|content|requests|messages|media|analytics', t):
            print('  ', t[:100])

print('\n=== 6. login-template classes in css ===')
for m in re.finditer(r'\.login-template-[a-z]+', css):
    pass
classes = sorted(set(re.findall(r'\.login-template-[\w-]+', css)))
print(classes)
print('login-card styles:', sorted(set(re.findall(r'\.login-card-[\w-]+', css))))
print('login-enter:', sorted(set(re.findall(r'\.login-enter[\w-]*', css))))
