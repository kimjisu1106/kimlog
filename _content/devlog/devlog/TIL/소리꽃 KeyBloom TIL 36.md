---
layout: post
title: 소리꽃 KeyBloom TIL 36
date: 2026-08-05
permalink: "devlog/devlog/TIL/소리꽃 KeyBloom TIL 36"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 유료 데스크톱 앱 출시 전 배운 것들 — 창 배치·색 동기화·요소 숨김·시드 재굴림, 알파 영상 인코딩, 자동 업데이트와 라이선스, 렌더 블렌드와 상태 추적, 그리고 CSS 함정들.
tags:
  - TypeScript
  - CSS
  - Rust
---
하루치 자잘한 작업에서 나온 포인트를 한데 묶었다. 창 배치, 색 입력 동기화, 요소 숨김, 시드 재굴림.

---

## 붙은 모니터 중 관객 화면을 골라 창을 띄운다

출력 창(관객용)은 연주자 조작 창이 있는 화면 말고 다른 화면에 풀스크린으로 떠야 한다. Tauri(러스트 기반으로 웹 화면을 감싸 데스크톱 앱을 만드는 프레임워크)는 붙은 모니터 목록과 주 모니터를 물어볼 수 있다. 주 모니터가 아닌 첫 화면을 골라 그 좌표에서 열면 된다.

`availableMonitors`는 연결된 모든 모니터를, `primaryMonitor`는 그중 주 모니터를 돌려준다. 각 모니터는 `position`(가상 데스크톱 상의 좌표)을 들고 있어, 그 좌표로 창을 열면 원하는 화면에 뜬다.

```ts
const { availableMonitors, primaryMonitor } = await import("@tauri-apps/api/window");
const monitors = await availableMonitors();
const primary = await primaryMonitor();
// 주 모니터와 좌표가 다른 첫 화면 = 관객 모니터
const target = monitors.find(
  (m) => !primary || m.position.x !== primary.position.x || m.position.y !== primary.position.y,
);
const pos = target ? { x: target.position.x, y: target.position.y } : null;
new WebviewWindow("output", { url: "output.html", fullscreen: true, ...(pos ?? {}) });
```

모니터가 하나뿐이면 `target`이 없어 `pos`가 `null` → 현재 화면에 풀스크린으로 폴백한다.

> 위 `await import(...)`는 동적 임포트다. 모니터 API를 앱 시작 때가 아니라 출력 창을 여는 순간에만 불러온다. 웹 빌드(네이티브 아님)에선 이 코드에 닿지 않아 Tauri 모듈이 번들에 안 섞인다.

---

## 색은 hex·RGB·HSV가 같은 하나를 가리키게 맞문다

색 선택기는 안으로 HSV(색상·채도·명도)로 색을 들고 있는데, 사람은 hex(`#rrggbb`)나 RGB(0~255) 로 넣고 싶어 한다. 표현이 셋인데 가리키는 색은 하나다. 그래서 한쪽을 만지면 나머지를 그 색으로 다시 칠해야 어긋나지 않는다.

RGB 칸에 값을 넣으면 RGB→HSV로 바꿔 내부 상태를 갱신하고, 상태가 바뀔 때마다 hex 칸과 RGB 칸을 현재 색으로 다시 써 준다.

```ts
function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n))); // 0~255 밖 입력 방어
}
// RGB 입력 → 내부 HSV 갱신
function onRgb(r: number, g: number, b: number): void {
  const { h, s, v } = rgbToHsv(clampByte(r), clampByte(g), clampByte(b));
  setHsv(h, s, v); // 상태 변경 → paint()가 hex·RGB 칸을 다시 채움
}
// 색이 칠해질 때마다 두 입력을 현재 색으로 동기화
function paint(): void {
  hexInput.value = toHex(currentRgb());
  setRgbInputs(currentRgb()); // R·G·B 세 칸
}
```

포인트는 입력마다 제 갱신 경로를 두되, 최종 표시는 `paint()` 한 곳에서 모아 칠하는 것. 그래야 어느 칸으로 넣어도 나머지가 따라온다.

---

