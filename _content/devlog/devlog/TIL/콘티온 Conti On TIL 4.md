---
layout: post
title: 콘티온 Conti On TIL 4
date: 2026-07-24
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
  - SQL
  - CSS
description: 콘티온 자막·콘티 편집을 하루 종일 손보며 정리한 여섯 갈래 — 저장 안 된 편집 경고 공통화, 로그를 무엇에 대한 것인지로 분류하고 정확히 남기기, 화면 손질, 상태·헬퍼 리팩터링, 잠긴 콘티에 한 가지만 여는 권한 예외.
---
콘티온의 자막 템플릿·콘티 편집을 하루 종일 손봤다. 저장 경고 공통화부터 로그 분류·정확성, 화면 손질, 리팩터링, 잠긴 콘티의 권한 예외까지 그날 정리한 것들을 한데 모았다.

---

## 막아야 할 지점이 세 군데였다

"화면을 벗어난다"가 한 가지가 아니었다.

- 앱 안에서 다른 메뉴로 이동 (상단 nav 버튼)
- 편집 화면 자체의 닫기·취소 버튼
- 브라우저 새로고침·탭 닫기

앞의 둘은 우리 코드가 부르는 함수라 그 앞에 확인을 끼울 수 있다. 세 번째는 브라우저가 페이지를 떠나는 거라 우리 함수를 안 거친다. 그래서 방법이 다르다.

브라우저 이탈은 `beforeunload` 이벤트로만 막을 수 있고, 경고창도 브라우저 기본 문구라 꾸밀 수 없다.

```ts
useEffect(() => {
  const h = (e: BeforeUnloadEvent) => {
    if (dirtyRef.current) {
      e.preventDefault();
      e.returnValue = ""; // 이 두 줄이 있어야 기본 "나가시겠습니까?"가 뜬다
    }
  };
  window.addEventListener("beforeunload", h);
  return () => window.removeEventListener("beforeunload", h);
}, []);
```

앱 안 이동은 우리가 만든 확인창(`confirm`)을 쓴다. 둘을 하나의 dirty(저장 안 된 변경이 있는 상태) 상태로 묶는 게 목표였다.

---

## 통로를 만드는 쪽은 그 통로를 못 쓴다

공통으로 만들려고 React(화면을 조각으로 짜는 UI 라이브러리)의 Context(값을 하위 컴포넌트로 내려보내는 통로)를 썼다. 여기서 한 번 막혔다.

nav 버튼은 최상위 컴포넌트(화면을 이루는 재사용 조각)인 AppShell에 있고, 편집 화면들은 그 아래에 있다. "dirty면 이동 막기"를 하려면 nav 버튼도 dirty를 알아야 한다. 처음엔 AppShell이 Context Provider(그 통로 값을 공급하는 요소)를 렌더하고 AppShell 자신이 그 값을 `useContext`(자식에서 그 값을 받는 장치)로 쓰려 했는데, 안 된다.

Provider를 렌더하는 컴포넌트는 그 Provider의 자식이 아니라 부모다. `useContext`는 자식에서만 값을 받는다.

그래서 구조를 이렇게 잡았다. dirty 상태(ref, 렌더와 무관하게 값을 담아두는 상자)와 확인 함수는 AppShell이 직접 들고, nav 버튼은 그 함수를 바로 쓴다. 자식 편집 화면들에는 Context로 내려준다.

{% raw %}
```tsx
// AppShell (부모) — 직접 소유
const dirtyRef = useRef(false);
const confirmLeave = () => !dirtyRef.current || confirm(LEAVE_MSG);
const nav = (v) => { if (confirmLeave()) setView(v); };  // nav 버튼이 직접 사용

// 자식들에게는 Context로
<UnsavedGuardProvider value={{ reportDirty, confirmLeave }}>
```
{% endraw %}

Provider의 값을 부모가 만들어 쥐고 있으면 부모도 쓰고 자식도 쓴다. Context는 "값을 아래로 내려보내는" 도구지, 부모 자신이 소비하는 도구가 아니라는 걸 다시 새겼다.

---

## dirty를 어떻게 아느냐는 화면마다 달랐다

편집 화면은 자기가 바뀌었는지를 이 훅(React 함수에서 상태·기능을 쓰는 장치, use~로 시작)으로 보고한다. 화면을 벗어나면(언마운트) 자동으로 해제된다.

```ts
export function useReportDirty(dirty: boolean) {
  const { reportDirty } = useContext(GuardCtx);
  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false); // 이 화면을 떠나면 dirty도 없던 일로
  }, [dirty, reportDirty]);
}
```

문제는 `dirty`를 계산하는 방법이 화면마다 달랐다는 것이다.

