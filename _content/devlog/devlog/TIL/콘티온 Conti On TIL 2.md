---
layout: post
title: 콘티온 Conti On TIL 2
date: 2026-07-20
permalink: "83th8qqx"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - TypeScript
  - React
  - CSS
  - SQL
description: 콘티온을 만들며 하루 동안 다룬 것들 — PPT 용량을 슬라이드 마스터로 줄이기, 평면 리스트로 구간 그룹 다루기, 드래그 순서 바꾸기 UX, 검색 차단과 공유 카드 공존, 하드코딩과 DB 사이 기준, 직접 만든 그라데이션 편집기, 글꼴 설치 감지, 원격 마이그레이션의 함정.
---
콘티온 자막 PPT 도구를 만들며 하루 동안 부딪힌 것들을 한데 모았다. PPT 용량부터 구간 그룹, 드래그 UX, 공유 카드, 글꼴 감지, 원격 마이그레이션까지 주제가 넓다.

---

## 같은 이미지도 슬라이드마다 복제된다

### 먼저 실측으로 원인부터

가사 슬라이드마다 배경(그라데이션)과 자막 바 이미지를 넣고 있었다. "같은 이미지니까 파일 안에서는 하나로 합쳐지겠지"라고 막연히 생각했는데, 그게 아니었다. PPT를 만드는 라이브러리(pptxgenjs)는 슬라이드마다 이미지를 각각 따로 저장한다. 80장이면 배경 80장 + 바 80장이 파일에 들어간다.

추측만으로 고치면 헛다리를 짚을 수 있으니, 같은 이미지를 (A) 슬라이드마다 넣기 (B) 마스터에 한 번만 두기로 나눠 파일 크기를 재봤다.

```js
// A: 80장 각각에 배경 + 이미지
for (let i = 0; i < 80; i++) {
  const s = p.addSlide();
  s.background = { data };
  s.addImage({ data, x: 0, y: 6.5, w: 13.333, h: 1 });
}

// B: 마스터에 한 번만 정의하고 슬라이드는 참조만
p.defineSlideMaster({ title: "M", background: { data }, objects: [{ image: { data, ... } }] });
for (let i = 0; i < 80; i++) p.addSlide({ masterName: "M" });
```

결과는 명확했다.

| 방식 | 80장 기준 |
| --- | --- |
| 슬라이드마다 삽입 | 77.5 MB |
| 마스터에 한 번 | 1.38 MB |

### 해결 — 배경·공통 요소는 슬라이드 마스터로

슬라이드 마스터는 "모든 슬라이드가 공유하는 밑판"이다. 배경과 매 장 반복되는 요소를 여기 한 번만 두면, 슬라이드는 그걸 참조만 하므로 이미지가 한 벌만 저장된다. 원래 쓰던 샘플 템플릿이 1MB 미만이었던 것도 같은 이유였다.

```ts
pptx.defineSlideMaster({
  title: MASTER,
  background: { data: bg },
  objects: [{ image: { data: bar.data, x: 0, y: barY, w: SLIDE_W, h: bar.heightIn } }],
});

// 슬라이드엔 텍스트만 — 배경·바는 마스터가 그린다
const makeSlide = () => pptx.addSlide({ masterName: MASTER });
```

### 검증 — pptx를 풀어보면 다 보인다

pptx는 사실 zip 파일이다. 압축을 풀면 안에 이미지가 몇 개 들어갔는지, 슬라이드가 이미지를 직접 참조하는지 바로 확인할 수 있다. `_rels`는 슬라이드마다 "내가 쓰는 그림 목록"이 따로 적혀 있는 곳이다.

```bash
unzip -q out.pptx -d x
ls x/ppt/media/                                   # 이미지 파일 개수 = 중복 여부
cat x/ppt/slides/_rels/slide1.xml.rels            # 슬라이드가 뭘 참조하는지
```

고친 뒤엔 80장짜리 파일에 이미지가 2개(배경 1 + 바 1)만 들어 있었고, 슬라이드 80장 중 이미지를 직접 참조하는 건 0개였다. 의도대로 마스터가 그리고 있다는 증거다.

---

## 세로로 안 변하는 그림은 얇은 띠로 충분하다

배경은 가로 방향 그라데이션이라 세로로는 색이 전혀 안 변한다. 그런데 1920×1080 크기로 구워서 넣고 있었다. 높이 2픽셀짜리 띠로 만들어 늘려 쓰면 화면 결과는 똑같은데 파일은 훨씬 작아진다(수십~수백 KB → 몇 KB). PowerPoint가 배경을 화면에 맞춰 늘려주기 때문에 가능한 절약이다.

```ts
const GRADIENT_STRIP_H = 2; // 가로 그라데이션 → 세로는 1~2px이면 충분
canvas.width = 1920;
canvas.height = GRADIENT_STRIP_H;
const grad = ctx.createLinearGradient(0, 0, 1920, 0);
```

---

## 밑판이 다르면 마스터도 나눈다

곡 사이 빈 슬라이드와 구간 안내 슬라이드에는 자막 바가 없어야 했다. 마스터는 여러 개 만들 수 있으니, 밑판 종류대로 나누고 슬라이드마다 골라 쓰면 된다.

```ts
pptx.defineSlideMaster({ title: MASTER, background: { data: bg }, objects: [ /* 자막 바 */ ] });
pptx.defineSlideMaster({ title: MASTER_BLANK, background: { data: bg } }); // 배경만

const makeSlide = () => pptx.addSlide({ masterName: MASTER });
const makeBlankSlide = () => pptx.addSlide({ masterName: MASTER_BLANK });
```

이미지가 마스터 수만큼(2벌) 들어가지만, 슬라이드 수만큼 복제되던 것에 비하면 무시할 수준이다.

---

## 곁들여 — 상태에 따라 파일명 바꾸기

확정되지 않은 콘티를 뽑으면 파일명에 표시를 붙였다. 파일을 주고받을 때 "이게 최종본인가?"를 파일명만 보고 알 수 있다.

```ts
const base = (opts.title.trim() || "콘티") + (opts.approved ? "" : " (미확정)");
await deck.save(base + ".pptx");
```

---

## 왜 중첩 구조로 안 갔나

최종 결과물이 일렬로 늘어선 슬라이드이기 때문이다. 그룹을 중첩 자료구조로 들고 있어도 내보낼 때는 어차피 평평하게 펴야 한다. 그러면 저장·전송·정렬 어디서든 "펴는 코드"가 계속 따라붙는다.

그래서 저장은 "항목들의 순서 목록" 하나로 두고, 그중 일부를 구분자(그룹 머리글)로 두기로 했다. 그룹의 정의는 규칙으로 해석한다 — 구분자 다음부터 다음 구분자 직전까지가 그 그룹. DB에도 원래 구분자용 자리가 있어서 그대로 썼다.

