import re
js = open('client/public/assets/js/admin-login-fix-v2.js', encoding='utf-8').read()

print('=== cardStyle options ===')
m = re.search(r'name="cardStyle".*?</select>', js)
print(m.group(0)[:400] if m else 'NONE')

print('\n=== logo / ownerPhoto upload inputs ===')
for m in re.finditer(r'data-owner-login-upload="\w+"', js):
    print(m.group(0))

print('\n=== mediaOptions (شعار/صورة المالك في المعرض) ===')
seen = set()
for m in re.finditer(r'name="(logoMediaId|ownerPhotoMediaId)"[^<]{0,300}</select>', js):
    if m.group(1) not in seen:
        seen.add(m.group(1))
        print(m.group(0)[:300])

print('\n=== sidebar nav items ===')
pos = js.find('function dashboard(')
# find all 'selected' comparisons and nav labels
for m in re.finditer(r'"ownerLogin"|data-nav[^ >]*|"dashboard"|navItems|navCount', js):
    ctx = js[max(0, m.start()-100):m.end()+100].replace('\n', ' ')
    print(' ', ctx[:200]); break
m = re.search(r'function navCount', js)
if m:
    print(js[m.start():m.start()+1200][:1200])