자막 템플릿은 값이 많고 흩어져 있어, 뭐든 건드리면 `true`가 되는 플래그를 뒀다. 저장·로드 때 `false`로.

```ts
const touch = () => { setSaved(false); setDirty(true); };
```

자막 편집은 조절값 객체를 원본과 통째로 비교했다.

```ts
const dirty = JSON.stringify(overrides) !== JSON.stringify(song.line_styles ?? {});
```

곡 수정 폼은 각 입력칸을 초기값과 비교했다.

```ts
const dirty =
  title !== (song?.title ?? "") ||
  lyrics !== (song?.lyrics ?? "") || ...;
```

공통 인터페이스는 `boolean` 하나(`dirty`)로 같지만, 그 값을 만드는 방법은 데이터 모양에 맞춰 제각각이다. 공통화란 모든 걸 똑같이 만드는 게 아니라, 다를 수밖에 없는 부분(판정)과 같아야 하는 부분(경고 동작)을 갈라내는 일이었다.

---

## 나가는 동작을 감싸는 함수

닫기·취소·이동 같은 "나가는 동작"은 이 훅으로 감싼다.

```ts
export function useLeaveGuard() {
  const { confirmLeave } = useContext(GuardCtx);
  return (run: () => void) => {
    if (confirmLeave()) run();
  };
}
```

```tsx
<button onClick={() => guard(onClose)}>닫기</button>
```

버튼이 하는 일(`onClose`)은 그대로 두고, "확인받고 실행"이라는 공통 규칙만 겉에 씌운다. 각 버튼이 confirm을 직접 부르면 문구가 또 갈리는데, 이렇게 하면 문구도 판정도 한 곳이다.

콘티 편집(곡 담기·순서·그룹)은 이 가드에서 뺐다. 바꿀 때마다 즉시 저장돼서 "저장 안 한 상태" 자체가 없기 때문이다. 모든 화면에 기계적으로 붙이는 게 아니라, 실제로 잃을 게 있는 화면에만 붙이는 게 맞았다.

---

## 배열로 뒤늦게 분류하고 있었다

곡 로그 화면은 이런 식으로 걸렀다.

```sql
WHERE detail = ? AND action IN ('create_song','edit_song','delete_song', ...)
```

`detail`에는 곡 id가 들어 있다. 그런데 곡 id 3과 콘티 id 3은 숫자가 같아서, `detail=3`만으로는 곡 로그인지 콘티 로그인지 구분이 안 된다. 그래서 "이 action들은 곡에 대한 것"이라는 배열로 한 번 더 걸렀다.

문제는 이 배열이 로그를 남기는 코드와 떨어져 있다는 것이다. 새 action을 만들면 두 곳을 고쳐야 하는데, 한 곳을 잊기 쉽다. 실제로 `request_edit_song`·`approve_edit_song` 같은 수정 검수 action이 배열에서 빠져 있었다. 로그는 쌓이는데 화면엔 안 보였다.

---

## 기록할 때 "무엇에 대한 것인지"를 남긴다

근본 원인은 로그에 "대상이 무엇인지"가 없다는 거였다. detail은 그냥 숫자였다. 그래서 entity(무엇)와 entity_id(어느 것)를 같이 남기기로 했다.

```sql
ALTER TABLE access_logs ADD COLUMN entity TEXT;      -- 'song' | 'setlist' | 'template'
ALTER TABLE access_logs ADD COLUMN entity_id INTEGER;
```

로그 함수도 대상별로 얇게 나눴다. 호출부에서 대상만 넘기면 entity가 자동으로 붙는다.

```ts
export function logSong(env, uid, action, songId, detail = null) {
  return logAction(env, uid, action, detail, "song", songId);
}
```

그러면 피드는 배열 없이 entity로만 거른다.

```sql
WHERE entity = 'song' AND entity_id = ?
```

이제 새 곡 action은 `logSong`으로 기록만 하면 자동으로 곡 로그에 들어온다. 유지할 배열이 없으니 빠뜨릴 것도 없다. 분류가 로그를 남기는 그 자리에 있어서, 기능을 추가하는 순간 분류도 같이 정해진다.

---

## 한 칸에 두 일을 시키지 않는다

전에 콘티 이름 변경 로그를 사람이 읽게 하려고 detail을 `"3|주일 → 예배"`처럼 "id|설명" 형태로 쓴 적이 있다. id로 걸러야 해서 앞에 id를 붙이고, 조회는 `detail = ? OR detail LIKE ?`로 둘 다 잡는 꼼수였다.

entity_id가 생기니 이 꼼수가 필요 없어졌다. id는 entity_id가 들고, detail은 순수하게 설명만 담는다.