```ts
// 저장되는 건 이 순서 하나뿐
[
  { type: "group", text: "준비찬양" },
  { type: "song", song: A },
  { type: "song", song: B },
  { type: "group", text: "예배" },
  { type: "song", song: C },
]
```

중첩이 아니라서 "그룹에 속하지 않은 곡"도 자연스럽게 표현된다(첫 구분자 앞에 있는 곡).

---

## 구분자가 데리고 다니는 범위 정하기

그룹을 다루려면 "이 구분자가 데리고 있는 항목이 어디까지인가"를 알아야 한다. 구분자부터 다음 구분자 직전까지를 한 덩어리(블록)로 보고 길이를 센다.

```ts
function blockLen(items, start) {
  let n = 1; // 구분자 자신
  while (start + n < items.length && items[start + n].type === "song") n++;
  return n;
}
```

이 함수 하나로 "그룹 안 곡 수 표시", "그룹 통째 이동", "그룹 통째 삭제"가 전부 풀린다.

---

## 그룹을 옮기면 곡이 따라오게 — 블록 이동

### 잘라내면 뒤쪽 항목 자리가 앞으로 당겨진다

배열에서 블록을 빼내면 그 뒤 항목들의 자리(순서 번호)가 빼낸 길이만큼 앞으로 당겨진다. 그런데 "어디에 넣을지(목표 위치)"는 빼내기 전 기준으로 계산된 값이다. 그대로 넣으면 뒤로 옮길 때마다 한 칸씩 어긋난다. 목표가 원래 위치보다 뒤라면 길이만큼 빼줘야 한다.

```ts
const len = items[from].type === "group" ? blockLen(items, from) : 1;
if (to > from && to < from + len) return; // 자기 블록 안으로 옮기는 건 의미 없음

const next = [...items];
const block = next.splice(from, len);              // 블록을 통째로 빼고
next.splice(to > from ? to - len : to, 0, ...block); // 당겨진 만큼 보정해 끼운다
```

곡 하나를 옮길 때도 같은 코드를 쓴다 — 길이가 1인 블록일 뿐이다. 덕분에 "곡 이동"과 "그룹 이동"에 코드가 갈리지 않는다.

### 화면 없이 입출력만 찍어봐도 검증이 된다

이 계산은 화면과 무관한 순수 함수(같은 입력이면 늘 같은 결과가 나오고 바깥에 아무 영향을 안 주는 함수)라, 브라우저 없이 입력·출력만 찍어보면 검증이 끝난다.

```text
원본             : [준비] a b [예배] c d
그룹 예배 → 맨앞 : [예배] c d [준비] a b     ← 소속 곡이 따라옴
그룹 준비 → 맨뒤 : [예배] c d [준비] a b
곡 c → 준비 그룹 : [준비] a b c [예배] d      ← 그룹 간 이동
```

UI를 붙이기 전에 이걸 먼저 맞춰 놓으니, 드래그가 이상하게 동작해도 "계산이 아니라 이벤트 쪽 문제"라고 범위를 좁힐 수 있었다.

---

## 삭제도 블록 단위로 고르게

그룹을 지울 때 안의 곡까지 지울지 물어보고, 대답에 따라 잘라내는 길이만 바꾼다.

```ts
next.splice(idx, withSongs ? blockLen(items, idx) : 1);
```

머리글만 지우면 그 곡들은 앞 그룹에 흡수되거나 그룹 없는 곡이 된다 — 평면 구조라 자동으로 그렇게 된다. 중첩 구조였다면 "부모 잃은 자식"을 따로 처리해야 했을 것이다.

---

## 화면에선 소속이 보이게

저장이 평면이어도 화면에선 소속이 보여야 한다. 목록을 훑으면서 직전 구분자를 기억해 두면, 각 곡이 어느 그룹인지·접혀 있는지를 그때 계산할 수 있다.

```ts
let curGroup = null;
const rows = items.map((item, i) => {
  if (item.type === "group") {
    curGroup = item.uid;
    return { item, i, groupUid: null, hidden: false };
  }
  return { item, i, groupUid: curGroup, hidden: curGroup != null && collapsed.has(curGroup) };
});
```

들여쓰기와 접기/펼치기는 이 한 번의 훑기로 끝난다.

---

## 진단 — 무엇이 불편했나

1. 항목 위에 커서를 올리면 무조건 그 항목 앞에 들어갔다. 원하는 자리를 정확히 집을 수 없었다.
2. 맨 끝으로 옮길 방법이 아예 없었다. 마지막 항목에 놓아도 그 앞에 들어가고, 목록 아래 빈 공간에 놓으면 아무 일도 안 일어났다.
3. 드래그하는 동안 항목들이 30px씩 벌어지며 밀려서, 커서 아래 항목이 계속 바뀌어 조준이 흔들렸다.

---

## 커서가 항목의 위/아래 어느 쪽인지로 판단한다

"어느 항목 위에 있나"가 아니라 "항목의 위쪽 절반인가 아래쪽 절반인가"를 봐야 앞뒤를 정할 수 있다. 항목의 화면상 위치를 재서 중간선과 비교하면 된다.

```ts
function insertIndexFor(e: DragEvent, i: number) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return e.clientY > r.top + r.height / 2 ? i + 1 : i; // 아래쪽 절반이면 그 뒤
}
```

여기서 얻는 값은 "몇 번째 항목"이 아니라 삽입 지점(0부터 목록 길이까지)이다. 이렇게 보면 문제 2번이 저절로 풀린다 — 마지막 항목의 아래쪽 절반에 있으면 값이 `목록 길이`가 되어 자연스럽게 "맨 끝"을 가리킨다. "맨 끝으로 옮기기" 전용 영역을 따로 만들 필요가 없었다.

---

## 표시는 레이아웃을 밀지 않아야 한다

처음엔 드롭될 자리를 `margin-top: 30px`으로 벌려서 보여줬다. 그런데 자리가 벌어지는 순간 커서 아래 항목이 바뀌고, 그러면 다시 다른 자리가 벌어지면서 깜빡였다. 표시는 공간을 차지하지 않아야 한다. 항목 사이 틈에 선만 그리는 방식으로 바꿨다.

```css
.conti-item.drop-before::before,
.conti-item.drop-after::after {
  content: "";
  position: absolute; /* 흐름에서 빠져 레이아웃을 안 민다 */
  left: 0; right: 0;
  height: 3px;
  background: var(--primary);
}
.conti-item.drop-before::before { top: -5px; }
.conti-item.drop-after::after { bottom: -5px; }
```

끌고 있는 항목은 흐리게(`opacity: .4`) 해서 무엇이 움직이는 중인지 보이게 했다.

---

## 자동 스크롤 — 무엇을 굴릴지 골라야 한다

