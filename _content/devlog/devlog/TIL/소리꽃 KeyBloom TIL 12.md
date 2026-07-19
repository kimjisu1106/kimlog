---
layout: post
title: 소리꽃 KeyBloom TIL 12
date: 2026-07-16
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 브라우저에서 파일에 직접 덮어쓰기(File System Access)와 핸들을 IndexedDB로 살려두기, 무료·유료 게이팅, 그리고 또 만난 CSS 함정들.
tags:
  - JavaScript
  - TypeScript
  - CSS
---
소리꽃을 무료 출시 상태로 만들며 배운 것들. 브라우저가 사용자 파일에 직접 덮어쓰는 법과 그 권한을 새 세션까지 살려두는 법, 무료·유료 경계를 코드로 긋는 법, 그리고 이번에도 발목을 잡은 CSS 기본값들.

---

## 브라우저가 파일에 직접 덮어쓰기 — File System Access

웹앱의 저장은 보통 `<a download>`다. 그런데 이건 매번 "새 파일 다운로드"라, 같은 프로젝트를 열 번 저장하면 `project (1).json` … `project (9).json`이 쌓인다. 편집하며 수시로 Ctrl+S 하는 툴엔 못 쓴다.

File System Access API(브라우저가 사용자 파일에 직접 접근하게 해주는 기능)를 쓰면 사용자가 고른 파일에 직접 쓸 수 있다. 핵심은 핸들(handle)을 기억해 두는 것이다. 핸들은 그 파일을 다시 열 수 있는 열쇠다 — 브라우저는 보안상 파일 경로(위치)는 못 기억하지만, 이 열쇠는 손에 쥐고 있을 수 있다.

```js
let fileHandle = null;

async function save(text) {
  // 핸들이 없을 때만 위치를 묻는다 → 두 번째 저장부터는 창 없이 덮어쓰기
  if (!fileHandle) {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: "song.kbloom",
      types: [{ description: "KeyBloom 프로젝트", accept: { "application/json": [".kbloom"] } }],
    });
  }
  const w = await fileHandle.createWritable();
  await w.write(text);
  await w.close();   // close 해야 실제로 디스크에 반영된다
}
```

열기도 같은 변수에 핸들을 담아두면, 연 파일에 바로 Ctrl+S가 먹는다.

```js
const [h] = await window.showOpenFilePicker({ types: [...] });
const text = await (await h.getFile()).text();
fileHandle = h;   // 이제 이 파일이 저장 대상
```

빠뜨리기 쉬운 것 두 가지가 있었다. 하나는 취소 처리 — 사용자가 픽커(파일 선택창)를 닫으면 `AbortError`가 던져지는데, 이건 에러가 아니라 정상 흐름이라 조용히 반환해야 한다. 다른 하나는 미지원 브라우저 폴백(대체 경로) — Safari·Firefox엔 이 API가 없어서, 기능 존재 여부로 갈라 예전 다운로드 방식으로 떨어뜨려야 한다.

```js
const FS_SUPPORTED = "showSaveFilePicker" in window;
// ...
catch (err) {
  if (err.name === "AbortError") return;   // 사용자가 취소 — 조용히
  fileHandle = null;                        // 깨진 핸들 버리고 다운로드 폴백
}
```

---

## 핸들을 새 세션까지 살려두기 — IndexedDB + 권한 재요청

프로젝트에 오디오 파일을 "기억"시키고 싶었다. 그런데 브라우저는 보안상 절대경로로 파일을 다시 열 수 없다 — 경로 문자열을 저장해봐야 쓸모없다.

방법은 경로가 아니라 핸들(파일을 다시 여는 열쇠) 자체를 IndexedDB에 저장하는 것이다. IndexedDB는 브라우저 안에 있는 작은 창고인데, 이 열쇠를 여기 넣어두면 새 세션에서도 꺼내 쓸 수 있다. `FileSystemFileHandle`은 구조적 복제(구조를 그대로 베껴 저장하는 방식)가 되기 때문에 IndexedDB에 그대로 들어간다(localStorage는 문자열만 되니 안 된다).

```js
// 저장: 오디오를 고를 때 핸들을 함께 보관
await putHandle(`audio:${file.name}`, handle);

// 복원: 프로젝트를 열 때 핸들을 꺼내 파일을 다시 읽는다
const h = await getHandle(`audio:${name}`);
```

여기서 중요한 함정 — 핸들은 살아남지만 권한은 안 살아남는다. 새 세션에서 그냥 `getFile()`을 부르면 거부된다. 권한을 확인하고, 없으면 다시 요청해야 한다.

```js
const state = await h.queryPermission({ mode: "read" });
const ok = state === "granted" || (await h.requestPermission({ mode: "read" })) === "granted";
if (ok) await loadAudio(await h.getFile());
```

그리고 자동 복원은 실패할 수 있다는 걸 전제로 설계해야 한다. 파일을 옮겼거나, 지웠거나, 권한을 거부했을 수 있다. 그래서 실패 시 "다른 파일로 대체할까요? (취소 = 없이 진행)"로 빠져나갈 길을 뒀다. 반대로 프로젝트 파일 핸들은 일부러 IndexedDB에 안 넣었다 — 새로고침하면 첫 저장 때 위치를 다시 묻는 게, 엉뚱한 파일에 덮어쓰는 것보다 안전하다.

---

