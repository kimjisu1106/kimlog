---
layout: post
title: 여둘까 Office Layout TIL 1
date: 2026-06-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - HTML
  - WebAPI
---

## 아키텍처

### 측정값(mm)이 진실, 픽셀은 파생값

```js
let pxPerMm = 0.1; // 보정으로 결정되는 단 하나의 환산 계수
const toPx = (mm) => mm * pxPerMm;
const toMm = (px) => px / pxPerMm;
```

가구는 항상 mm(`cx, cy, w, h`)로만 저장하고, 화면 픽셀은 그릴 때 `toPx`로 계산한다. 픽셀을 저장하지 않는다.

```js
function rebuildAll() {
  // 축척 바뀌면 전체 재렌더
  const all = mainLayer.getChildren().slice();
  all.forEach((g) => {
    const fx = g._fx;
    g.destroy();
    buildNode(fx);
  });
}
```

"측정값(mm)"과 "표현값(px)"을 분리하면, 축척 재보정이 `pxPerMm` 한 줄 + 재렌더로 끝난다. 만약 px를 저장했다면 보정할 때마다 모든 좌표를 일일이 환산해야 하고 반올림 오차가 누적된다. "무엇이 진실이고 무엇이 파생인가"를 먼저 정하는 것이 핵심이다.
그래서 px은 별도로 저장하지 않고 항상 저장해둔 mm에 축척을 곱해 화면에 그리는 용으로만 사용한다.

---

### 화면 좌표 ↔ 월드 좌표 변환

```js
function worldPointer() {
  // 마우스 화면좌표 → 월드(이미지픽셀) 좌표
  const p = stage.getPointerPosition();
  const sc = stage.scaleX();
  return { x: (p.x - stage.x()) / sc, y: (p.y - stage.y()) / sc };
}
```

줌(`stage.scale`)과 팬(`stage.position`)은 시각적 변환일 뿐 좌표공간은 안 변한다. 그래서 클릭 위치를 항상 `(화면 - 팬) / 줌`으로 역변환한다. 캔버스·지도·게임에서 반복되는 공식이다. "보이는 좌표"와 "논리 좌표"를 변환하는 카메라 수식.
이걸 안 하면 줌 인한 상태에서 가구를 클릭하면 옆에 있는 가구가 선택되는 등의 좌표 관련 버그가 발생한다.

---

### kind 판별자로 다형 객체를 통합 처리

가구·네모·원·화살표·텍스트가 전부 같은 `_fx` 객체에 `kind` 필드로 구분된다.
가구인지 아닌지를 구분하는 방법은 kind 유무.

```js
function buildNode(fx) {
  if (fx.kind === "arrow") return buildArrowNode(fx);
  if (fx.kind === "text") return buildTextNode(fx);
  // kind 없으면 가구, "rect"/"ellipse"면 도형
}
```

드래그·선택·회전 핸들러는 한 곳에서 모두에게 붙인다.

```js
function attachNodeHandlers(g) {   // 가구·도형·화살표·텍스트가 전부 공유
  g.on("dragstart", () => { ... });
  g.on("click tap", () => { ... });
  g.on("dblclick dbltap", () => renameNode(g));
}
```

종류가 늘어날 때마다 드래그/저장/undo/복사 코드를 새로 짜지 않아도 된다. "공통 동작은 통합 모델 + 공통 핸들러, 차이나는 부분만 분기" — UE5의 BP Function Library 개념.

---

### 중첩 대신 논리 ID로 그룹화

```js
// 같은 gid를 가진 노드들이 한 그룹. Konva로 중첩(nest)하지 않는다.
function getGroupMates(g) {
  const gid = g._fx.gid;
  if (!gid) return [g];
  return mainLayer.getChildren().filter((n) => n._fx && n._fx.gid === gid);
}
```

트리 구조로 묶으면 저장·재렌더·드래그 계산이 전부 재귀가 된다. 대신 플랫 배열 + 그룹 ID(외래키처럼)로 두면 구조가 단순해지고, 저장 JSON도 평면이라 다루기 쉽다. DB 정규화와 같은 트레이드오프다.

---

## 알고리즘

### 회전 좌표계에서 면 스냅 (선형대수 실전)