목록이 길면 화면 밖 위치로는 끌고 갈 수가 없다. 그래서 커서가 가장자리에 오면 자동으로 스크롤되게 했는데, 여기 함정이 있었다. 목록이 자체 스크롤 영역이 되면 창을 굴려봐야 소용이 없다. 목록이 스크롤 가능한 상태면 목록을, 아니면 창을 굴려야 한다.

```ts
function autoScroll(clientY: number) {
  const el = listRef.current;
  if (el && el.scrollHeight > el.clientHeight) { // 목록이 자체 스크롤 중이면
    const r = el.getBoundingClientRect();
    const M = 48;
    if (clientY < r.top + M && el.scrollTop > 0) return el.scrollBy(0, -12);
    if (clientY > r.bottom - M && el.scrollTop + el.clientHeight < el.scrollHeight)
      return el.scrollBy(0, 12);
  }
  if (clientY < 90) window.scrollBy(0, -12);          // 아니면 창
  else if (clientY > window.innerHeight - 90) window.scrollBy(0, 12);
}
```

이미 끝까지 굴린 방향으로는 시도하지 않도록 `scrollTop`(현재 스크롤 위치값) 조건을 붙였다. 안 그러면 끝에 닿았는데도 계속 스크롤을 호출한다.

---

## 스크롤바는 숨기되, 뒤 페이지가 밀리진 않게

목록이 길어져도 아래 버튼들이 밀려나지 않도록 목록만 스크롤되게 하고, 스크롤바는 숨겼다. 브라우저마다 방법이 달라서 셋을 같이 쓴다.

```css
.conti-list {
  max-height: 45vh;
  overflow-y: auto;
  overscroll-behavior: contain; /* 끝에 닿아도 뒤 페이지가 안 밀림 */
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* 구형 Edge */
  padding: 5px 0;               /* 삽입선이 잘리지 않게 여유 */
}
.conti-list::-webkit-scrollbar { display: none; } /* Chrome·Safari */
```

`overscroll-behavior: contain`이 없으면 목록 끝에서 휠을 더 굴릴 때 뒤 페이지가 따라 움직인다(스크롤 체이닝). 그리고 넘침을 숨기는 영역이라, 항목 위/아래에 그리는 삽입선이 잘리지 않도록 위아래 여백을 줘야 했다.

---

## 값이 바뀔 때 버튼이 밀리지 않게

자막 편집에서 크기·자간을 조절하면 "기본값" 버튼이 새로 나타나면서 아래 버튼들이 밀렸다. 조건부로 넣고 빼면 높이가 변하기 때문이다. 자리는 항상 지키고 상태만 바꾸면 흔들리지 않는다.

```tsx
{/* 이전: {overridden && <button>기본값</button>} — 나타날 때 레이아웃이 밀림 */}
<button onClick={() => reset(i)} disabled={!overridden}>기본값</button>
```

---

## 링크 공유 카드

### 무엇을 넣나

카카오톡·슬랙 같은 곳은 링크를 받으면 그 페이지를 한 번 가져와서 `og:`로 시작하는 태그(og는 링크를 미리보기 카드로 보여줄 때 읽어가는 정보다)를 읽고 카드를 만든다. 아무것도 없으면 카드도 없다.

```html
<meta property="og:title" content="콘티온 Conti On" />
<meta property="og:description" content="찬양팀 콘티·자막 PPT 도구" />
<meta property="og:url" content="https://example.pages.dev/" />
<meta property="og:image" content="https://example.pages.dev/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

이미지 주소는 `/og.png` 같은 상대경로가 아니라 전체 주소로 적어야 한다. 카드를 만드는 쪽은 남의 서버라, 상대경로를 우리 도메인 기준으로 풀어주지 않는 경우가 있다. 크기는 1200×630이 사실상 표준이다.

이미지 자체는 앱 화면 캡처 대신 디자인 카드로 만들었다. 실제 화면엔 곡 목록과 사람 이름이 나오는데, 링크 미리보기는 로그인 안 한 사람에게도 보이기 때문이다.

---

## 검색에는 안 잡히게, 공유 카드는 뜨게

### noindex는 "결과에서 빼달라"는 부탁이다

```html
<meta name="robots" content="noindex, nofollow" />
```

이건 검색엔진이 페이지를 가져와서 읽고 따르는 방식이다. 강제 차단이 아니라, 규칙을 지키는 크롤러가 알아서 결과에서 빼주는 것이다. 여기선 그걸로 충분하다 — 어차피 로그인 벽이라 크롤러가 주소를 알아도 내용은 못 본다. 막고 싶은 건 "검색 결과에 주소가 뜨는 것"뿐이었다.

### robots.txt로 막으면 카드도 같이 사라질 수 있다

더 센 방법으로 `robots.txt`에 `Disallow: /`를 넣는 게 있다. 그런데 이건 "가져가지도 마라"라서, 일부 미리보기 봇도 이 규칙을 존중해 페이지를 안 읽는다. 그러면 카톡 카드까지 같이 안 뜬다.

정리하면 담당이 다르다.

| | 읽는 것 | noindex를 따르나 |
| --- | --- | --- |
| 검색엔진 봇 | 페이지 전체 | 따른다 → 결과에서 빠짐 |
| 링크 미리보기 봇 | og 태그 | 안 따른다 → 카드는 그대로 |

그래서 meta 태그 방식이 "검색은 차단, 공유는 유지"를 동시에 만족한다.

> 미리보기 봇은 결과를 자체 캐싱한다. 이미 공유했던 링크는 예전 상태가 한동안 뜰 수 있고, 급하면 주소 뒤에 `?v=2` 같은 걸 붙여 새로 읽게 한다.

---

## 로컬 HTML에서는 웹폰트가 안 먹는다

카드 이미지를 만들려고 HTML을 짜서 브라우저로 열었는데, 지정한 폰트가 아니라 기본 글꼴로 나왔다.

### 왜

`file://`로 연 페이지는 브라우저가 파일마다 서로 다른 출처(자원의 주인을 가르는 기준)로 취급한다. 그래서 옆에 있는 폰트 파일이라도 "다른 출처의 자원"으로 보고 차단한다(폰트는 이미지보다 규칙이 엄격하다). 결국 폴백 글꼴(지정한 글꼴을 못 쓸 때 브라우저가 대신 내보내는 기본 글꼴)로 떨어진다.

### 해결 — 폰트를 HTML 안에 심는다

서버를 띄우는 방법도 있지만, 일회성 작업물이라 폰트를 base64(폰트 파일을 글자로 바꿔 HTML 안에 통째로 붙여넣는 방식)로 바꿔 파일 안에 직접 넣는 쪽이 간단하다. 외부에서 아무것도 안 불러오니 무조건 적용된다.

```js
// node로 HTML을 생성 — 폰트를 통째로 심는다
const bold = fs.readFileSync(FONT_DIR + "GMARKETSANSTTFBOLD.TTF").toString("base64");
const html = `<style>
  @font-face {
    font-family: "GmarketBold";
    src: url(data:font/ttf;base64,${bold}) format("truetype");
  }
