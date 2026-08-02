---
layout: post
title: 콘티온 Conti On TIL 3
date: 2026-07-21
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - SQL
  - TypeScript
  - React
  - CSS
description: 콘티온 하루치 작업 — 로그를 읽는 시점 기준으로 남기기, 시각 형식을 한 곳에서 정하기, 설정 저장 방식의 선택, 화면 쪽 형식 조립과 정렬에서 배운 것들.
---
콘티온을 손보며 걸렸던 것들을 모았다. 로그와 시각 형식처럼 저장하는 방식에서 갈리는 문제부터, 설정을 어떻게 담느냐, 화면에서 형식을 조립하고 정렬을 맞추는 일까지 이어진다.

---

## 로그는 남기는 시점이 아니라 읽는 시점 기준으로

접속 로그를 보다가 이런 줄을 발견했다.

```text
2026-07-21 23:58  홍길동  set_song_manager  10:1
2026-07-22 00:34  홍길동  rename_setlist    3
```

내가 만든 로그인데 무슨 뜻인지 바로 안 읽혔다. 앞은 "사용자 10에게 곡 관리 권한 부여", 뒤는 "3번 콘티의 이름을 바꿈"이다. 만들 때는 명확했는데 며칠 뒤에 보니 아니었다.

로그를 남길 때는 맥락이 머릿속에 다 있다. 어떤 화면에서 무슨 버튼을 눌러 이 코드가 도는지 알고 있으니 id(항목마다 붙는 고유 번호)만 있어도 충분해 보인다.

문제는 로그를 읽는 시점이 정반대라는 것이다. 그때는 맥락이 없다. "10"이 누구인지 알려면 사용자 테이블을 따로 뒤져야 하는데, 그 사용자가 이미 지워졌으면 영영 알 수 없다.

기준을 이렇게 바꿨다. 이 줄만 떼어놓고 봐도 무슨 일이 있었는지 알 수 있는가.

```ts
// 이전 — 만들 때만 명확
await logAction(c.env, me.id, "set_song_manager", `${id}:${value ? 1 : 0}`);

// 이후 — 읽을 때 알 수 있게
await logAction(c.env, me.id, "set_song_manager", await grantDetail(c, id, value));
// → "김철수(10) 부여"
```

이름을 남기면 그 사용자가 나중에 지워져도 기록은 남는다. id를 괄호에 같이 둔 건 동명이인 때문이다.

---

## 그런데 그 값으로 거르고 있었다

콘티 이름 변경도 같은 문제라 "이전 이름 → 새 이름"으로 바꾸려 했는데, 여기서 막혔다. 콘티별 로그를 보여주는 조회가 이렇게 생겼다.

```sql
SELECT ... FROM access_logs a
WHERE a.detail = ? AND a.action IN (...)
```

`detail`이 곧 콘티 id라는 전제로 거르고 있었다. 이름으로 바꾸면 이 조회가 통째로 깨진다.

같은 칸이 두 가지 일을 하고 있었던 셈이다. 하나는 필터 키, 하나는 사람이 읽을 설명. 원래는 칼럼을 나누는 게 맞지만, 이미 쌓인 기록이 있고 종류마다 형태가 달라서 형식으로 풀었다.

```ts
// "3|주일 콘티 → 예배 콘티"
await logAction(c.env, user.id, "rename_setlist", `${id}|${before} → ${after}`);
```

```sql
WHERE (a.detail = ? OR a.detail LIKE ?) AND a.action IN (...)
-- bind: id, `${id}|%`
```

앞이 id, `|` 뒤가 설명이다. 기존 기록(id만 있는 것)은 첫 번째 조건에, 새 기록은 두 번째에 걸린다. 마이그레이션 없이 둘 다 살아 있다.

깔끔하진 않다. 다만 "한 칸에 두 역할을 지우면 어느 쪽도 못 쓰게 된다"는 게 이번의 교훈이고, 형태를 정해 둔 덕에 나중에 칼럼을 나눌 때도 파싱해서 옮기면 된다.

---

## 안 보이는 것과 묻힌 것

다른 팀원들 기록이 목록에 안 뜨는 걸 발견했다. 필터링 버그인 줄 알았는데, 코드에는 사용자로 거르는 조건이 아예 없었다. 그래서 데이터를 봤다.

```sql
SELECT u.name, COUNT(*) AS n
FROM access_logs a LEFT JOIN users u ON u.id = a.user_id
GROUP BY a.user_id ORDER BY n DESC;
```