회전된 두 사각형의 면을 정확히 붙이려면 축정렬 박스(AABB) 비교로는 안 된다. 그래서 드래그 객체의 회전각 `θ`만큼 세상을 역회전시켜 — 그 객체 입장에선 똑바로 선 상태에서 — 비교한다.

```js
function objectSnap(g) {
  const th = (g.rotation() * Math.PI) / 180;
  const cf = Math.cos(-th),
	sf = Math.sin(-th); // world → frame (−θ 회전)
  const toFrame = (x, y) => ({ x: x * cf - y * sf, y: x * sf + y * cf });
  const C = toFrame(g.x(), g.y()); // 드래그 중심을 frame 좌표로
  // frame에서는 드래그 객체가 축정렬되므로 ±w/2, ±h/2로 면 위치가 단순해진다
}
```

그리고 보정한 델타를 다시 `+θ`로 월드에 되돌린다.

```js
const cb = Math.cos(th),
	sb = Math.sin(th); // frame → world (+θ)
if (s.bx) {
  g.x(g.x() + s.bx.delta * cb);
  g.y(g.y() + s.bx.delta * sb);
}
```

회전 변환 행렬 `[cosθ −sinθ; sinθ cosθ]`의 정방향/역방향 적용. "복잡한 기하 문제는 좌표계를 바꿔서 단순한 문제로 만든다"는 발상이 핵심이다. 같은 각도 객체끼리 frame에서 보면 둘 다 똑바로 선 사각형 — 면 맞춤이 단순 뺄셈이 된다.

[요약]
const th = 현재 기울기
const cf = -th로 기울기 상쇄 (똑바르게 만들기)
두 도형 거리 비교
delta 계산 (얼마나 움직여야 붙는지)
const cb = delta에 원래 기울기(+th) 적용해서 월드 좌표로 복원

---

### 다중 선택 드래그 — leader/follower 패턴

Konva는 선택된 노드 전부에 `dragmove`를 쏜다. 그대로 두면 공유 상태가 N번 덮어써져 깨진다. 그래서 하나만 리더로 삼고 나머지 이벤트는 무시한다.

```js
g.on("dragstart", () => {
  if (_dragLeader) return; // 이미 리더 있으면 follower → 무시
  _dragLeader = g;
  _dragStart = selectedNodes.map((n) => ({ n, x: n.x(), y: n.y() }));
  _dragLead = { x: g.x(), y: g.y() };
});
g.on("dragmove", () => {
  if (_dragLeader !== g) return; // 리더만 계산
  const dx = g.x() - _dragLead.x,
    dy = g.y() - _dragLead.y;
  _dragStart.forEach((s) => {
    if (s.n !== g) {
      s.n.x(s.x + dx);
      s.n.y(s.y + dy);
    }
  });
});
```

이벤트가 중복 발화되는 환경(멀티터치, 다중선택, 브로드캐스트)에서 쓰는 "리더 1 + 시작 스냅샷 + 델타 적용" 패턴이다. 매 프레임 상대 위치가 아니라 시작점 기준 절대 델타로 옮기는 게 누적 오차를 막는 포인트다.

---

### 줌과 무관하게 화면 크기 고정 — 1/scale

측정선·점·라벨은 확대해도 굵기가 똑같이 보여야 한다. 모든 크기를 `1 / scale`로 나눈다.

```js
strokeWidth: 2 / s,  radius: 4 / s,  fontSize: 14 / s
```

```js
function updateMeasureSizes() {
  // 줌 바뀔 때마다 재조정
  const s = stage.scaleX();
  overlayLayer.find(".mline").forEach((n) => n.strokeWidth(2 / s));
  overlayLayer.find(".mdot").forEach((n) => n.radius(4 / s));
}
```

"월드에 그리되 화면 크기는 고정"이 필요한 UI(핸들, 가이드, 라벨)의 표준 트릭이다. 줌 인하면 월드 단위가 커지니, 역수를 곱해 상쇄한다.

---

## 상태 관리

### Undo/Redo — 불변 데이터 스냅샷

장면 전체를 mm 모델 배열로 찍어 스택에 쌓고, 되돌릴 때 노드를 재생성한다.

