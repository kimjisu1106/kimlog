---
layout: post
title: 소리꽃 KeyBloom TIL 10
date: 2026-07-07
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
  - CSS
---
소리꽃 편집 UX를 다듬으며 나온 것들. Undo/Redo를 스냅샷으로 만드는 법, 슬라이더 드래그 같은 연속 편집을 undo 한 단계로 묶는 법, 텍스트↔입력칸을 오가는 인라인 편집, 그리고 다시 만난 CSS `hidden` 함정.

---

## Undo/Redo를 스냅샷으로

편집 되돌리기를 만드는 가장 단순한 방법은, 매 편집 직전에 상태를 통째로 저장(스냅샷)해두고 되돌릴 때 갈아끼우는 것이다. 스택 두 개면 된다.

```js
const undoStack = [];
const redoStack = [];

// 편집하기 직전에 현재 상태를 저장
function pushHistory(snap = takeSnapshot()) {
  undoStack.push(snap);
  redoStack.length = 0; // 새 편집이 생기면 redo 무효
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(takeSnapshot()); // 지금 상태는 redo로
  applySnapshot(undoStack.pop()); // 직전 상태로 복원
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(takeSnapshot());
  applySnapshot(redoStack.pop());
}
```

`takeSnapshot()`은 되돌릴 대상(여기선 큐·큐포인트·선택 큐)을 딥클론하고, `applySnapshot()`은 그걸 다시 세팅한 뒤 UI를 갱신한다. 각 편집 핸들러(큐 배치·삭제 등)는 상태를 바꾸기 직전에 `pushHistory()`만 부르면 끝이다.

포인트는 "무엇을 스냅샷에 담느냐"다. 파티클처럼 매 프레임 흐르는 건 담지 않고, 사용자가 만든 문서 상태(큐·배치)만 담았다. 그리고 새 파일을 열면 히스토리를 비운다(다른 문서니까).

---

## 연속 편집을 undo 한 단계로 — 편집 세션

슬라이더 드래그는 `input` 이벤트가 수십 번 날아온다. 매번 `pushHistory()`하면 undo 한 번에 값이 1px씩만 돌아간다. 원하는 건 "드래그 한 번 = undo 한 단계"다.

그래서 편집 세션 개념을 뒀다. 시작(pointerdown)에 편집 전 상태를 저장해두고, 끝(change)에 실제로 바뀌었을 때만 그 스냅샷을 등록한다.

```js
function makeEditSession() {
  let stash = null;
  return {
    begin() { if (!stash) stash = takeSnapshot(); }, // 편집 전 상태
    commit() {
      if (!stash) return;
      const before = stash;
      stash = null;
      // 실제로 바뀐 경우에만 한 단계 (빈 undo 방지)
      if (JSON.stringify(takeSnapshot()) !== JSON.stringify(before)) pushHistory(before);
    },
  };
}
```

여기서 배운 게 하나 더 있다. 큐 이름 편집과 슬라이더 편집이 시점상 겹칠 수 있다(이름 타이핑 중 슬라이더 클릭 → 이름 blur와 슬라이더 pointerdown이 교차). 세션을 하나로 공유하면 서로의 스냅샷을 지워버린다. 그래서 이름 세션과 파라미터 세션을 따로 뒀더니 겹쳐도 각자 제 단계로 남았다.

파라미터 컨트롤이 여러 개(슬라이더·색·셀렉트·모양)라, 하나하나에 리스너를 다는 대신 부모에 위임(delegation)했다.

```js
panel.addEventListener("pointerdown", (e) => {
  if (e.target.matches('input[type="range"], input[type="color"], select, .shape-toggle'))
    session.begin();
});
panel.addEventListener("change", (e) => {
  if (e.target.matches('input[type="range"], input[type="color"], select')) session.commit();
});
```

내보내기·트랙 셀렉트도 같이 걸리지만, `commit`이 "스냅샷에 변화 없으면 무시"라 빈 undo가 안 생긴다. 위임 + 무해한 commit 조합이 깔끔했다.