```ts
await logSetlist(env, uid, "rename_setlist", id, `${before} → ${after}`);
```

한 칸(detail)에 필터 키와 설명 두 가지를 시키려다 조회가 지저분해졌던 건데, 각자 칼럼을 주니 둘 다 깨끗해졌다. 값 하나가 두 역할을 하고 있으면 대개 나중에 문제가 된다.

---

## 기존 기록 옮기기

이미 쌓인 로그도 분류해 줘야 했다. 백필은 지금 아는 action 목록으로 일회성으로 돌린다(앞으로는 기록 시점에 붙으니 이 목록은 다시 필요 없다).

```sql
UPDATE access_logs SET entity = 'setlist', entity_id = CAST(detail AS INTEGER)
WHERE action IN ('create_setlist','rename_setlist', ...);

-- "3|주일 → 예배" 는 id를 entity_id로 옮겼으니 설명만 남긴다
UPDATE access_logs SET detail = substr(detail, instr(detail, '|') + 1)
WHERE action = 'rename_setlist' AND detail LIKE '%|%';
```

`CAST('3|주일 → 예배' AS INTEGER)`가 앞의 숫자만 뽑아 3을 준다는 점을 이용했다. SQLite는 문자열 앞의 숫자를 파싱하다 숫자가 아닌 문자를 만나면 멈춘다.

돌리고 나서 확인해 보니 곡·콘티·템플릿 로그로 제대로 갈렸고, 빠져 있던 수정 검수 action들이 곡 로그에 정상으로 나타났다.

---

## 화면 라벨은 여전히 손이 간다

여기까지 오면 피드 분류는 자동이지만, 로그를 한국어로 보여주는 라벨(`create_song` → "곡 등록")은 자동이 안 된다. 번역은 사람이 정해야 한다.

대신 세 화면에 흩어져 중복·누락되던 라벨 맵을 한 곳으로 모았다. 새 action의 라벨은 여기 한 줄만 추가하면 되고, 없어도 action 문자열이 그대로 보여 화면이 깨지진 않는다.

```ts
export const LOG_LABEL: Record<string, string> = {
  create_song: "곡 등록", request_edit_song: "수정 요청", ...
};
// 화면: LOG_LABEL[l.action] ?? l.action
```

자동으로 만들 수 있는 것(분류)과 사람이 정해야 하는 것(번역)을 구분하고, 후자는 한 곳에 모아 두는 게 현실적인 절충이었다.

---

## 로그가 항상 같은 말을 하고 있었다

자막 위치만 바꿨는데 수정 기록엔 "배경 그라데이션 · 글꼴 G마켓 산스"가 떴다. 배경을 건드린 적이 없는데도.

코드를 보니 무엇을 바꿨든 로그 내용을 고정으로 만들고 있었다.

```ts
// 저장 요청에 담겨 온 값을 그대로 나열 — 실제 변경 여부와 무관
const changed = [
  `배경 ${mode === "solid" ? "단색" : "그라데이션"}`,
  `글꼴 ${body.font_face}`,
];
```

화면은 저장할 때 모든 필드를 보낸다. 그래서 자막 위치만 만졌어도 배경·글꼴 값이 요청에 다 들어 있고, 로그는 그걸 그대로 찍었다. "무엇을 보냈나"를 기록한 셈인데, 알고 싶은 건 "무엇이 바뀌었나"다.

고치는 방법은 저장 직전 값과 비교하는 것이다.

```ts
const before = await getCurrentPreset();
// ... 저장 ...
const changed = fields
  .filter((k) => String(before[k]) !== String(next[k]))
  .map((k) => LABEL[k]);
await logTemplate(env, uid, "edit_template", changed.join(" · ") || "변경 없음");
```

이제 자막 위치만 바꾸면 "자막 위치"만 남는다. 로그가 실제와 어긋나면 사람은 로그 전체를 안 믿게 된다. 로그의 값어치는 정확함에서 나온다.

한 가지, 자막 바 이미지처럼 값이 큰 건 내용 비교 대신 "바꿨는지 여부"로만 판단했다. 전부 비교할 필요는 없고, 사람이 알아야 할 수준으로만 남기면 된다.

---

## 설정이 놓인 자리가 뜻을 바꾼다

자막 세로 위치 조절을 처음엔 "좌석 안내" 설정 섹션 안에 넣었다. 만들 때는 좌석 안내 작업을 하다 같이 넣은 거라 자연스러워 보였다.

그런데 이 값은 좌석 안내만이 아니라 제목·가사까지 자막 줄 전체를 움직인다. 좌석 안내 섹션 안에 있으니 "좌석 안내 문구의 위치"로 읽힌다. 기능은 맞는데 놓인 자리가 틀린 뜻을 만들었다.

