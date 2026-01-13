const express = require("express");
const path = require("path");

const app = express();
const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));

app.get("/health", (req, res) => res.status(200).send("ok"));

function getDefaultConfig() {
  return {
    hubTitle: "BRS PoC Hub",
    updatedAt: new Date().toISOString(),
    groups: [
      {
        title: "PoCs",
        items: [
          {
            id: "poc-a",
            title: "PoC-A: Login (third-party script + iframe)",
            desc: "정상 로그인 UI에 서드파티 스크립트/iframe 체인을 붙이는 시나리오",
            links: { main: "", thirdparty: "" },
            notes: ["main/thirdparty origin 분리"]
          },
          {
            id: "poc-b",
            title: "PoC-B: Invisible Layer (click hijack)",
            desc: "투명 오버레이로 클릭을 가로채서 강제 이동",
            links: { main: "" },
            notes: ["단일 origin으로도 동작"]
          },
          {
            id: "poc-c",
            title: "PoC-C: Third-party iframe + postMessage + form.action swap",
            desc: "서드파티 위젯이 postMessage 트리거로 제출 경로를 바꾸는 시나리오",
            links: { main: "", thirdparty: "" },
            notes: ["main/thirdparty origin 분리"]
          },
          {
            id: "poc-d",
            title: "PoC-D: JIT href swap (pointerdown 직전 스왑)",
            desc: "클릭 직전 href를 스왑했다가 원복하는 링크 하이재킹",
            links: { main: "" },
            notes: ["단일 origin도 가능하지만 별도 분리"]
          },
          {
            id: "poc-e",
            title: "PoC-E: XHR Mirroring (prototype hook)",
            desc: "XHR open/send 후킹으로 요청을 다중 collector로 미러링",
            links: { main: "", hook: "", c1: "", c2: "", c3: "" },
            notes: ["main/hook/collectors origin 분리"]
          },
          {
            id: "poc-f",
            title: "PoC-F: Form submit prototype hook",
            desc: "form.submit/requestSubmit 후킹으로 제출 흐름 개입",
            links: { main: "", thirdparty: "" },
            notes: ["main/thirdparty origin 분리"]
          },
          {
            id: "poc-g",
            title: "PoC-G: Service Worker persistence",
            desc: "SW 등록/지속성으로 응답 변조/퍼시스턴스 재현",
            links: { victim: "", attacker: "" },
            notes: ["반드시 origin 격리", "테스트 후 사이트 데이터 삭제 가이드 필요"]
          },
          {
            id: "poc-h",
            title: "PoC-H: Script injection chain",
            desc: "동적 스크립트 삽입 체인을 재현 (데모 목적)",
            links: { main: "", thirdparty: "", ws: "" },
            notes: ["민감데이터 수집 금지", "origin 격리"]
          }
        ]
      }
    ],
    resetGuides: [
      {
        title: "Service Worker / 캐시 리셋",
        steps: [
          "Chrome DevTools → Application → Service Workers → Unregister",
          "Application → Storage → Clear site data",
          "새로고침 후 다시 테스트"
        ]
      },
      {
        title: "권장 테스트 순서(오염 방지)",
        steps: [
          "B → D → A/C/F/E → (마지막에) G",
          "G 실행 후 반드시 사이트 데이터 삭제"
        ]
      }
    ]
  };
}

function safeParseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

app.get("/runtime-config.js", (req, res) => {
  const hubTitle = process.env.HUB_TITLE || "BRS PoC Hub";

  const raw = process.env.HUB_CONFIG_JSON;
  const parsed = raw ? safeParseJson(raw) : null;

  const envLinks = {
    "poc-a": { main: process.env.POC_A_MAIN || "", thirdparty: process.env.POC_A_THIRD || "" },
    "poc-b": { main: process.env.POC_B_MAIN || "" },
    "poc-c": { main: process.env.POC_C_MAIN || "", thirdparty: process.env.POC_C_THIRD || "" },
    "poc-d": { main: process.env.POC_D_MAIN || "" },
    "poc-e": {
      main: process.env.POC_E_MAIN || "",
      hook: process.env.POC_E_HOOK || "",
      c1: process.env.POC_E_C1 || "",
      c2: process.env.POC_E_C2 || "",
      c3: process.env.POC_E_C3 || ""
    },
    "poc-f": { main: process.env.POC_F_MAIN || "", thirdparty: process.env.POC_F_THIRD || "" },
    "poc-g": { victim: process.env.POC_G_VICTIM || "", attacker: process.env.POC_G_ATTACKER || "" },
    "poc-h": { main: process.env.POC_H_MAIN || "", thirdparty: process.env.POC_H_THIRD || "", ws: process.env.POC_H_WS || "" }
  };

  const base = parsed && typeof parsed === "object" ? parsed : getDefaultConfig();
  base.hubTitle = hubTitle;

  for (const group of base.groups || []) {
    for (const item of group.items || []) {
      const add = envLinks[item.id];
      if (!add) continue;
      item.links = { ...(item.links || {}), ...add };
    }
  }

  res
    .type("application/javascript")
    .send(`window.__HUB_CONFIG__=${JSON.stringify(base)};`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("[hub] listening on", port));