</style>...`;
```

파일은 6MB가 됐지만 스크린샷 한 번 찍고 버릴 페이지라 상관없었다. 캡처는 개발자도구에서 해당 요소를 골라 "Capture node screenshot"으로 하면 정확히 그 크기(1200×630)로 나온다.

---

## 값을 코드에 박아둘까 DB에 둘까

둘 다 맞을 때가 있어서 기준이 필요했다. 내가 잡은 건 이거다.

바뀔 때 누가 손대야 하는가.

코드에 있으면 바꿀 때마다 개발자가 파일을 고치고 배포해야 한다. DB에 있으면 화면에서 사용자가 직접 바꾼다. 그래서 판단은 "이 값이 자주 바뀌나"가 아니라 "이게 바뀔 때 내가 개입해야 하나"다.

1년에 한 번 바뀌어도, 그때 내가 붙어야 한다면 DB로 뺄 이유가 된다. 반대로 매주 바뀌어도 그게 코드 로직의 일부라면 코드에 두는 게 맞다.

이번 건은 명확했다. 만들어 넘긴 뒤로는 손대지 않을 도구다. 그러면 코드에 남은 배열 하나가 나중에 나를 다시 불러내는 고리가 된다.

---

## 파일을 못 담을 때는 링크로

원래 하고 싶었던 건 글꼴 파일 자체를 올리는 거였다. 두 가지에 막혔다.

첫째, PPT를 만드는 라이브러리(pptxgenjs)는 글꼴을 파일로 넣지 못한다. 이름만 적어둘 뿐이다. 그래서 파일을 아무리 잘 보관해도 PPT 자체는 달라지지 않는다. 글꼴은 재생하는 PC에 설치돼 있어야 한다.

둘째, 저장할 곳이 마땅치 않았다. 쓰고 있는 D1(사이트가 쓰는 데이터베이스)은 한 값이 2MB를 넘지 못하는데 한글 TTF(글꼴 파일 형식)는 보통 4~8MB다. 이미지처럼 base64로 밀어 넣는 방식이 글꼴에는 안 통한다.

그래서 파일 대신 이름과 받는 곳(주소)만 저장하기로 했다. 파일을 보관하는 대신 어디서 받는지를 보관하는 것이다. 실제로 필요한 동작 — 재생 PC 담당자가 글꼴을 구해 설치하는 것 — 은 이걸로 충분히 된다.

```sql
CREATE TABLE IF NOT EXISTS fonts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,   -- PPT에 들어가는 글꼴명
  url TEXT,                    -- 받는 곳 (비워도 됨)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 기본 글꼴 미리 넣기 — 여러 번 돌려도 안 겹치게

기본 글꼴 몇 개는 미리 넣어두고 싶었다. 그런데 마이그레이션을 두 번 돌리거나, 이미 같은 이름이 있는 상태에서 실행될 수도 있다.

`name`에 UNIQUE를 걸어두고 `INSERT OR IGNORE`를 쓰면 중복은 조용히 건너뛴다. 여러 번 실행해도 결과가 같아진다.

```sql
INSERT OR IGNORE INTO fonts (name, url, sort_order) VALUES
  ('G마켓 산스 TTF Bold',   '/fonts/GMARKETSANSTTFBOLD.TTF',   1),
  ('G마켓 산스 TTF Medium', '/fonts/GMARKETSANSTTFMEDIUM.TTF', 2);
```

사이트에 같이 담아 배포하는 글꼴은 주소를 내부 경로로 적었다. 남의 서버를 가리키지 않으니 링크가 죽을 일이 없다.

---

## 쓰고 있는 항목은 지우지 못하게

목록에서 지우는 버튼을 달고 나니 구멍이 보였다. 지금 템플릿이 쓰고 있는 글꼴을 지워버리면, 이름은 템플릿에 남아 있는데 그게 어디서 받는 글꼴인지 아무도 모르게 된다.

DB의 외래 키(한 표의 값이 다른 표의 어느 행을 가리키는지 묶어 두고, 쓰이는 항목을 함부로 못 지우게 하는 장치)로는 이걸 못 막는다. 템플릿은 글꼴을 id가 아니라 이름 문자열로 들고 있기 때문이다(PPT에 들어가는 게 이름이라 그렇게 뒀다). 그래서 지우기 전에 직접 확인한다.

```ts
const inUse = await c.env.DB.prepare(
  "SELECT 1 FROM ppt_presets WHERE is_default = 1 AND font_face = ?",
)
  .bind(row.name)
  .first();
if (inUse) return c.json({ error: "in_use" }, 409);
```

409는 "요청은 이해했지만 지금 상태와 충돌한다"는 뜻이라 이 상황에 맞는다. 화면에서는 아예 삭제 버튼을 비활성으로 두고 이유를 툴팁에 적었다. 서버에서도 막는 이유는, 화면만 막으면 그건 안내지 방어가 아니기 때문이다.

---

## 사용자가 넣은 주소를 링크로 걸 때

받는 곳 주소는 사용자가 입력해서 `<a href>`로 나간다. 여기서 걸러야 할 게 있다.

```ts
function safeUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().slice(0, 500);
  if (!v) return null;
  if (v.startsWith("/")) return v.startsWith("//") ? null : v;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}
```

세 가지를 본다.

`javascript:`로 시작하는 주소는 링크를 누르는 순간 코드가 실행된다. 그래서 프로토콜을 `http`/`https`로 한정했다.

내부 경로(`/fonts/...`)는 허용하고 싶은데, 여기에 함정이 있다. `//example.com`도 `/`로 시작한다. 이건 내부 경로가 아니라 "지금 페이지와 같은 프로토콜을 쓰는 외부 주소"다. 내부인 줄 알고 통과시키면 외부로 나간다. 그래서 `//`는 따로 막았다.

길이도 잘랐다. 안 자르면 DB에 아주 긴 문자열을 밀어 넣을 수 있다.

그리고 검증은 서버에서 한다. 화면에서만 거르면 요청을 직접 보내는 것으로 우회된다.

### 새 창으로 열 때 딸려오는 위험 막기

```html
<a href={url} target="_blank" rel="noopener noreferrer">받기</a>
```

`target="_blank"`로 열면 열린 쪽에서 `window.opener`로 원래 창을 건드릴 수 있다. 이걸 노린 공격이 탭내빙(tabnabbing)이다 — 받기 링크가 가리키는 페이지가, 사용자가 새 탭을 보는 사이 원래 콘티온 탭의 주소를 몰래 가짜 로그인 화면으로 바꿔친다. 돌아온 사용자가 의심 없이 비밀번호를 치면 탈취된다. 받는 곳 주소는 사용자가 넣는 값이라 악성 주소가 섞일 수 있으니 막아야 한다. `noopener`가 그 연결을 끊어 새 페이지가 원래 창을 못 건드리게 한다. `noreferrer`는 어디서 왔는지를 안 넘긴다. 요즘 브라우저는 `noopener`를 기본으로 적용하지만, 명시해두는 편이 안전하다.