코드는 한 줄도 안 바꾸고 UI에서 별도 "자막 위치" 섹션으로 빼는 것으로 끝냈다.

```text
[좌석 안내]  문구: ______
[자막 위치]  세로 위치: __ pt   ← 별도 섹션. "제목·가사·좌석 안내 전체를 옮깁니다"
```

설정이 무엇에 영향을 주는지는 라벨만이 아니라 어느 묶음에 들어 있느냐로도 전달된다. 같은 입력칸이라도 어느 섹션에 두느냐에 따라 사용자가 이해하는 범위가 달라진다.

---

## 두 문제의 공통점

둘 다 동작은 멀쩡했다. 로그는 잘 쌓였고, 자막 위치 조절도 제대로 작동했다. 틀린 건 "사람에게 전달되는 것"이었다 — 로그는 틀린 내용을 말했고, 설정은 틀린 범위를 암시했다.

기능이 맞게 도는지만 보면 이런 걸 놓친다. 만드는 사람은 맥락을 다 아니까 로그가 좀 부정확해도, 설정이 어느 섹션에 있어도 알아본다. 정작 그 화면을 처음 보는 사람 기준으로 다시 봐야 드러난다. 로그 TIL(14번)에서 "읽는 시점 기준으로"라고 적었는데, 그게 로그만이 아니라 화면 전체에 해당하는 이야기였다.

---

## 설정을 만지는 동안 미리보기가 화면에 남게

자막 위치 값을 조절하는데, 설정칸은 아래에 있고 미리보기는 위에 있어서 값을 바꿀 때마다 스크롤을 오르내려야 했다. 미리보기가 스크롤을 따라오면 된다.

```css
.tpl-stage {
  position: sticky;
  top: 0;
  background: #fff; /* 아래로 스크롤되는 설정이 미리보기 뒤로 비치지 않게 */
}
```

`position: sticky`는 평소엔 제자리에 있다가 스크롤이 지정 위치(`top: 0`)에 닿으면 거기 붙는다. 한 가지 빠뜨리기 쉬운 건 배경이다. sticky 요소는 반투명이 아니어도 뒤 내용이 겹쳐 지나가므로, 배경색을 채워야 스크롤되는 설정이 미리보기 뒤로 비쳐 보이지 않는다.

sticky가 작동하려면 그 요소가 스크롤되는 부모 안에 있어야 하고, 부모가 잘릴 만큼 충분히 길어야 한다. 편집 영역이 세로로 길어서 자연히 만족됐다.

---

## inline-flex는 세로 기준선이 어긋난다

콘티 곡 옆에 붙인 "착석" 토글(체크박스 + 글자)이 곡 제목보다 살짝 위로 떠 보였다.

토글은 `inline-flex`였다. 글줄에 얹히는 인라인 요소인데, 안에 체크박스와 글자가 flex로 들어 있다. 이런 요소의 세로 기준선(baseline)은 주변 글자의 기준선과 잘 안 맞는다.

```css
.conti-seat {
  display: inline-flex;
  align-items: center;
  vertical-align: middle; /* 글줄 가운데에 맞춘다 */
}
```

`vertical-align: middle`로 요소 상자의 가운데를 글줄 가운데에 맞췄다. 인라인 요소 안에 flex를 넣으면 바깥(글줄과의 정렬)과 안(요소 내부 정렬)을 따로 챙겨야 한다는 걸 잊고 있었다. `align-items`는 안쪽만, `vertical-align`은 바깥쪽만 담당한다.

---

## 막지 않고 묻기

이미 콘티에 담긴 곡을 또 담으려 하면 실수일 수 있다. 그런데 예배에선 같은 곡을 일부러 두 번 넣기도 한다(1절 후렴 다음에 또 부르는 식). 그래서 막지 않고 확인만 한다.

```ts
if (
  items.some((i) => i.type === "song" && i.song.id === song.id) &&
  !confirm(`"${song.title}"은(는) 이미 이 콘티에 있습니다. 그래도 추가할까요?`)
)
  return;
```

확인은 담는 함수 한 곳에 넣었다. 곡 목록의 버튼과 드래그앤드롭이 둘 다 이 함수를 거치므로, 두 경로가 자동으로 같이 걸린다. UI 이벤트마다 확인을 붙이면 하나를 빠뜨리는데, 실제 동작하는 함수 하나에 두면 그 함수를 부르는 모든 경로가 덮인다.

"실수 방지"와 "정당한 반복"이 부딪힐 때, 막아 버리면 후자가 불편해진다. 물어보는 건 둘 다 만족시킨다.

