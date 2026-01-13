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

  function getLinkByKey(links, key) {
    if (!links || !key) return "";
    const u = links[key];
    return isSetUrl(u) ? u : "";
  }

  function mkOpenBtn(label, links, key) {
    const url = getLinkByKey(links, key);
    const b = document.createElement("button");
    b.className = "btn btn--ghost";
    b.textContent = label;
    b.disabled = !isSetUrl(url);
    b.addEventListener("click", () => openUrl(url));
    return b;
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
    },
    "poc-b": {
    expectedEventTypes: [
        "INVISIBLE_LAYER_DETECTED"
    ],
    expectedRuleIds: [
        "INVISIBLE_LAYER_INSERT",
        "INVISIBLE_LAYER_CLICK"
    ],
    reproChecklist: [
        {
        title: "1) 메인 페이지 열기",
        detail: "아래 버튼으로 MAIN(투명 오버레이 삽입 페이지)을 엽니다.",
        action: "open_main"
        },
        {
        title: "2) BRS 확장(센서) 활성화 확인",
        detail: "브라우저에서 BRS 확장이 켜져 있고, 해당 사이트에서 동작 중인지 확인합니다. (콘솔 로그/팝업/대시보드 등)",
        action: "manual"
        },
        {
        title: "3) 로드 직후 삽입 탐지 확인",
        detail: "페이지가 로드되면 투명 레이어가 DOM에 삽입됩니다. 콘솔/대시보드에서 reason=INSERT 이벤트가 발생했는지 확인합니다.",
        action: "manual"
        },
        {
        title: "4) 화면 아무 곳이나 클릭",
        detail: "투명 레이어가 클릭을 가로채고 /ad로 이동합니다. reason=POINTERDOWN 이벤트가 발생했는지 확인합니다.",
        action: "manual"
        },
        {
        title: "5) 탐지 근거(Evidence/필드) 확인",
        detail: "overlay의 크기/투명도/z-index/점유율 및 클릭 좌표 등 근거 필드가 기대값으로 채워졌는지 확인합니다.",
        action: "manual"
        }
    ],
    evidenceFields: [
        {
        title: "INVISIBLE_LAYER_DETECTED (INSERT)",
        keys: [
            "type = INVISIBLE_LAYER_DETECTED",
            "data.reason = INSERT",
            "data.tag, data.id, data.cls",
            "data.position, data.zIndex, data.opacity",
            "data.areaRatio, data.rect (x,y,w,h)",
            "data.flags.transparent, data.flags.highZ"
        ],
        why: "화면을 넓게 덮고(면적) 클릭을 받을 수 있으며(pointer-events), 투명하거나(opacity), 최상단(z-index)인 오버레이가 삽입된 정황입니다."
        },
        {
        title: "INVISIBLE_LAYER_DETECTED (POINTERDOWN)",
        keys: [
            "type = INVISIBLE_LAYER_DETECTED",
            "data.reason = POINTERDOWN",
            "data.x, data.y (클릭 좌표)",
            "overlay 정보(INSERT와 동일 필드들)"
        ],
        why: "사용자의 실제 입력(pointerdown)이 투명 오버레이를 타겟으로 잡은 상황이라, 단순 삽입보다 훨씬 강한 근거가 됩니다."
        }
    ]
    },
    "poc-c": {
    expectedEventTypes: [
        "DYN_SCRIPT_INSERT",
        "DYN_IFRAME_INSERT",
        "THIRDPARTY_POSTMESSAGE_ARM",
        "FORM_NATIVE_SUBMIT",
        "FORM_SUBMIT"
    ],
    expectedRuleIds: [
        "DYN_SCRIPT_INSERT_CROSS_SITE",
        "IFRAME_INSERT_INITIATED_BY_CROSS_SITE_SCRIPT",
        "THIRDPARTY_WIDGET_ARMED",
        "PHISHING_FORM_MISMATCH"
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
        title: "3) 위젯(iframe) 노출 확인",
        detail: "페이지 우하단(또는 지정 위치)에 광고 위젯처럼 보이는 iframe이 로드됐는지 확인합니다. (SDK가 iframe을 삽입합니다.)",
        action: "manual"
        },
        {
        title: "4) 위젯에서 상호작용(ARM) 트리거",
        detail: "위젯 내부 버튼(예: 광고 보기)을 클릭해 postMessage 트리거를 발생시킵니다. THIRDPARTY_POSTMESSAGE_ARM 이벤트가 발생했는지 확인합니다.",
        action: "manual"
        },
        {
        title: "5) 로그인 폼 제출로 유출 플로우 재현",
        detail: "MAIN 로그인 폼에 아무 값이나 입력 후 Login을 클릭합니다. armed 상태면 SDK가 action을 (thirdparty)/collect로 바꾸고 form.submit()을 호출합니다.",
        action: "manual"
        },
        {
        title: "6) 탐지 결과 확인",
        detail: "FORM_SUBMIT에서 mismatch=true(via=native_submit)로 잡히는지, 그리고 script/iframe/armed 시그널이 같은 세션에서 연결되는지 확인합니다.",
        action: "manual"
        },
        {
        title: "7) (선택) THIRDPARTY 구성요소 확인",
        detail: "THIRDPARTY(위젯/수집 엔드포인트)가 분리된 origin임을 확인하면 체인 이해에 도움이 됩니다.",
        action: "open_third"
        }
    ],
    evidenceFields: [
        {
        title: "DYN_SCRIPT_INSERT (cross-site SDK 로드)",
        keys: [
            "type = DYN_SCRIPT_INSERT",
            "data.src / data.abs",
            "data.crossSite = true",
            "data.targetOrigin"
        ],
        why: "MAIN이 외부(THIRDPARTY) SDK를 로드한 정황입니다. 체인의 시작점 역할을 합니다."
        },
        {
        title: "DYN_IFRAME_INSERT (SDK가 위젯 삽입)",
        keys: [
            "type = DYN_IFRAME_INSERT",
            "data.src / data.abs",
            "data.hidden (일반적으로 false)",
            "data.initiatorCrossSite = true (근거가 있으면)"
        ],
        why: "외부에서 들어온 스크립트가 iframe을 동적으로 삽입하는 패턴은 위젯/광고 형태로 악용되기 쉬워 위험도가 상승합니다."
        },
        {
        title: "THIRDPARTY_POSTMESSAGE_ARM (위젯 → 부모창 트리거)",
        keys: [
            "type = THIRDPARTY_POSTMESSAGE_ARM",
            "data.origin",
            "data.type, data.action",
            "data.payload"
        ],
        why: "iframe 위젯 상호작용이 부모창 상태(armed)를 바꾸는 중간 트리거입니다. 이후 폼 제출 조작의 선행 신호로 의미가 있습니다."
        },
        {
        title: "FORM_NATIVE_SUBMIT → FORM_SUBMIT (native_submit 경로)",
        keys: [
            "type = FORM_SUBMIT",
            "data.via = native_submit",
            "data.actionResolved, data.actionOrigin, data.pageOrigin",
            "data.mismatch = true"
        ],
        why: "submit 이벤트를 막고 form.submit()로 전송하는 우회 흐름에서도, 실제 제출 목적지가 cross-origin으로 바뀐 상태(mismatch)를 근거로 잡아내는 것이 핵심입니다."
        }
    ]
    },
    "poc-d": {
    expectedEventTypes: [
        "LINK_HREF_SWAP_DETECTED",
        "MUTATION_OBSERVER_REGISTER",
        "MUTATION_OBSERVER_TRIGGER"
    ],
    expectedRuleIds: [
        "LINK_HREF_SWAP_PRECLICK_REVERTED",
        "LINK_HREF_SWAP_CROSS_ORIGIN",
        "LINK_HREF_SWAP_SAME_ORIGIN",
        "LINK_HREF_SWAP_BASE",
        "MUTATION_OBSERVER_REGISTER_BASE"
    ],
    reproChecklist: [
        {
        title: "1) 메인 페이지 열기",
        detail: "아래 버튼으로 MAIN(링크 bait 페이지)을 엽니다.",
        action: "open_main"
        },
        {
        title: "2) BRS 확장(센서) 활성화 확인",
        detail: "브라우저에서 BRS 확장이 켜져 있고, 해당 사이트에서 동작 중인지 확인합니다. (콘솔 로그/팝업/대시보드 등)",
        action: "manual"
        },
        {
        title: "3) 링크 클릭으로 트리거",
        detail: "페이지에서 보이는 링크(예: www.example.com 표시)를 클릭합니다. 클릭 직전 순간에만 href가 바뀌고, 클릭 직후에는 다시 원복되는 흐름이 재현됩니다.",
        action: "manual"
        },
        {
        title: "4) 탐지 결과 확인",
        detail: "LINK_HREF_SWAP_DETECTED 이벤트가 발생했는지 확인합니다. within50ms/within200ms, reverted/revertMs, crossOriginChanged 필드가 근거가 됩니다.",
        action: "manual"
        },
        {
        title: "5) (선택) /real 과 /ad 확인",
        detail: "PoC는 같은 origin에서 /real(정상)과 /ad(강제 이동)를 제공합니다. 링크 표시와 실제 이동 목적지 불일치를 확인할 수 있습니다.",
        action: "manual"
        }
    ],
    evidenceFields: [
        {
        title: "LINK_HREF_SWAP_DETECTED (pre-click href swap)",
        keys: [
            "type = LINK_HREF_SWAP_DETECTED",
            "data.triggerInput (pointerdown/mousedown)",
            "data.deltaMsFromDown, data.within50ms, data.within200ms",
            "data.oldHrefAbs → data.newHrefAbs (변경 전/후)",
            "data.crossOriginChanged (오리진 전환 여부)",
            "data.reverted, data.revertMs (원복 패턴 여부)"
        ],
        why: "다운 이벤트 직후(매우 짧은 시간)에 href가 바뀌고, 클릭 이후 원래 값으로 돌아오는(revert) 패턴은 사용자가 보는 링크와 실제 이동을 분리하려는 전형적인 회피 형태입니다."
        },
        {
        title: "rule 승격 조건(룰셋 매칭 포인트)",
        keys: [
            "within50ms=true & reverted=true → LINK_HREF_SWAP_PRECLICK_REVERTED (HIGH)",
            "within200ms=true & crossOriginChanged=true → LINK_HREF_SWAP_CROSS_ORIGIN (HIGH)",
            "within50ms=true & crossOriginChanged=false → LINK_HREF_SWAP_SAME_ORIGIN (MEDIUM)",
            "기본 기록: LINK_HREF_SWAP_BASE (LOW)"
        ],
        why: "PoC-D는 동일 이벤트(LINK_HREF_SWAP_DETECTED)를 기록한 뒤, 타이밍/원복/교차 오리진 조건에 따라 HIGH/MEDIUM으로 승격되는 구조입니다."
        },
        {
        title: "간접 신호: MutationObserver",
        keys: [
            "MUTATION_OBSERVER_REGISTER (href attribute 감시 등록)",
            "MUTATION_OBSERVER_TRIGGER (href 변경 감지 트리거)",
            "이 신호는 ‘부가 타임라인 근거’이며, 핵심 판정은 LINK_HREF_SWAP_DETECTED로 수행"
        ],
        why: "PoC 내부가 MutationObserver로 href 변화를 감시하기 때문에, 등록/트리거 이벤트가 함께 기록될 수 있습니다. (핵심 판정은 href swap 전용 detector가 담당)"
        }
    ]
    },
    "poc-e": {
    expectedEventTypes: [
      "DYN_SCRIPT_INSERT",
      "PROTO_TAMPER"
    ],
    expectedRuleIds: [
      "DYN_SCRIPT_INSERT_CROSS_SITE",
      "XHR_OPEN_PROTOTYPE_TAMPER",
      "XHR_SEND_PROTOTYPE_TAMPER",
      "XHR_SETREQUESTHEADER_PROTOTYPE_TAMPER",
      "XHR_MIRRORING_SUSPECT (optional)"
    ],
    reproChecklist: [
      {
        title: "1) 메인 페이지 열기",
        detail: "MAIN(정상 앱 역할) 페이지를 열고, 화면이 정상 표시되는지 확인합니다.",
        action: "open:main"
      },
      {
        title: "2) BRS 확장(센서) 활성화 확인",
        detail: "BRS 확장이 켜져 있고, 해당 사이트에서 동작 중인지 확인합니다. (콘솔 로그/팝업/대시보드 등)",
        action: "manual"
      },
      {
        title: "3) Hook 스크립트 로딩(공급망) 확인",
        detail: "MAIN이 외부 Hook 스크립트를 로드하도록 구성되어 있어야 합니다. (링크가 분리 배포라면 HOOK 도메인/URL이 설정되어야 합니다.)",
        action: "open:hook"
      },
      {
        title: "4) XHR 요청 트리거 실행",
        detail: "MAIN 페이지에서 버튼을 눌러 XHR 요청을 발생시킵니다. 이때 원래 요청은 정상 응답을 받아야 합니다.",
        action: "manual"
      },
      {
        title: "5) Collector 로그로 미러링 확인",
        detail: "Collector(c1/c2/c3)에서 /mirror 요청 로그가 동시에 찍히는지 확인합니다. (미러링은 네트워크 탭에서도 확인 가능)",
        action: "open:collectors"
      },
      {
        title: "6) 탐지 결과 확인",
        detail: "아래 '기대 이벤트 타입 / 기대 Rule ID'가 찍히는지 확인하고, PROTO_TAMPER의 evidence/analysis가 왜 그렇게 나왔는지 확인합니다.",
        action: "manual"
      }
    ],
    evidenceFields: [
      {
        title: "DYN_SCRIPT_INSERT (dom_mutation)",
        keys: [
          "type = DYN_SCRIPT_INSERT",
          "data.crossSite = true (hook script origin != page origin)",
          "data.src / data.abs / data.targetOrigin"
        ],
        why: "외부(서드파티) 스크립트 로드는 체인의 시작점이 될 수 있습니다. PoC-E에서는 HOOK 스크립트가 XHR 후킹을 수행하는 주체입니다."
      },
      {
        title: "PROTO_TAMPER: XHR.prototype.open / send / setRequestHeader",
        keys: [
          "type = PROTO_TAMPER",
          "ruleId = XHR_OPEN_PROTOTYPE_TAMPER (또는 SEND/SETREQUESTHEADER)",
          "data.isNative = false",
          "data.analysis.suspicionScore",
          "data.analysis.head (함수 바디 프리뷰)",
          "evidence.desc (writable/configurable 등 descriptor 근거)"
        ],
        why: "XHR 핵심 메서드의 프로토타입이 바뀌면 네트워크 계층 후킹(유출/조작/로깅) 가능성이 커집니다. PoC-E는 이 후킹으로 요청을 여러 collector로 미러링합니다."
      },
      {
        title: "미러링 행위 확인(collector / Network 탭)",
        keys: [
          "MAIN의 정상 XHR 응답은 정상적으로 표시되어야 함",
          "동시에 c1/c2/c3 collector에 /mirror 요청이 복제되어 도착",
          "(선택) request header에 x-brs-mirror 같은 구분 헤더 확인"
        ],
        why: "탐지는 '후킹 자체'를 근거로 하고, 실제 유출/복제 동작은 collector 로그와 브라우저 Network 탭에서 교차 확인하면 가장 명확합니다."
      },
      {
        title: "XHR_MIRRORING_SUSPECT (optional)",
        keys: [
          "ruleId = XHR_MIRRORING_SUSPECT",
          "PROTO_TAMPER + (네트워크 호출 상관 신호) 결합 시 발생"
        ],
        why: "리포 구조/구현에 따라 상관 이벤트는 optional입니다. PROTO_TAMPER + collector 로그로도 충분히 PoC-E를 입증할 수 있습니다."
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
        actions.appendChild(mkOpenBtn("Open MAIN", { main: mainUrl }, "main"));
      } else if (step.action === "open_third") {
        const thirdUrl = links.thirdparty || links.attacker || "";
        actions.appendChild(mkOpenBtn("Open THIRDPARTY", { thirdparty: thirdUrl }, "thirdparty"));
      }

      if (typeof step.action === "string" && step.action.startsWith("open:")) {
        const key = step.action.slice("open:".length).trim();
        if (key === "collectors") {
          actions.appendChild(mkOpenBtn("Open C1", links, "c1"));
          actions.appendChild(mkOpenBtn("Open C2", links, "c2"));
          actions.appendChild(mkOpenBtn("Open C3", links, "c3"));
        } else {
          const label = "Open " + key.toUpperCase();
          actions.appendChild(mkOpenBtn(label, links, key));
        }
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