---

## 같은 값을 CSS와 캔버스가 다르게 읽는다

미리보기는 CSS `linear-gradient`로 그리고, 실제 PPT 배경은 캔버스(브라우저가 그림을 픽셀로 직접 그려 넣는 영역)에 구워서 넣는다. 같은 정지점 목록(그라데이션에서 어느 위치에 무슨 색을 놓을지 찍어둔 점들)을 쓰니 당연히 같게 나올 줄 알았는데 아니었다.

포인트를 끌어서 서로 지나치게 만들면 갈린다. 배열은 `[0%, 78%, 100%]` 순서인데 가운데를 90%까지 끌면 실제 위치는 `[0%, 90%, 100%]`이 아니라 배열 순서상 어긋난 상태가 될 수 있다.

CSS는 이럴 때 뒤에 오는 정지점이 앞의 것보다 작으면 앞의 값으로 눌러버린다. 스펙에 그렇게 정해져 있다.

```css
/* 뒤 정지점이 앞보다 작으면 앞 값으로 보정된다 */
linear-gradient(90deg, #A 0%, #B 90%, #C 40%)
/* → #C 는 90% 로 취급 */
```

캔버스는 그런 보정을 하지 않는다. `addColorStop`은 받은 위치 그대로 찍는다.

```js
grad.addColorStop(0.9, "#B");
grad.addColorStop(0.4, "#C"); // 순서와 무관하게 40% 자리에 그려진다
```

그래서 정렬하지 않으면 화면에서 본 것과 실제로 뽑히는 PPT가 달라진다. 미리보기의 존재 이유가 사라지는 셈이다.

---

## 정렬은 하되, 배열 자체는 건드리지 않는다

해결은 정렬인데, 어디서 정렬하느냐가 중요했다.

처음엔 위치가 바뀔 때마다 배열을 정렬하려 했다. 그러면 드래그가 끊긴다. 핸들은 배열 인덱스로 자기를 알고 있는데, 끌다가 옆 포인트를 지나치는 순간 정렬이 일어나 인덱스가 바뀐다. 손은 계속 움직이는데 잡고 있던 대상이 바뀌어버린다.

그래서 배열 순서는 그대로 두고, 그릴 때와 저장할 때만 정렬한 복사본을 쓴다.

```ts
// 핸들을 서로 지나쳐 끌 수 있으므로 그릴 때·저장할 때는 위치순으로 세운다.
// (배열 순서 자체를 바꾸면 끌고 있던 핸들의 인덱스가 바뀌어 드래그가 끊긴다)
const sortedStops = [...stops].sort((a, b) => a.pos - b.pos);
const gradientCss = `linear-gradient(90deg, ${sortedStops
  .map((s) => `#${s.color} ${s.pos}%`)
  .join(", ")})`;
```

저장할 때도 정렬본을 보낸다. 그러면 DB에는 항상 정렬된 상태로 들어가고, 나중에 읽어 쓰는 쪽은 순서를 신경 쓸 필요가 없다.

정리하면 이렇다. 조작 중인 상태(배열 순서)와 표현·저장하는 상태(정렬된 값)를 분리했다. 화면에서 만지는 것과 결과로 나가는 것이 꼭 같은 자료구조일 필요는 없다.

---

## 요소 밖으로 나가도 드래그가 안 끊기게

핸들을 잡고 막대 밖으로 손을 빼면 이벤트가 끊긴다. 이걸 막는 게 포인터 캡처다.

```tsx
onPointerDown={(e) => {
  e.preventDefault();
  setSelStop(i);
  setDragStop(i);
  e.currentTarget.setPointerCapture(e.pointerId);
}}
onPointerMove={(e) => {
  if (dragStop === i) setStop(i, { pos: posFromX(e.clientX) });
}}
onPointerUp={() => setDragStop(null)}
```

`setPointerCapture`를 부르면 그 포인터의 이벤트가 커서 위치와 무관하게 이 요소로 계속 온다. 예전처럼 `document`에 리스너를 달았다가 떼는 처리를 안 해도 된다. 포인터를 놓으면 캡처도 자동으로 풀린다.

좌표를 퍼센트로 바꾸는 건 막대의 실제 위치를 기준으로 한다.

```ts
function posFromX(clientX: number): number {
  const r = trackRef.current!.getBoundingClientRect();
  return Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
}
```

`getBoundingClientRect()`를 매번 부르는 건 스크롤이나 창 크기가 바뀌어도 맞게 하기 위해서다.

터치에서는 CSS 한 줄이 더 필요하다.

```css
.grad-handle {
  touch-action: none;
}
```

이게 없으면 브라우저가 손가락 움직임을 스크롤로 가져가서 핸들이 안 따라온다.

---

## 기본 제공 슬라이더를 버리면 따라오는 책임

브라우저가 원래 제공하는 슬라이더(`<input type="range">`)를 쓰다가 직접 만든 핸들로 바꿨다. 모양은 원하는 대로 됐지만, 공짜로 얻던 것들이 같이 사라졌다. 키보드로 조작할 수 없고, 화면 낭독기가 이게 무엇인지 모른다.

그래서 직접 붙였다.

```tsx
<div
  role="slider"
  aria-valuenow={s.pos}
  aria-valuemin={0}
  aria-valuemax={100}
  tabIndex={0}
  onKeyDown={(e) => {
    const d = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!d) return;
    e.preventDefault();
    setStop(i, { pos: Math.min(100, Math.max(0, s.pos + d)) });
  }}
/>
```

`role`과 `aria-*`는 이 div가 슬라이더이고 지금 값이 얼마인지 알려준다. `tabIndex={0}`이 있어야 탭으로 초점이 온다. 방향키는 마우스보다 오히려 정확해서, 88%처럼 딱 떨어지는 값을 맞출 땐 이쪽이 편하다.

기본 요소를 버릴 땐 모양만 가져오는 게 아니라 기능도 같이 다시 만들어야 한다는 걸 알았다.

---

## 미리보기를 결과와 맞추기

미리보기는 640px짜리 박스인데 실제 슬라이드는 13.333인치다. 크기를 어떻게 대응시킬지 정해야 했다.

인치와 pt의 관계는 1인치 = 72pt로 고정이다. 슬라이드 가로가 13.333인치니까 960pt다. 미리보기가 640px이면 1pt는 0.667px이 된다.

{% raw %}
```tsx
style={{
  fontSize: (PREV_W * fontSize) / (13.333 * 72),      // 44pt → 29.3px
  letterSpacing: (PREV_W * charSpacing) / (13.333 * 72),
}}
```
{% endraw %}

