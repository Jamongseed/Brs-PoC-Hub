# BRS PoC Hub
<img width="1134" height="574" alt="image" src="https://github.com/user-attachments/assets/eef8a12c-feeb-43ef-8cc3-c1a047d6b4e3" />
<img width="1165" height="575" alt="image" src="https://github.com/user-attachments/assets/05690d0b-a440-4d4c-9c5d-329476fd3108" />

Browser Runtime Security(BRS) 프로젝트의 PoC 시나리오들을 한 곳에서 실행/접속할 수 있도록 만든 허브입니다.

- `poc-hub/`: PoC 링크를 한 페이지에서 모아주는 Hub 서버(Express)
- `poc-*/`: 각 공격 시나리오를 재현하는 PoC 서버들(Express 기반)

> 이 레포는 공격을 수행하기 위한 목적이 아니라, **브라우저 런타임 변조가 어떻게 발생하고 센서가 어떤 Evidence를 남기는지**를 재현/검증하기 위한 데모 세트입니다.

## Quick Start (로컬)

### 0) 준비물
- Node.js
- (권장) 한 번에 PoC 하나씩만 실행  
  대부분의 PoC가 `3000` 포트를 사용하므로 동시에 여러 개를 띄우면 충돌합니다.

### 1) Hub 실행 (권장: 3100 포트)
Hub는 정적 페이지 + `runtime-config.js`를 제공하는 서버입니다.

```bash
cd poc-hub
npm install
PORT=3100 npm start
# http://localhost:3100
```

### 2) Hub에 로컬 링크 주입(환경변수)
Hub는 `/runtime-config.js`를 통해 각 PoC의 링크를 표시합니다.  
아래처럼 환경변수로 로컬 주소를 넣어두면, Hub에서 바로 클릭해서 접속할 수 있습니다.

macOS/Linux (bash/zsh):

```bash
cd poc-hub
POC_A_MAIN="http://localhost:3000" POC_A_THIRD="http://localhost:4000" POC_B_MAIN="http://localhost:3000" POC_C_MAIN="http://localhost:3000" POC_C_THIRD="http://localhost:4000" POC_D_MAIN="http://localhost:3000" POC_E_MAIN="http://localhost:3000" POC_E_HOOK="http://localhost:4000" POC_E_C1="http://localhost:5001" POC_E_C2="http://localhost:5002" POC_E_C3="http://localhost:5003" POC_F_MAIN="http://localhost:3000" POC_F_THIRD="http://localhost:4000" POC_G_VICTIM="http://localhost:3000" POC_G_ATTACKER="http://localhost:4000" POC_H_MAIN="http://localhost:3000" POC_H_THIRD="http://localhost:4000" POC_H_WS="ws://localhost:5000" POC_H_OBF_MAIN="http://localhost:3000" POC_H_OBF_THIRD="http://localhost:4000" POC_H_OBF_WS="ws://localhost:5000" POC_AI_TEST_MAIN="http://localhost:3000" PORT=3100 npm start
```

Windows PowerShell:

```powershell
cd poc-hub
$env:POC_A_MAIN="http://localhost:3000"
$env:POC_A_THIRD="http://localhost:4000"
$env:POC_B_MAIN="http://localhost:3000"
$env:POC_C_MAIN="http://localhost:3000"
$env:POC_C_THIRD="http://localhost:4000"
$env:POC_D_MAIN="http://localhost:3000"
$env:POC_E_MAIN="http://localhost:3000"
$env:POC_E_HOOK="http://localhost:4000"
$env:POC_E_C1="http://localhost:5001"
$env:POC_E_C2="http://localhost:5002"
$env:POC_E_C3="http://localhost:5003"
$env:POC_F_MAIN="http://localhost:3000"
$env:POC_F_THIRD="http://localhost:4000"
$env:POC_G_VICTIM="http://localhost:3000"
$env:POC_G_ATTACKER="http://localhost:4000"
$env:POC_H_MAIN="http://localhost:3000"
$env:POC_H_THIRD="http://localhost:4000"
$env:POC_H_WS="ws://localhost:5000"
$env:POC_H_OBF_MAIN="http://localhost:3000"
$env:POC_H_OBF_THIRD="http://localhost:4000"
$env:POC_H_OBF_WS="ws://localhost:5000"
$env:POC_AI_TEST_MAIN="http://localhost:3000"
$env:PORT="3100"
npm start
```

### 3) PoC 하나 실행
Hub의 링크는 현재 실행 중인 PoC로 접속시키는 용도입니다.  
대부분의 PoC가 `http://localhost:3000`을 사용하므로, PoC는 한 번에 하나씩 실행하는 것을 권장합니다.

