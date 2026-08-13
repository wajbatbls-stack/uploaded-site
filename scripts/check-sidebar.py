import re
src = open("client/public/admin.html", encoding="utf-8").read()
# find sidebar nav items
idx = src.find("sidebar")
seg = src[max(0, idx - 500):idx + 8000]
# look for nav items list: find all occurrences of "ownerLogin" context in html
for m in re.finditer(r'ownerLogin', src):
    s = max(0, m.start() - 200)
    print(repr(src[s:m.end() + 200]))
    print("---")
