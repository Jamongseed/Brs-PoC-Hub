(() => {
  const ORIGIN = (() => {
    try {
      if (document.currentScript && document.currentScript.src) {
        return new URL(document.currentScript.src).origin;
      }
    } catch {}

    try {
      const s = Array.from(document.scripts).find((x) => x && x.src && x.src.includes("/sdk.js"));
      if (s) return new URL(s.src).origin;
    } catch {}

    return location.origin;
  })();

  console.log("[thirdparty sdk] loaded from", ORIGIN);

  function injectAdWidget() {
    if (document.getElementById("adWidgetContainer")) return;

    const container = document.createElement("div");
    container.id = "adWidgetContainer";
    container.dataset.poc = "ad-widget";
    container.style.cssText = `
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 320px;
      height: 260px;
      z-index: 999999;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
      background: white;
    `;

    const close = document.createElement("button");
    close.textContent = "닫기";
    close.setAttribute("aria-label", "close-ad");
    close.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      padding: 6px 10px;
      border-radius: 10px;
      border: 1px solid #ddd;
      background: rgba(255,255,255,0.95);
      cursor: pointer;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 13px;
    `;
    close.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      container.remove();
      console.log("[thirdparty sdk] ad closed (container removed)");
    });

    const iframe = document.createElement("iframe");
    iframe.src = `${ORIGIN}/widget.html`;
    iframe.style.cssText = "border:0;width:100%;height:100%;";
    iframe.setAttribute("title", "Ad Widget");

    container.appendChild(close);
    container.appendChild(iframe);
    document.documentElement.appendChild(container);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectAdWidget);
  } else {
    injectAdWidget();
  }
})();