(function () {
  "use strict";

  const rules = {
    design: /^structured-logo-image$/,
    team: /^team-photo-\d+$/,
    downloads: /^downloadFile\d+$/,
  };

  function bindUploadedMedia(scope, target, item, url) {
    const next = { ...(item || {}) };
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl || !rules[scope]?.test(String(target || ""))) return next;
    if (scope === "design") return { ...next, logoUrl: normalizedUrl };
    if (scope === "team") return { ...next, photoUrl: normalizedUrl };
    return { ...next, remoteFile: normalizedUrl };
  }

  window.WajbatAdminMediaBinding = { bindUploadedMedia };
})();