---

## pt 값이 실제로 얼마나 옮겨졌는지 눈으로 확인

자막 세로 위치는 pt로 받는데, PPT 슬라이드 좌표는 인치다. 텍스트 상자의 y를 `pt/72`인치만큼 내린다.

```ts
y: 6.3 + tpl.subtitle_dy / 72, // 미세조정 pt를 in으로
```

이게 실제로 슬라이드에 반영되는지는 뽑은 파일을 열어 확인했다. pptx는 zip이라 풀면 XML이 나오고, 좌표는 EMU라는 단위로 들어 있다(1인치 = 914400 EMU, 1pt = 12700 EMU).

```text
오프셋 0  → y = 5760720  (6.3in)
오프셋 10 → y = 5887720
차이 127000 = 정확히 10pt × 12700
```

숫자가 맞아떨어지는 걸 보고서야 "환산이 맞다"고 확신했다. 눈으로 "대충 내려갔네"가 아니라 단위까지 맞춰 확인하면, pt→인치→EMU를 거치며 어딘가 틀어지지 않았다는 걸 확실히 할 수 있다.

---

## 같은 코드가 여섯 곳에 있었다

날짜를 화면에 보여주는 함수가 여섯 파일에 똑같이 들어 있었다.

```ts
function fmt(s) {
  return new Date(s.replace(" ", "T") + "Z").toLocaleString("ko-KR");
}
```

복붙이 문제인 건 "줄 수가 많아서"가 아니라, 고칠 일이 생겼을 때 여섯 곳을 다 고쳐야 하고 하나를 빠뜨리기 때문이다. 그리고 이 함수는 실제로 예전에 버그를 냈던 코드다. 시각 형식이 어긋나 `Invalid Date`가 뜬 적이 있는데(TIL 3), 그때 고친 건 마침 그 화면의 사본 하나였다. 나머지 다섯에 같은 함정이 남아 있었을 수도 있다.

한 곳으로 모으면 고칠 데도 한 곳, 다시 틀릴 여지도 한 곳이 된다.

```ts
// format.ts — 이 변환은 여기서만
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "-";
  return new Date(s.replace(" ", "T") + "Z").toLocaleString("ko-KR");
}
```

두 가지 변형이 있었다. null을 "-"로 처리하는 것과 안 하는 것. 합칠 땐 더 방어적인 쪽(nullable)으로 맞추면 양쪽 호출부가 다 안전해진다. 좁은 시그니처를 넓은 것에 흡수시키는 방향이다.

같은 정리를 서버 쪽 `Math.min(hi, Math.max(lo, ...))`에도 했다. 값 범위를 제한하는 코드가 필드마다 인라인으로 흩어져 있었는데, `clamp(v, lo, hi, fallback)` 하나로 묶었다. 크기 전용 `size()`도 그 위에 얹었다.

```ts
function clamp(v, lo, hi, fallback) {
  return Math.min(hi, Math.max(lo, Number(v) || fallback));
}
const size = (v, fallback) => clamp(v, 8, 200, fallback);
```

---

## 상태가 서른 개를 넘었다

자막 템플릿 화면은 배경·글꼴·크기·위치·자막 바를 다 정하는 곳이라, 기능을 붙일 때마다 `useState`(화면에 반영되는 상태 값)가 하나씩 늘었다. 어느새 서른 개가 넘어 있었다.

```ts
const [mode, setMode] = useState(...);
const [solid, setSolid] = useState(...);
const [fontFace, setFontFace] = useState(...);
const [titleSize, setTitleSize] = useState(...);
// ... 열여섯 개가 더
```

문제는 개수만이 아니었다. 값을 바꿀 때마다 "저장 안 됨" 표시를 켜야 해서, 모든 핸들러가 이런 짝이었다.

```tsx
onChange={(e) => { setTitleSize(Number(e.target.value)); touch(); }}
```

`setX`와 `touch()`를 항상 같이 불러야 하는데, 새 필드를 추가하며 `touch()`를 빠뜨리면 그 값은 바꿔도 저장 경고가 안 뜬다. 조용히 어긋난다.

저장 함수의 의존성 배열(이 값들이 바뀔 때만 다시 실행하라는 목록)도 열여덟 개로 불어 있었다. 하나 늘 때마다 여기도 손대야 했다.

```ts
}, [mode, solid, dir, sortedStops, fontFace, fontColor, fontSize,
    charSpacing, seatNotice, titleSize, /* ... 8개 더 */, reloadLogs]);
```

---

## 하나로 묶되, 읽는 쪽은 안 건드린다

