import re
src = open('client/public/assets/js/admin-login-fix-v2.js', encoding='utf-8').read()

print('========== loginDefaults ==========')
pos = src.find('function loginDefaults(')
end = src.find('\nfunction ', pos + 10)
seg = src[pos:end]
for m in re.finditer(r'<option[^>]*>', seg):
    print('  opt:', m.group(0)[:150])
for m in re.finditer(r'<input[^>]*type="(range|color|text|number)"[^>]*>', seg):
    print('  inp:', m.group(0)[:150])

print('========== enhanceOwnerLoginForm selects full ==========')
pos = src.find('function enhanceOwnerLoginForm(')
end = src.find('\nfunction ', pos + 10)
seg = src[pos:end]
for m in re.finditer(r'<select[^>]*>(.*?)</select>', seg, re.S):
    select = m.group(0)
    label = re.search(r'<label>(.*?)</label>', select)
    opts = re.findall(r'<option value="([^"]*)"[^>]*>([^<]*)<', select)
    print('SELECT for', label.group(1).strip() if label else '?', '->', opts)

print('========== html owner-login section ==========')
html = open('client/public/admin.html', encoding='utf-8').read()
m = re.search(r'data-owner-login-settings', html)
if m:
    print('owner-login-settings form found at', m.start())
    print(html[m.start()-500:m.start()+300].replace('\n', ' ')[:800])
