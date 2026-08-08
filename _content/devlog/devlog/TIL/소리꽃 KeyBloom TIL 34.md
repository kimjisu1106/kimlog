---
layout: post
title: 소리꽃 KeyBloom TIL 34
date: 2026-08-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 손에 걸리던 것들을 고치며 배운 것 — 컨트롤 만진 뒤 단축키가 막히던 포커스 문제, 네이티브에서 저장 대화상자가 자꾸 뜨던 문제, 진행 오버레이를 재사용한 이야기.
tags:
  - TypeScript
---
기능 사이사이 거슬리던 것들을 정리하며 알게 된 것들.

---

## 편집 후 단축키가 막히는 건 포커스가 남아서다

슬라이더·체크박스를 만진 뒤 숫자키(큐 전환)·스페이스(재생)가 바로 안 먹혔다. 원인은 단축키 핸들러가 입력칸에 포커스가 있으면 무시하도록 돼 있어서(타이핑 중 단축키 가로채기 방지). 컨트롤을 만지면 포커스가 거기 남아 계속 막힌다.

그래서 파라미터 편집이 끝나는 지점(change 커밋)에서 그 컨트롤의 포커스를 뗀다.

```ts
bodyWrap.addEventListener("change", (e) => {
  const el = e.target as HTMLElement;
  if (el.matches('input[type="range"], input[type="checkbox"], select')) {
    commit();
    el.blur(); // 포커스 해제 → 이후 keydown의 e.target이 body → 단축키 즉시 동작
  }
});
```

재생(seek) 바는 별도 위치라 거기에도 따로 `change → blur`를 걸었다.

---

## 네이티브에서 저장 대화상자가 자꾸 뜨는 이유

저장 위치를 정해뒀는데도 영상 저장을 누르면 매번 대화상자가 떴다. 오프라인 렌더가 브라우저의 저장 픽커(`showSaveFilePicker`)를 직접 호출하는데, 이건 브라우저가 파일을 직접 읽고 쓰게 해주는 FSA(File System Access) 기능이다. 네이티브 WebView(WebView2, Windows 내장 브라우저 엔진)도 이걸 지원해서 대화상자를 띄운 것.

네이티브에선 이 픽커를 끄고, 결과를 버퍼로 받아 지정 폴더(없으면 다운로드 폴더)에 바로 쓰게 했다.

```ts
// 네이티브면 FSA 픽커 대신 버퍼 → 지정 폴더로 직접 저장(대화상자 없음)
if (!IS_NATIVE && typeof win.showSaveFilePicker === "function") { /* 웹: 픽커 */ }
else { /* 버퍼로 받아 saveOutput이 폴더에 씀 */ }
```

기본 폴더는 Tauri의 `downloadDir()`로 다운로드 폴더를 잡아 대화상자 없이.

> 주의로 남긴 것 — 버퍼는 메모리에 통째라 4K 장척은 나중에 Rust 스트리밍 쓰기로 개선해야 한다.

---

## 오버레이는 스타일을 재사용한다

느린 내보내기(앞으로 붙일 알파 인코딩 등)에서 진행을 크게 보여주려고 화면 중앙 진행바를 만들었다. 이미 있던 시작 로딩 오버레이의 `.loading-*` 스타일을 그대로 재사용하고, 반투명 배경만 얹었다.

- 배운 점: 같은 모양의 오버레이는 CSS를 새로 짜지 말고 기존 클래스를 재사용 — 진행바·박스·퍼센트가 이미 다 있음.

---

## 요약

- 편집 후 단축키가 막히면 커밋 지점에서 `blur()` — 포커스가 input에 남는 게 원인.
- 네이티브 저장 대화상자는 `showSaveFilePicker`를 네이티브에서 끄고 버퍼→지정 폴더(`downloadDir`)로 우회.
- 같은 꼴 오버레이는 기존 스타일 재사용.