저장 대상이 되는 값들을 객체 하나로 모았다. 관건은 이미 잘 도는 JSX(JS 안에 HTML처럼 쓰는 문법)·미리보기 코드를 안 건드리는 것이었다.

핵심은 구조분해다. 객체로 묶되, 쓰기 직전에 개별 변수처럼 풀어 놓으면 읽는 코드(`value={titleSize}`, `pxPt(fontSize)` 등)는 한 글자도 안 바뀐다.

```ts
const [settings, setSettings] = useState<Settings>(INITIAL);
const { mode, solid, fontFace, titleSize, fontSize, /* ... */ } = settings;
// 아래 JSX는 예전 그대로 titleSize·fontSize를 읽는다
```

바꾸는 건 한 곳으로 모았다. 병합과 "저장 안 됨" 표시를 함께 하는, useCallback(함수를 재사용하도록 기억해 두는 것)으로 만든 `set` 하나.

```ts
const set = useCallback((patch: Partial<Settings>) => {
  setSettings((s) => ({ ...s, ...patch }));
  setDirty(true);
}, []);
```

그러면 핸들러가 이렇게 짧아진다. `touch()`를 따로 부를 일이 없으니 빠뜨릴 수도 없다.

```tsx
onChange={(e) => set({ titleSize: Number(e.target.value) })}
```

저장 함수의 의존성도 세 개로 줄었다. 열여섯 개 값이 객체 하나에 들어 있으니, 그 객체 하나에만 의존하면 된다.

```ts
}, [settings, sortedStops, reloadLogs]);
```

정리하면, 상태를 묶는 리팩터링에서 바꿔야 할 건 "쓰는 법"이지 "읽는 법"이 아니다. 구조분해가 그 경계를 그어 줘서, 큰 화면인데도 실제로 손댄 곳은 핸들러들뿐이었다.

---

## 반복되는 UI는 데이터로

크기·글꼴을 정하는 줄이 다섯 개(가사·제목·구분·좌석·구간) 있었는데, 거의 똑같은 마크업이 다섯 번 반복됐다. 이걸 배열로 빼고 한 번만 그린다.

```ts
const ELEMENTS = [
  { key: "lyric",  field: "fontSize",  label: "가사",   note: "..." },
  { key: "title",  field: "titleSize", label: "제목",   note: "" },
  // ...
] as const;

{ELEMENTS.map((el) => (
  <ElementRow ... onSize={(v) => set({ [el.field]: v })} />
))}
```

`field`에 Settings의 키를 담아 두면, 각 줄이 어느 값을 바꿀지 데이터가 들고 있다. 줄을 하나 더 늘릴 때 마크업을 복사하는 게 아니라 배열에 한 줄 추가하면 된다. 반복되는 화면은 코드로 반복하지 말고 데이터로 펴는 게 낫다.

---

## 언제 정리하나

이 정리들은 기능을 붙이는 도중이 아니라 하루 끝에 몰아서 했다. 만드는 중엔 무엇이 진짜 중복이고 무엇이 우연히 비슷한 건지 아직 안 보인다. 날짜 포맷터가 여섯 곳에 생긴 것도, 여섯 번째를 붙이고 나서야 "이거 매번 똑같네"가 확실해졌다.

너무 일찍 묶으면 잘못된 추상을 만들고, 너무 늦게 묶으면 빠뜨린 사본이 버그를 낸다. 같은 것이 세 번쯤 보이면 그때가 묶을 때라는 감각으로, 기능이 일단락된 자리에서 정리했다.

동작은 하나도 안 바뀌었다. 리팩터링은 그래야 한다 — 겉보기 결과가 같은 걸 확인하는 게(여기선 타입체크와 빌드) 안전망이었다.

---

## 도메인 소유권으로 권한을 가른다

처음엔 "잠긴 걸 왜 열지"였는데, 이유를 들으니 납득됐다. 이 앱에서 하단 자막 바는 실제 방송에 나가는 자막 영역이고, 착석 문구도 그 자막의 일부다. 자막은 자막 담당자의 소관이다.

그러면 잠금의 의미가 갈린다. 콘티 승인 잠금은 "곡 구성·순서를 확정했다"는 뜻이지, "자막까지 못 건드린다"는 뜻이 아니었다. 곡 구성은 승인권자 소관이고 자막은 자막 담당자 소관이라, 같은 콘티라도 누가 무엇을 건드릴 수 있는지가 다르다.

권한을 "이 화면은 잠겼나"로만 보면 이게 안 보인다. "이 값은 누구 소관인가"로 봐야 잠금을 넘어서는 예외가 자연스럽게 나온다.

---

## 전체를 막는 잠금은 두고, 한 가지만 여는 좁은 길