---

## 인라인 편집 — 텍스트와 입력칸을 오가기

큐 이름을 상시 입력칸으로 두니 지저분했다. 평소엔 텍스트로 보이고 클릭하면 입력칸이 되는, 흔한 인라인 편집으로 바꿨다. 요소 두 개(텍스트용 `div`, 편집용 `input`)를 두고 `hidden`으로 토글한다.

```js
titleText.addEventListener("click", () => {
  titleText.hidden = true;
  titleInput.hidden = false;
  titleInput.focus();
  titleInput.select();
});
titleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") titleInput.blur(); // Enter = 확정
});
titleInput.addEventListener("blur", () => {
  commitEdit();          // 확정(undo 한 단계)
  showText();            // 다시 텍스트로
});
```

확정 경로를 blur 하나로 모은 게 편했다. Enter는 그냥 `blur()`를 부르게 해서 "Enter나 다른 데 클릭"이 같은 코드로 처리된다. 비어 있을 땐 텍스트 자리에 회색 placeholder를 보여줘 클릭 가능함을 알린다.

---

## 스크럽 미리보기 · 마그넷 스냅

두 가지는 작지만 편집 흐름을 크게 바꿨다.

스크럽 미리보기 — 시크를 끄는 동안엔 그 시점의 큐를, 놓으면 편집 중인 선택 큐를 보여준다. 렌더 파라미터를 고르는 조건에 "스크럽 중" 하나만 얹으면 된다.

```js
const following = timeline.isPlaying || scrubbing; // 스크럽도 포함
const cue = following ? activeCueAtTime(t) : selectedCue; // 검사 vs 편집
```

마그넷 스냅 — 큐를 옮길 때 플레이헤드 근처면 딱 달라붙게. 시간이 아니라 화면 픽셀 거리로 판정해야 줌과 무관하게 일정한 손맛이 난다.

```js
function snapTime(t, x) {
  return snap && Math.abs(x - xOf(playheadTime)) < 8 ? playheadTime : t; // ±8px
}
```

스크럽으로 지점을 찾고, 스냅으로 큐를 그 커서에 붙이는 흐름이 자연스럽게 이어졌다.

---

## 또 만난 CSS hidden 함정

`el.hidden = true`를 줬는데 요소가 안 사라졌다. 전에도 겪은 그거다 — `hidden`은 브라우저 기본 `[hidden] { display: none }`으로 동작하는데 우선순위가 낮아서, 내 CSS에 `display`가 있으면 진다.

```css
.cue-title { display: block; }   /* 이게 [hidden]을 이겨버림 */
.cue-title[hidden] { display: none; } /* 클래스+속성으로 명시해야 이김 */
```

이번엔 `.mode-bar`(실시간 토글 숨김), `.cue-title`(입력칸 토글) 두 군데서 나왔다. `display`를 지정하는 요소를 `hidden`으로 숨길 땐 `.클래스[hidden]`을 같이 써야 한다는 걸 이제 반사적으로 챙기게 됐다.

---

## 요약

- Undo/Redo는 스택 두 개 + 편집 직전 스냅샷 + 되돌릴 때 갈아끼우기. 담을 상태는 "사용자 문서"만(흐르는 파티클은 제외).
- 연속 편집은 편집 세션(시작에 스냅샷, 끝에 실제 변화 있으면 한 단계)으로 묶는다. 겹치는 편집은 세션을 분리. 여러 컨트롤은 위임 + "변화 없으면 무시"로.
- 인라인 편집은 텍스트/입력칸 두 요소를 `hidden` 토글, 확정은 blur 하나로 모으고 Enter는 blur를 호출.
- 렌더 큐 선택 조건에 "스크럽 중"만 얹으면 검사 미리보기, 스냅은 시간이 아니라 화면 픽셀 거리로 판정.
- `hidden`이 안 먹으면 `display`를 지정한 규칙이 덮은 것 — `.클래스[hidden] { display: none }`.