전체 기록의 대부분이 내 것이었다. 화면은 최근 200건을 가져오는데 그중 대다수가 나였고, 다른 사람 기록은 한두 건씩 그 사이에 드물게 흩어져 있었다.

버그가 아니라 비율 문제였다. 목록에 있긴 한데 눈에 안 띈 것이다.

"안 보인다"는 증상은 원인이 여러 갈래다. 없거나(데이터가 안 쌓임), 걸러졌거나(쿼리), 묻혔거나(비율). 코드만 보면 두 번째까지밖에 확인이 안 되고, 세 번째는 실제 데이터를 세어봐야 나온다.

고친 방향은 두 가지다. 가져오는 양을 늘리고, 사람으로 걸러 볼 수 있게 했다.

```tsx
const logUserNames = [...new Set(logs.map((l) => l.user_name).filter(Boolean))] as string[];
const shownLogs = logUser ? logs.filter((l) => l.user_name === logUser) : logs;
```

`Set`으로 중복을 없애 드롭다운 항목을 만든다. 목록을 서버에서 따로 받지 않고 이미 가져온 로그에서 뽑는 이유는, 로그에 안 나오는 사람은 골라 봐야 빈 화면이기 때문이다.

---

## 곁들여 — 어디까지 로그로 보여줄까

이번에 자막 편집 이력과 템플릿 수정 이력을 각각 그 화면에 붙였다. 전체 로그 화면이 이미 있는데도 따로 만든 이유가 있다.

전체 로그는 감사(監査)용이다. 전부 시간순으로 쌓인다. 반면 자막 편집 화면에서 알고 싶은 건 "이 곡을 누가 마지막으로 손댔나" 하나뿐이다. 전체 로그에서 그걸 찾으려면 곡을 특정하고 액션을 걸러야 한다.

그래서 좁은 질문에는 좁은 조회를 따로 뒀다.

```sql
WHERE a.detail = ? AND a.action = 'edit_song_styles'
  AND a.created_at > datetime('now', '-1 year')
```

같은 테이블을 읽지만 질문이 다르면 조회도 화면도 나누는 게 낫다는 걸 배웠다.

---

## 한 칸만 형식이 달랐다

팀원 목록의 "마지막 로그인"이 전부 `Invalid Date`로 떴다. 값이 없는 것도 아니었다. DB에는 멀쩡히 들어 있었다.

DB를 열어 보니 이랬다.

```text
created_at    : 2026-07-19 10:08:34
last_login_at : 2026-07-21T13:52:14.288Z
```

다른 시각 값은 전부 SQLite가 만든 형식인데 이것만 달랐다. 저장하는 코드가 이랬기 때문이다.

```ts
// ❌ 이 칸만 JS가 만든 문자열
await c.env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
  .bind(new Date().toISOString(), user.id)
  .run();
```

```ts
// ✅ 나머지와 같이 DB가 만들게
await c.env.DB.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")
  .bind(user.id)
  .run();
```

두 형식 다 그 자체로는 문제가 없다. 문제는 화면이 하나만 가정하고 있었다는 것이다.

---

## 변환이 두 번 적용됐다

SQLite의 `datetime('now')`는 `2026-07-19 10:08:34`를 준다. 공백으로 구분되고 시간대 표기가 없다. 이대로 `new Date()`에 넣으면 브라우저가 로컬 시각(그 PC에 설정된 시간대)으로 읽어서 9시간이 어긋난다(한국 기준).

그래서 화면에는 이런 변환기가 있었다.

```ts
function fmt(s: string | null) {
  if (!s) return "-";
  return new Date(s.replace(" ", "T") + "Z").toLocaleString("ko-KR");
}
```

공백을 `T`로 바꾸고 `Z`를 붙여 "이건 UTC(세계 표준시)"라고 알려주는 것이다. SQLite 형식에는 맞다.

그런데 이미 ISO(국제 표준 시각 표기, `2026-07-21T13:52:14.288Z`처럼 T와 Z가 붙은 형태) 형식인 값이 들어오면 이렇게 된다.

```text
2026-07-21T13:52:14.288Z
→ replace(" ", "T") 는 바꿀 공백이 없어 그대로
→ + "Z"
→ 2026-07-21T13:52:14.288ZZ   ← Z가 두 개
→ Invalid Date
```

`replace`가 조용히 아무것도 안 한 게 핵심이다. 에러도 없고 형식만 슬쩍 망가진다.