여기까지 맞췄는데도 실제로 뽑아 보니 미리보기 글씨만 살짝 위에 있었다. 위치 상수는 계산상 0.07px 오차로 맞는데도 그랬다.

원인은 줄 간격이었다. PPT 텍스트 상자는 줄 간격 1.5로 만드는데, 미리보기는 사이트 전역의 `line-height: 1.6`을 그대로 받고 있었다. 줄 상자 높이가 다르면 세로 가운데 정렬의 기준도 달라진다.

```css
.tpl-preview-text {
  /* PPT 텍스트 상자의 lineSpacingMultiple과 같은 값 */
  line-height: 1.5;
}
```

미리보기를 결과와 맞춘다는 건 위치와 크기만이 아니라, 글자를 배치하는 규칙까지 같게 만드는 일이었다.

---

## 글꼴이 깔려 있는지, 이름만으로는 알 수 없다

이름만 보면 딱 맞는 API처럼 보인다.

```js
document.fonts.check('72px "ㅎㅎㅎㅎ"'); // true
```

없는 글꼴 이름을 넣었는데 `true`가 나온다. 버그가 아니라 이 API가 답하는 질문이 다르기 때문이다.

`check()`는 "이 지정으로 텍스트를 그릴 수 있느냐"를 답한다. 글꼴이 없으면 브라우저는 폴백 글꼴(없을 때 대신 쓰는 글꼴)로 그린다. 어쨌든 그려지긴 하니까 `true`다.

"설치돼 있느냐"와 "그릴 수 있느냐"는 다른 질문이었다. 폴백이 있는 한 후자는 거의 항상 참이다. 이름이 비슷해서 같은 뜻으로 읽은 게 실수였다.

---

## 폭을 재서 판정한다

쓸 수 있는 방법은 결국 결과를 보는 것이다. 그 글꼴을 지정했을 때와 안 했을 때 글자 폭이 달라지면 실제로 그 글꼴이 쓰인 것이다. 폴백됐다면 기준 글꼴과 똑같은 폭이 나온다.

```ts
function measuresDifferent(name: string): boolean {
  const probe = "간나다ABC가나다123";
  const ctx = document.createElement("canvas").getContext("2d")!;
  return ["monospace", "serif", "sans-serif"].some((base) => {
    ctx.font = `72px ${base}`;
    const baseW = ctx.measureText(probe).width;
    ctx.font = `72px "${name}", ${base}`;
    return ctx.measureText(probe).width !== baseW;
  });
}
```

몇 가지 이유가 있다.

기준 글꼴을 셋 쓴다. 어떤 글꼴은 우연히 `monospace`와 폭이 같을 수 있다. 셋 중 하나라도 다르면 그 글꼴이 쓰인 것으로 본다.

폰트 크기를 72px로 크게 잡는다. 작은 크기에서는 반올림 때문에 미세한 차이가 묻힌다.

문자열에 한글·영문·숫자를 섞었다. 한글만 있는 글꼴, 영문만 있는 글꼴 어느 쪽이든 차이가 드러나게 하려는 것이다.

이름은 따옴표로 감싼다. 공백이 들어간 이름(`G마켓 산스 TTF Bold`)은 따옴표가 없으면 제대로 파싱되지 않는다.

---

## 화면을 그리는 중에 재면 안 된다

폭 비교로 바꿨는데 이번엔 반대로 항상 "없다"고 떴다. 코드가 이랬다.

```tsx
// 이러면 안 된다
const fontInstalled = useMemo(() => measuresDifferent(fontFace), [fontFace]);
```

문제는 두 가지가 겹쳐 있었다.

첫째, 사이트에 담아 배포하는 글꼴은 `@font-face`(사이트가 자기 글꼴을 브라우저에 함께 실어 보내는 방식)로 걸려 있는데, 브라우저는 이걸 실제로 필요해질 때 받아온다. 화면을 그리는 순간에는 아직 글꼴을 받기 전이라 폴백 상태다. 그때 재면 당연히 "다르지 않다"가 나온다.

둘째, `useMemo`(계산 결과를 저장해 두고 재활용하는 리액트 장치)는 넘겨준 값이 안 바뀌면 다시 계산하지 않는다. 잠시 뒤 글꼴이 로드돼도 처음 잰 값이 그대로 굳는다.

측정은 계산이 아니라 시점에 의존하는 관찰이다. 그런 건 화면을 그리는 중에 하면 안 되고, 로드가 끝난 뒤에 재서 그 결과를 상태(리액트가 값을 기억해 두는 칸)로 받아야 한다.

```tsx
async function checkFontUsable(name: string): Promise<boolean> {
  await document.fonts.ready;            // 진행 중인 웹폰트 로딩이 끝날 때까지
  try {
    await document.fonts.load(`72px "${name}"`); // 아직 안 받았으면 지금 받는다
  } catch {
    /* 사이트에 담긴 글꼴이 아니면 여기서 실패 — 시스템 설치본일 수 있으니 계속 진행 */
  }
  return measuresDifferent(name);
}
```

```tsx
// 확인 전에는 경고를 띄우지 않는다
const [fontInstalled, setFontInstalled] = useState(true);
useEffect(() => {
  const name = fontFace.trim();
  if (!name) return setFontInstalled(true);
  let alive = true;
  checkFontUsable(name).then((ok) => alive && setFontInstalled(ok));
  return () => {
    alive = false;
  };
}, [fontFace]);
```

`fonts.ready`는 지금 진행 중인 로딩이 끝나기를 기다린다. `fonts.load()`는 아직 시작도 안 한 글꼴을 지금 받아오게 한다. 둘 다 필요했다. 아직 화면 어디서도 안 쓴 글꼴은 로딩이 시작조차 안 됐기 때문이다.

`alive` 플래그는 결과가 오기 전에 사용자가 다른 글꼴을 고른 경우를 위한 것이다. 늦게 도착한 옛 결과가 새 값을 덮어쓰지 않게 한다.

---

## 기본값을 어느 쪽에 두는가

작은 결정인데 생각보다 중요했다. 확인이 끝나기 전에는 `있음`으로 둔다.

```tsx
const [fontInstalled, setFontInstalled] = useState(true);
```

두 방향의 오류가 비용이 다르기 때문이다. 있는데 없다고 뜨면 사용자가 멀쩡한 설정을 의심하고 뭔가 잘못했나 찾게 된다. 없는데 잠깐 안 뜨는 건 잠시 후 정정된다.

경고성 메시지의 기본값은 조용한 쪽에 두는 게 낫다는 걸 배웠다.

---

## DB 구조 바꾸기(마이그레이션)가 중간에 멈추면 앞부분은 남는다

여러 문장이 든 SQL 파일을 원격 DB에 실행했는데 중간에서 에러가 났다.

