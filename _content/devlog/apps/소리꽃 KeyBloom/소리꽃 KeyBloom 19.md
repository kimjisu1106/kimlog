---
layout: post
title: 소리꽃 KeyBloom 19
date: 2026-08-05
permalink: "devlog/apps/소리꽃 KeyBloom/소리꽃 KeyBloom 19"
categories:
  - apps
  - log
project: key-bloom
project_name: 소리꽃 KeyBloom
video_id:
app_url: https://keybloom.pages.dev
status: finished
description: 백로그에 쌓아둔 자잘한 것들을 처리한 날 — 출력 창을 관객 모니터에 자동으로 풀스크린으로 띄우고, 결정적으로 만든 파티클을 다시 굴리는 버튼을 달고, 색 선택기에 RGB 입력을 붙이고, PRO 라이브에선 광고와 하단을 비웠다.
tags:
  - TypeScript
  - Rust
  - CSS
---
## 오늘 한 일

- 출력 창 버튼을 누르면 관객 모니터(두 번째 모니터)에 바로 풀스크린으로 뜨게 함 — 모니터가 하나면 현재 화면에 풀스크린
- 한번 정해진 파티클 배열을 다시 굴리는 버튼([비주얼] 탭 🎲) — 결정적은 유지한 채 배열만 새로, 프로젝트에 저장
- 색 선택기에 RGB(0~255) 직접 입력칸 추가 — hex·스포이드·HSV 슬라이더와 서로 맞물려 갱신
- PRO는 광고를 아예 안 띄우고, PRO 라이브 모드에선 하단 시퀀스 영역을 크기 그대로 비움(하우스 광고까지 화면에서 사라짐)
- 도움말에 큐(파티클 전환 지점) 배치하는 방법 단계 추가

---

## 막힌 부분

### 출력 창을 어느 모니터에 띄울지 자동으로 고르기

버튼을 누르면 관객 화면에 풀스크린으로 떠야 하는데, 모니터가 여러 개일 때 어느 쪽에 띄울지가 문제였다. 무조건 현재 화면에 띄우면 연주자 조작 창을 덮어버린다.

Tauri에 붙은 모니터 목록(`availableMonitors`)과 주 모니터(`primaryMonitor`)를 물어, 주 모니터가 아닌 첫 화면을 골라 그 좌표에서 풀스크린으로 열게 했다. 못 찾으면(모니터 하나뿐) 그냥 현재 화면 풀스크린으로 폴백.

```ts
const { availableMonitors, primaryMonitor } = await import("@tauri-apps/api/window");
const monitors = await availableMonitors();
const primary = await primaryMonitor();
const target = monitors.find(
  (m) => !primary || m.position.x !== primary.position.x || m.position.y !== primary.position.y,
);
const pos = target ? { x: target.position.x, y: target.position.y } : null;
new WW("output", { url: "output.html", fullscreen: true, ...(pos ?? {}) });
```

- 해결: 주 모니터가 아닌 화면을 좌표로 찾아 그 자리에 풀스크린. 단일 모니터는 현재 화면 폴백

### 결정적으로 만든 파티클을 배열만 새로 굴리기

파티클을 결정적으로 바꾼 뒤로(18번 글) 같은 연주는 언제나 같은 배열이 된다. 두 화면을 맞추고 프로젝트를 재현하려고 그렇게 만들었는데, 정작 "지금 배열이 마음에 안 드니 다른 걸로" 할 방법이 없어졌다.

그래서 시드에 기준값(`seedBase`)을 하나 더 뒀다. 노트마다 쓰는 시드를 `seedBase + 순번`으로 계산하고, 버튼이 `seedBase`를 새 난수로 바꾼다. 기준값이 바뀌면 이후 모든 파티클이 다른 배열로 뜨고, 그 값을 프로젝트에 저장하니 다시 열어도 같은 배열이 재현된다.

```ts
let seedBase = 0;
function nextSeed(): number { return (seedBase + spawnSeq++) >>> 0; }

function rerollSeed(): void {
  seedBase = Math.floor(Math.random() * 0x100000000) >>> 0;
  particles.clear();
  if (outputWin) emitOut("kb:clear", {}); // 출력 창도 같이 비움
}
```

- 해결: 시드 기준값을 따로 둬 "다시 굴리기"와 "재현"을 둘 다 살림. 굴릴 때 메인·출력 창의 남은 파티클을 함께 비움

---

## 다음에 할 일

- 투명 배경 영상(알파) 내보내기 — Windows는 Ut Video·이미지 시퀀스, Mac은 ProRes
- Mac 네이티브 앱
- Tauri 자동 업데이터 붙이기(유료 배포 전, 배포하면 다시 받아야 갱신되므로)
- 첫 방문자용 샘플 데모 MIDI 자동 로드(자작곡 1곡 + 쇼팽 녹턴)
- 커스텀 파티클 모양 실루엣 재작업(투명 PNG 기준)
- 비-나선 파티클 가로 퍼짐(폭) 슬라이더 검토
- Creem 결제·라이선스 활성화 배선
- 실시간 연주 데모 영상 — 손+화면 동시로 실제 연주임을 보이기