---

## 형식은 한 곳에서만 정한다

같은 문제가 검수 대기 시각(`review_requested_at`)에도 있었다. 지금은 대기 중인 곡이 없어서 안 드러났을 뿐이다. 찾아보니 `toISOString()`(날짜를 표준 문자열로)을 쓰는 자리가 딱 그 둘이었다.

```bash
grep -rn "toISOString" worker/
```

배운 건 이거다. 값을 만드는 곳이 여럿이면 형식이 갈린다. DB에 넣는 시각은 전부 DB가 만들게 하면(`datetime('now')`) 갈릴 여지가 없다.

기존 값도 맞춰 줘야 했다.

```sql
UPDATE users
SET last_login_at = replace(substr(last_login_at, 1, 19), 'T', ' ')
WHERE last_login_at LIKE '%T%';
```

`substr(…, 1, 19)`로 밀리초와 `Z`를 자르고 `T`를 공백으로 바꾼다. `WHERE`로 ISO 형태만 골라서, 여러 번 돌려도 이미 바뀐 값은 건드리지 않는다.

ISO의 시각이 UTC이고 `datetime('now')`도 UTC라 값 자체는 그대로 옮겨진다. 이게 아니었으면 시간대 변환까지 해야 했다.

---

## 서버에서 읽을 때도 같은 함정

고치고 나서 이 값을 읽는 다른 자리를 찾았다. 30일 무접속이면 계정을 잠그는 판정이다.

```ts
// ❌ 시간대 표기가 없으면 로컬로 읽힌다
const inactiveDays = (Date.now() - Date.parse(user.last_login_at)) / 86400000;
```

`Date.parse("2026-07-21 13:52:14")`(문자열을 날짜로 해석)는 표기가 없으니 실행 환경의 로컬 시각으로 해석한다. 한국이면 9시간만큼 어긋난다. 30일 판정에서 9시간은 치명적이진 않지만 틀린 건 틀린 것이다.

```ts
// ✅ UTC라고 명시해서 읽는다
const lastLogin = Date.parse(user.last_login_at.replace(" ", "T") + "Z");
const inactiveDays = (Date.now() - lastLogin) / 86400000;
```

날짜 문자열은 그 자체로 시점을 확정하지 못한다. 시간대 표기가 없으면 읽는 쪽이 마음대로 정한다. 저장할 때 UTC로 통일했으면 읽을 때도 UTC라고 말해 줘야 한다.

---

## 비워 둔 값을 "기본을 따른다"로 쓰기

자막 PPT의 글자 크기와 글꼴을 담당자가 직접 정할 수 있게 만들었다. 코드에 박혀 있던 값을 설정으로 빼는 단순한 작업 같았는데, 설정을 "어떻게 저장하느냐"에서 갈리는 지점이 여럿 있었다.

요소마다(가사·제목·번호·안내·구간) 글꼴을 따로 정할 수 있게 하되 기본은 메인 글꼴을 쓰기로 했다. 두 가지 방법이 있다.

첫째, 설정할 때 메인 글꼴 값을 복사해 넣는다. 모든 요소가 항상 구체적인 값을 갖는다.

둘째, 비워 두고 읽을 때 메인을 가져온다.

처음엔 첫째가 단순해 보였다. 읽는 쪽에 분기가 없으니까. 그런데 이런 상황을 생각하니 답이 나왔다.

메인 글꼴을 다른 글꼴로 바꾼다. 첫째 방식이면 이미 복사된 값들은 그대로다. 다섯 군데를 하나씩 다시 고쳐야 한다. 둘째 방식이면 비워 둔 것들이 전부 따라 바뀐다.

```sql
-- NULL = 메인 글꼴(font_face)을 따른다.
-- 값을 복사해 두지 않는 이유: 복사하면 나중에 메인 글꼴을 바꿔도 따라오지 않는다.
ALTER TABLE ppt_presets ADD COLUMN lyric_font TEXT;
ALTER TABLE ppt_presets ADD COLUMN title_font TEXT;
```

```ts
// 읽는 쪽은 한 줄
const face = (f: string | null) => f || tpl.font_face;
```

저장할 때 빈 문자열을 NULL(값이 아예 비어 있음을 뜻하는 DB 표시)로 바꾸는 것도 잊으면 안 된다. 화면의 select는 "(메인 글꼴)"을 빈 문자열로 다루는데, 그대로 저장하면 `""`가 들어가서 의미가 애매해진다.