착석은 원래 콘티 전체를 저장하는 경로(모든 항목을 다시 쓰는 API)에 얹혀 있었다. 그 경로는 승인 잠금이 막는다. 여기서 착석만 통과시키려고 그 경로의 잠금을 느슨하게 하면, 곡 구성까지 같이 열려 버린다.

그래서 잠금을 건드리지 않고, 착석 한 필드만 반영하는 좁은 엔드포인트를 따로 뒀다.

```ts
// 착석 한 항목만. 승인 콘티는 자막 담당자만, 미승인은 전 팀.
setlists.put("/:id/items/:itemId/seat-notice", async (c) => {
  const status = await statusOf(c, id);
  if (status === "approved" && !isSubtitleManager(user))
    return c.json({ error: "locked" }, 423);
  await c.env.DB.prepare(
    "UPDATE setlist_items SET seat_notice = ? WHERE id = ? AND setlist_id = ? AND item_type = 'song'",
  ).bind(value ? 1 : 0, itemId, id).run();
  // ...
});
```

기존의 넓은 경로(전체 저장 + 편집 잠금)는 그대로 두고, 예외는 좁은 경로로 냈다. 예외를 만들 때 기존 규칙을 느슨하게 하면 그 규칙이 지키던 다른 것까지 새어 나간다. 규칙은 조이고, 예외는 별도 문으로 내는 게 안전하다.

---

## 중복될 수 있는 대상은 자연 키로 못 짚는다

착석을 바꾸려면 "콘티의 이 곡"을 서버에 지정해야 한다. 곡 번호(song_id)를 보내면 될 것 같았는데, 안 됐다.

예배에선 같은 곡을 두 번 담기도 한다(1절 후렴 다음에 또 부르는 식). 그래서 한 콘티 안에 song_id가 같은 항목이 둘일 수 있다. song_id로 UPDATE하면 둘 다 바뀐다.

곡을 가리키는 song_id는 "무엇인가"를 말하지, "어느 것인가"를 말하지 못한다. 중복이 허용되는 순간 자연 키(값에서 온 키)로는 개별 항목을 못 짚는다. 그래서 항목 자체의 행 id(setlist_items의 기본 키)로 지정했다.

```sql
UPDATE setlist_items SET seat_notice = ?
WHERE id = ? AND setlist_id = ? AND item_type = 'song'
```

`setlist_id`와 `item_type`을 조건에 같이 둔 건, 넘어온 item_id가 정말 이 콘티의 곡 항목인지 확인하려는 것이다. 남의 콘티 항목 id를 넣어도 안 바뀌게.

---

## 그 id를 언제 믿을 수 있나

행 id로 짚기로 하니 새 걱정이 생겼다. 이 앱은 콘티를 저장할 때 항목을 전부 지우고 다시 넣어서, 저장할 때마다 항목 id가 새로 생긴다. 클라이언트가 들고 있는 id가 금방 옛것이 될 수 있다.

그런데 이 기능은 잠긴 콘티에서만 쓴다. 잠긴 콘티는 편집이 막혀 항목이 안 바뀐다. 그러니 화면을 연 시점의 항목 id가 그대로 유효하다.

식별자의 신뢰도가 데이터 상태에 달려 있었다. 편집 가능한 콘티에선 id가 흔들리지만, 잠긴 콘티에선 고정이다. 마침 예외를 여는 곳이 잠긴 콘티라 id가 안정적이었고, 편집 가능한 경우는 기존 전체 저장 경로가 처리하니 흔들리는 id를 쓸 일이 없었다. 기능의 조건과 식별자의 신뢰 구간이 겹쳐서 성립한 셈이다.

덤으로, 이 id는 서버가 콘티 상세를 줄 때 이미 항목마다 실어 보내던 값이었다. 클라이언트가 안 쓰고 버리고 있었을 뿐이다. 필요해지니 그대로 실어 나르기만 하면 됐다.

---

## 한 동작을 상태에 따라 두 길로

착석 토글은 한 버튼이지만, 콘티 상태에 따라 다른 길로 간다.

```ts
if (locked) {
  if (!isSubtitleManager) return;      // 잠김: 자막 담당자만, 착석 전용 엔드포인트로
  await setSeatNotice(activeId, target.itemId, value);
  apply();
  return;
}
// 미승인: 기존 전체 저장 경로
```

같은 UI 동작이라도 상황에 따라 다른 경로가 맞을 때가 있다. 잠긴 콘티는 좁은 문으로, 열린 콘티는 원래 문으로. 하나로 억지로 합치지 않았다.

