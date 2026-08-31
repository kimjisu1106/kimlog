---
layout: post
title: 콘티온 Conti On TIL 5
date: 2026-07-26
permalink: "1lfn2630"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - TypeScript
  - SQL
description: 곡만 다루던 도구를 예배 순서 전체 자막까지 넓히며 배운 것들 — 대분류 한 컬럼으로 노출·권한 가르기, 배치는 복사하고 내용은 참조하기, 화면마다 다른 표시 규칙, 설치된 글꼴을 목록으로 받아 오는 API.
---
자막 담당자가 예배 순서 전체 자막도 만들고 싶다고 해서, 곡만 다루던 구조를 예배 순서지까지 넓혔다. 그 과정에서 노출·권한을 가른 방식, 곡 콘티를 순서지에 끼울 때의 복사·참조 설계, 화면마다 달라지는 표시 규칙, 설치된 글꼴을 목록으로 받아 오는 API까지 배운 것들을 모았다.

---

## 대분류 컬럼 하나로 노출과 권한을 동시에 가른다

카테고리(구분)에 대분류 `major`를 붙였다. 값은 `찬양`/`순서` 둘로 고정한다. 이 한 컬럼이 두 가지를 한꺼번에 가른다.

- 화면 노출 — 콘티 페이지는 찬양 하위 카테고리만, 순서지 페이지는 순서 하위만 보여준다.
- 승인권자 — 항목(가사) 수정 승인을 대분류로 라우팅한다(값에 따라 갈 곳을 정하는 것). 찬양이면 곡 관리자, 순서면 자막 담당자.

```ts
async function canManageMajor(c, user, hymnType: string | null): Promise<boolean> {
  const cat = hymnType
    ? await c.env.DB.prepare("SELECT major FROM categories WHERE name = ?")
        .bind(hymnType).first<{ major: string }>()
    : null;
  return cat?.major === "순서" ? isSubtitleManager(user) : isSongManager(user);
}
```

권한을 "이 화면은 잠겼나"가 아니라 "이 값은 어느 대분류에 속하나"로 물으니, 승인 라우팅이 조건문 더미가 아니라 한 줄이 됐다.

---

## 컬럼을 더할 때는 기본값이 기존 행을 메운다

대분류는 마이그레이션(DB 저장 구조를 바꾸는 것)으로 얹었다. `NOT NULL DEFAULT '찬양'`으로 더하면 기존 카테고리는 손대지 않아도 전부 찬양으로 채워진다 — 예전 데이터가 곧 찬양이니 이게 맞다.

```sql
ALTER TABLE categories ADD COLUMN major TEXT NOT NULL DEFAULT '찬양';

INSERT OR IGNORE INTO categories (name, sort_order, has_number, protected, major) VALUES
  ('묵도', 101, 0, 0, '순서'),
  ('대표기도', 102, 0, 0, '순서'),
  ('광고', 104, 0, 0, '순서');
```

순서 하위 항목은 `INSERT OR IGNORE`로 시드했다(초기 데이터를 미리 넣었다). `name`이 UNIQUE라 마이그레이션을 두 번 돌려도 같은 이름이 중복으로 안 들어간다 — 로컬에서 한 번, 원격에서 한 번 돌려도 안전하다.

---

## 이미 있는 테이블을 일반화해 재활용한다

곡을 담던 `songs` 테이블을 "자막 라이브러리"로 넓혔다. 묵도·광고 같은 순서 자막도 결국 "제목 + 여러 줄 + 구분 + 줄 스타일"이라, 곡과 형태가 같다. 그래서 곡에 이미 붙어 있던 것들 — 등록 폼, PPT 내보내기, 검색, 편집 잠금, 휴지통 — 을 새로 안 짜고 그대로 물려받았다.

테이블을 새로 파지 않은 대신, 화면에서 부르는 이름만 대분류에 따라 바꿨다. 순서 페이지에서는 "곡→자막", "가사→내용"으로 라벨을 가른다. 데이터 구조는 하나, 부르는 이름만 둘이다.

---

## 컨테이너(항목을 담는 상위 그릇)는 종류로 나눠 소유를 다르게 둔다

콘티(setlist)에 종류 `kind`를 더했다. `song`은 곡 콘티(찬양팀 소유), `service`는 예배 순서지(방송실·자막 담당자 소유)다. 같은 테이블을 쓰되, 편집을 막는 관문에서 종류로 소유를 가른다.