```ts
function face(v: string | null | undefined): string | null {
  const t = (v ?? "").trim().slice(0, 60);
  return t || null; // 빈 문자열 → NULL
}
```

정리하면 이렇다. 값을 복사하면 그 순간의 사진이 되고, 비워 두면 살아 있는 참조가 된다. 어느 쪽이 맞는지는 "원본이 바뀌면 따라가야 하나"로 갈린다.

부수효과로 개념도 정리됐다. 원래 `font_face`는 "가사 글꼴"이었는데, 가사도 자기 override(기본을 덮어쓰는 개별 설정값)를 갖게 되면서 순수한 기본값이 됐다. 화면 라벨도 "글꼴"에서 "메인 글꼴"로 바꿨다.

---

## 다른 값에서 계산해 박아 둔 값(파생값 하드코딩)은 나중에 빚이 된다

구간 슬라이드의 글자 크기는 제목의 2배로 계산하고 있었다.

```ts
fontSize: TITLE_SIZE * 2,
```

만들 때는 합리적이었다. 상수가 하나 줄고, 제목을 키우면 구간도 비례해 커지니 일관돼 보였다.

그런데 제목 크기를 설정으로 빼는 순간 문제가 드러났다. 담당자가 제목을 40에서 50으로 올리면 구간이 80에서 100으로 같이 커진다. 이건 설정한 사람이 의도한 게 아니다.

"제목의 2배"라는 규칙은 내가 정한 것이지 도메인의 규칙이 아니었다. 도메인 규칙이라면 연동이 맞지만, 그냥 초기값을 정하는 방편이었을 뿐이다.

```sql
-- 기본값 80 = 지금까지의 결과(제목 40 × 2)와 같아 바꾸기 전까지 동일하다.
ALTER TABLE ppt_presets ADD COLUMN group_size REAL NOT NULL DEFAULT 80;
```

기본값을 기존 계산 결과와 같게 두면 손대기 전까지 결과가 똑같다. 설정을 추가할 때는 이걸 지키는 게 좋다. 기능을 늘리면서 기존 결과를 조용히 바꾸면 쓰는 사람이 놀란다.

값이 다른 값에서 파생되게 짤 때는 물어볼 게 있다. 이게 도메인의 규칙인가, 아니면 지금 값을 두 번 쓰기 싫어서인가. 후자면 그냥 각각 두는 게 낫다.

---

## 담을 수 없으면 가리키게 한다

글꼴 파일을 직접 담지 못해(PPT 라이브러리가 이름만 참조하고, 쓰는 DB는 한 값이 2MB를 못 넘는데 한글 글꼴은 4~8MB다) 파일 대신 이름과 받는 곳만 `fonts` 테이블에 저장했다. 이 결정의 근거와 사용자 입력 주소 검증(`safeUrl`)·사용 중 삭제 가드는 콘티온 Conti On TIL 2에 정리했다.

그 판단의 효과가 이번에 나왔다. 설명서의 다운로드 목록을 템플릿에 연동할 때, 지금 쓰는 글꼴 이름으로 `fonts`를 찾아 링크를 걸면 끝이었다. 파일을 들고 있었다면 파일과 이름의 대응을 따로 관리해야 했을 것이다.

```tsx
{inUse.map((name) => {
  const f = fonts.find((x) => x.name === name);
  return f?.url
    ? <a href={f.url} download>{name} 내려받기</a>
    : <span>{name} — 받는 곳이 등록돼 있지 않습니다</span>;
})}
```

받는 곳이 없으면 없다고 알리는 것도 중요하다. 조용히 빠뜨리면 담당자는 그 글꼴이 필요한 줄 모른다.

---

## 같은 형식을 두 곳에서 만들면 갈린다

곡 하나의 가사를 복사하는 기능이 이미 있었고, 콘티 전체를 복사하는 기능을 새로 만들었다. 형식은 이렇게 정했다.

```text
주일 콘티

통일찬송가 1장 만복의 근원 하나님
(가사 본문)…

통일찬송가 2장 성부 성자 성령께
(가사 본문)…
```

처음엔 각 화면에서 따로 조립했다. 곡 목록 화면은 곡 하나를, 콘티 화면은 전체를. 만들고 나서 보니 곡 하나 복사에는 제목 줄이 없어서 형식이 달랐다.

한쪽만 고치면 또 갈린다는 게 문제였다. 조립하는 자리를 한 곳으로 모았다.

