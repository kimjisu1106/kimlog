---
layout: post
title: 소리꽃 KeyBloom TIL 8
date: 2026-07-05
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - TypeScript
  - WebAPI
  - CSS
---
소리꽃에 큐(Cue)와 시퀀서를 붙이면서 나온 기법들을 한데 모았다. 큐 여러 개를 오가고 재정렬해도 상태가 안 깨지게 하는 법, 반복되는 우클릭 메뉴를 하나로 뽑는 법, 캔버스로 타임라인을 그리는 좌표계와 줌, 그리고 입력·단축키·데이터에 거는 가드까지.

---

## 큐 시스템 내부 — 여러 상태를 오가도 안 깨지게

큐 = 비주얼 파라미터 전체를 담은 스냅샷 1~6번. 큐를 오가고 순서를 바꿔도 화면·파티클·트랙이 어긋나지 않게 만드는 게 일이었다.

### 큐별 아틀라스 — 파티클이 자기 큐를 기억한다

파티클 색·모양은 매번 그리기 비싸서 미리 스프라이트로 구워두고 `drawImage`로 찍는다(아틀라스). 그런데 아틀라스가 하나뿐이면, 큐를 바꾸는 순간 이미 떠 있던 파티클까지 새 큐 색으로 바뀐다.

해결은 파티클이 태어난 `cueId`를 들고 다니게 하고, 렌더러가 `cueId`별 아틀라스를 캐시하는 것. 각 파티클은 자기 큐의 아틀라스로 그린다.

```ts
interface Particle { /* ...위치·수명... */ cueId: number; }

class ParticleRenderer {
  private atlases = new Map<number, Atlas>(); // cueId → 미리 구운 스프라이트

  draw(ctx, view, particles, getParams: (cueId: number) => EffectParams) {
    for (const p of particles) {
      const atlas = this.cueAtlas(p.cueId, getParams(p.cueId)); // 자기 큐로
      ctx.drawImage(atlas.sprites[p.shapeIndex][idx], /* ... */);
    }
  }
}
```

큐를 편집하면 그 큐의 아틀라스만 다시 굽고(디바운스), 다른 큐 파티클은 건드리지 않는다. "지금 어느 큐냐"가 아니라 "무엇으로 태어났느냐"로 색을 정한 게 핵심이다.

### 큐를 바꾸면 컨트롤 값도 따라오게 — get/set + sync

큐 1을 편집하다 큐 2로 넘어가면 우측 슬라이더·색상칸이 전부 큐 2 값으로 바뀌어야 한다. 컨트롤마다 수동으로 값을 다시 넣는 건 번거롭고 빠뜨리기 쉽다.

컨트롤을 만들 때 get/set과 함께 "현재 값을 다시 읽어 화면에 반영하는 sync 함수"를 등록해두고, 큐 전환 때 모든 sync를 한 번에 부른다.

```ts
const syncers: Array<() => void> = [];

function rangeRow(label, min, max, step, get, set) {
  const input = document.createElement("input");
  input.addEventListener("input", () => set(Number(input.value)));
  const sync = () => (input.value = String(get())); // 현재값 → 화면
  syncers.push(sync);
  return row;
}

let cur = params;                 // get/set은 이 "현재 큐 params"를 가리킴
function setParams(p: EffectParams) {
  cur = p;                        // 포인터만 갈아끼우고
  syncers.forEach((s) => s());   // 전부 재동기화
}
```

get/set이 `cur`를 가리키니, `cur`만 바꾸고 sync를 돌리면 UI 전체가 새 큐로 갈아탄다.

### 재정렬하면 번호만 바뀌는 게 아니다 — 참조 remap

큐를 드래그해 순서를 바꾸면 번호를 위치대로 1..N으로 다시 매긴다. 그런데 비주얼 트랙의 큐포인트, 화면에 떠 있는 파티클, 선택 중인 큐가 전부 옛 번호를 가리키고 있어서 그대로 두면 깨진다. 옛→새 매핑을 만들어 한꺼번에 갈아준다.