```ts
async function editBlock(c, id, user) {
  const row = await c.env.DB.prepare(
    "SELECT status, kind FROM setlists WHERE id = ? AND deleted_at IS NULL",
  ).bind(id).first<{ status: string; kind: string }>();
  if (!row) return { error: "not_found", code: 404 as const };
  // 순서지는 방송실(자막 관리자) 소유 — 곡 콘티는 전 팀 편집(기존)
  if (row.kind === "service" && !isSubtitleManager(user))
    return { error: "forbidden", code: 403 as const };
  if (row.status === "approved") return { error: "locked", code: 423 as const };
  // …편집 잠금(다른 사람이 편집 중) 검사
}
```

프런트에서는 상단 알약(`mode` 상태)으로 곡 콘티 / 예배 순서지 화면을 전환한다. 목록 불러오기·새로 만들기·승인이 전부 이 `mode`(=kind)로 갈린다. 알림 개수도 사용자의 대분류에 해당하는 것만 센다.

---

## 배치는 복사, 내용은 공유

두 요구가 부딪쳤다. 방송실은 순서지 안에서 곡 사이에 자막을 끼우고 재배열하고 싶다(=원본과 독립이어야 함). 그런데 찬양팀이 가사를 고치면 순서지 자막에도 반영돼야 한다(=원본과 이어져야 함).

그래서 축을 둘로 갈랐다.

- 배치(어떤 곡을 어떤 순서로) — 복사한다. 넣는 순간의 구성을 스냅샷으로 떠서, 방송실이 순서지에서 무엇을 하든 찬양팀 콘티와 안 엉킨다.
- 내용(가사·문구) — 공유한다. 복사한 항목도 `song_id`로 원래 곡을 가리키므로, PPT를 만들 때 곡을 최신으로 다시 읽는다. 가사 수정은 순서지에도 그대로 따라온다.

한 마디로, 넣는 순간 "구성만 사진 찍고 내용은 링크로 걸어 둔다".

---

## 넣기 = 항목을 복사해 뒤에 붙이기

곡 콘티를 넣으면, 그 콘티의 곡 항목을 순서지 끝에 복사하고, 앞에 콘티 이름을 그룹 머리글로 자동으로 하나 얹는다. 그래서 "곡 콘티를 가리키는 특별한 항목 종류"를 새로 만들 필요가 없었다 — 그룹 + 곡들로 펼쳐서 들어간다.

```ts
const maxRow = await c.env.DB.prepare(
  "SELECT COALESCE(MAX(sort_order), -1) AS m FROM setlist_items WHERE setlist_id = ?",
).bind(id).first<{ m: number }>();

const songRows = await c.env.DB.prepare(
  "SELECT song_id, seat_notice FROM setlist_items " +
  "WHERE setlist_id = ? AND item_type = 'song' AND song_id IS NOT NULL ORDER BY sort_order",
).bind(contiId).all<{ song_id: number; seat_notice: number }>();

let n = (maxRow?.m ?? -1) + 1;
const stmts = [
  // 콘티 이름을 그룹 머리글로
  c.env.DB.prepare(
    "INSERT INTO setlist_items (setlist_id, item_type, separator_text, sort_order) " +
    "VALUES (?, 'separator', ?, ?)",
  ).bind(id, srcRow.title.slice(0, 40), n++),
  // 곡은 song_id로 — 내용은 원본을 계속 가리킨다
  ...songRows.results.map((r) =>
    c.env.DB.prepare(
      "INSERT INTO setlist_items (setlist_id, item_type, song_id, sort_order, seat_notice) " +
      "VALUES (?, 'song', ?, ?, ?)",
    ).bind(id, r.song_id, n++, r.seat_notice ? 1 : 0),
  ),
  c.env.DB.prepare("UPDATE setlists SET updated_at = datetime('now') WHERE id = ?").bind(id),
];
await c.env.DB.batch(stmts);
```

`sort_order`는 기존 마지막 값 뒤부터 이어 붙인다. `MAX(sort_order)`가 없을 때(빈 순서지)를 대비해 `COALESCE(..., -1)`로 시작을 -1로 두면, 첫 항목이 0부터 깔끔하게 들어간다.

복사하는 건 `song_id`와 좌석 안내 여부뿐이다. 가사 원문은 복사하지 않는다 — 그게 "내용은 공유"의 실제 모습이다.

> 대가도 적어 뒀다. 넣은 뒤에 찬양팀이 곡을 추가·교체(=배치 변경)하면 순서지엔 자동 반영되지 않는다. 그건 스냅샷을 떴기 때문이고, 필요하면 다시 불러와야 한다. 배치를 복사로 택한 순간 따라오는 값이다.

---

## 옛 데이터는 기본값으로 메워 거른다

라이브러리를 대분류로 거를 때, 카테고리가 매칭 안 되는 옛 곡이 조용히 빠지면 안 됐다. 대분류를 못 찾으면 찬양으로 본다는 규칙을 `COALESCE`로 박았다.