```ts
const BLOCK_SEP = "\n\n";

export function copySong(s: Copyable): string {
  return `${songHeading(s)}\n${s.lyrics}`;
}

export function copyConti(title: string, items: ContiItem[]): string {
  const blocks = items.map((it) => (it.type === "group" ? it.text : copySong(it.song)));
  return [title || "콘티", ...blocks].join(BLOCK_SEP);
}
```

`copyConti`가 `copySong`을 호출하는 구조라 곡 블록의 모양은 구조적으로 어긋날 수 없다. 블록 구분자도 상수로 빼서, 빈 줄을 없애려면 한 줄만 고치면 된다.

번호 표기도 같은 문제가 있었다. 목록에는 `[통일찬송가 469장]`, 복사에는 `통일찬송가 469장`으로 대괄호만 다른데, 각각 만들고 있었다. 안쪽을 함수로 빼서 둘 다 그걸 쓰게 했다.

```ts
function numberText(s: Numbered): string { … }              // "통일찬송가 469장"
export function numberLabel(s) { const n = numberText(s); return n ? `[${n}]` : ""; }
export function songHeading(s) { return [numberText(s), s.title].filter(Boolean).join(" "); }
```

기능이 아니라 형식을 공유해야 할 때가 있다. "같은 규칙을 따르는 두 곳"이 보이면 규칙을 함수로 만들 자리다.

---

## PPT 한 줄에 여러 스타일 넣기 — 문단과 런

제목 슬라이드에 안내 문구를 한 줄 더 넣어야 했다. 제목·번호·안내가 각각 다른 크기와 글꼴을 쓴다.

PPT를 만드는 `addText`에 배열을 넘기면 조각(런 — 스타일이 같은 글자 덩어리)마다 스타일을 다르게 줄 수 있고, 텍스트에 `\n`을 넣으면 거기서 문단(줄)이 나뉜다.

```ts
makeSlide().addText(
  [
    { text: song.title, options: { fontSize: tpl.title_size, fontFace: face(tpl.title_font) } },
    { text: numberSuffix(song), options: { fontSize: tpl.number_size, fontFace: face(tpl.number_font) } },
    ...(seatNotice && notice
      ? [{ text: "\n" + notice, options: { fontSize: tpl.notice_size, fontFace: face(tpl.notice_font) } }]
      : []),
  ],
  textBox,
);
```

실제로 그렇게 되는지는 만든 파일을 열어 확인했다. pptx는 zip이라 풀면 XML이 나온다.

```bash
unzip -q out.pptx -d out
```

```text
문단 수: 2
  문단1  40pt  "만복의 근원 하나님"
  문단1  20pt  " 통일찬송가 1장"
  문단2  30pt  "&lt;안내 문구&gt;"
```

첫 문단에 런이 둘, 둘째 문단에 안내가 들어갔다. 꺾쇠는 XML에서 이스케이프되는데, 이건 정상이고 화면에는 `< >`로 나온다.

줄간격도 같은 방법으로 확인했다.

```text
<a:lnSpc><a:spcPct val="100000"/></a:lnSpc>
```

`lineSpacingMultiple: 1`이 `spcPct 100000`(100%)으로 들어간다. 눈으로 열어 보기 전에 이렇게 확인해 두면 "됐겠지"로 넘어가지 않는다.

---

## 자동 정렬(flex)은 바로 아래 자식까지만 먹는다

메뉴 버튼(⋯) 높이를 옆 드롭다운과 맞추려고 이렇게 했다.

```css
.conti-select-row {
  display: flex;
  align-items: stretch; /* 자식들을 같은 높이로 */
}
```

안 맞았다. 마크업이 이랬기 때문이다.

```html
<div class="conti-select-row">
  <select>…</select>
  <div class="conti-menu-wrap">   <!-- 드롭다운 메뉴를 띄우려고 감싼 상자 -->
    <button class="conti-menu-btn">⋯</button>
  </div>
</div>
```

`stretch`가 적용되는 건 flex 컨테이너의 직계 자식까지다. 늘어난 건 `.conti-menu-wrap`이고, 그 안의 버튼은 자기 패딩만큼의 높이 그대로였다.

```css
.conti-menu-btn {
  height: 100%; /* 늘어난 부모를 채운다 */
  padding: 0 12px;
}
```