```ts
onCueReorder: (orderedIds) => {
  const remap = new Map<number, number>();          // 옛 id → 새 id(위치+1)
  const next = orderedIds.map((oldId, i) => {
    remap.set(oldId, i + 1);
    return cueById(oldId)!;
  });
  next.forEach((c, i) => (c.id = i + 1));
  cues = next;

  // id로 참조하던 모든 곳을 함께 갱신
  cuePoints = cuePoints.map((p) => ({ ...p, cueId: remap.get(p.cueId) ?? p.cueId }));
  for (const part of particles.all) part.cueId = remap.get(part.cueId) ?? part.cueId;
  selectedCueId = remap.get(selectedCueId) ?? cues[0].id;
  renderer.reset(); // cueId→params 매핑이 바뀌었으니 아틀라스 캐시 폐기
}
```

"id를 바꾸면 그 id로 참조하던 모든 곳을 같이 바꿔야 한다"가 요지. 캐시(아틀라스)도 참조라는 걸 놓치면 색이 한 박자 어긋난다.

---

## 컨텍스트 메뉴를 하나로

큐 버튼 우클릭 메뉴와 시퀀서 마커 우클릭 메뉴 — 거의 같은 코드가 두 벌 생겼다. DOM 만들고, 바깥 클릭에 닫고, 커서 위치에 띄우고. 하나로 뽑았다.

### createContextMenu — 정적/동적/헤더/입력을 한 헬퍼로

아이템을 배열로 주면 정적, 함수로 주면 열 때마다 재구성한다(상황에 따라 목록이 바뀌는 메뉴용). 항목은 버튼·헤더·입력 세 종류.

```ts
type MenuItem =
  | { label: string; onSelect: () => void; enabled?: () => boolean }
  | { header: string }
  | { input: { value: string; format?: (raw: string) => string; onSubmit: (v: string) => void } };

function createContextMenu(items: MenuItem[] | (() => MenuItem[]), opts?: { above?: boolean }) {
  const el = document.createElement("div");
  el.className = opts?.above ? "ctx-menu above" : "ctx-menu";
  document.body.append(el); // 패널/캔버스에 안 잘리게 body에 붙임
  window.addEventListener("pointerdown", (e) => {
    if (!el.hidden && !el.contains(e.target as Node)) el.hidden = true; // 바깥 클릭 → 닫기
  });
  function render() { /* items()를 평가해 버튼/헤더/입력 생성 */ }
  return {
    open(x, y) { render(); el.style.left = `${x}px`; el.style.top = `${y}px`; el.hidden = false; },
    close() { el.hidden = true; },
  };
}
```

동적 팩토리 덕에 시퀀서 마커 메뉴가 "현재 존재하는 큐 목록"을 열 때마다 새로 그린다. 지금 가리키는 큐엔 `(현재)`를 붙이고 비활성으로.

### 위치 입력을 실시간으로 mm:ss:cs 마스킹

마우스로 세밀하게 못 맞추니 시간을 타이핑하게 했다. 숫자만 치면 2자리씩 콜론으로 끊어 보여준다. 표시 포맷과 파싱을 분리했다.

```ts
// 입력 중 실시간 마스킹 — 숫자만 남겨 2자리씩 콜론
function maskClock(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 6);
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 2) parts.push(d.slice(i, i + 2));
  return parts.join(":"); // "012340" → "01:23:40"
}

// 적용 시 초로 환산
function parseClock(s: string): number | null {
  const n = s.split(":").map(Number);
  if (n.length === 1) return n[0];                       // 초
  if (n.length === 2) return n[0] * 60 + n[1];           // mm:ss
  if (n.length === 3) return n[0] * 60 + n[1] + n[2] / 100; // mm:ss:cs
  return null;
}
```