```text
X [ERROR] no such column: font_url at offset 178: SQLITE_ERROR
```

도구는 실행 전에 이런 안내를 띄운다.

```text
Note: if the execution fails to complete, your DB will return to its original state
```

이 문장을 보고 "실패했으니 아무것도 안 들어갔겠지"라고 생각했다. 확인해 보니 아니었다. 앞쪽의 테이블 생성과 데이터 삽입은 그대로 남아 있었고, 에러가 난 문장부터 뒤로만 실행되지 않았다.

여러 문장을 하나의 트랜잭션(전부 성공하거나 전부 취소되도록 묶는 단위)으로 묶어주지는 않는다는 뜻이다. 그래서 마이그레이션 파일은 이렇게 쓰는 게 안전하다.

- 여러 번 실행해도 결과가 같도록 쓴다 — `CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`
- 되돌리기 어려운 문장(`DROP COLUMN` 같은)은 파일 맨 뒤에 둔다
- 실패하면 "안 들어갔다"가 아니라 "어디까지 들어갔는지" 확인한다

이번엔 다행히 앞부분이 여러 번 실행돼도 안전한 문장이었다. 파일에서 문제가 된 문장을 걷어내고 다시 돌리니 그대로 이어졌다.

---

## 성공했는지 확인한다면서 한 줄만 봤다

앞의 사고보다 이게 더 문제였다. 그 전날 다른 마이그레이션을 원격에 적용하고 이렇게 확인했다.

```bash
wrangler d1 execute conti-on-db --remote --file=... | grep "rows_written"
# "rows_written": 1,
```

숫자가 나왔으니 됐다고 판단하고 "적용 완료"라고 보고했다. 그런데 실제로는 반영되지 않은 상태였고, 하루 뒤 다른 작업을 하다 에러로 드러났다.

`grep`(텍스트에서 패턴 찾기)으로 한 줄만 뽑아 보면 그 줄이 어느 문장의 결과인지, 뒤에 에러가 있었는지 안 보인다. 내가 보고 싶은 것만 골라 본 셈이다.

바꾼 방법은 이렇다. 실행 결과 대신 실제 상태를 조회한다.

```bash
wrangler d1 execute conti-on-db --remote --json \
  --command="SELECT sql FROM sqlite_master WHERE name='ppt_presets'"
```

스키마를 직접 읽으면 칼럼이 있는지 없는지가 그대로 나온다. "명령이 성공했다"와 "원하는 상태가 됐다"는 다른 이야기고, 확인해야 하는 건 후자다.

SQLite에서는 `sqlite_master` 테이블에 각 테이블의 생성 구문이 문자열로 들어 있다. `ALTER TABLE`로 추가한 칼럼도 이 문자열 뒤에 붙어서, 이걸 읽으면 현재 스키마 전체를 볼 수 있다.

---

## 칼럼을 지우는 것

SQLite는 오랫동안 칼럼 삭제를 지원하지 않아서 테이블을 새로 만들고 옮겨 담아야 했는데, 3.35부터는 이게 된다.

```sql
ALTER TABLE ppt_presets DROP COLUMN font_url;
```

다만 인덱스나 제약에 걸린 칼럼은 못 지운다. 그리고 당연히 데이터는 사라진다.

이번엔 전날 추가했다가 설계를 바꾸면서 필요 없어진 칼럼이라 지웠다. 하루밖에 안 된 칼럼이고 값도 안 들어 있어서 부담이 없었다. 쓰인 지 오래된 칼럼이라면 지우는 대신 안 쓰는 쪽을 골랐을 것이다.

---

## 마이그레이션 이력을 사실과 맞추기

칼럼을 추가하는 마이그레이션(0012)을 만들었다가, 다음 날 그걸 지우는 마이그레이션을 쓰게 됐다. 그런데 확인해 보니 0012는 원격에 애초에 적용된 적이 없었다.

이 상태로 두면 이력이 이렇게 된다. 로컬은 추가했다가 지운 흔적이 있고, 원격은 추가된 적이 없다. 나중에 이 파일들을 처음부터 돌리는 사람은 있지도 않은 칼럼을 지우려다 실패한다.

그래서 0012 파일을 아예 지우고, 0013에서 그 칼럼을 언급하는 부분도 걷어냈다. 결과적으로 로컬·원격 두 DB와 마이그레이션 파일이 같은 이야기를 하게 됐다.

마이그레이션은 "내가 무슨 시도를 했는지"의 기록이 아니라 "빈 DB에서 현재 상태에 이르는 경로"다. 아직 아무 데도 반영되지 않은 실패한 시도라면, 남기는 것보다 지우는 게 맞다.

---

## 이미지를 다시 굽지 않고 원본 그대로 쓰기

자막 바 이미지를 1920×1080짜리 원본에서 잘라 쓰고 있었다. 캔버스에 그려 필요한 띠만 오려내는 방식이었다.

```ts
// 이전 — 잘라서 다시 굽는다
const canvas = document.createElement("canvas");
ctx.drawImage(img, 0, sy, W, sh, 0, 0, W, canvas.height);
return canvas.toDataURL("image/png");
```

그런데 정확히 규격(1920×173)인 원본을 받고 나니 이 과정이 통째로 필요 없어졌다. 자르지 않아도 되면 다시 구울 이유도 없다.

```ts
// 이후 — 파일 바이트를 그대로
const blob = await fetch(BAR_IMAGE).then((r) => r.blob());
const dataUrl = await new Promise<string>((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(fr.result as string);
  fr.onerror = reject;
  fr.readAsDataURL(blob);
});
```

`fetch`(서버에서 받아오기) → `blob`(파일 같은 바이너리 덩어리) → `readAsDataURL`(base64 문자열로 읽기)로 가면 픽셀을 한 번도 다시 그리지 않는다. 캔버스를 거치면 이미지가 픽셀로 풀렸다가 다시 압축되면서 원본과 미세하게 달라지는데, 이 경로는 그게 없다.

크롭 좌표 계산(`sy = 0.00893 * H` 같은 것)도 같이 사라졌다. 원본이 규격대로면 계산할 게 없다는 게, 코드가 짧아지는 것 이상으로 마음이 편했다.

---

## 곁들여 — 한글 파일명과 셸

두 가지 사소한 것에 시간을 썼다.

윈도우에서 받은 `그림1.png`를 스크립트로 열려니 파일이 없다고 나왔다. 목록에는 분명히 보이는데도 그랬다. 한글 자모를 조합해 저장하는 방식이 둘(NFC/NFD)이라 이름은 같아 보여도 바이트가 다를 수 있다. 웹에서 쓸 정적 파일은 영문 이름으로 바꾸는 게 속 편하다. `subtitle-bar.png`로 바꿨다.