정렬 속성은 부모-자식 한 단계에서만 작동한다. 사이에 다른 요소가 끼면 거기서 끊긴다. 마크업을 보지 않고 CSS만 보면 놓친다.

글자를 상자 가운데 두는 것도 마찬가지였다. `line-height`(줄 높이)로 맞추면 글꼴의 메트릭(글꼴마다 정해 둔 위아래 여백 수치)에 끌려다닌다. flex로 줄 상자 자체를 가운데 두는 게 확실하다.

```css
.conti-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

다만 이걸로도 완전하진 않다. `⋯`(U+22EF)는 점이 글자 상자의 정중앙이 아니라 수학 기호 축에 찍히도록 설계된 문자라, 남는 오차는 글리프(글자의 실제 그림) 자체의 문제다. CSS로 맞출 수 있는 건 줄 상자까지다.

---

## 곁들여 — 양끝 정렬에서 한쪽이 사라질 때

버튼 두 개를 양끝에 두려고 `space-between`을 썼는데, 왼쪽 버튼이 조건부로 사라지는 자리였다. 그러면 오른쪽 버튼이 왼쪽으로 붙는다.

```tsx
<div className="conti-panel-actions">   {/* justify-content: space-between */}
  <div className="conti-panel-actions-left">
    {!locked && <button>그룹 추가</button>}
  </div>
  <button onClick={handleCopy}>콘티 복사</button>
</div>
```

왼쪽을 빈 `div`로 감싸 두면 자식이 없어도 flex 항목은 남아서 오른쪽이 제자리를 지킨다.

그리고 화면 전환이 URL이 아니라 상태인 앱에서는 링크를 `<a href>`로 못 건다. 버튼을 링크처럼 보이게 하는 편이 정직하다.

```css
.link-btn {
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
```

---

## 요약

- 로그 내용은 남기는 시점이 아니라 읽는 시점 기준으로 정한다. 그 줄만 떼어 봐도 알 수 있어야 한다
- id만 남기면 대상이 지워졌을 때 영영 못 읽는다. 이름을 같이 남긴다
- 한 칸을 필터 키와 설명으로 겸용하면 어느 쪽도 못 쓴다. 나눌 수 없으면 형태(`id|설명`)를 정하고 조회를 넓힌다
- "안 보인다"는 없거나·걸러졌거나·묻혔거나 셋 중 하나다. 셋째는 데이터를 세어봐야 나온다
- 같은 종류의 값은 만드는 곳을 하나로. DB에 넣는 시각은 DB가 만들게 하면(`datetime('now')`) 형식이 갈릴 일이 없다
- `replace`는 바꿀 게 없으면 조용히 아무것도 안 한다. 형식 변환을 조건 없이 걸면 이미 그 형식인 값에서 망가진다
- 시간대 표기 없는 문자열을 `Date.parse`에 넘기면 로컬로 읽힌다. 저장을 UTC로 통일했으면 읽을 때도 명시한다
- 하나를 고쳤으면 같은 패턴을 `grep`으로 훑는다. 지금 안 보이는 곳에도 같은 버그가 있다
- 값을 복사하면 그 순간의 사진, 비워 두면 살아 있는 참조. "원본이 바뀌면 따라가야 하나"로 고른다
- 빈 문자열은 저장 전에 NULL로. 안 그러면 "비었다"의 의미가 두 가지가 된다
- 파생값 하드코딩(`제목 × 2`)은 그 값을 설정으로 뺄 때 빚이 된다. 도메인 규칙이 아니면 각각 두자
- 설정을 새로 추가할 땐 기본값을 기존 결과와 같게 — 기능을 늘리며 결과를 조용히 바꾸지 않는다
- 담을 수 없으면 가리키게 한다. 실제로 필요한 동작이 무엇인지 보면 그걸로 충분할 때가 있다
- 같은 형식을 두 곳에서 조립하면 갈린다. 형식을 만드는 자리를 하나로 모으고, 큰 단위가 작은 단위를 호출하게 짠다
- pptxgenjs는 `addText` 배열로 런별 스타일을, `\n`으로 문단을 나눈다. 만든 pptx를 풀어 XML로 확인할 수 있다
- flex 정렬은 직계 자식까지만. 사이에 감싼 요소가 있으면 거기서 끊긴다
- 글자 세로 가운데는 `line-height`보다 flex 정렬이 확실하다. 남는 오차는 글리프 자체일 수 있다
- `space-between`에서 한쪽이 사라질 수 있으면 빈 컨테이너로 자리를 지킨다