## 자리를 남기고 비우려면 display:none이 아니라 visibility:hidden

PRO 라이브 모드에선 화면 하단(시퀀스·광고)이 보이면 안 된다. `display:none`으로 지우면 그 자리가 접혀 위쪽 레이아웃이 딸려 올라간다. 크기는 그대로 두고 내용만 감추고 싶었다.

```css
/* 자리는 유지, 그리기만 생략 → 위쪽 캔버스 크기가 안 흔들림 */
body.live-mode #sequence { visibility: hidden; }
```

`visibility:hidden`은 요소가 여전히 자리를 차지한 채 안 보이기만 한다. 그래서 하단이 사라져도 위쪽 파티클 캔버스 높이가 그대로다. "지우기"와 "감추기"는 다르다.

---

## 결정적 시드에 기준값을 더하면 다시 굴리면서도 재현이 된다

파티클을 결정적으로 만든 뒤로(TIL 31) 같은 연주는 언제나 같은 배열이 된다. 두 화면 일치·프로젝트 재현엔 좋지만, "이 배열 말고 다른 걸로"가 안 된다.

그래서 시드에 기준값(`seedBase`) 을 하나 더 뒀다. 노트마다 쓰는 시드를 `seedBase + 순번`으로 계산하고, 버튼이 `seedBase`를 새 난수로 바꾼다. 기준값이 달라지면 이후 파티클이 통째로 다른 배열이 되고, 그 값을 프로젝트에 저장하니 다시 열어도 같은 배열이 재현된다.

```ts
let seedBase = 0;
let spawnSeq = 0;
function nextSeed(): number { return (seedBase + spawnSeq++) >>> 0; }

function rerollSeed(): void {
  seedBase = Math.floor(Math.random() * 0x100000000) >>> 0; // 기준값만 새로
  particles.clear();
  if (outputWin) emitOut("kb:clear", {}); // 출력 창의 남은 파티클도 비움
}
```

무작위를 다시 끌어들이는 게 아니라 결정적 수열의 시작점만 옮긴 것이라, 굴린 뒤에도 여전히 결정적이다. 재굴림 순간의 화면 잔여 파티클은 메인·출력 양쪽에서 함께 비워 어긋남을 막는다.

---

편집툴이 네이티브로 읽는 투명(알파) 영상은 사실상 ProRes(애플의 고품질 영상 코덱)뿐인데, 브라우저(WebView)엔 그 인코더가 없다. 그래서 프레임은 브라우저가 그리고, 인코딩은 네이티브 도구가 하도록 나눴다.

---

## PNG 프레임을 ffmpeg가 단일 영상으로 묶는다

원래 계획은 "raw RGBA(빨강·초록·파랑에 투명도를 더한 픽셀 데이터) 프레임을 ffmpeg(영상·오디오를 변환·인코딩하는 도구)의 stdin(표준 입력)으로 스트리밍"이었다. 근데 4K RGBA는 프레임당 33MB라, 그걸 앱→네이티브로 초당 수십 장 흘려보내는 건 무겁다.

대신, 우리는 이미 PNG 시퀀스를 폴더에 쓰고 있다(코덱 없는 폴백 경로). 그러니 그 PNG를 ffmpeg가 다시 읽어 묶으면 된다. 스트리밍이 필요 없다.

```ts
// ffmpeg가 frame_000001.png … 를 순서대로 읽어 무손실 알파 Ut Video로
const args = ["-y", "-framerate", "60", "-i", `${dir}/frame_%06d.png`];
if (hasAudio) args.push("-i", `${dir}/audio.wav`);
args.push("-c:v", "utvideo", "-pix_fmt", "gbrap"); // gbrap = planar RGBA, 알파 보존
args.push(outPath);
```

`gbrap`은 ffmpeg가 알파를 담는 planar RGBA 픽셀 포맷이다. `utvideo`(Ut Video)는 무손실이라 화질 손실이 없다. 묶고 나면 중간 PNG는 지운다.

> 인코딩엔 코덱 설치가 필요 없다(ffmpeg에 utvideo 인코더가 내장). 단 결과 `.avi`를 편집툴에서 열려면 시청 PC에 Ut Video 코덱을 깔아야 한다 — 그건 앱 안에서 다운로드 버튼으로 안내했다.