그리고 커밋 메시지가 `@`로 시작하는 이상한 형태로 들어간 적이 있다. PowerShell의 여러 줄 문자열 문법(`@'...'@`)을 Bash에서 그대로 썼기 때문이다. Bash에서는 heredoc(`<<'EOF'`)을 쓴다. 같은 창에서 두 셸을 오가면 이런 게 섞인다.

---

## 요약

- PPT 라이브러리는 같은 이미지라도 슬라이드마다 따로 저장한다 — 배경·반복 요소는 반드시 슬라이드 마스터에 한 번만.
- 고치기 전에 A/B로 파일 크기를 재보면 원인을 추측이 아니라 숫자로 확인할 수 있다(80장 77MB → 1.4MB).
- pptx는 zip이라 풀어서 `ppt/media` 개수와 슬라이드 rels를 보면 중복 여부가 바로 드러난다.
- 한 방향으로만 변하는 그라데이션은 얇은 띠로 구워 늘려 쓴다.
- 밑판이 다른 슬라이드가 있으면 마스터를 종류대로 나눈다.
- 최종 결과가 일렬이면 저장도 평면 리스트로 두고, 그룹은 "구분자~다음 구분자 전"이라는 규칙으로 해석하는 편이 단순하다.
- `blockLen` 하나로 그룹의 범위를 정의하면 이동·삭제·개수 표시가 전부 그 위에 얹힌다.
- 배열에서 빼고 넣을 땐 빼낸 만큼 뒤 항목 자리가 앞으로 밀리므로, 목표가 뒤쪽이면 뺀 길이만큼 보정한다.
- 이동 계산은 순수 함수로 떼어 표로 검증해 두면, 이후 UI 문제와 계산 문제를 구분할 수 있다.
- 평면 구조는 "그룹 없는 항목", "머리글만 삭제" 같은 경우가 저절로 풀린다.
- 드래그 순서 바꾸기는 "어느 항목 위인가"가 아니라 "항목의 위/아래 절반 어디인가"로 판단해야 정확하다.
- 삽입 지점을 0~길이 범위의 값으로 다루면 "맨 끝"이 특별한 경우가 아니게 되어 맨 끝 전용 놓기 영역을 따로 둘 필요가 없다.
- 드롭 위치 표시는 자리를 차지하지 않고 겹쳐 그리는 선이어야 커서 아래 항목이 안 바뀐다.
- 자동 스크롤은 대상을 골라야 한다 — 자체 스크롤 영역이면 그 영역을, 아니면 창을.
- 스크롤바를 숨길 땐 `overscroll-behavior: contain`으로 스크롤 체이닝도 같이 막는다.
- 버튼을 없앴다 만들었다 하지 말고, 자리는 그대로 두고 눌리지만 않게 하면 값 조절 중 레이아웃이 안 흔들린다.
- 링크 미리보기는 `og:` 태그를 읽어 만든다. 이미지 주소는 전체 주소로, 크기는 1200×630.
- 로그인 벽이 있는 도구라도 미리보기 이미지는 아무나 보므로, 실제 화면 캡처 대신 디자인 카드가 안전하다.
- `noindex`는 검색 결과에서 빼달라는 부탁이고, 미리보기 봇은 이를 따르지 않아 카드는 그대로 뜬다.
- `robots.txt`의 `Disallow`는 "가져가지 마라"라서 미리보기까지 막힐 수 있다 — 검색만 막고 싶으면 meta 쪽.
- `file://`에서는 웹폰트가 차단된다. 일회성 페이지라면 폰트를 base64로 심는 게 제일 확실하다.
- 하드코딩이냐 DB냐는 "얼마나 자주 바뀌나"가 아니라 "바뀔 때 내가 개입해야 하나"로 가른다. 넘기고 손 뗄 도구라면 코드에 남은 목록 하나가 나를 다시 불러낸다
- 파일을 담을 수 없으면 파일 대신 받는 곳을 담는다. 실제로 필요한 동작이 무엇인지 보면 그걸로 충분한 경우가 있다
- 미리 넣어둘 기본값은 UNIQUE + `INSERT OR IGNORE`로, 마이그레이션을 여러 번 돌려도 같은 결과가 되게 한다
- 참조가 문자열이면 외래 키가 못 막는다. 지우기 전에 직접 확인하고 409로 거절한다
- 사용자가 넣은 주소를 링크로 걸 땐 프로토콜을 제한한다. 내부 경로를 허용할 때 `//`는 외부 주소라는 걸 잊지 말 것
- CSS `linear-gradient`는 순서가 어긋난 정지점을 앞 값으로 보정하고, 캔버스 `addColorStop`은 위치대로 그린다. 같은 데이터를 써도 결과가 갈린다
- 정렬은 그릴 때와 저장할 때만. 조작 중인 배열을 정렬하면 인덱스가 바뀌어 드래그가 끊긴다
- `setPointerCapture`로 요소 밖에서도 드래그를 유지한다. 터치에는 `touch-action: none`이 같이 필요하다
- 기본 요소를 직접 만든 것으로 바꾸면 키보드 조작과 `role`·`aria-*`도 직접 붙여야 한다
- 미리보기를 결과와 맞추려면 좌표뿐 아니라 줄 간격 같은 배치 규칙까지 같게 둔다
- `document.fonts.check()`는 "설치돼 있느냐"가 아니라 "그릴 수 있느냐"를 답한다. 폴백이 있으니 모르는 이름에도 참이다
- 실제 판정은 글자 폭 비교로 한다. 기준 글꼴 여럿, 큰 크기, 한글·영문 섞은 문자열이 정확도를 높인다
- 측정은 렌더 중에 하지 않는다. `document.fonts.ready`와 `fonts.load()`로 로딩을 끝낸 뒤 `useEffect`에서 재고 결과를 상태로 받는다
- 비동기 결과에는 취소 플래그를 둬서 늦게 온 옛 결과가 새 값을 덮지 않게 한다
- 경고의 기본값은 조용한 쪽으로. 잘못 뜨는 경고가 잠깐 안 뜨는 경고보다 비싸다
- 여러 문장이 든 마이그레이션은 중간에 실패해도 앞부분이 남는다. 여러 번 돌려도 안전하게 쓰고, 되돌리기 어려운 문장은 뒤에 둔다
- 명령이 성공했는지가 아니라 원하는 상태가 됐는지를 확인한다. `sqlite_master`를 읽으면 스키마가 그대로 보인다
- 아직 어디에도 반영되지 않은 실패한 마이그레이션은 남기지 말고 지운다. 이력은 시도의 기록이 아니라 현재 상태에 이르는 경로다
- 자를 필요가 없으면 캔버스를 거치지 말고 `fetch` → `blob` → `readAsDataURL`로 원본 바이트를 그대로 쓴다
- 웹에 올릴 파일은 영문 이름으로. 한글 파일명은 자모 조합 방식 차이로 못 찾을 수 있다
