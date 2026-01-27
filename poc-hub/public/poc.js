(function () {
  const cfg = window.__HUB_CONFIG__ || {};

  function normId(s) {
    return String(s || "").trim().toLowerCase();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function isSetUrl(u) {
    return typeof u === "string" && u.trim().length > 0;
  }

  function toOpenableUrl(url) {
    const u = String(url || "").trim();
    if (u.startsWith("wss://")) return "https://" + u.slice("wss://".length);
    if (u.startsWith("ws://")) return "http://" + u.slice("ws://".length);
    return u;
  }

  function openUrl(url) {
    if (!isSetUrl(url)) return;
    url = toOpenableUrl(url);
    try { window.open(url, "_blank", "noopener,noreferrer"); }
    catch { location.href = url; }
  }

  function copyText(text) {
    return navigator.clipboard.writeText(text);
  }

  function findItemById(id) {
    const want = normId(id);
    const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
    for (const g of groups) {
      const items = Array.isArray(g.items) ? g.items : [];
      for (const it of items) {
        if (it && normId(it.id) === want) return it;
      }
    }
    return null;
  }

  function getPocId() {
    const fromAttr = document.body.getAttribute("data-poc-id");
    if (fromAttr) return fromAttr;
    const any = document.querySelector("[data-poc-id]");
    if (any) return any.getAttribute("data-poc-id") || "";
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
    },
    "poc-f": {
    expectedEventTypes: [
      "DYN_SCRIPT_INSERT",
      "PROTO_TAMPER",
      "FORM_NATIVE_SUBMIT",
      "FORM_SUBMIT",
      "SUSP_NETWORK_CALL"
    ],
    expectedRuleIds: [
      "DYN_SCRIPT_INSERT_CROSS_SITE",
      "FORM_SUBMIT_PROTOTYPE_TAMPER",
      "FORM_REQUESTSUBMIT_PROTOTYPE_TAMPER",
      "FORM_SUBMIT_AFTER_PROTO_TAMPER",
      "PHISHING_FORM_MISMATCH_AFTER_PROTO_TAMPER (optional)",
      "NETWORK_LEAK"
    ],
    reproChecklist: [
      {
        title: "1) 메인 페이지 열기",
        detail: "아래 버튼으로 MAIN(정상 로그인 폼 페이지 역할)을 엽니다.",
        action: "open_main"
      },
      {
        title: "2) BRS 확장(센서) 활성화 확인",
        detail: "브라우저에서 BRS 확장이 켜져 있고, 해당 사이트에서 동작 중인지 확인합니다. (콘솔 로그/팝업/대시보드 등)",
        action: "manual"
      },
      {
        title: "3) 서드파티 SDK 로드(공급망) 확인",
        detail: "MAIN이 THIRDPARTY SDK(sdk_submit_hook.js)를 로드합니다. DYN_SCRIPT_INSERT(crossSite=true)가 찍히는지 확인합니다.",
        action: "open_third"
      },
      {
        title: "4) 프로토타입 변조 탐지 확인",
        detail: "SDK 로드 이후 HTMLFormElement.prototype.submit/requestSubmit 변조가 발생합니다. PROTO_TAMPER 이벤트와 ruleId(폼 submit/requestSubmit tamper)가 찍히는지 확인합니다.",
        action: "manual"
      },
      {
        title: "5) Normal Submit 트리거",
        detail: "로그인 폼에 임의 값을 입력하고 Normal Submit(기본 제출)을 눌러 제출을 발생시킵니다. FORM_NATIVE_SUBMIT → FORM_SUBMIT 변환이 잡히는지 확인합니다.",
        action: "manual"
      },
      {
        title: "6) JS submit()/requestSubmit() 트리거",
        detail: "페이지에 제공된 버튼이 있다면 form.submit() / form.requestSubmit() 경로를 각각 실행해봅니다. via 값(native_submit/requestSubmit)이 올바른지 확인합니다.",
        action: "manual"
      },
      {
        title: "7) 외부 동시 유출(sendBeacon/fetch) 확인",
        detail: "THIRDPARTY가 /collect로 sendBeacon 또는 fetch를 호출합니다. SUSP_NETWORK_CALL 발생과 NETWORK_LEAK(ruleId) 매칭을 확인합니다.",
        action: "manual"
      }
    ],
    evidenceFields: [
      {
        title: "DYN_SCRIPT_INSERT (dom_mutation)",
        keys: [
          "type = DYN_SCRIPT_INSERT",
          "data.src / data.abs",
          "data.crossSite = true",
          "data.targetOrigin (THIRDPARTY origin)"
        ],
        why: "서드파티 SDK 로드는 체인의 시작점입니다. PoC-F에서는 이 SDK가 폼 제출 프로토타입 변조 + 유출 네트워크를 유발하는 주체입니다."
      },
      {
        title: "PROTO_TAMPER: HTMLFormElement.prototype.submit / requestSubmit",
        keys: [
          "type = PROTO_TAMPER",
          "ruleId = FORM_SUBMIT_PROTOTYPE_TAMPER 또는 FORM_REQUESTSUBMIT_PROTOTYPE_TAMPER",
          "data.target (예: HTMLFormElement.prototype.submit)",
          "data.isNative = false",
          "data.valueHead (toString head)",
          "data.desc (writable/configurable/enumerable 등)",
          "data.prevFp / data.nextFp"
        ],
        why: "submit/requestSubmit 같은 핵심 API의 프로토타입이 바뀌면, 브라우저 런타임 레벨에서 제출 훅킹(유출/조작)이 가능해집니다."
      },
      {
        title: "FORM_NATIVE_SUBMIT → FORM_SUBMIT (page_hook → content 변환 + 상관 신호)",
        keys: [
          "type = FORM_NATIVE_SUBMIT (page_hook에서 발생)",
          "type = FORM_SUBMIT (content.js 변환 후 룰 적용)",
          "data.via = native_submit / requestSubmit",
          "data.actionResolved, data.actionOrigin, data.pageOrigin",
          "data.protoTamperSeen = true (구현에 따라 포함)",
          "evidence.protoTamper.* (구현에 따라 포함)"
        ],
        why: "프로토타입 변조가 실제 제출 동작과 같은 세션에서 연결되면 확정성이 올라갑니다. (서버는 정상 처리처럼 보여도 브라우저 내부에서 변조+제출 연계가 근거가 됨)"
      },
      {
        title: "SUSP_NETWORK_CALL (sendBeacon/fetch) → NETWORK_LEAK",
        keys: [
          "type = SUSP_NETWORK_CALL",
          "data.api = sendBeacon / fetch",
          "data.abs, data.targetOrigin",
          "data.crossSite = true",
          "ruleId = NETWORK_LEAK"
        ],
        why: "PoC-F의 핵심은 '정상 제출 유지'와 동시에 외부(/collect)로 유출 네트워크가 추가 발생하는 점입니다. proto tamper + submit + network call이 한 세션에 묶이면 가장 설득력이 강합니다."
      }
    ]
    },
    "poc-g": {
      expectedEventTypes: [
        "DYN_SCRIPT_INSERT",
        "SW_REGISTER",
        "SW_REGISTRATIONS_PRESENT",
        "SW_PERSISTENCE_ACTIVE",
        "POC_G_SW_CHAIN (optional)"
      ],
      expectedRuleIds: [
        "DYN_SCRIPT_INSERT_CROSS_SITE",
        "SW_REGISTER_INITIATED_BY_CROSS_SITE_SCRIPT",
        "SW_REGISTER (fallback)",
        "SW_REGISTRATIONS_PRESENT",
        "SW_PERSISTENCE_ACTIVE",
        "POC_G_SW_CHAIN_CONFIRMED (optional)"
      ],
      reproChecklist: [
        {
          title: "1) 메인(VICTIM) 페이지 열기",
          detail: "아래 버튼으로 MAIN(VICTIM)을 열고 페이지가 정상 로드되는지 확인합니다.",
          action: "open_main"
        },
        {
          title: "2) BRS 확장(센서) 활성화 확인",
          detail: "BRS 확장이 켜져 있고, 해당 사이트에서 동작 중인지 확인합니다. (콘솔 로그/팝업/대시보드 등)",
          action: "manual"
        },
        {
          title: "3) 서드파티 SDK(ATTACKER) 로드 확인",
          detail: "MAIN이 THIRDPARTY(ATTACKER) SDK를 로드하는 구조인지 확인합니다. DYN_SCRIPT_INSERT(crossSite=true)가 시작 신호입니다.",
          action: "open_third"
        },
        {
          title: "4) SW register 시도 탐지 확인",
          detail: "SDK가 victim origin 컨텍스트에서 navigator.serviceWorker.register('/sw-evil.js', {scope:'/'})를 호출합니다. SW_REGISTER가 찍히는지 확인합니다.",
          action: "manual"
        },
        {
          title: "5) SW 등록/활성 상태 확인",
          detail: "등록이 존재하면 SW_REGISTRATIONS_PRESENT, 컨트롤러를 잡으면 SW_PERSISTENCE_ACTIVE가 찍힙니다. controller.scriptURL이 /sw-evil.js로 보이는지 확인합니다.",
          action: "manual"
        },
        {
          title: "6) (PoC 동작) /api/account 호출로 변조 확인",
          detail: "PoC UI에서 /api/account 호출 시 응답이 SW에 의해 변조되는지 확인합니다. (예: VIP, balance 999999, swModified=true, 헤더 X-POC-SW 등)",
          action: "manual"
        },
        {
          title: "7) (선택) 체인 확정 이벤트 확인",
          detail: "구현/상태에 따라 POC_G_SW_CHAIN이 발행될 수 있습니다. 발행되면 ruleId=POC_G_SW_CHAIN_CONFIRMED(HIGH)로 확정됩니다. (안 뜨면 optional로 간주)",
          action: "manual"
        }
      ],
      evidenceFields: [
        {
          title: "DYN_SCRIPT_INSERT (cross-site SDK 로드)",
          keys: [
            "type = DYN_SCRIPT_INSERT",
            "data.src / data.abs (sdk_sw_register.js)",
            "data.crossSite = true",
            "data.targetOrigin"
          ],
          why: "공급망 체인의 시작점입니다. victim이 외부(서드파티) 스크립트를 로드한 정황을 남깁니다."
        },
        {
          title: "SW_REGISTER + initiatorCrossSite (핵심)",
          keys: [
            "type = SW_REGISTER",
            "data.scriptURL / data.abs = /sw-evil.js",
            "data.scope (예: /)",
            "data.crossSite = false (SW 스크립트가 same-origin이면 정상)",
            "data.initiatorCrossSite = true (register 호출 주체가 cross-site SDK면 true)",
            "data.initiatorUrl / evidence.stack (스택에서 sdk_sw_register.js가 보이는지)"
          ],
          why: "SW 스크립트 자체는 same-origin이라도, 등록을 실행한 주체가 cross-site 스크립트로 확인되면 정상 설계에서 매우 이례적이라 강한 신호입니다."
        },
        {
          title: "SW_REGISTRATIONS_PRESENT (등록 존재)",
          keys: [
            "type = SW_REGISTRATIONS_PRESENT",
            "data.regsCount",
            "data.regs[*].scope",
            "data.regs[*].activeScriptURL / installing / waiting 요약"
          ],
          why: "SW가 실제로 등록되어 브라우저에 남아있다는 정보성 신호입니다. 단독보다는 다른 이벤트와 결합될 때 의미가 커집니다."
        },
        {
          title: "SW_PERSISTENCE_ACTIVE (controller 확보)",
          keys: [
            "type = SW_PERSISTENCE_ACTIVE",
            "data.hasController = true",
            "data.controller.scriptURL",
            "data.controllerAbs, data.controllerOrigin",
            "data.regsCount / data.regs 요약"
          ],
          why: "controller를 확보한 순간부터 fetch 가로채기/응답 변조가 현실화됩니다. PoC-G에서 지속성(persistence)의 핵심 증거입니다."
        },
        {
          title: "POC_G_SW_CHAIN (optional: 체인 확정)",
          keys: [
            "type = POC_G_SW_CHAIN",
            "ruleId = POC_G_SW_CHAIN_CONFIRMED",
            "DYN_SCRIPT_INSERT(crossSite) + SW_REGISTER(initiatorCrossSite) + SW_PERSISTENCE_ACTIVE를 시간 윈도우로 결합"
          ],
          why: "구현이 시간상관을 성공적으로 묶으면 HIGH 확정 이벤트로 승격됩니다. 현재 코드 상태에 따라 optional일 수 있습니다."
        }
      ]
    },
    "poc-h": {
      expectedEventTypes: [
        "DYN_SCRIPT_INSERT",
        "DYN_IFRAME_INSERT",
        "MUTATION_OBSERVER_REGISTER",
        "MUTATION_OBSERVER_TRIGGER",

        // 2-stage 로딩(디코드/실행) 근거
        "SUSP_ATOB_CALL",
        "SUSP_FUNCTION_CONSTRUCTOR_CALL",

        // stage2 동작(프로토타입 후킹)
        "PROTO_TAMPER",

        // (선택) stage2 제거 후 재주입 시 gate.js가 postMessage로 발생
        "PERSISTENCE_REINJECT"
      ],
      expectedRuleIds: [
        "DYN_SCRIPT_INSERT_CROSS_SITE",
        "IFRAME_INSERT_INITIATED_BY_CROSS_SITE_SCRIPT",
        "IFRAME_INSERT",

        "MUTATION_OBSERVER_REGISTER",
        "MUTATION_OBSERVER_REGISTER_WIDE_SCOPE",
        "MUTATION_OBSERVER_REGISTER_CROSS_SITE_INITIATOR",
        "MUTATION_OBSERVER_TRIGGER_SCRIPT_OR_IFRAME_ADDED",

        "OBFUSCATION_ATOB",
        "DYNAMIC_CODE_FUNCTION",

        "XHR_OPEN_PROTOTYPE_TAMPER",
        "XHR_SEND_PROTOTYPE_TAMPER",

        "PERSISTENCE_REINJECT"
      ],
      reproChecklist: [
        {
          title: "1) 메인 페이지 열기",
          detail: "아래 버튼으로 MAIN(정상 페이지)을 엽니다.",
          action: "open_main"
        },
        {
          title: "2) BRS 확장(센서) 활성화 확인",
          detail: "BRS 확장이 켜져 있고, 해당 사이트에서 이벤트가 수집되는지 확인합니다. (콘솔/팝업/대시보드 등)",
          action: "manual"
        },
        {
          title: "3) 서드파티 위젯 표시 확인",
          detail: "MAIN 우측 하단에 위젯(iframe)이 표시되는지 확인합니다. (THIRDPARTY sdk.js가 삽입한 위젯)",
          action: "manual"
        },
        {
          title: "4) 위젯 닫기 버튼 클릭",
          detail: "위젯의 X 버튼을 눌러 위젯 컨테이너 DOM이 제거되도록 합니다. 이 동작이 트리거입니다.",
          action: "manual"
        },
        {
          title: "5) stage2 활성화 확인",
          detail: "위젯 제거 직후 loader.js가 삽입되고 payload.b64가 실행되면, 페이지 상단에 배지/상태 변화가 나타납니다. (또는 DOM에 script#pocH_stage2가 생깁니다.)",
          action: "manual"
        },
        {
          title: "6) MAIN에서 Test XHR 요청 보내기 버튼 클릭",
          detail: "MAIN에 있는 'Test XHR 요청 보내기' 버튼을 눌러 XHR 요청을 발생시킵니다. stage2가 활성화되어 있다면 XHR 후킹이 동작합니다.",
          action: "manual"
        },
        {
          title: "7) THIRDPARTY 서버의 /mirror 로그 확인",
          detail: "stage2는 요청 메타를 /mirror로 미러링합니다. THIRDPARTY 서버 콘솔 로그에 [mirror] 라인이 찍히는지 확인합니다.",
          action: "open_third"
        },
        {
          title: "8) (선택) Injected 제거(방어자) 버튼 클릭 후 재주입 확인",
          detail: "MAIN에서 'Injected 제거(방어자)' 버튼으로 script#pocH_stage2를 제거해봅니다. gate.js가 제거를 감지하면 재주입을 시도하며, PERSISTENCE_REINJECT 이벤트가 함께 발생할 수 있습니다. (쿨다운이 있어 즉시 재주입이 안 될 수도 있음)",
          action: "manual"
        }
      ],
      evidenceFields: [
        {
          title: "DYN_SCRIPT_INSERT: sdk.js / loader.js (dom_mutation)",
          keys: [
            "type = DYN_SCRIPT_INSERT",
            "data.src, data.abs",
            "data.crossSite = true",
            "data.initiatorUrl, data.initiatorOrigin, data.initiatorCrossSite (가능한 경우)"
          ],
          why: "PoC-H는 THIRDPARTY 스크립트(sdk.js)를 로드한 뒤, 트리거 이후 추가로 THIRDPARTY loader.js를 동적으로 삽입합니다. 외부 스크립트 로드가 단계적으로 이어지는지가 핵심입니다."
        },
        {
          title: "DYN_IFRAME_INSERT: widget.html + initiator provenance",
          keys: [
            "type = DYN_IFRAME_INSERT",
            "data.src, data.abs (widget.html)",
            "data.hidden (위젯은 보이는 iframe이면 보통 false)",
            "data.initiatorUrl / data.initiatorOrigin / data.initiatorCrossSite (가능한 경우)"
          ],
          why: "THIRDPARTY sdk.js가 iframe 위젯을 삽입합니다. initiatorCrossSite 근거가 잡히면, 누가 삽입했는지까지 연결돼 신뢰도가 올라갑니다."
        },
        {
          title: "MUTATION_OBSERVER_REGISTER: gate.js observe",
          keys: [
            "type = MUTATION_OBSERVER_REGISTER",
            "data.targetDesc (예: documentElement)",
            "data.options.childList, data.options.subtree",
            "data.initiatorUrl / data.initiatorOrigin / data.initiatorCrossSite"
          ],
          why: "gate.js가 DOM 변화 감시를 위해 MutationObserver를 등록합니다. wide-scope(childList+subtree) 관측은 트리거 기반 동작을 구성할 때 자주 사용됩니다."
        },
        {
          title: "MUTATION_OBSERVER_TRIGGER: 위젯 제거 / stage2 제거 등",
          keys: [
            "type = MUTATION_OBSERVER_TRIGGER",
            "data.observerId, data.targetDesc",
            "data.summary.removedNodes, data.summary.addedNodes",
            "data.summary.addedScripts / addedIframes (구현에 따라 존재)"
          ],
          why: "트리거는 위젯 DOM 제거입니다. 추가로 stage2(script#pocH_stage2)를 제거했을 때도 removedNodes로 잡힐 수 있어, 재주입 흐름을 확인할 때 중요합니다."
        },
        {
          title: "2-stage 실행 근거: atob + Function",
          keys: [
            "type = SUSP_ATOB_CALL → ruleId = OBFUSCATION_ATOB",
            "type = SUSP_FUNCTION_CONSTRUCTOR_CALL → ruleId = DYNAMIC_CODE_FUNCTION",
            "각 이벤트의 data.payload / data.len (프리뷰)"
          ],
          why: "loader.js는 payload.b64를 atob로 디코딩하고, new Function(code)로 stage2를 실행합니다. 이 두 이벤트는 stage2 실행이 실제로 일어났다는 강한 근거가 됩니다."
        },
        {
          title: "PROTO_TAMPER: XHR.prototype.open / send",
          keys: [
            "type = PROTO_TAMPER",
            "ruleId = XHR_OPEN_PROTOTYPE_TAMPER / XHR_SEND_PROTOTYPE_TAMPER",
            "data.target (예: XMLHttpRequest.prototype.open)",
            "data.isNative = false",
            "data.analysis.head (함수 바디 프리뷰)"
          ],
          why: "stage2는 XHR 프로토타입을 후킹해 요청 정보를 가로채고, /mirror로 미러링합니다. 프로토타입 변조 자체가 런타임 변조의 핵심 증거입니다."
        },
        {
          title: "(선택) PERSISTENCE_REINJECT: stage2 제거 후 재주입 알림",
          keys: [
            "type = PERSISTENCE_REINJECT",
            "ruleId = PERSISTENCE_REINJECT",
            "data.from, data.removedId, data.ts"
          ],
          why: "Injected 제거(방어자) 버튼으로 stage2를 지우면, gate.js가 이를 감지해 재주입을 시도하고 postMessage로 알림을 보냅니다. 제거-재주입 흐름이 보이면 지속성 패턴을 사용자가 쉽게 이해할 수 있습니다."
        }
      ]
    },
    "poc-h-obf": {
      expectedEventTypes: [
        "DYN_SCRIPT_INSERT",
        "DYN_IFRAME_INSERT",
        "MUTATION_OBSERVER_REGISTER",
        "MUTATION_OBSERVER_TRIGGER",
        "SUSP_ATOB_CALL",
        "SUSP_FUNCTION_CONSTRUCTOR_CALL"
      ],
      expectedRuleIds: [
        "DYN_SCRIPT_INSERT_SAME_SITE",
        "DYN_SCRIPT_INSERT_CROSS_SITE",
        "IFRAME_INSERT_INITIATED_BY_CROSS_SITE_SCRIPT",
        "MUTATION_OBSERVER_REGISTER",
        "MUTATION_OBSERVER_TRIGGER"
      ],
      reproChecklist: [
        {
          title: "1) 메인 페이지 열기",
          detail: "아래 버튼으로 MAIN(정상 페이지)을 엽니다.",
          action: "open_main"
        },
        {
          title: "2) BRS 확장(센서) 활성화 확인",
          detail: "BRS 확장이 켜져 있고, 해당 사이트에서 이벤트가 수집되는지 확인합니다. (콘솔/팝업/대시보드 등)",
          action: "manual"
        },
        {
          title: "3) 서드파티 위젯 표시 확인",
          detail: "MAIN 우측 하단에 위젯(iframe)이 표시되는지 확인합니다. (THIRDPARTY sdk.js가 삽입한 위젯)",
          action: "manual"
        },
        {
          title: "4) 위젯 닫기 버튼 클릭",
          detail: "위젯의 X 버튼을 눌러 위젯 컨테이너 DOM이 제거되도록 합니다. (트리거)",
          action: "manual"
        },
        {
          title: "5) 난독화 체인 활성화 정황 확인",
          detail: "위젯 제거 직후 동적 삽입/실행이 일어나면, 배지/상태 변화 또는 추가 스크립트가 DOM에 나타납니다.",
          action: "manual"
        },
        {
          title: "6) (선택) THIRDPARTY 오리진 직접 열기",
          detail: "공급망 역할(외부 스크립트 제공)을 확인합니다.",
          action: "open_third"
        }
      ],
      evidenceFields: [
        {
          title: "DYN_SCRIPT_INSERT / DYN_IFRAME_INSERT (dom_mutation)",
          keys: [
            "type = DYN_SCRIPT_INSERT 또는 DYN_IFRAME_INSERT",
            "data.src, data.abs, data.targetOrigin",
            "data.crossSite (targetOrigin !== location.origin)",
            "data.initiatorCrossSite (외부 initiator 유도 여부)"
          ],
          why: "외부(서드파티)에서 들어온 코드가 다시 동적 삽입을 유도하는 체인은 공급망/로더 패턴으로 위험도가 상승합니다."
        },
        {
          title: "MutationObserver 기반 트리거",
          keys: [
            "type = MUTATION_OBSERVER_REGISTER",
            "type = MUTATION_OBSERVER_TRIGGER",
            "data.targetDesc / data.options",
            "data.summary.removedNodes (위젯 제거 트리거 근거)"
          ],
          why: "사용자 동작(위젯 제거 등)을 신호로 삼아 런타임 주입이 발생하는 전형적인 트리거 패턴입니다."
        },
        {
          title: "난독화/동적 실행 근거(page_hook)",
          keys: [
            "type = SUSP_ATOB_CALL",
            "type = SUSP_FUNCTION_CONSTRUCTOR_CALL",
            "evidence.stack 또는 data.summary.*"
          ],
          why: "정적 분석/탐지 회피를 위해 디코드(atob) + 동적 실행(Function)을 사용하는 흔한 패턴입니다."
        }
      ]
    },
    "poc-AI-test": {
      expectedEventTypes: [
        "INJECTED_SCRIPT_SCORE",
        "INJECTED_SCRIPT_AI_VERDICT"
      ],
      expectedRuleIds: [
        "INJECTED_SCRIPT_SCORE",
        "INJECTED_SCRIPT_AI_VERDICT"
      ],
      reproChecklist: [
        {
          title: "1) PoC-AI-Test 메인 페이지 열기",
          detail: "",
          action: "open_main"
        },
        {
          title: "2) Inject: BENIGN(medium) 클릭", 
          detail: "대시보드에서 INJECTED_SCRIPT_SCORE 확인", 
          action: "manual" 
        },
        { title: "3) AI verdict 확인", 
          detail: "몇 초 내 INJECTED_SCRIPT_AI_VERDICT(benign) 추가 기록 확인", 
          action: "manual" 
        },
        { 
          title: "4) Inject: MALICIOUS(medium) 클릭", 
          detail: "대시보드에서 INJECTED_SCRIPT_SCORE 확인", 
          action: "manual" 
        },
        { title: "5) AI verdict 확인", 
          detail: "몇 초 내 INJECTED_SCRIPT_AI_VERDICT(malicious) 추가 기록 확인", 
          action: "manual" 
        }
      ]
    }
  };

  function getWriteup(pocId) {
    return WRITEUPS[normId(pocId)] || null;
  }

  // ---- init common header/buttons ----
  const pocId = getPocId();
  const item = findItemById(pocId);
  const canonicalPocId = (item && item.id) ? item.id : pocId;
  const writeup = getWriteup(canonicalPocId);
  const pocIdNorm = normId(canonicalPocId);

  const detailTitle = document.getElementById("detailTitle");
  const detailSub = document.getElementById("detailSub");
  const pocTitle = document.getElementById("pocTitle") || document.getElementById("title");
  const pocDesc = document.getElementById("pocDesc") || document.getElementById("desc");
  const pocLinkButtons = document.getElementById("pocLinkButtons") || document.getElementById("links");
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
  if (detailSub) detailSub.textContent = `poc: ${canonicalPocId}`;

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
      const lines = linkLines(canonicalPocId, links);
      if (!lines.length) return;
      try { await copyText(lines.join("\n")); } catch {}
    }));
  }

  const notes = Array.isArray(item.notes) ? item.notes : [];
  if (pocNotes) {
    pocNotes.remove();
  }

  if (btnCopyLinks) {
    btnCopyLinks.addEventListener("click", async () => {
      const lines = linkLines(pocId, links);
      if (!lines.length) return;
      try { await copyText(lines.join("\n")); } catch {}
    });
  }

  function renderReproChecklist() {
    const root = document.getElementById("reproChecklist") || document.getElementById("checklist");
    const progress = document.getElementById("reproProgress");
    if (!root || !writeup || !Array.isArray(writeup.reproChecklist)) return;

    const storageKey = `__poc_check_${pocIdNorm}__`;
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
    const evUl = document.getElementById("expectedEventTypes");
    const ruleUl = document.getElementById("expectedRuleIds");
    const btnEv = document.getElementById("btnCopyEventTypes");
    const btnRule = document.getElementById("btnCopyRuleIds");

    const ev = Array.isArray(writeup.expectedEventTypes) ? writeup.expectedEventTypes : [];
    const rules = Array.isArray(writeup.expectedRuleIds) ? writeup.expectedRuleIds : [];

    if (evBox) evBox.textContent = ev.map(s => `- ${s}`).join("\n");
    if (ruleBox) ruleBox.textContent = rules.map(s => `- ${s}`).join("\n");

    if (evUl) evUl.innerHTML = ev.map(s => `<li><code>${esc(s)}</code></li>`).join("");
    if (ruleUl) ruleUl.innerHTML = rules.map(s => `<li><code>${esc(s)}</code></li>`).join("");

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

  function initAiTestEmbedAndPassFail() {
    if (pocIdNorm !== "poc-ai-test") return;

    const frame = document.getElementById("aiTestFrame");
    const st = document.getElementById("aiTestStatus");
    const boxRoot = document.getElementById("aiTestPassFail");
    const btnReload = document.getElementById("aiTestReload");
    const btnAll = document.getElementById("aiTestMarkAll");
    const btnReset = document.getElementById("aiTestReset");

    const mainUrlRaw = links.main || links.victim || "";
    const mainUrl = isSetUrl(mainUrlRaw) ? toOpenableUrl(mainUrlRaw) : "";

    const storageKey = "__poc_ai_test_passfail__";
    let state = {};
    try { state = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch {}

    const steps = [
      { k: "score_benign", t: "INJECTED_SCRIPT_SCORE (BENIGN) 확인" },
      { k: "ai_benign", t: "INJECTED_SCRIPT_AI_VERDICT (BENIGN) 확인" },
      { k: "score_mal", t: "INJECTED_SCRIPT_SCORE (MALICIOUS) 확인" },
      { k: "ai_mal", t: "INJECTED_SCRIPT_AI_VERDICT (MALICIOUS) 확인" }
    ];

    function save() {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }

    function doneCount() {
      return steps.filter(s => state[s.k] === true).length;
    }

    function renderStatus() {
      if (!st) return;
      if (!mainUrl) { st.textContent = "missing: MAIN link (hub env)"; return; }
      const done = doneCount();
      const total = steps.length;
      st.textContent = (done === total) ? "PASS (manual checklist complete)" : `RUNNING… (manual ${done}/${total})`;
    }

    function renderBox() {
      if (!boxRoot) return;

      const wrap = document.createElement("div");
      wrap.className = "checklist";

      const head = document.createElement("div");
      head.className = "hint";
      head.textContent = `Progress: ${doneCount()}/${steps.length}`;
      wrap.appendChild(head);

      steps.forEach((s) => {
        const row = document.createElement("div");
        row.className = "check-row";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = state[s.k] === true;
        cb.addEventListener("change", () => {
          state[s.k] = cb.checked;
          save();
          renderBox();
        });

        const txt = document.createElement("div");
        txt.className = "txt";
        txt.innerHTML = `<b>${esc(s.t)}</b>`;

        row.appendChild(cb);
        row.appendChild(txt);
        wrap.appendChild(row);
      });

      boxRoot.innerHTML = "";
      boxRoot.appendChild(wrap);
      renderStatus();
    }

    if (frame) {
      if (mainUrl) frame.src = mainUrl;
      frame.addEventListener("load", () => renderStatus());
    }

    if (btnReload) btnReload.addEventListener("click", () => {
      if (!frame) return;
      if (!mainUrl) { renderStatus(); return; }
      const u = new URL(mainUrl, location.href);
      u.searchParams.set("_t", String(Date.now()));
      frame.src = u.toString();
    });

    if (btnAll) btnAll.addEventListener("click", () => {
      steps.forEach(s => state[s.k] = true);
      save();
      renderBox();
    });

    if (btnReset) btnReset.addEventListener("click", () => {
      state = {};
      save();
      renderBox();
    });

    renderBox();
  }

  renderReproChecklist();
  renderExpectedLists();
  renderEvidence();
  initAiTestEmbedAndPassFail();
})();