입력 이벤트마다 `inp.value = maskClock(inp.value)`로 다시 칠하고, Enter에서 `parseClock`으로 초를 뽑아 적용한다. `format` 콜백을 메뉴 헬퍼에 넘겨, UI 코드와 도메인(시간) 규칙을 분리했다.

### 브라우저 기본 우클릭은 통째로 끈다

커스텀 우클릭 메뉴를 쓰는 앱이라 브라우저 기본 메뉴가 뜰 일이 없다. 전역에서 한 번에 막고 각 커스텀 메뉴만 살린다.

```ts
window.addEventListener("contextmenu", (e) => e.preventDefault());
```

---

## 캔버스로 시퀀서 그리기

트랙·룰러·파형·재생선을 캔버스 하나에 직접 그렸다.

### 시간 ↔ 픽셀, 그리고 playhead 기준 줌

모든 좌표는 "왼쪽 가장자리 시각(`scrollTime`)"과 "초당 픽셀(`pxPerSec`)" 둘로 계산한다.

```ts
const xOf = (t: number) => LABEL_W + (t - scrollTime) * pxPerSec;
const timeOf = (x: number) => scrollTime + (x - LABEL_W) / pxPerSec;

function zoomBy(f: number) {
  const anchorT = curTime;                 // playhead를 기준점으로
  const anchorX = xOf(anchorT);
  pxPerSec = clamp(pxPerSec * f, 4, 400);
  scrollTime = anchorT - (anchorX - LABEL_W) / pxPerSec; // 그 지점의 화면 위치 유지
}
```

줌을 화면 중앙이 아니라 재생 위치를 고정한 채 확대/축소되게 앵커를 잡았다.

### 오디오 파형 — 디코드해서 버킷 피크로

파일을 디코드해 샘플에서 버킷별 최대 진폭만 뽑아두고(수천 개), 그걸 세로선으로 그린다. 전부 로컬 처리.

```ts
const buf = await ctx.decodeAudioData(await file.arrayBuffer());
const ch = buf.getChannelData(0);
const per = Math.floor(ch.length / BUCKETS);
for (let i = 0; i < BUCKETS; i++) {
  let max = 0;
  for (let j = i * per; j < (i + 1) * per; j++) max = Math.max(max, Math.abs(ch[j]));
  peaks[i] = max; // 0~1
}
```

### 시각 표기가 한 줄에서 섞이던 버그

눈금 라벨이 `0:05.0`인데 옆은 `0:23`이었다. 소수 자리를 "초 값이 10 미만이면 붙인다"로 정했던 게 원인. 값이 아니라 눈금 간격(줌)으로 정해야 한 줄 안에서 통일된다.

```ts
// ❌ 초 값 기준 — 같은 줄에 5초(소수)와 23초(정수)가 섞인다
r < 10 ? r.toFixed(1) : r.toFixed(0);

// ✅ 눈금 간격 기준 — 한 눈금 줄은 항상 같은 형식
const dec = step >= 1 ? 0 : step === 0.25 ? 2 : 1;
fmt(t, dec);
```

### 드래그 중 임시 head + 알맞은 커서

마커를 끌 때 지금 몇 초인지 안 보였다. 드래그 중에만 전체 높이 가이드선 + 시각 칩을 그려준다. 그리고 마커는 두 구간의 경계라, 커서는 손(`grab`)보다 열 경계 조절용 `col-resize`가 맞다.

```ts
if (cueDrag !== null) {
  const dp = cuePoints.find((p) => p.id === cueDrag)!;
  const gx = xOf(dp.time);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  drawLine(gx, RULER_H, gx, cssH);   // 전체 높이 가이드
  drawChip(gx, fmtClock(dp.time));   // "01:23:40" 칩
}
canvas.style.cursor = overMarker ? "col-resize" : "default";
```

---

## 상호작용과 클린코드

### HTML5 드래그앤드롭으로 큐 순서 바꾸기