## 무료·유료 게이팅은 UI만으로 하면 안 된다

무료 빌드에서 4K 내보내기를 막았다. 배운 건 잠금은 두 겹이어야 한다는 것.

```js
export const IS_FREE = true;   // 빌드 티어 (유료 빌드에서 false)

// 1) UI — 옵션만 비활성. select 자체를 잠그면 720/1080도 못 고른다
if (IS_FREE) proOption.disabled = true;

// 2) 진입점 — UI를 우회해도 막히게
function startExport(opts) {
  if (IS_FREE && opts.height >= 2160) return;
  // ...
}
```

UI만 막으면 콘솔에서 함수를 직접 부르거나 DOM을 고쳐서 뚫린다. 반대로 진입점만 막으면 사용자는 왜 안 되는지 모른다. 둘 다 필요하다.

표기도 배운 점이 있다. 처음엔 왕관 PRO 뱃지를 이미지로 만들고 해상도를 버튼 그룹으로 바꿨다 — `<option>`엔 이미지를 못 넣기 때문이다. 그런데 그 제약 때문에 UI를 통째로 바꾸는 건 배보다 배꼽이라, 드롭다운으로 되돌리고 옵션 텍스트에 이모지를 넣었다.

```js
["3840x2160", "2160p (4K) 👑 PRO"]   // 이미지 대신 이모지 — 제약에 UI를 맞추지 말 것
```

---

## 규칙은 한 곳만 예외로 두면 티가 난다 — 먼저 정한 색을 끝까지 유지 (first-in)

파티클은 이미 "태어난 순간의 큐 색을 유지"였다(큐는 색·모양 설정 한 벌). 그런데 건반은 매 프레임 현재 큐로 색을 계산해서, 큐가 바뀌는 순간 이미 눌려 있던 건반까지 색이 확 바뀌었다.

고치는 방법은 파티클과 같은 규칙을 적용하는 것 — 노트가 시작된 시점의 큐로 색을 정한다.

```js
// 매 프레임 현재 큐(rp)가 아니라, 그 노트가 시작된 시각의 큐를 찾는다
const p = following ? cueById(activeCueIdAtTime(n.time)).params : rp;
active.set(n.midi, { color: keyColor(n, p), gloss: p.keyGloss });
```

이때 색만이 아니라 광택도 같이 들려 보내야 했다. 광택은 원래 "지금 큐의 값"으로 전역 인자였는데, 그러면 색은 안 변하는데 광택만 변하는 어색한 상태가 된다. 그래서 키마다 `{color, gloss}`를 들게 하고 렌더 함수의 전역 광택 인자를 없앴다.

같은 종류의 상태(파티클·건반)에 서로 다른 규칙을 두면, 둘이 함께 보이는 순간 반드시 티가 난다.

---

## 또 CSS 기본값 — hidden과 flex shrink

두 번 다 이미 아는 함정이었는데 또 밟았다.

`[hidden]`은 약하다. CSS는 규칙끼리 힘겨루기를 하는데, 더 구체적으로 짚은 규칙이 이긴다. `hidden` 속성은 브라우저 기본 `[hidden] { display: none }`으로 동작하는데, 내 CSS의 `.file-btn { display: block }`이 더 구체적이라 이걸 이겨버린다 — "이 클래스이면서 hidden일 때"라고 콕 집어야 숨김이 이긴다. 미지원 브라우저용 폴백 버튼을 숨겼는데 버튼이 두 개로 보인 이유다.

```css
.file-btn { display: block; }          /* 이게 [hidden]을 이겨버림 */
.file-btn[hidden] { display: none; }   /* 클래스+속성으로 명시해야 이김 */
```

flex 아이템은 기본으로 줄어든다. 시퀀서 옆에 250px 광고 자리를 넣자 툴바 버튼이 찌그러졌다. `flex-shrink`가 기본 1이라 공간이 모자라면 아이템이 눌린다.

```css
.seq-btn { flex: none; white-space: nowrap; }  /* 자연 크기 유지 */
.seq-toolbar { flex-wrap: wrap; }              /* 정말 좁으면 줄바꿈 */
```

레이아웃에 뭔가를 새로 끼워 넣을 땐, 폭을 나눠 갖는 기존 요소들이 어떻게 반응할지 같이 봐야 한다는 걸 다시 배웠다.

---

## 요약

- File System Access는 핸들(파일을 다시 여는 열쇠)을 기억하는 게 핵심 — 첫 저장만 픽커, 이후 같은 파일에 덮어쓰기. `AbortError`(취소)와 미지원 폴백은 필수.
- 파일을 "기억"시키려면 경로가 아니라 핸들을 IndexedDB에 넣는다(구조적 복제 가능). 단 권한은 세션을 못 넘으니 재요청해야 하고, 자동 복원은 실패를 전제로 대안을 준다.
- 유료 게이팅은 UI(보이되 잠금) + 진입점(우회 방지) 두 겹. 표기 제약(`<option>`에 이미지 불가) 때문에 UI를 갈아엎지 말고 이모지로 우회.
- 같은 종류의 상태엔 같은 규칙 — 파티클이 먼저 정한 색을 유지하면(first-in) 건반도 똑같이(색만이 아니라 광택까지).
- `[hidden]`은 `display` 지정에 지고, flex 아이템은 기본으로 줄어든다. 둘 다 "기본값이 약하다"는 같은 교훈.