```js
function snapshot() {
  return { pxPerMm, items: mainLayer.getChildren().map((n) => ({ ...n._fx })) };
}
function applySnapshot(s) {
  mainLayer.destroyChildren();
  pxPerMm = s.pxPerMm;
  s.items.forEach((fx) => buildNode({ ...fx })); // ← 클론 전달이 핵심
}
```

화면 노드가 아니라 순수 데이터(mm 모델)를 스냅샷한다. 그래서 저장 포맷과 undo가 같은 모델을 공유한다 — 저장·복사·undo가 공짜로 따라온다.

`{ ...fx }` 클론을 넘기는 이유: 안 하면 빌드된 노드가 스냅샷 객체를 직접 참조해서 이후 편집이 과거 스냅샷을 오염시키고, undo가 깨진다. 불변 스냅샷 원칙.

스택은 60개로 제한하고, 넘으면 가장 오래된 것부터 버리는 FIFO(선입선출) 방식이다 — 메모리와 실용성의 타협점.

---

## 파일 처리

### File System Access API로 덮어쓰기 구현

`showSaveFilePicker()`가 반환한 파일 핸들을 변수에 보관해두면, 다음 저장 때 다이얼로그 없이 같은 파일을 덮어쓸 수 있다.

```js
let fileHandle = null;

async function saveProject() {
  if (!fileHandle) {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: `${projectName}.layout`,
      types: [{ accept: { "application/json": [".layout"] } }],
    });
  }
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(toJSON()));
  await writable.close();
}

// "다른 이름으로 저장"은 핸들만 초기화하면 된다
async function saveAsProject() {
  fileHandle = null;
  await saveProject();
}
```

"다른 이름으로 저장"이 핸들 초기화 한 줄로 끝나는 게 핵심이다. 기존 `<a download>` 방식은 매번 Downloads 폴더에 새 파일이 쌓이지만, File System Access API는 사용자가 선택한 위치를 그대로 덮어쓴다.

---

### 이미지를 JSON에 자기완결로 담기 — Base64 data URL

그림을 파일로 따로 두면 프로젝트 파일을 다른 곳에 옮겼을 때 링크가 깨진다. 이미지를 Base64 문자열로 변환해 JSON 필드에 그대로 담으면, 파일 하나에 평면도까지 자기완결로 들어간다.

```js
// 업로드 → data URL 문자열로 변환
reader.readAsDataURL(file); // "data:image/png;base64,iVBORw0KGgo..."
// 저장: 그 문자열을 JSON 필드에 그대로
{
  bg: bgImage._src;
}
// 복원: 다시 Image.src에 꽂으면 브라우저가 알아서 그림으로
img.src = d.bg;
```

그림 = 숫자의 배열이고, Base64는 그 숫자를 안전한 ASCII 문자로 옮겨 적는 번역기다. 대가는 원본보다 약 33% 커지는 것 — 글자로 풀어 적는 비용이다.

---

### pdf.js로 PDF 평면도 업로드

보통 도면 파일은 DWG 또는 PDF다. DWG를 열 수 있는 사람이라면 전용 프로그램을 쓸 테니, PDF만 추가 지원하기로 했다. pdf.js가 각 페이지를 썸네일로 렌더링하면, 사용자가 원하는 페이지를 골라 평면도로 사용한다.

```js
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const viewport = page.getViewport({ scale: 0.2 }); // 썸네일용 축소
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport })
    .promise;
  // 클릭 시 해당 페이지를 full scale로 렌더해 배경으로 설정
}
```

여러 쪽짜리 PDF면 썸네일 그리드로 보여주고, 선택하면 그 페이지만 전체 크기로 다시 렌더해 캔버스 배경으로 깔린다.

---

## 보안

### 비밀번호 기반 암호화 — PBKDF2 + AES-GCM

라이브러리 없이 브라우저 내장 Web Crypto만으로 구현했다.

```js
async function deriveKey(password, salt, iter) {
  const base = await crypto.subtle.importKey("raw",
    new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptText(plain, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));  // 매번 새 salt
  const iv   = crypto.getRandomValues(new Uint8Array(12));  // 매번 새 IV
  const key  = await deriveKey(password, salt, PBKDF2_ITER);
  const ct   = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ...);
  return JSON.stringify({ enc:"AES-GCM-PBKDF2", iter: PBKDF2_ITER, salt, iv, ct });
}
```