그리고 화면에서 체크박스를 막는 것(`disabled = locked && !자막담당자`)과 서버가 거절하는 것(승인 콘티 + 비담당자 → 423)을 짝으로 뒀다. 화면만 막으면 요청을 직접 보내는 것으로 넘어가니, 화면은 안내고 방어는 서버다.

---

## 요약

- "화면을 벗어난다"는 앱 내 이동·자체 닫기·브라우저 이탈 셋. 브라우저 이탈만 `beforeunload`로 따로 막는다
- Context Provider를 렌더하는 부모는 그 Context를 `useContext`로 못 쓴다. 부모가 값을 직접 쥐고 자식에게만 내려준다
- 공통 인터페이스는 `dirty: boolean` 하나지만, 판정하는 법은 데이터 모양마다 다르다. 공통화는 다를 부분과 같을 부분을 가르는 일
- 나가는 동작을 래퍼로 감싸면 문구·판정이 한 곳에 모인다
- 잃을 게 없는 화면(즉시 저장)엔 가드를 붙이지 않는다
- 로그를 남기는 건 공통인데 "어디에 보여줄지"를 별도 배열로 정하면, 새 동작마다 두 곳을 고쳐야 하고 빠뜨린다
- 분류 기준(entity)을 기록하는 그 자리에 두면, 기능을 추가하는 순간 분류도 정해진다. 유지할 목록이 없으니 누락도 없다
- 한 칸에 필터 키와 설명 두 역할을 시키지 말 것. 칼럼을 나누면 둘 다 깨끗해진다
- `CAST('3|...' AS INTEGER)` = 3 — 앞 숫자만 뽑는다. 백필에 유용
- 자동화되는 것(분류)과 안 되는 것(번역)을 구분하고, 후자는 한 곳에 모은다
- 로그는 "무엇을 보냈나"가 아니라 "무엇이 바뀌었나"를 남긴다. 저장 전/후를 비교해 달라진 것만
- 로그가 실제와 어긋나면 사람은 로그 전체를 안 믿는다. 정확함이 로그의 값어치다
- 전부 비교할 필요는 없다. 큰 값은 "바꿨는지 여부"로만 — 사람이 알아야 할 수준으로
- 설정이 무엇에 영향을 주는지는 라벨만이 아니라 어느 섹션에 있느냐로도 전달된다
- 동작이 맞아도 "사람에게 전달되는 것"이 틀릴 수 있다. 처음 보는 사람 기준으로 다시 본다
- `position: sticky`로 미리보기를 스크롤에 붙인다. 배경색을 채워야 뒤 내용이 안 비친다
- inline 요소 안에 flex를 넣으면 바깥 정렬(`vertical-align`)과 안 정렬(`align-items`)을 따로 챙긴다
- 정당한 반복이 있는 동작은 막지 말고 확인만. 확인은 UI 이벤트가 아니라 실제 동작 함수에 두면 모든 경로가 덮인다
- 단위 변환(pt→in→EMU)은 결과 파일의 수치를 뽑아 딱 맞아떨어지는지로 검증한다
- 복붙의 비용은 줄 수가 아니라 "고칠 때 다 고쳐야 하고 하나를 빠뜨린다"는 것. 버그를 낸 적 있는 코드라면 더욱
- 두 변형을 합칠 땐 더 방어적인 쪽(nullable 등)으로 흡수시킨다
- 상태를 객체로 묶되 구조분해로 풀면, 읽는 코드는 안 건드리고 쓰는 법만 바꾼다
- 병합·부수효과(dirty 표시)를 `set` 한 곳에 두면 "짝지어 부르다 빠뜨리는" 실수가 사라진다
- 반복되는 UI는 배열로 펴고 한 번만 그린다. 늘릴 때 마크업이 아니라 데이터 한 줄
- 정리는 기능이 일단락된 뒤에. 같은 게 세 번 보이면 묶을 때. 동작이 안 바뀌는 걸 빌드로 확인한다
- 권한은 "이 화면이 잠겼나"가 아니라 "이 값은 누구 소관인가"로 본다. 그래야 잠금을 넘는 예외가 자연스럽다
- 예외는 기존 규칙을 느슨하게 해서 내지 말고, 좁은 별도 경로로 낸다. 규칙을 풀면 그게 지키던 것까지 샌다
- 중복이 허용되는 대상은 자연 키(값에서 온 키)로 개별을 못 짚는다. 행 id로 지정한다
- 식별자의 신뢰도는 데이터 상태에 달릴 수 있다. 그 기능이 쓰이는 조건과 id가 안정적인 구간이 겹치는지 본다
- 같은 동작도 상태에 따라 다른 경로가 맞을 수 있다. 화면 차단과 서버 거절은 짝으로