```sql
WHERE COALESCE(
  (SELECT c.major FROM categories c WHERE c.name = s.hymn_type),
  '찬양'
) = ?
```

서브쿼리가 `NULL`(구분이 비었거나 삭제된 카테고리)을 내면 `찬양`으로 친다. 새 대분류를 도입해도 예전 곡이 필터에서 사라지지 않는다.

---

## 자동 정리는 고르는 목록만, 입력 폼은 남긴다

카테고리(구분)가 늘면서, 항목이 하나도 없는 구분이 드롭다운을 채우는 게 지저분했다. 그래서 "항목 0개인 구분은 목록에서 숨긴다"를 넣었다. 개수는 상관 서브쿼리로 센다.

```sql
SELECT id, name, sort_order, has_number, protected, major,
       (SELECT COUNT(*) FROM songs s
        WHERE s.hymn_type = categories.name AND s.deleted_at IS NULL) AS song_count
FROM categories ORDER BY sort_order, name
```

그런데 여기서 갈렸다. 같은 자동 정리를 검색 필터에도 쓰고 입력 폼에도 쓰면, 빈 구분에는 영영 첫 항목을 못 넣는다 — 폼에서도 안 보이니까. 그래서 숨기는 건 검색 필터에서만 하고, 추가 폼에서는 다 보여준다.

```tsx
// 검색 필터 — 비어 있으면 숨김(단 protected는 항상)
categories.filter((c) => c.protected || (c.song_count ?? 0) > 0)

// 추가 폼 — 거르지 않음. 빈 구분에 첫 항목을 넣을 수 있어야 하니까
```

"목록을 정리한다"가 항상 좋은 건 아니다. 고르는 목록이냐, 만드는 목록이냐에 따라 규칙이 반대가 된다.

---

## 번호가 없으면 구분을 대신 보여준다

곡은 목록에서 `[통일찬송가 469장] 제목`처럼 번호로 앞을 단다. 그런데 묵도·광고 같은 순서 자막은 번호가 없다. 기존 번호 라벨 함수는 번호가 없으면 빈 문자열을 내서, 순서 항목은 구분이 안 보였다.

번호가 없을 때 구분으로 떨어지는 라벨을 따로 뒀다.

```ts
export function itemLabel(s: Numbered): string {
  const n = numberText(s);            // "통일찬송가 469장" 또는 ""
  if (n) return `[${n}]`;
  if (s.hymn_type && s.hymn_type !== "없음") return `[${s.hymn_type}]`; // [묵도]
  return "";
}
```

곡 콘티 화면은 기존 번호 라벨을 그대로 쓰고, 순서지 화면만 이 라벨로 바꿨다. 같은 항목이라도 어느 화면에 놓이느냐로 머리글이 달라진다.

---

## 한국어 조사 때문에 문자열을 통째로 갈랐다

라벨을 "곡→자막", "가사→내용"으로 바꾸며 처음엔 명사만 끼워 넣는 템플릿을 썼다. 그런데 조사에서 깨졌다.

```ts
// ❌ 명사만 바꾸면 조사가 안 맞는다
`${content}을 붙여넣으세요`   // 가사 → "가사을" (틀림), 내용 → "내용을" (맞음)
```

받침에 따라 을/를이 갈리는데(가사는 "를", 내용은 "을"), 명사만 치환하면 한쪽이 틀린다. 조사 규칙을 코드로 넣는 것도 방법이지만, 경우가 둘뿐이라 문장을 통째로 갈랐다.

```ts
// ✅ 경우가 적으면 문장 전체를 분기하는 게 더 읽힌다
major === "순서"
  ? "내용을 줄바꿈 그대로 붙여넣으세요"
  : "가사를 줄바꿈 그대로 붙여넣으세요";
```

번역·다국어까지 갈 규모가 아니면, 조사 처리 로직보다 문장 두 벌이 더 정직하다.

---

## "있나 없나"가 아니라 목록을 통째로 받는다

전에는 글꼴이 깔렸는지를 글자 폭을 재서 판정했다(TIL 2). 그건 "이 이름이 설치돼 있나?"를 하나씩 묻는 방식이라, 이름을 이미 알아야 쓸 수 있다. 이번엔 방향이 반대였다 — 이름을 모르니 목록을 받아야 했다.

브라우저에 설치된 글꼴 목록을 그대로 주는 API가 있다. `window.queryLocalFonts()`다.

```ts
async function readInstalledFamilies(): Promise<string[]> {
  const query = (window as unknown as { queryLocalFonts?: QueryLocalFonts }).queryLocalFonts;
  if (!query) throw new Error("unsupported");
  const list = await query();
  // family는 굵기·스타일별로 여러 번 나온다 → 중복 제거하고 가나다순
  return [...new Set(list.map((f) => f.family))].sort((a, b) => a.localeCompare(b, "ko"));
}
```