예: PoC-D (href swap)

```bash
cd poc-d-href-swap
npm install
npm start
# http://localhost:3000
```

Hub(`http://localhost:3100`)에서 PoC-D 링크를 클릭하면 됩니다.

## PoC 목록과 실행 방법

### PoC-A: Login (third-party script + iframe)
- Main: 3000 / Third-party: 4000

```bash
cd poc-a-login
npm install
npm run dev
# MAIN http://localhost:3000
# THIRDPARTY http://localhost:4000
```

### PoC-B: Invisible Layer (click hijack)
- Main: 3000

```bash
cd poc-b-invisible-layer
npm install
npm start
# http://localhost:3000
```

### PoC-C: Third-party iframe + postMessage + form swap
- Main: 3000 / Third-party: 4000

```bash
cd poc-c-thirdparty-iframe-postmessage
npm install
npm start
# MAIN http://localhost:3000
# THIRDPARTY http://localhost:4000
```

### PoC-D: JIT href swap (pointerdown 직전 스왑)
- Main: 3000

```bash
cd poc-d-href-swap
npm install
npm start
# http://localhost:3000
```

### PoC-E: XHR Mirroring (prototype hook) + multi collectors
- Main: 3000 / Hook: 4000 / Collectors: 5001, 5002, 5003

```bash
cd poc-e-xhrMirroring
npm install
npm start
# MAIN http://localhost:3000
# HOOK http://localhost:4000
# C1 http://localhost:5001
# C2 http://localhost:5002
# C3 http://localhost:5003
```

### PoC-F: Form submit prototype hook
- Main: 3000 / Third-party: 4000

```bash
cd poc-f-form-proto-submit-hook
npm install
npm run dev
# MAIN http://localhost:3000
# THIRDPARTY http://localhost:4000
```

### PoC-G: Service Worker persistence
- Victim: 3000 / Attacker: 4000

macOS/Linux:

```bash
cd poc-g-serviceworker-persistence
npm install
npm run dev
# victim http://localhost:3000
# attacker http://localhost:4000
```

Windows:

```bash
cd poc-g-serviceworker-persistence
npm install
npm run dev:win
```

### PoC-H: Script injection chain + WebSocket collector
- Main: 3000 / Third-party: 4000 / WS collector: 5000(ws)

```bash
cd poc-h-script_injection
npm install
npm start
# MAIN http://localhost:3000
# THIRDPARTY http://localhost:4000
# WS ws://localhost:5000
```

### PoC-H-OBF: Script injection 난독화 chain
- Main: 3000 / Third-party: 4000 / WS collector: 5000(ws)

```bash
cd poc-h-script_injection_Obfuscation
npm install
npm run start:all
# MAIN http://localhost:3000
# THIRDPARTY http://localhost:4000
# WS ws://localhost:5000
```

### PoC-AI-Test: Script Verdict Regression
- Main: 3000

```bash
cd poc-ai-test
npm install
npm start
# http://localhost:3000
```

## 권장 테스트 순서 / 리셋 가이드

### 권장 테스트 순서(오염 방지)
- B → D → A/C/F/E → H → (마지막) G
- G(Service Worker) 실행 후에는 반드시 사이트 데이터 삭제를 권장합니다.

### Service Worker / 캐시 리셋
- Chrome DevTools → Application → Service Workers → Unregister
- Application → Storage → Clear site data
- 새로고침 후 다시 테스트

## Hub 설정 방식

Hub는 아래 엔드포인트를 제공합니다.

- `GET /health` → `ok`
- `GET /runtime-config.js` → `window.__HUB_CONFIG__=...` 형태로 런타임 설정 전달

링크 주입은 아래 둘 중 하나로 가능합니다.

1) 개별 환경변수 방식(권장)  
`POC_A_MAIN`, `POC_A_THIRD`, `POC_E_C1` 등

2) `HUB_CONFIG_JSON`  
전체 설정(JSON)을 한 번에 덮어쓸 때 사용합니다.

## Directory Structure

```text
Brs-PoC-Hub/
  poc-hub/                          # Hub (Express)
  poc-a-login/
  poc-b-invisible-layer/
  poc-c-thirdparty-iframe-postmessage/
  poc-d-href-swap/
  poc-e-xhrMirroring/
  poc-f-form-proto-submit-hook/
  poc-g-serviceworker-persistence/
  poc-h-script_injection/
  poc-h-script_injection_Obfuscation/
  poc-ai-test/
```

## Safety / Ethics
- 본 PoC들은 학습/연구/데모 목적입니다.
- 실제 서비스/사용자 환경에서 무단으로 실행하지 마세요.