- PBKDF2로 비밀번호 → 키 유도 — 비밀번호를 직접 키로 쓰지 않는다. 수십만 회 반복으로 무차별 대입 속도를 늦춘다.
- salt·IV는 매번 새로 생성해 파일에 같이 저장 — 같은 비밀번호로 암호화해도 결과가 매번 다르다.
- AES-GCM은 인증 암호화 — 비밀번호가 틀리면 복호화가 오류로 거부된다(변조 탐지).
- 반복 횟수 `iter`를 파일에 저장 — 나중에 `PBKDF2_ITER`를 올려도 옛 파일은 자기 `iter`로 복호화되어 전방 호환이 깨지지 않는다.
- `crypto.subtle`은 secure context(https) 필요 — 그래서 Cloudflare(https)로 배포한 것이 중요하다. 그리고 DOM 없는 순수 암호화 로직은 Node 24의 같은 Web Crypto API로 브라우저 없이도 검증 가능하다(왕복 일치·틀린 비번 거부 확인).

---

### XSS 차단 — textContent와 createElement

프리셋·그룹 이름은 남이 만든 JSON 파일에서 올 수 있는 신뢰 불가 입력이다.

```js
// ❌ 과거: wrap.innerHTML = "<span>" + it.name + "</span>";  // name에 <script> 끼면 실행됨
// ✅ 현재:
const nm = document.createElement("span");
nm.className = "pal-name";
nm.textContent = it.name; // 태그가 들어와도 문자열로만 렌더
el.append(sw, nm, dm);
```

"외부에서 온 문자열은 절대 `innerHTML`로 DOM에 넣지 않는다." `textContent`는 HTML을 해석하지 않아 XSS가 원천 차단된다. 색 같은 값도 `el.style.background = c`로 속성에 직접 대입(문자열 보간 X).

---

## 이벤트 함정

### mouseup에서 prompt 띄우기

```js
// prompt를 mousedown이 아니라 mouseup에서 띄운다 —
// mousedown 중 prompt를 띄우면 mouseup을 못 받아 stage가 눌린 채로 꼬임
stage.on("mouseup", () => {
  if (drawKind === "text") { const txt = prompt("텍스트 내용", "메모"); ... }
});
```

`prompt()`는 블로킹 다이얼로그라 이벤트 루프를 멈춘다. `mousedown` 중에 띄우면 `mouseup`이 영원히 안 오고, stage는 버튼이 눌린 상태로 굳는다.

---

### `_skipClick` 가드로 드래그 후 클릭 차단

```js
// 텍스트 추가 직후 따라오는 click이 방금 만든 선택을 해제하지 않도록
_skipClick = true;
```

드래그가 끝나면 브라우저가 `click` 이벤트를 하나 더 발사한다. 텍스트 도구 드래그 후 생긴 객체가 즉시 선택 해제되는 버그의 원인이었다. `_skipClick` 플래그로 그 click 한 번을 무시한다.

---

### 격자 스냅은 미회전 객체에만

```js
// 격자 스냅은 미회전(θ≈0) 객체에만 — 회전 시 frame/world 축이 섞여 어긋남
if (gridOn && Math.abs(th) < 1e-6) { ... }
```

회전된 객체에 격자 스냅을 적용하면 world 축과 object 축이 달라 오히려 위치가 어긋난다.

---

## UX 설계

### 비전문가 첫 진입 — 빈 화면 안내와 튜토리얼

비전문가 도구에서 빈 화면은 가장 큰 진입 장벽이다. 파트장님이 처음 써볼 때 설명이 없으면 막히는 지점이 있었고, 그 지점이 그대로 개선 목록이 됐다.

- 빈 화면 빠른 안내: 아무것도 없을 때 "평면도를 불러오세요" 안내 텍스트 표시
- 툴바 도움말 모달: 각 버튼 설명을 ?로 접근 가능하게
- 축척 보정 튜토리얼: 평면도를 처음(그리고 새로) 열 때마다 자동 안내 — 보정 없이 쓰면 거리 측정값이 의미가 없어서 필수

실사용자가 한 번 써보면 인터페이스 검토 열 번보다 빠르게 막히는 지점이 드러난다.