버튼에 `draggable`을 주고, 컨테이너에서 드롭 위치를 계산한다. 각 버튼 중점과 커서 x를 비교해 몇 번째 앞에 꽂을지 정한다.

```ts
b.draggable = true;
b.addEventListener("dragstart", () => (draggedId = cue.id));

cueBar.addEventListener("dragover", (e) => e.preventDefault()); // 이게 있어야 drop이 열림
cueBar.addEventListener("drop", (e) => {
  const idx = dropIndexAt(e.clientX);   // 커서 x → 삽입 인덱스
  const order = cueOrder.slice();
  const from = order.indexOf(draggedId);
  order.splice(from, 1);
  order.splice(from < idx ? idx - 1 : idx, 0, draggedId); // 앞에서 뺐으면 한 칸 보정
  onCueReorder(order);
});
```

포인트 둘 — `dragover`에서 `preventDefault`를 해야 drop이 허용되고, 끌던 항목을 뺀 뒤엔 목표 인덱스가 한 칸 당겨진다.

### 단축키엔 포커스 가드

스페이스바로 재생/일시정지. 그런데 큐 이름 입력칸에서 스페이스를 누르면 띄어쓰기여야지 재생이 토글돼선 안 된다.

```ts
window.addEventListener("keydown", (e) => {
  const el = e.target as HTMLElement;
  if (el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return; // 입력 중이면 무시
  if (e.code === "Space") { e.preventDefault(); togglePlay(); }
});
```

### 없는 걸 만질 수 있으면 버그가 난다 — 활성화 가드

MIDI를 안 불러왔는데도 비주얼 트랙에 큐를 찍을 수 있었고, 그 상태에서 위치를 입력하니 마커가 사라졌다(곡 길이가 0이라 0으로 클램프). 애초에 못 만지게 막는 게 답이다.

```ts
canvas.addEventListener("pointerdown", (e) => {
  if (duration <= 0) return; // 곡(MIDI) 없으면 무반응
  // ...
});
penBtn.disabled = duration <= 0; // 펜 버튼도 비활성
```

### 클린코드 — 중복 제거와 변수화

- 완전히 같은 두 함수(`seekTo`, `resetPlayback`)를 하나로 합쳤다. 본문이 한 줄도 안 달랐다.
- 파일 안에서만 쓰는 `export`를 떼어 표면적을 줄였다.
- 반복되는 색·폰트 크기를 CSS 변수로 뺐다.

```css
:root {
  --ctl-bg: #24242a; /* 버튼·인풋 배경 */
  --hover-bg: #2a2a30;
  --fs-sm: 12px;
  --fs-base: 13px;
}
.cue-tab { background: var(--ctl-bg); font-size: var(--fs-sm); }
```

단, 캔버스에 JS로 칠하는 색은 CSS 변수를 못 쓰니 예외로 남겼다.

---

## 요약

- 큐별로 아틀라스를 캐시하고 파티클이 자기 `cueId`를 들면, 큐가 바뀌어도 옛 파티클 색이 유지된다. id를 바꾸는 재정렬에선 큐포인트·파티클·캐시까지 옛→새로 함께 remap.
- 컨트롤은 get/set + sync 배열로 묶으면 큐 전환 시 한 번에 재동기화된다.
- 반복되는 우클릭 메뉴는 정적/동적·헤더·입력을 받는 하나의 헬퍼로. 입력은 `format` 콜백으로 마스킹해 도메인 규칙을 UI에서 분리.
- 캔버스 타임라인은 `(scrollTime, pxPerSec)` 하나로 좌표를 풀고, 줌은 playhead 앵커로. 표기 소수 자리는 값이 아니라 눈금 간격으로 정해야 통일된다.
- 단축키엔 입력 포커스 가드, 데이터 없을 땐 상호작용 가드. 없는 걸 만질 수 있으면 버그가 난다.