---

## 번들한 ffmpeg를 sidecar로 부른다

ffmpeg는 앱과 함께 배포하는 별도 실행파일(sidecar)로 넣는다. Tauri는 sidecar 이름에 타깃 트리플(빌드 대상 플랫폼을 나타내는 이름)을 붙이길 요구한다.

```text
src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe   ← 이 이름 규칙
tauri.conf.json:  "externalBin": ["binaries/ffmpeg"]
```

실행 권한은 capability(Tauri에서 기능별 권한을 여는 설정)로 스코프를 건다 — 아무 프로그램이나 못 돌리고 이 sidecar만.

```json
{ "identifier": "shell:allow-spawn", "allow": [{ "name": "binaries/ffmpeg", "sidecar": true, "args": true }] }
```

프론트에선 `Command.sidecar("binaries/ffmpeg", args).spawn()`으로 띄우고, ffmpeg가 stderr(표준 에러 출력)로 뱉는 `frame=  N`을 파싱해 진행률을 만든다.

> 라이선스 주의 — 유료 제품이라 GPL이 아닌 LGPL 빌드(BtbN의 `win64-lgpl`)를 썼다. Ut Video 인코더는 ffmpeg 네이티브라 x264 같은 GPL 컴포넌트가 필요 없다. 배포 시 LGPL 고지문 동봉.

---

## PCM을 직접 WAV로 만들어 붙인다

이미지 시퀀스엔 오디오가 없으니 따로 준다. 우리는 오디오를 Float32 PCM(압축하지 않은 원본 오디오 샘플)으로 들고 있어서, 표준 WAV(RIFF) 헤더 44바이트만 앞에 붙이면 파일이 된다.

```ts
// 16-bit PCM stereo WAV — 헤더 44B + interleaved LR
const dv = new DataView(buf);
ascii(0, "RIFF"); dv.setUint32(4, 36 + dataSize, true); ascii(8, "WAVE");
ascii(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); // PCM
dv.setUint16(22, 2, true); dv.setUint32(24, rate, true); // 2ch, 샘플레이트
// … data 청크에 clamp(-1..1)*0x7fff로 int16 기록
```

라이브러리 없이 헤더 규격만 알면 되는, 의외로 간단한 포맷이다.

---

네이티브 앱은 웹과 달리 "새로고침하면 최신"이 아니다. 배포·업데이트·저장을 앱이 직접 챙겨야 한다. 유료화 전에 그 뼈대를 세웠다.

---

## 자동 업데이트 — 서명으로 위조를 막는다

앱이 스스로 새 버전을 받아 설치하려면, 받은 파일이 진짜 내가 낸 것인지 확인해야 한다. 아무 파일이나 받아 설치하면 위조 업데이트에 뚫린다. 그래서 키쌍으로 서명한다.

- 개인키(`.key`) — 내가 빌드할 때 업데이트 파일에 서명(도장). 유출·분실 금지
- 공개키(`.pub`) — 앱 안에 심어둠. 받은 업데이트가 그 개인키로 서명됐는지 검증

```jsonc
// tauri.conf.json — 앱에 공개키를 심고, 확인할 매니페스트 위치를 준다
"plugins": { "updater": {
  "endpoints": ["https://github.com/…/releases/latest/download/latest.json"],
  "pubkey": "dW50cnVzdGVk…" // .pub 내용(공개라 안전)
}}
```

앱은 실행 때 `latest.json`을 보고, 새 버전이면 다운로드 → 공개키로 서명 검증 → 설치 → 재시작. 검증에 실패한(다른 키로 서명된) 건 거부한다.

> 중요 — 개인키를 잃으면 이후 업데이트를 기존 사용자가 못 받는다(서명 불일치). 그래서 첫 릴리스 전에 키를 확정하고 안전하게 백업한다.

---

## 라이선스 활성화 — 시크릿은 앱에 두지 않는다