돌려주는 목록은 굵기·기울기별 항목까지 다 들어 있어, 같은 `family`가 여러 번 나온다. `Set`으로 접고 한국어 정렬(`localeCompare(a, b, "ko")`)로 다듬어야 고를 만한 목록이 된다.

---

## 고르되, 손입력 길도 남긴다

받은 목록은 `datalist`에 물려, 기존 이름 입력칸을 그대로 두고 자동완성만 붙였다. 입력칸을 드롭다운으로 바꾸지 않은 건, 재생 PC에는 있고 편집 PC에는 없는 글꼴도 이름으로 직접 넣을 수 있어야 하기 때문이다.

```tsx
<input list="installed-fonts" className={"tpl-font" + (pickHint ? " tpl-font--hint" : "")} … />
<datalist id="installed-fonts">
  {installedFamilies.map((f) => <option key={f} value={f} />)}
</datalist>
```

불러오기가 끝나면 이름 칸을 잠깐 강조한다(`pickHint`). 목록을 받아 놓고도 어디서 고르는지 모르면 소용없어서, "여기서 고르라"고 시선을 끄는 장치다.

---

## 대가 — 강한 권한이라 좁고, 거부될 수 있다

설치된 글꼴 전체 목록은 기기를 특정할 수 있는 민감한 정보라, 이 API는 대가가 크다.

- Chrome·Edge에서만 된다. 그 외 브라우저엔 `queryLocalFonts` 자체가 없다.
- 호출하면 권한 프롬프트가 뜨고, 사용자가 거부할 수 있다.

그래서 두 경우를 갈라 안내하고, 어느 쪽이든 이름 직접 입력으로 떨어지게 했다.

```ts
try {
  setInstalledFamilies(await readInstalledFamilies());
  setPickHint(true);
} catch (e) {
  setFontError(
    e instanceof Error && e.message === "unsupported"
      ? "이 브라우저는 설치 글꼴 불러오기를 지원하지 않습니다 (Chrome·Edge에서 가능). 이름을 직접 입력하세요."
      : "글꼴 접근이 허용되지 않았습니다. 이름을 직접 입력하세요.",
  );
}
```

편의 기능이 안 되는 환경에서도 원래 하던 손입력은 늘 남아 있어야, 기능을 붙이고도 아무도 막히지 않는다.

---

## 요약

- 대분류 컬럼 하나가 화면 노출과 승인 라우팅을 동시에 가른다. 권한을 "값의 소속"으로 물으면 조건문이 한 줄이 된다.
- 컬럼을 더할 때 `NOT NULL DEFAULT`는 기존 행을 그 기본값으로 메운다. 옛 데이터가 곧 기본값일 때 딱 맞는다.
- 형태가 같은 데이터는 테이블을 새로 파지 말고 일반화해 폼·검색·잠금·휴지통을 통째로 재활용한다.
- 컨테이너를 종류로 나누면 같은 테이블로도 소유·권한을 다르게 둘 수 있다.
- "복사냐 참조냐"를 통째로 정하지 말고 축을 갈라라. 배치는 복사(독립), 내용은 참조(반영)처럼 나누면 두 요구를 동시에 만족한다.
- 무언가를 "끼우는" 기능은 특별한 항목 종류를 새로 만들기 전에, 이미 있는 항목들로 펼쳐 넣을 수 있는지 본다.
- 뒤에 이어 붙일 때 `COALESCE(MAX(...), -1)`로 빈 경우의 시작점을 정한다.
- 새 분류 컬럼으로 거를 때 `COALESCE(서브쿼리, 기본값)`은 옛 데이터를 기본값으로 메워 조용한 누락을 막는다.
- 자동 정리는 "고르는 목록"과 "만드는 목록"에서 규칙이 반대다. 검색 필터는 비면 숨기고, 입력 폼은 남긴다.
- 같은 항목도 화면에 따라 머리글이 다를 수 있다. 번호가 없으면 구분으로 떨어지는 라벨을 따로 둔다.
- 한국어 조사는 명사 치환으로 안 맞는다. 경우가 적으면 문자열을 통째로 분기하는 게 더 정직하다.
- "설치됐나?"는 글자 폭으로 재고(TIL 2), "무엇이 설치됐나?"는 `queryLocalFonts()`로 목록을 받는다. 묻는 방향이 다르면 도구도 다르다.
- 목록엔 굵기·스타일별 중복이 있다. `family`만 뽑아 `Set`으로 접고 정렬해야 쓸 목록이 된다.
- 강한 권한을 요구하는 API는 지원 브라우저가 좁고 거부될 수 있다. 편의는 얹되, 원래 하던 손입력 길을 반드시 남긴다.
