(function () {
  const cfg = window.__HUB_CONFIG__ || {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function isSetUrl(u) {
    return typeof u === "string" && u.trim().length > 0;
  }

  function openUrl(url) {
    if (!isSetUrl(url)) return;
    try { window.open(url, "_blank", "noopener,noreferrer"); }
    catch { location.href = url; }
  }

  function copyText(text) {
    return navigator.clipboard.writeText(text);
  }

  function findItemById(id) {
    const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
    for (const g of groups) {
      const items = Array.isArray(g.items) ? g.items : [];
      for (const it of items) {
        if (it.id === id) return it;
      }
    }
    return null;
  }

  function getPocId() {
    const fromAttr = document.body.getAttribute("data-poc-id");
    if (fromAttr) return fromAttr;
    const qs = new URLSearchParams(location.search);
    return qs.get("id") || "";
  }

  function linkLines(pocId, links) {
    return Object.entries(links || {})
      .filter(([, u]) => isSetUrl(u))
      .map(([k, u]) => `${pocId}.${k} = ${u}`);
  }

  const WRITEUPS = {
    "poc-a": {
      expectedEventTypes: [
        "FORM_SUBMIT",
        "DYN_SCRIPT_INSERT",
        "DYN_IFRAME_INSERT",
        "SUSP_ATOB_CALL",
        "SUSP_FUNCTION_CONSTRUCTOR_CALL"
      ],
      expectedRuleIds: [
        "PHISHING_FORM_MISMATCH",
        "DYN_SCRIPT_INSERT_CROSS_SITE",
        "DYN_SCRIPT_INSERT_INITIATED_BY_CROSS_SITE_SCRIPT",
        "HIDDEN_IFRAME_INSERT",
        "HIDDEN_IFRAME_INSERT_INITIATED_BY_CROSS_SITE_SCRIPT",
        "OBFUSCATION_ATOB",
        "DYNAMIC_CODE_FUNCTION"
      ],
      reproChecklist: [
        {
          title: "1) 메인 페이지 열기",
          detail: "아래 버튼으로 MAIN(정상 로그인 UI 역할)을 엽니다.",
          action: "open_main"
        },
        {
          title: "2) BRS 확장(센서) 활성화 확인",
          detail: "브라우저에서 BRS 확장이 켜져 있고, 해당 사이트에서 동작 중인지 확인합니다. (콘솔 로그/팝업/대시보드 등)",
          action: "manual"
        },
        {
          title: "3) PoC 트리거 실행",
          detail: "MAIN 페이지에서 Sign in(제출) 또는 데모 트리거 버튼을 눌러 체인을 실행합니다. 실제 계정 정보를 입력하지 마세요.",
          action: "manual"
        },
        {
          title: "4) 탐지 결과 확인",
          detail: "아래 '기대 이벤트 타입 / 기대 Rule ID'와 일치하는지 확인하고, Evidence 필드가 왜 채워졌는지 확인합니다.",
          action: "manual"
        },
        {
          title: "5) (선택) Thirdparty 구성요소 확인",
          detail: "THIRDPARTY(공급망 역할)가 추가 삽입을 유도하는 주체이므로, origin 분리/체인 이해에 도움이 됩니다.",
          action: "open_third"
        }
      ],
      evidenceFields: [
        {
          title: "FORM_SUBMIT (forms detector)",
          keys: [
            "type = FORM_SUBMIT",
            "data.mismatch (actionOrigin !== location.origin)",
            "data.actionResolved, data.actionOrigin, data.pageOrigin"
          ],
          why: "외부로 제출되는 폼은 피싱 시그널이 될 수 있습니다. (데모에서는 localhost vs 127.0.0.1 차이로 mismatch가 쉽게 보이도록 구성되었습니다.)"
        },
        {
          title: "DYN_SCRIPT_INSERT / DYN_IFRAME_INSERT (dom_mutation detector)",
          keys: [
            "data.crossSite (targetOrigin !== location.origin)",
            "data.src, data.abs, data.targetOrigin",
            "data.initiatorCrossSite (외부 initiator가 유도했는지 확인)"
          ],
          why: "외부에서 들어온 코드가 다시 추가 삽입을 유도하는 체인은 공급망/로더 패턴으로 위험도가 상승합니다."
        },
        {
          title: "Hidden iframe 판정",
          keys: [
            "type = DYN_IFRAME_INSERT",
            "data.hidden = true",
            "근거: 1px/opacity/화면 밖(left/top -...) 등"
          ],
          why: "사용자 인지 회피 목적이 강한 패턴이라, 일반적으로 위험도가 높게 평가됩니다."
        },
        {
          title: "atob / Function (page_hook)",
          keys: [
            "type = SUSP_ATOB_CALL",
            "type = SUSP_FUNCTION_CONSTRUCTOR_CALL",
            "evidence.stack 또는 data.summary.*"
          ],
          why: "정적 분석/탐지 회피를 위해 동적 코드 실행을 사용하는 흔한 패턴입니다. 다른 시그널과 함께 나오면 강한 근거가 됩니다."
        }
      ]
    }
  };

  function getWriteup(pocId) {
    return WRITEUPS[pocId] || null;
  }

  // ---- init common header/buttons ----
  const pocId = getPocId();
  const item = findItemById(pocId);
  const writeup = getWriteup(pocId);

  const detailTitle = document.getElementById("detailTitle");
  const detailSub = document.getElementById("detailSub");
  const pocTitle = document.getElementById("pocTitle");
  const pocDesc = document.getElementById("pocDesc");
  const pocLinkButtons = document.getElementById("pocLinkButtons");
  const pocNotes = document.getElementById("pocNotes");

  const btnBack = document.getElementById("btnBack");
  const btnCopyLinks = document.getElementById("btnCopyLinks");

  if (btnBack) btnBack.addEventListener("click", () => { location.href = "/"; });

  if (!pocId || !item) {
    if (detailTitle) detailTitle.textContent = cfg.hubTitle || "BRS PoC Hub";
    if (detailSub) detailSub.textContent = "invalid poc id";
    if (pocTitle) pocTitle.textContent = "Not found";
    if (pocDesc) pocDesc.textContent = "해당 PoC 정의를 hub config에서 찾지 못했습니다.";
    if (pocLinkButtons) pocLinkButtons.innerHTML = "";
    if (pocNotes) pocNotes.innerHTML = "";
    return;
  }

  document.title = (item.title || pocId) + " - Detail";

  if (detailTitle) detailTitle.textContent = cfg.hubTitle || "BRS PoC Hub";
  if (detailSub) detailSub.textContent = `poc: ${pocId} · updated: ${cfg.updatedAt || "-"}`;

  if (pocTitle) pocTitle.textContent = item.title || pocId;
  if (pocDesc) pocDesc.textContent = item.desc || "";

  const links = item.links || {};
  const entries = Object.entries(links);

  function mkBtn(label, url, onClick) {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = label;
    b.disabled = !isSetUrl(url);
    b.addEventListener("click", () => (onClick ? onClick() : openUrl(url)));
    return b;
  }

  function mkGhost(label, onClick) {
    const b = document.createElement("button");
    b.className = "btn btn--ghost";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  if (pocLinkButtons) {
    pocLinkButtons.innerHTML = "";

    const mainUrl = links.main || links.victim || "";
    const thirdUrl = links.thirdparty || links.attacker || "";

    pocLinkButtons.appendChild(mkBtn("Open MAIN", mainUrl));
    pocLinkButtons.appendChild(mkBtn("Open THIRDPARTY", thirdUrl));

    for (const [k, url] of entries) {
      if (k === "main" || k === "victim" || k === "thirdparty" || k === "attacker") continue;
      pocLinkButtons.appendChild(mkBtn("Open " + k.toUpperCase(), url));
    }

    const anySet = Object.values(links).some(isSetUrl);
    if (!anySet) {
      const warn = document.createElement("div");
      warn.className = "hint";
      warn.textContent =
        "이 PoC 링크가 아직 설정되지 않았습니다. (운영자가 Hub 환경변수에 PoC 배포 URL을 등록해야 버튼이 활성화됩니다.)";
      pocLinkButtons.appendChild(warn);
    }

    pocLinkButtons.appendChild(mkGhost("Copy links (this page)", async () => {
      const lines = linkLines(pocId, links);
      if (!lines.length) return;
      try { await copyText(lines.join("\n")); } catch {}
    }));
  }

  const notes = Array.isArray(item.notes) ? item.notes : [];
  if (pocNotes) {
    if (!notes.length) {
      pocNotes.innerHTML = `<div>Notes</div><div class="hint">No notes</div>`;
    } else {
      pocNotes.innerHTML = `<div>Notes</div><ul>${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
    }
  }

  if (btnCopyLinks) {
    btnCopyLinks.addEventListener("click", async () => {
      const lines = linkLines(pocId, links);
      if (!lines.length) return;
      try { await copyText(lines.join("\n")); } catch {}
    });
  }

  function renderReproChecklist() {
    const root = document.getElementById("reproChecklist");
    const progress = document.getElementById("reproProgress");
    if (!root || !writeup || !Array.isArray(writeup.reproChecklist)) return;

    const storageKey = `__poc_check_${pocId}__`;
    let state = {};
    try { state = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch {}

    function save() {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }

    function computeProgress() {
      const total = writeup.reproChecklist.length;
      const done = writeup.reproChecklist.filter((_, i) => state[String(i)] === true).length;
      return { done, total };
    }

    function updateProgressText() {
      const { done, total } = computeProgress();
      if (progress) progress.textContent = `Progress: ${done}/${total}`;
    }

    const box = document.createElement("div");
    box.className = "checklist";

    writeup.reproChecklist.forEach((step, idx) => {
      const row = document.createElement("div");
      row.className = "check-row";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = state[String(idx)] === true;
      cb.addEventListener("change", () => {
        state[String(idx)] = cb.checked;
        save();
        updateProgressText();
      });

      const txt = document.createElement("div");
      txt.className = "txt";

      const title = document.createElement("div");
      title.innerHTML = `<b>${esc(step.title || `Step ${idx + 1}`)}</b>`;
      txt.appendChild(title);

      const sub = document.createElement("div");
      sub.className = "sub";
      sub.textContent = step.detail || "";
      txt.appendChild(sub);

      const actions = document.createElement("div");
      actions.className = "inline-actions";

      if (step.action === "open_main") {
        const mainUrl = links.main || links.victim || "";
        const b = document.createElement("button");
        b.className = "btn btn--ghost";
        b.textContent = "Open MAIN";
        b.disabled = !isSetUrl(mainUrl);
        b.addEventListener("click", () => openUrl(mainUrl));
        actions.appendChild(b);
      } else if (step.action === "open_third") {
        const thirdUrl = links.thirdparty || links.attacker || "";
        const b = document.createElement("button");
        b.className = "btn btn--ghost";
        b.textContent = "Open THIRDPARTY";
        b.disabled = !isSetUrl(thirdUrl);
        b.addEventListener("click", () => openUrl(thirdUrl));
        actions.appendChild(b);
      }

      if (actions.childElementCount > 0) txt.appendChild(actions);

      row.appendChild(cb);
      row.appendChild(txt);
      box.appendChild(row);
    });

    root.innerHTML = "";
    root.appendChild(box);
    updateProgressText();
  }

  function renderExpectedLists() {
    if (!writeup) return;

    const evBox = document.getElementById("eventTypesBox");
    const ruleBox = document.getElementById("ruleIdsBox");
    const btnEv = document.getElementById("btnCopyEventTypes");
    const btnRule = document.getElementById("btnCopyRuleIds");

    const ev = Array.isArray(writeup.expectedEventTypes) ? writeup.expectedEventTypes : [];
    const rules = Array.isArray(writeup.expectedRuleIds) ? writeup.expectedRuleIds : [];

    if (evBox) evBox.textContent = ev.map(s => `- ${s}`).join("\n");
    if (ruleBox) ruleBox.textContent = rules.map(s => `- ${s}`).join("\n");

    if (btnEv) btnEv.addEventListener("click", async () => {
      if (!ev.length) return;
      try { await copyText(ev.join("\n")); } catch {}
    });

    if (btnRule) btnRule.addEventListener("click", async () => {
      if (!rules.length) return;
      try { await copyText(rules.join("\n")); } catch {}
    });
  }

  function renderEvidence() {
    const root = document.getElementById("evidenceBox");
    if (!root || !writeup || !Array.isArray(writeup.evidenceFields)) return;

    const html = writeup.evidenceFields.map(block => {
      const keys = Array.isArray(block.keys) ? block.keys : [];
      return `
        <div class="kv">
          <div class="k"><b>${esc(block.title || "Evidence")}</b></div>
          <div class="v">
            <div>${esc(block.why || "")}</div>
            <ul>
              ${keys.map(k => `<li><code>${esc(k)}</code></li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }).join("");

    root.innerHTML = html;
  }

  renderReproChecklist();
  renderExpectedLists();
  renderEvidence();
})();