결제사의 라이선스 검증 API는 시크릿 키가 필요하다. 이걸 앱에 넣으면 누구나 열어 볼 수 있어 검증을 위조할 수 있다. 그래서 시크릿은 클라우드(프록시 서버) 에 두고, 앱은 그 서버에만 묻는다(설계 배경은 TIL 30).

이번엔 그 흐름을 실제로 구현했다. 오프라인 네이티브 앱이라 매번 온라인 검증을 강요할 수 없어서, 낙관적 언락 + 유예를 뒀다.

```ts
// 저장된 라이선스가 있으면 일단 PRO로 열고(오프라인도 바로 씀), 뒤에서 재검증
let licensed = read() !== null;
async function revalidate() {
  try {
    const res = await post("/validate", { key, instanceId }); // 프록시 경유
    if (res.status === "active") touch();            // 유예 갱신
    else clearLicense();                             // 만료·해제 → 즉시 잠금
  } catch {
    if (Date.now() - lastValidated > GRACE_MS) clearLicense(); // 무네트워크는 7일 유예
  }
}
```

`activate`는 기기당 한 번(인스턴스 생성), `validate`는 실행마다, `deactivate`는 기기에서 해제. "정직한 사용자 유지"가 목표라 완전 DRM(불법 복제를 막는 디지털 저작권 보호 기술)엔 과투자하지 않는다.

---

## 네이티브 프로젝트 저장은 경로 기반으로

불러온 프로젝트를 저장할 때마다 "다른 이름으로 저장" 창이 떴다. 원인은 네이티브 웹뷰(WebView2)의 File System Access API가 불안정해, 파일 핸들(열린 파일에 접근하는 창구 역할의 객체) 방식이 실패하고 다운로드(대화상자)로 떨어져서였다.

웹은 파일 경로를 못 다루지만(보안), 네이티브는 다룰 수 있다. 그러니 네이티브는 FSA 대신 경로를 기억하면 된다.

```ts
// 네이티브: 다이얼로그로 경로를 얻고 기억 → 저장은 그 경로에 픽커 없이 덮어쓰기
if (IS_NATIVE) {
  if (!nativeProjectPath) nativeProjectPath = await save({ … }); // 첫 저장만 물음
  await invoke("write_file", { path: nativeProjectPath, dataB64: … });
}
```

불러올 땐 Tauri 다이얼로그로 경로를 받아 Rust `read_file(path)`로 읽고 그 경로를 기억한다. 이후 저장은 조용히 덮어쓴다 — 내보내기 저장과 같은 방식.

---

## 발광은 배경 밝기에 따라 블렌드가 달라야 한다

건반 발광은 가산 블렌드(`lighter`) 로 그린다. 빛을 배경에 더하는 방식이라, 어두운 배경에선 빛이 겹겹이 밝아져 예쁘다.

그런데 밝은 배경 이미지를 깔면 발광이 하얗게 날아간다. 가산은 "흰색 + 색 = 흰색"이라 밝은 바탕 위에선 더할 게 없어 색을 잃는다.

```ts
// 배경 이미지가 실제로 깔릴 때만 일반 블렌드로 — 밝은 배경서도 색 유지
ctx.globalCompositeOperation = glowOverImage ? "source-over" : "lighter";
```

배경이 없을 때(기본=검정)는 가산 그대로라 원래 룩은 안 변한다. 배경 이미지가 있을 때만 `source-over`로 바꿔 색을 살린다. 완벽한 자동은 아니고(어두운 배경 이미지도 가산이 나을 수 있음), "배경 이미지 유무"를 기준으로 한 실용적 타협이다.

---

## 하드코딩된 기본값은 상태로 추적한다

큐를 재정렬하면 번호가 위치대로 다시 매겨지고, 시퀀서 구간들도 새 번호를 따라간다. 그런데 첫 구간(첫 큐포인트 이전)만 안 바뀌었다. 코드가 그 구간을 항상 "큐 1"로 박아 뒀기 때문이다.

```ts
// ❌ 기본 구간이 항상 1 — 재정렬로 큐 1이 옮겨가도 안 따라감
const segs = [{ start: 0, id: 1 }];
```

