---
layout: post
title: 소리꽃 KeyBloom TIL 42
date: 2026-08-13
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 이미 있는 이벤트 경로에 라이브 서스테인·큐 키를 얹는 법, 네이티브 출시본에서만 브라우저 단축키를 막는 법, 그리고 코드가 아니라 배포 브랜치·릴리스 API로 "출시본만 웹에" 와 changelog를 만드는 법.
tags:
  - TypeScript
  - Rust
---
출시 이후를 다듬으며 배운 것 — 라이브 연주 키, 네이티브 단축키 잠금, 그리고 코드 아닌 배포·릴리스 운영.

---

## 라이브 연주 키

### 이미 있는 경로에 입력만 얹는다

라이브에 서스테인과 큐 넘기기를 넣을 때, 오디오·큐 로직을 새로 만들 필요가 없었다. 서스테인은 MIDI 페달(CC64)이 쓰던 `onSustain` 경로가 이미 있어서, 왼쪽 Shift를 거기에 연결만 하면 됐다. 큐도 기존 `activateCue`를 순환 호출하는 얇은 함수 하나면 됐다.

```ts
// 스페이스 = 다음 큐 순환 (라이브). 파일 모드 스페이스는 재생/정지 그대로.
function advanceCue(): void {
  if (cues.length < 2) return;
  const i = cues.findIndex((c) => c.id === selectedCueId);
  activateCue(cues[(i + 1) % cues.length].id);
}

// 왼쪽 Shift = 서스테인 — MIDI CC64와 같은 onSustain 경로 재사용(오디오 코드 무수정)
// keydown: h.onSustain(true) / keyup: h.onSustain(false)  (code === "ShiftLeft")
```

교훈 — 새 기능이라고 새 배관을 깔 게 아니라, 같은 결과를 내는 이벤트 경로가 이미 있는지부터 본다. 여기선 컴퓨터 키보드 입력만 그 경로에 붙였다.

---

## 네이티브 단축키 잠금

### 출시본에서만 브라우저 단축키를 막는다 — denylist

네이티브 앱은 웹뷰로 돌아서 F5(새로고침)·F12(개발자도구)·Ctrl+P(인쇄) 같은 브라우저 단축키가 그대로 먹는다. 출시본에선 이게 이상하다. 그래서 우리가 안 만든 키를 막았다.

```ts
function isBlockedNativeShortcut(e: KeyboardEvent): boolean {
  const k = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  if (/^f([1-9]|1[0-2])$/.test(k)) return true; // F1~F12
  if (ctrl && e.shiftKey && ["i", "j", "c", "r"].includes(k)) return true; // 개발자도구·강력 새로고침
  if (ctrl && !e.shiftKey && ["r", "p", "f", "g", "u", "-", "=", "0"].includes(k)) return true; // 새로고침·인쇄·찾기·소스·줌
  return false;
}
// keydown 맨 앞에서:
// if (IS_NATIVE && !import.meta.env.DEV && isBlockedNativeShortcut(e)) { e.preventDefault(); return; }
```

두 가지가 핵심 — (1) denylist가 whitelist보다 안전하다. "우리 것만 허용"으로 짜면 Ctrl+C/V/A 같은 입력창 필수키까지 막기 쉽다. "브라우저 것만 차단"이면 그 위험이 없다. (2) 조건을 `IS_NATIVE && !DEV`로 걸어 웹은 브라우저 기본키를 그대로(사용자가 기대함), 개발 빌드는 F12·새로고침을 살려(개발용) 둔다.

---

## 자동 업데이트 진행 표시

### 업데이터 진행 이벤트 + 오버레이 재사용

자동 업데이트에서 [설치]를 눌러도 다운로드(~60MB)·설치가 아무 표시 없이 진행돼 "멈춘 것처럼" 보였다. Tauri 업데이터의 `downloadAndInstall`은 진행 콜백을 받는데, 그 이벤트로 진행률을 얻어 렌더/저장에 쓰던 공용 오버레이를 그대로 재사용했다.

```ts
await update.downloadAndInstall((e) => {
  switch (e.event) {
    case "Started":  total = e.data.contentLength ?? 0; overlay.set(0, "update-download"); break;
    case "Progress": downloaded += e.data.chunkLength;  overlay.set(downloaded / total, "update-download"); break;
    case "Finished": overlay.busy("설치 중… 곧 재시작합니다"); break;
  }
});
```

두 가지 유의 — (1) 다운로드 크기(`contentLength`)를 못 받는 경우가 있어, 그럴 땐 진행률 바 대신 indeterminate(shimmer)로 폴백한다. (2) ⚠️ 이 코드는 업데이트를 수행하는 쪽(구버전) 에 있다. 그래서 이번에 넣어도 이번 업데이트엔 안 보이고, 이 버전으로 올라온 사용자가 다음 버전으로 업데이트할 때부터 보인다.

---

## 코드가 아니라 운영으로 푸는 것

### "출시본만 웹에" — 배포 브랜치 분리

웹(Cloudflare Pages)은 원래 `main`에 push될 때마다 자동 배포됐다. 출시 뒤엔 미완성 커밋이 바로 웹에 올라가는 게 문제였는데, 이건 코드가 아니라 배포 설정으로 풀었다.

- 프로덕션 브랜치를 `release`로 지정 → keybloom.pages.dev는 `release`에 올라올 때만 갱신
- 프리뷰 배포를 끔 → `main` push는 아무것도 배포하지 않음
- 개발·자동 커밋은 계속 `main`, 웹 올릴 땐 `main`→`release` 병합(대개 네이티브 릴리스와 함께)

정적 사이트라도 "언제 나가느냐"는 브랜치·배포 설정으로 통제한다. 앱은 릴리스 시점에만 웹·네이티브가 같은 상태가 된다.

### changelog는 latest.json이 아니라 릴리스 API에서

업데이터가 보는 `latest.json`에는 최신 한 버전의 노트만 있다. 그래서 전체 업데이트 내역엔 못 쓴다. 전체 이력은 GitHub Releases API가 준다.

```text
GET https://api.github.com/repos/OWNER/REPO/releases
→ [{ tag_name, name, body, published_at }, ...]
   (api.github.com은 CORS 허용 → 브라우저에서 바로 fetch, 비인증 60회/시간)
```

각 릴리스의 `body`가 그 버전의 changelog 본문이다. 그래서 릴리스 노트를 한국어·영어를 한 body에 적고 가운데 `---`로 나눠 두면, 샵이 그 body를 로케일별로 갈라 보여줄 수 있다. 릴리스마다 이 형식으로 통일했다.

---

## 요약

- 새 기능은 새 배관보다 기존 이벤트 경로 재사용부터 — 서스테인은 MIDI CC64의 `onSustain`에 왼쪽 Shift만 연결
- 네이티브 출시본 단축키 잠금은 denylist(브라우저 것만 차단)가 whitelist보다 안전, 조건은 `IS_NATIVE && !DEV`
- "출시본만 웹에"는 코드가 아니라 배포 브랜치 분리(프로덕션=release, main은 배포 안 함)로
- 전체 changelog는 `latest.json`(최신 1개)이 아니라 GitHub Releases API(버전별 body, CORS(다른 출처의 요청을 허용하는 브라우저 규칙) 허용), 노트는 국·영 `---` 통합
- Tauri 업데이터 `downloadAndInstall`의 진행 콜백(`Started`/`Progress`/`Finished`)으로 진행률 표시(공용 오버레이 재사용, 크기 없으면 shimmer 폴백) — 단 구버전 코드라 다음 업데이트부터 보임