기본값이라도 재정렬로 바뀔 수 있으면 상태로 들고 있어야 한다. `defaultCueId`를 두고 재정렬·삭제·되돌리기·저장/복원·내보내기에 전부 전파했다.

```ts
// ✅ 상태로 추적 — 재정렬 시 다른 큐포인트처럼 remap
let defaultCueId = 1;
defaultCueId = remap.get(defaultCueId) ?? defaultCueId; // 연출은 그대로, 번호만 따라감
```

교훈은 넓다 — 리터럴이 "초기값"인지 "상태로 추적해야 할 값"인지 구분해야 한다. 다른 곳도 감사해 보니 큐는 전부 id로 조회(find/Map)해 배열 인덱스 가정이 없었고, 이 첫 구간 하나만 진짜 문제였다.

---

## 멈춰 보이는 진행은 살아있음을 보여준다

영상 저장 중 진행바가 특정 지점(오디오 렌더, ffmpeg 팩, 오디오 엔진 워밍)에서 한참 멈춰 있으면 "얼었나?" 싶다. 그 구간들은 진행률을 잘게 못 쪼개는 통짜 작업이라 % 가 안 움직인다.

두 가지로 해결했다. 하나는 % 와 무관하게 항상 도는 shimmer — 바에 빛줄기가 계속 지나가 살아있음을 보인다.

```css
.loading-fill::after {
  content: "";
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  animation: kb-shimmer 1.2s ease-in-out infinite; /* 멈춘 구간에도 움직임 */
}
```

다른 하나는 단계 문구 — "오디오 렌더링 중…", "영상 파일로 묶는 중…", "오디오 엔진 준비 중…"처럼 지금 뭘 하는지 알린다. % 가 멈춰도 "무엇 때문에" 기다리는지 알면 얼음으로 안 보인다.

---

## display:flex가 [hidden]을 이긴다

`[hidden]` 속성만 주면 요소가 숨는다(브라우저 기본 스타일 `[hidden]{display:none}`). 그런데 그 요소에 레이아웃용으로 `display:flex`를 명시하면 안 숨는다.

```css
.credits-box { display: flex; } /* 이게 [hidden]{display:none}을 덮어씀 → 안 숨음 */
```

브라우저 기본 스타일은 우선순위가 낮아, 앞서 지정한 `display:flex`가 이긴다. 그래서 명시적으로 다시 숨겨야 한다.

```css
.credits-box[hidden] { display: none; } /* [hidden]일 땐 flex 취소 */
```

`[hidden]`으로 토글하는 요소에 `display`를 줄 거면 이 한 줄을 잊지 말 것.

---

## 반복되는 조건부 UI는 헬퍼로 묶는다

"무료면 👑 PRO 배지"를 여섯 군데(배경·커스텀·출력창·4K·알파 2종)에서 각각 `(!isPro() ? " 👑 PRO" : "")`로 반복하고 있었다. 그러다 한 곳(4K)만 하드코딩돼 PRO인데도 배지가 떴다.

같은 판단이 여러 곳에 흩어지면 한 곳이 어긋난다. 하나로 묶으면 일괄로 일관된다.

```ts
const proBadge = (): string => (isPro() ? "" : " 👑 PRO");
// 모든 라벨: section("배경 이미지" + proBadge()), "2160p (4K)" + proBadge() …
```

이제 배지 규칙을 바꿔도 한 곳만 고치면 되고, "여기만 빠뜨림"이 안 생긴다.

---

## 죽은 코드는 참조를 따라가며 지운다

WebM 내보내기를 없애자 실시간 녹화 관련 코드(`CanvasRecorder`, `finishExport`, `exporting`·`bgTransparent` 플래그 등)가 아무도 안 부르는 죽은 코드가 됐다. 지울 땐 무작정 지우지 않고 참조를 먼저 훑는다.

- 각 심볼을 grep(파일에서 문자열을 찾는 명령)해 모든 사용처를 확인 → 정말 죽었는지(실행 경로가 닿지 않는지) 판단
- 지운 뒤 남는 "쓰기만 하고 안 읽는" 변수는 컴파일러의 미사용 검출이 잡아준다(`declared but never read`)
- 지우고 나서 빌드가 통과 = 안전. 이번엔 -81줄

동작을 안 바꾸면서 코드만 줄이는 건, 지우는 것 자체보다 "정말 안 쓰는지"를 확인하는 게 일이다.

---

## 리터럴이 버그인지 아닌지 가려낸다

첫 구간 큐가 "항상 1"로 박혀 버그였던 일(TIL 39) 뒤로, 비슷한 하드코딩이 더 있나 코드 전체를 감사했다. 리터럴 `1`이나 `arr[0]`이 다 문제인 건 아니다. 세 가지로 갈린다.

- 초기값 — 시작 상태와 일치하고 이후 이벤트가 갱신함(예: `let selectedCueId = 1`). 안전
- 방어 폴백 — 조회 실패 시 대비(예: `find(...) ?? cues[0]`, `naturalWidth || 1`). 안전
- 상태로 추적해야 할 값 — 재정렬·삭제 등으로 바뀌는데 리터럴로 박힘. 이게 버그(첫 구간 큐가 여기 해당)

감사해 보니 큐는 전부 id로 조회(find/Map)라 "배열 인덱스가 순서를 가정"하는 취약점이 없었고, 진짜 버그는 그 하나뿐이었다. 리터럴을 볼 때 "이건 셋 중 뭔가"를 묻는 습관이 남았다.

---

## 요약

- Tauri `availableMonitors`/`primaryMonitor`로 주 모니터가 아닌 화면을 골라 그 좌표에 창을 띄운다. 단일 모니터는 현재 화면 폴백.
- hex·RGB·HSV는 한 색의 세 표현 — 입력마다 갱신 경로를 두되 표시는 한 곳(`paint()`)에서 모아 칠해 동기화한다.
- 자리를 남기고 감추려면 `display:none`이 아니라 `visibility:hidden`.
- 결정적 시드에 기준값을 더하면 시작점만 옮겨 "다시 굴리기"와 "저장 재현"을 둘 다 살린다.
- 브라우저에 없는 알파 인코딩은 프레임은 WebView가 그리고 인코딩은 네이티브 ffmpeg가 하도록 나눈다.
- 무거운 stdin 스트리밍 대신 이미 쓰는 PNG 시퀀스를 ffmpeg가 다시 읽어 단일 Ut Video(`utvideo`/`gbrap`)로 묶는다.
- ffmpeg는 타깃-트리플 이름의 sidecar로 번들하고 capability로 스코프를 건다(LGPL 빌드).
- 오디오는 Float32 PCM에 RIFF 헤더만 붙여 WAV로.
- 자동 업데이트는 개인키 서명 / 공개키 검증으로 위조를 막는다. 개인키 분실 = 사용자 업데이트 끊김이라 백업 필수.
- 라이선스 검증 시크릿은 앱에 두지 말고 클라우드 프록시에. 오프라인 앱은 낙관적 언락 + 유예로 설계.
- 네이티브 저장은 웹의 FSA 대신 경로를 기억해 픽커 없이 덮어쓴다(WebView2 FSA는 불안정).
- 가산 발광(`lighter`)은 밝은 배경 위에서 흰색으로 날아간다 → 배경 이미지가 있을 때만 `source-over`로.
- 재정렬로 바뀔 수 있는 기본값은 리터럴 대신 상태(`defaultCueId`)로 추적해 관련 경로에 다 전파한다.
- 진행률이 멈추는 통짜 구간엔 상시 shimmer + 단계 문구로 "멈춤 아님"을 보인다.
- `[hidden]` 토글 요소에 `display`를 주면 `[hidden]{display:none}`을 덮으니 `[hidden]`에 다시 `display:none`.
- 흩어진 조건부 UI(PRO 배지)는 헬퍼 하나로 묶어 한 곳만 어긋나는 걸 막는다.
- 죽은 코드는 참조 확인 + 컴파일러 미사용 검출 + 빌드 통과로 안전하게 지운다.
- 리터럴은 초기값 / 방어폴백 / 상태추적-대상 중 뭔지 구분 — 셋째만 버그다.
