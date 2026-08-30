---
layout: post
title: 콘티온 Conti On TIL 1
date: 2026-07-19
permalink: "devlog/devlog/TIL/콘티온 Conti On TIL 1"
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
description: 하루치 콘티온 작업을 한데 모은 기록 — 승인제 구글 로그인과 서명 쿠키 세션, 소프트 삭제·편집 잠금 같은 되돌릴 수 있는 협업 설계, 정규식 없는 SQLite 활용, 서버 실명 마스킹과 위협 모델, Cloudflare Pages 배포.
---
여럿이 함께 쓰는 팀 도구를 만들며 하루 동안 다룬 것들을 모았다 — 승인제 로그인과 세션, 여럿이 만져도 되돌릴 수 있는 데이터 설계, 기능 소박한 SQLite를 영리하게 쓰기, 실명 가리기와 위협 모델, 그리고 Cloudflare Pages 배포까지.

---

## 구글 로그인 — 비밀번호를 안 갖는 로그인

### 구글에 다녀와서 사용자 정보를 받고, 위조된 요청은 걸러낸다

로그인 버튼을 누르면 구글 동의 화면으로 보냈다가, 구글이 다시 우리 주소로 `code`를 들고 돌려보낸다. 이 `code`는 그 자체로는 쓸모없는 임시표라, 서버가 구글에 다시 내밀어야 진짜 사용자 정보로 바꿔 준다 — 임시표를 진짜 정보로 교환해 오는 이 방식을 authorization code flow라고 부른다. 이때 "지금 돌아온 게 정말 우리가 보낸 요청이 맞나"를 확인하려고 `state`라는 무작위 값을 처음에 쿠키에 심어 보내고, 돌아올 때 같은지 비교한다 — 남이 링크만으로 로그인 흐름을 끼워 넣는 위조(CSRF)를 막는 장치다.

`redirect_uri`(돌아올 주소)는 고정값이 아니라 요청이 들어온 origin(요청이 온 출처, 주소의 도메인 부분)으로 만든다. 그러면 로컬(localhost)이든 배포 도메인이든 같은 코드가 알아서 맞춘다.

```ts
auth.get("/google", (c) => {
  const state = crypto.randomUUID();
  setCookie(c, STATE_COOKIE, state, { httpOnly: true, secure: isHttps(c), sameSite: "Lax", path: "/", maxAge: 600 });
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${new URL(c.req.url).origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return c.redirect(`${GOOGLE_AUTH}?${params}`);
});

// 콜백: 돌아온 state가 심어둔 값과 다르면 즉시 거절
if (!code || !state || state !== getCookie(c, STATE_COOKIE)) return c.redirect("/?auth=error");
```

`client_secret`은 코드에 두지 않고 서버 시크릿으로만 관리한다(로컬은 `.dev.vars`, 배포는 `wrangler secret`).

---

## 세션 — 서버에 저장하지 않고 서명한 쿠키로

### 로그인 표식은 쿠키에 담고, 열쇠 없이는 못 고치게 서명한다

로그인 상태를 서버 메모리나 DB에 따로 보관하지 않고, 사용자에게 건네주는 작은 표식(쿠키) 하나로 표현한다. 이 쿠키에는 사용자 id와 만료 시각만 담고 서버 비밀키로 봉인 도장을 찍는다 — 이렇게 도장 찍힌 표식을 JWT라 부르고, 도장의 열쇠(비밀키) 없이는 내용을 위조할 수 없다. 쿠키에는 세 가지 방어를 건다 — `HttpOnly`(브라우저 안 스크립트가 이 쿠키를 읽지 못하게 막아, 훔쳐 가는 걸 차단), `Secure`(암호화된 HTTPS 연결에서만 오감), `SameSite=Lax`(다른 사이트가 이 쿠키를 몰래 실어 요청 보내는 걸 제한).

만료(`exp`)는 "마지막 활동 + 1시간"으로 잡고, 사용자가 뭔가 할 때마다 다시 발급한다. 그래서 계속 쓰면 안 풀리고, 1시간 손 놓으면 저절로 로그아웃된다(rolling session).

```ts
export async function issueSession(c: Ctx, uid: number) {
  const now = Date.now();
  const token = await sign({ uid, la: now, exp: Math.floor((now + IDLE_MS) / 1000) }, c.env.SESSION_SECRET);
  setCookie(c, "session", token, { httpOnly: true, secure: isHttps(c), sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

// 검증 — 서명 불일치나 exp 만료면 예외 → 로그인 안 된 것으로
try {
  payload = await verify(token, c.env.SESSION_SECRET, "HS256");
} catch { return null; }
```

`verify`는 세 번째 인자로 알고리즘(`"HS256"`)을 꼭 넘겨야 한다 — 안 넘기면 어떤 알고리즘이든 통과시키는 취약점(알고리즘 혼동)을 스스로 막는 라이브러리의 안전장치다.

---

## 승인제 — 아무나 못 들어오게

### 첫 사용자는 관리자, 그 외는 승인 대기 / 무접속은 지연 잠금

가입은 자유지만 앱은 못 쓴다. 구글 로그인에 성공해도 상태가 `pending`(승인 대기)이면 승인 대기 화면만 보이고, 관리자가 승인해야 `approved`(승인됨)가 된다. 맨 처음 로그인한 사람은 위에서 승인해 줄 관리자가 아직 없으니, 그 첫 사람만 자동으로 관리자 겸 승인 상태로 만든다 — 서비스가 처음 열릴 때 한 번만 자동으로 세팅해 주는 이런 처리를 부트스트랩이라 부른다.

"30일 무접속이면 잠금"은 상시 도는 서버(크론)가 없어도 된다 — 로그인을 시도하는 그 순간에 마지막 접속일을 재서, 30일이 지났으면 그때 잠근다(지연 판정).

```ts
if (!user) {
  const { count } = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
  const isFirst = count === 0;
  // isFirst ? (admin, approved) : (member, pending) 로 생성
}

// 로그인 시점에 무접속 30일 넘었으면 잠금
if (user.status === "approved" && user.last_login_at) {
  const inactiveDays = (Date.now() - Date.parse(user.last_login_at)) / 86400000;
  if (inactiveDays > LOCK_DAYS) { /* status='locked' */ }
}
```

---

## 미들웨어 — 문을 한 곳에서 지키기

### 앱 데이터 요청은 승인된 사람만, 프로필 제출은 로그인만 있으면 통과

기능마다 로그인 검사를 하나하나 흩뿌리면 한 곳만 빼먹어도 구멍이 된다. 그래서 미들웨어(요청이 실제 기능에 닿기 전에 한 곳에서 먼저 거르는 문지기) 한 곳에서 서버로 오는 데이터 요청(`/api/*`)을 막고, 로그인과 헬스체크(서버가 살아 있는지 확인하는 전용 주소)만 예외로 열어 둔다.

함정이 하나 있었다. 가입 신청자(`pending`)는 앱엔 못 들어와도 "부서·직책 신청"은 제출해야 한다. 그래서 판정을 둘로 나눴다 — 앱 접근용은 `approved`만 통과시키고, 프로필 제출용은 상태를 안 따지고 로그인 여부만 본다.

```ts
// 앱 접근: 승인된 사용자만
export async function getSessionUser(c) {
  const user = await getSessionUserAnyStatus(c);
  return user && user.status === "approved" ? user : null;
}

// 미들웨어: auth/health 빼고 전부 승인 세션 강제
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith("/api/auth/") || path === "/api/health") return next();
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  c.set("user", user);
  await issueSession(c, user.id); // rolling 갱신
  await next();
});
```

그 안쪽에서 다시 역할별로 나눈다 — 관리자만, 콘티 승인권만, 곡 관리권만. 권한은 계정의 플래그(`can_approve`, `can_manage_songs`)로 두고 "관리자는 항상 참"으로 합친다.

```ts
export const isApprover = (u) => u.role === "admin" || !!u.can_approve;
export const isSongManager = (u) => u.role === "admin" || !!u.can_manage_songs;
```

---

## 삭제를 진짜로 지우지 않기 — 소프트 삭제

### 지우는 대신 "지운 시각"을 찍고, 목록에서만 뺀다

`DELETE`로 행을 없애면 되돌릴 수 없다. 대신 `deleted_at` 칸에 지운 시각·지운 사람을 적는다. 목록·검색은 `deleted_at IS NULL`인 것만 보여주니 사용자에겐 사라진 것처럼 보이고, 복구는 그 칸을 다시 비우면 된다. 휴지통은 반대로 `deleted_at IS NOT NULL`을 모으면 된다.

```ts
// 삭제 = 표시만
"UPDATE songs SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?"
// 목록 = 안 지워진 것만
where.push("deleted_at IS NULL");
// 복구 = 표시 지움 (곡 관리자만)
"UPDATE songs SET deleted_at = NULL, deleted_by = NULL WHERE id = ?"
```

플랫폼 차원의 안전망도 있다 — Cloudflare D1은 최대 30일 시점 복원(Time Travel)을 기본 제공해서, DB가 통째로 잘못돼도 되돌릴 수 있다. 소프트 삭제는 "일상적인 실수 되돌리기", Time Travel은 "재해 복구"로 층을 나눴다.

---

## 확정본 잠그기 — 콘티 승인 상태

### 확정하면 서버가 편집 요청 자체를 거절한다

콘티(부를 순서)를 여럿이 짜다 보면 "이게 최종 맞아?"가 흐려진다. 그래서 콘티에 상태를 뒀다 — `draft`(초안)와 `approved`(승인). 승인권자가 확정하면 `approved`가 되고, 이름 변경·곡 추가/삭제 같은 편집 API가 전부 막힌다(HTTP 423 Locked). PPT 내보내기만 열어 두고, 다시 고치려면 승인권자가 해제한다.

핵심은 UI에서만 막지 않고 서버에서도 막는 것이다 — 버튼을 숨겨도 요청은 직접 보낼 수 있으니.

```ts
async function statusOf(c, id) {
  const row = await c.env.DB.prepare("SELECT status FROM setlists WHERE id = ? AND deleted_at IS NULL").bind(id).first();
  return row ? row.status : null;
}

setlists.put("/:id/items", async (c) => {
  const status = await statusOf(c, id);
  if (status == null) return c.json({ error: "not_found" }, 404);
  if (status === "approved") return c.json({ error: "locked" }, 423); // 승인되면 편집 거절
  // ...항목 교체
});
```

---

## 검수를 상태로 — 곡 추가/삭제 요청

### 곡을 정상 / 추가 대기 / 삭제 요청 세 상태로 두고, 요청자에 따라 즉시냐 대기냐

일반 팀원이 곡을 추가·삭제하면 바로 반영하지 않고 "검수 대기"로 둔다. 곡에 `review_state`를 두고 세 상태로 관리한다 — `active`(정상), `pending_add`(추가 검수 대기), `pending_delete`(삭제 요청). 곡 관리 권한이 있는 사람은 같은 동작이 즉시 반영되고, 권한이 없으면 대기 상태로 쌓인다. 목록에선 대기 곡을 흐리게 가려 보여주고, 관리자가 승인/거절로 전이시킨다.

```ts
// 추가: 권한 있으면 바로 active, 없으면 검수 대기
const manager = isSongManager(user);
const state = manager ? "active" : "pending_add";
// INSERT ... review_state = state

// 삭제: 권한 있으면 바로 소프트 삭제, 없으면 삭제 요청
if (isSongManager(user)) {
  "UPDATE songs SET deleted_at = datetime('now'), deleted_by = ?, review_state = 'active' WHERE id = ?"
} else {
  "UPDATE songs SET review_state = 'pending_delete', review_requested_by = ? WHERE id = ? AND review_state = 'active'"
}

// 검수: 승인은 상태 전이, 거절-삭제요청은 원상복구
"UPDATE songs SET review_state = 'active' WHERE id = ? AND review_state = 'pending_delete'" // 삭제 요청 취소
```

상태를 하나의 칸으로 표현하니, "누가 요청했나(`review_requested_by`)"까지 같이 들고 알림·검수 목록을 만들 수 있었다.

---

## 동시에 못 고치게 — 만료 시간이 있는 편집 잠금

### "최근에 잡고 있으면" 차단하고, 손 놓으면 저절로 풀리게

같은 곡을 두 사람이 동시에 고치면 나중 저장이 앞 저장을 덮어쓴다. 그래서 편집(수정/자막)을 열 때 그 곡을 잠근다. 문제는 "잠갔는데 브라우저를 그냥 닫으면?" — 영영 잠긴다. 그래서 잠금에 만료 시간을 뒀다. `editing_at`(잠근 시각)이 3분보다 오래됐으면 만료된 것으로 보고 새로 잡을 수 있게 한다. 열어둔 동안엔 60초마다 갱신해서(하트비트) 살아 있는 편집은 안 풀린다.

```ts
// 서버: "최근(3분 이내)"이고 남이 잡고 있으면 409
const row = await c.env.DB.prepare(
  `SELECT s.editing_by, (s.editing_at > datetime('now', '-3 minutes')) AS fresh, u.name AS editor_name
   FROM songs s LEFT JOIN users u ON u.id = s.editing_by WHERE s.id = ?`
).bind(id).first();
if (row.editing_by && row.editing_by !== user.id && row.fresh)
  return c.json({ error: "locked_by_other", editor: maskName(row.editor_name) }, 409);
// 아니면 내 잠금으로 갱신
"UPDATE songs SET editing_by = ?, editing_at = datetime('now') WHERE id = ?"
```

```ts
// 프론트: 열 때 잠금 시도, 실패하면 못 열고 안내
async function openEdit(s) {
  const r = await lockSong(s.id);
  if (!r.ok) { alert(`${r.editor ?? "다른 사람"}님이 편집 중입니다.`); return; }
  setForm({ song: s });
}
// 열어둔 동안 60초마다 갱신 (하트비트)
useEffect(() => {
  if (lockedId == null) return;
  const t = setInterval(() => lockSong(lockedId), 60000);
  return () => clearInterval(t);
}, [lockedId]);
```

서버는 "차단"만 하고 강제하진 않는(advisory) 잠금이다. UI에서 못 열게 막는 게 실제 방어이고, 서버 잠금은 그 판정 근거다.

---

## 로그 표는 하나만 두고 돌려쓰기

### 기록마다 무엇에 대한 일인지 번호를 남겨두면, 나중에 이름을 붙일 수 있다

콘티 로그, 곡별 가사 로그, 전체 가사 로그가 필요했지만 표를 종류별로 따로 만들지 않았다. 접속 로그 표 하나(`access_logs` — 누가·무슨 동작·detail·시각을 기록)에 다 쌓되, `detail` 칸에 "이 기록이 무엇에 대한 것인지"를 그 대상의 번호(id)로 통일해서 남기는 규칙을 세웠다. 그러면 나중에 `action`(동작 종류)으로 거르고, 그 번호로 곡·사용자 표를 조인해 — 두 표를 같은 번호끼리 이어붙여 함께 읽어 — 제목·이름을 붙인 피드를 만든다.

```sql
-- 전체 가사 변경 로그: 곡 제목까지 붙여서
SELECT a.action, a.created_at, u.name AS user_name, s.title AS song_title
FROM access_logs a
LEFT JOIN users u ON u.id = a.user_id
LEFT JOIN songs s ON s.id = CAST(a.detail AS INTEGER)   -- detail = 곡 id 규칙 덕분
WHERE a.action IN ('create_song','edit_song','delete_song','restore_song', ...)
ORDER BY a.id DESC LIMIT 100;
```

함정은 "곡 id 5"와 "콘티 id 5"가 detail에서 똑같이 `'5'`라는 것이다. detail만으로 거르면 서로 섞인다. 그래서 반드시 `action IN (...)`으로 종류를 좁혀야 곡 로그·콘티 로그가 안 섞인다. 옛날에 쌓인 로그(예전엔 detail에 제목을 넣었다)는 조인이 안 붙는데, 그럴 땐 제목 대신 detail을 그대로 보여주면 된다.

---

## 하드코딩 목록을 DB로 — 카테고리

### 이름을 바꾸면 그걸 참조하는 곡까지 같이 바꿔야 짝이 안 어긋난다

곡의 구분(통일찬송가·CCM…)을 코드 상수로 박아 뒀는데, 관리자가 추가·수정할 수 있게 `categories` 테이블로 옮겼다. 그런데 곡은 구분을 이름 문자열(`hymn_type`)로 들고 있다. 카테고리 이름만 바꾸면 곡들은 옛 이름을 든 채로 남아 짝이 어긋난다. 그래서 이름을 바꿀 때 곡들의 값도 함께 갱신한다(cascade). 삭제할 땐 그 구분의 곡을 '없음'으로 재지정하고 곡 자체는 보존한다.

```ts
// 이름 변경 = 카테고리 + 참조하는 곡 둘 다
await DB.prepare("UPDATE songs SET hymn_type = ? WHERE hymn_type = ?").bind(newName, cat.name).run();
await DB.prepare("UPDATE categories SET name = ? WHERE id = ?").bind(newName, id).run();

// 삭제 = 곡은 '없음'으로 살리고 카테고리만 제거 ('없음'은 protected라 삭제 불가)
await DB.prepare("UPDATE songs SET hymn_type = '없음' WHERE hymn_type = ?").bind(cat.name).run();
await DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
```

프론트에선 코드에 박아 둔 목록을 지우고 `/api/categories`를 불러 드롭다운을 채운다. 이때 구분 값의 타입도 손봐야 한다 — 원래는 "통일찬송가·CCM…" 정해진 몇 개 중 하나만 허용하도록(고정 유니온) 못 박아 뒀는데, 이제 관리자가 자유롭게 늘리니 아무 문자열이나 가능하도록(`string`) 느슨하게 풀어야 실제 목록과 맞는다. 범위를 넓혀 두는 게 오히려 정직한 표현이었다.

---

## 여러 줄을 한 번에 — 배치

콘티 순서 저장은 "이 콘티 항목을 다 지우고, 새 순서대로 다시 넣기"다. 이걸 문장 여러 개로 쪼개 보내지 않고 `batch`로 묶어 한 번에 실행한다 — 왕복도 줄고 중간에 반만 적용되는 일도 없다.

```ts
const stmts = [
  DB.prepare("DELETE FROM setlist_items WHERE setlist_id = ?").bind(id),
  ...song_ids.map((sid, i) =>
    DB.prepare("INSERT INTO setlist_items (setlist_id, item_type, song_id, sort_order) VALUES (?, 'song', ?, ?)").bind(id, sid, i)),
  DB.prepare("UPDATE setlists SET updated_at = datetime('now') WHERE id = ?").bind(id),
];
await c.env.DB.batch(stmts);
```

---

## 정규식 없는 DB에서 수백 곡 일괄 정리

가사 데이터에 세 가지 흠이 있었다 — 연속 공백, 절 번호 뒤 공백 누락(`1.구주와`), 끝의 `. 아멘`. SQLite엔 정규식 치환이 없어서 패턴마다 방법을 달리했다.

연속 공백은 `REPLACE`를 여러 번 중첩하면 긴 공백도 한 칸으로 접힌다(한 번에 2칸→1칸이라 반복 필요).

```sql
UPDATE songs SET lyrics = REPLACE(REPLACE(REPLACE(lyrics,'  ',' '),'  ',' '),'  ',' ') WHERE lyrics LIKE '%  %';
```

끝에 붙은 특정 문자열은 `SUBSTR`+`LENGTH`로 잘라내고 다시 붙인다(`. 아멘` 4글자를 떼고 ` 아멘`을 붙임).

```sql
UPDATE songs SET lyrics = SUBSTR(lyrics, 1, LENGTH(lyrics)-4) || ' 아멘' WHERE lyrics LIKE '%. 아멘';
```

"줄 시작의 `숫자.` 뒤에만 공백"처럼 SQL로 표현하기 어려운 패턴은, node로 데이터를 읽어 정규식으로 고친 UPDATE문을 만들고 `wrangler d1 execute --file`로 한 번에 적용했다. DB의 약점(정규식)을 바깥 언어로 메운 셈이다.

```js
// node: 바뀐 행만 UPDATE문 생성
const fixed = r.lyrics.replace(/(^|\n)(\d+)\.(?=\S)/g, "$1$2. "); // 줄 시작 "숫자." 뒤 공백
if (fixed !== r.lyrics)
  out.write(`UPDATE songs SET lyrics='${fixed.replace(/'/g, "''")}' WHERE id=${r.id};\n`);
```

로컬(`--local`)에 먼저 적용해 결과를 확인하고, 같은 걸 원격(`--remote`)에 적용했다. 되돌릴 안전망은 Time Travel이 받쳐 준다.

---

## 이름 가리기 — 서버에서, 팀 화면에만

### 홍길동 → `홍*동`, 유니코드 안전하게, 실명은 관리자만

콘티 로그·검수 목록·휴지통처럼 팀 전체가 보는 화면엔 실명 대신 가운데를 가린다(홍길동→`홍*동`, 홍동→`홍*`). 중요한 건 클라이언트가 아니라 서버에서 가리는 것이다 — 프론트에서 가리면 개발자도구로 응답을 열어 실명이 그대로 새기 때문이다. 그래서 팀 공유 응답은 서버에서 마스킹해 내보내고, 관리자 전용 API만 실명을 준다.

한글 이름은 글자 단위로 다뤄야 안전하다. `.length`나 인덱스는 이모지·일부 문자에서 어긋날 수 있어, `[...name]`으로 글자 배열을 만들어 자른다.

```ts
export function maskName(name) {
  if (!name) return name ?? null;
  const c = [...name.trim()];               // 글자 단위 (유니코드 안전)
  if (c.length <= 1) return "*";
  if (c.length === 2) return c[0] + "*";
  return c[0] + "*".repeat(c.length - 2) + c[c.length - 1];
}

// 팀 공유 응답에만 적용 — 관리자(/api/admin/*) 응답은 실명 그대로
return c.json({ logs: maskNames(results, ["user_name"]) });
```

로그의 이름은 저장해 둔 문자열이 아니라 조인으로 실시간 표시라, 관리자가 이름을 고치면 과거 로그에도 새 이름(가려진 형태)으로 반영된다.

---

## 관리자 화면 — 목록에서 상세로

### 컬럼 많은 표 대신 마스터-디테일

팀원 표에 이름·이메일·부서·권한·승인권·곡관리·상태·마지막로그인·작업 버튼까지 다 넣었더니 한 줄에 안 들어가 줄바꿈됐다. 그래서 흔한 관리자 도구 방식으로 나눴다 — 목록은 이름·부서·권한 뱃지만 간결히, 팀원을 누르면 상세로 들어가 권한 토글·상태 조작·그 사람의 접속 로그까지 모아 본다. "선택된 사람" 상태 하나로 목록/상세를 분기한다.

```ts
const [selectedId, setSelectedId] = useState(null);
const selected = users.find((u) => u.id === selectedId) ?? null;

async function openDetail(u) {
  setSelectedId(u.id);
  setDetailLogs(await adminLogs(u.id)); // 그 사람 로그만 불러와 상세에 표시
}

if (selected) return <상세 화면 />;      // 선택되면 상세
return <목록 화면 />;                     // 아니면 목록
```

---

## 이 앱의 급소는 코드가 아니라 계정·시크릿

### 뚫린다면 어디부터 뚫릴까 — 코드보다 계정과 비밀키

"해킹당한다면 원인이 뭘까"를 짚어 보니, 급소는 코드 버그가 아니라 계정과 비밀키였다.

- 로그인이 구글이라, 앱의 마스터키는 사실상 관리자의 구글 계정이다 → 2FA(휴대폰 인증)가 1순위 방어.
- 세션 위조의 열쇠는 `SESSION_SECRET`(서명 키)이다. 새면 아무 사용자로든 세션을 위조할 수 있다 → 코드·커밋·로그에 절대 남기지 않고, git 히스토리에 실수로 들어갔는지 점검한다.

```bash
# 시크릿이 히스토리에 샜는지 점검 (0건이어야 정상)
git log --all --oneline -- .dev.vars        # 추적 이력 없어야
git log --all -p -S "GOCSPX"                # 구글 시크릿 접두사 흔적
```

코드 쪽에서 흔히 노리는 공격은 이미 기본 방어가 돼 있었다. 세 가지를 하나씩 풀면 이렇다.

- 데이터베이스 속여 넘기기(주입, injection) — 공격자가 입력창에 명령문을 섞어 넣어 데이터베이스가 그걸 명령으로 착각하게 만드는 수법이다. 우리는 사용자가 넣은 값을 명령문에 글자로 이어 붙이지 않고, "이건 그냥 값이다"라고 따로 넘긴다(바인딩). 그러면 값은 끝까지 값으로만 취급돼 명령으로 둔갑하지 못한다.
- 남이 심어놓은 코드가 화면에서 실행되는 공격(XSS) — 누가 이름 칸에 화면 조작 코드를 적어 넣으면, 그게 다른 사람 화면에서 프로그램처럼 돌아가는 공격이다. 우리가 쓰는 React는 사용자가 넣은 글자를 그림이 아니라 글자로만 그려서(이스케이프) 이걸 막는다. 다만 React에도 "이 글자를 코드로 취급해 그려라"는 예외 기능(`dangerouslySetInnerHTML`)이 있는데, 그걸 쓰면 방어가 풀리므로 쓰지 않는다.
- 로그인한 사람을 몰래 시켜 먹는 공격(CSRF) — 로그인된 사용자가 낚시 링크를 눌렀을 때, 본인도 모르게 우리 서버로 요청이 날아가게 만드는 수법이다. 우리 사이트에서 시작된 요청에만 로그인 쿠키가 따라가도록 막고(SameSite 쿠키), 구글 로그인 과정에도 위조 방지 표식(OAuth state)을 끼워 막는다.

```ts
// 안전 — 값은 바인딩
DB.prepare("SELECT * FROM songs WHERE hymn_type = ?").bind(type);
// 위험 — 이렇게 문자열을 이어 붙이면 주입 (안 함)
// DB.prepare(`SELECT * FROM songs WHERE hymn_type = '${type}'`)
```

정리하면, 이 도구의 보안 ≈ (팀 구글 계정들의 2FA) + (SESSION_SECRET 관리)였다. 어디를 지킬지가 분명해지니 "당장 더 조일 곳(하드닝)은 없다"는 판단도 설 수 있었다.

---

## Pages Functions — 정적 사이트에 API를 얹기

### 만들어진 화면 파일을 올리고 서버 몫은 파일 하나가 다 받는다

React로 만든 SPA(Single Page Application, 페이지 이동 없이 화면만 바꾸는 웹앱) 화면을 완성된 파일 묶음(dist)으로 구워 올리고, 서버가 처리해야 할 요청은 `functions/api/[[path]].ts` 한 파일이 도맡는다. `[[path]]`는 "이 아래 모든 경로"라는 뜻이라, `/api/...`로 오는 요청을 전부 Hono(요청을 받아 처리하는 작은 서버 도구) 앱으로 넘긴다. 덕분에 로컬에서 쓰던 서버 코드를 그대로 배포 환경에 재사용했다.

```ts
// functions/api/[[path]].ts
import { handle } from "hono/cloudflare-pages";
import app from "../../worker/index";
export const onRequest = handle(app);
```

---

## 배포 방식은 한 번 정해지면 못 바꾼다

### 직접 업로드 vs Git 연동

Cloudflare Pages 프로젝트는 두 종류다 — "직접 업로드"(내 컴퓨터에서 `wrangler`로 올림)와 "Git 연동"(저장소에 push하면 알아서 빌드·배포). 그런데 이건 만들 때 정해지고 서로 못 바꾼다. 처음에 직접 업로드로 만들었더니, 나중에 "push하면 자동 배포"를 붙이려 해도 안 됐다(새 프로젝트로 다시 만들어야 하고 시크릿도 다시 넣어야 한다).

그래서 자동배포는 접고, 둘을 분리해 운영하기로 했다 — `git push`는 코드 백업(GitHub), `wrangler pages deploy`는 실제 배포. push해도 사이트는 안 바뀌고, 배포해도 GitHub은 안 바뀐다. 배포가 잦지 않은 도구라 이 편이 오히려 단순했다.

---

## Workers와 Pages는 배포 명령이 다르다

### 배포 명령이 한 단어 다르면 아예 다른 곳으로 간다

Git 연동을 시도했을 때 빌드가 계속 실패했는데, 로그를 보니 배포 명령이 `wrangler deploy`로 잡혀 있었다. 그건 Workers(단일 스크립트)용이라, Pages 구조인 우리 프로젝트에선 "진입점(entry-point)이 없다"며 죽었다. Pages는 빌드 결과 폴더를 통째로 올리는 `wrangler pages deploy`여야 한다. 명령 한 줄 차이지만 대상이 완전히 다르다.

```bash
# Pages: 빌드 폴더를 프로젝트로 업로드
npx wrangler pages deploy dist --project-name=conti-on
# (Workers였다면) wrangler deploy — 스크립트 진입점을 배포. Pages엔 안 맞음
```

---

## 폰트는 외부 링크 말고 자체 호스팅

자막용 폰트를 외부 사이트로 링크하지 않고 앱에 번들했다. `public/` 아래 둔 파일은 빌드가 결과 폴더로 복사해 `/파일경로` 그대로 제공한다. 화면 렌더용 `@font-face`(웹폰트 불러오는 CSS 규칙)도 되고, 사용자가 받아 설치하도록 `download` 링크로도 준다 — 외부 사이트가 사라지거나 막혀도 안전하고, 팀원이 한 곳에서 받는다.

```css
@font-face { font-family: "G마켓 산스 TTF Bold"; src: url("/fonts/GMARKETSANSTTFBOLD.TTF") format("truetype"); }
```
```html
<a href="/fonts/GMARKETSANSTTFBOLD.TTF" download>폰트 받기</a>
```

---

## 스키마 변경은 배포와 별개 — 마이그레이션은 수동

자동배포가 아니더라도, DB 스키마 변경(컬럼 추가 등)은 어차피 코드 배포와 별개다. 컬럼을 더하면 원격 DB에 마이그레이션을 따로 적용해야 한다. 순서가 중요해서 — 새 코드가 없는 컬럼을 읽으면 깨지니 — 스키마를 먼저 반영하고 코드를 배포한다.

```bash
npx wrangler d1 migrations apply conti-on-db --local    # 로컬 먼저
npx wrangler d1 migrations apply conti-on-db --remote   # 원격 (코드 배포보다 먼저)
```

---

## 요약

- 구글 로그인(authorization code)은 비밀번호를 안 갖는 대신 `state`로 위조를 막고, `redirect_uri`는 origin으로 만들어 환경마다 자동 대응한다.
- 세션은 서버에 저장하지 않고 서명한 쿠키(JWT)로 — HttpOnly·Secure·SameSite로 감싸고, 액션마다 재발급해 유휴 만료를 굴린다.
- 승인제는 첫 사용자만 관리자로 부트스트랩하고, 무접속 잠금은 로그인 시점 지연 판정으로 크론 없이 처리한다.
- 문은 미들웨어 한 곳에서 지키되, "앱 접근(승인만)"과 "프로필 제출(상태 무관)"의 세션 판정을 분리해야 가입 신청 흐름이 열린다.
- 삭제는 `deleted_at` 표시로만 하고 목록에서 빼면, 사용자에겐 지워진 듯 보이면서 언제든 복구된다.
- 확정본은 `approved` 상태로 잠그되, UI뿐 아니라 서버 API에서도 423으로 막아야 진짜 잠긴다.
- 추가·삭제 검수는 `review_state` 상태 칸 하나로 흐름을 관리하고, 요청자 권한에 따라 즉시/대기를 가른다.
- 동시 편집 잠금은 잠금에 유효 시간을 두고 하트비트로 갱신해야 "닫고 나간 잠금이 영영 안 풀리는" 사고를 막는다.
- 로그는 테이블을 늘리지 말고 하나에 쌓되, `detail`에 대상 id를 통일해 넣고 `action IN`으로 좁혀 여러 피드를 뽑는다(id 충돌 주의).
- 목록을 코드에서 DB로 옮길 땐, 그 값을 문자열로 참조하는 데이터까지 이름 변경 시 함께 갱신해야 짝이 안 어긋난다.
- 다중 쓰기는 `batch`로 묶어 왕복·부분 적용을 줄인다.
- 정규식 없는 SQLite에선 REPLACE 중첩·SUBSTR 자르기로 해결하고, 어려운 패턴은 바깥 언어(node)로 UPDATE문을 생성해 `--file`로 적용한다 — 로컬 먼저, 원격 나중.
- 팀 공유 화면의 실명은 서버에서 가려야(`홍*동`) 개발자도구로도 안 샌다. 관리자 응답만 실명.
- 한글 이름은 `[...name]` 글자 단위로 잘라야 유니코드에서 안 어긋난다.
- 컬럼이 많아지면 표를 늘리지 말고 목록→상세(마스터-디테일)로, "선택된 항목" 상태 하나로 분기한다.
- 이런 앱의 급소는 코드가 아니라 계정(구글 2FA)과 시크릿(SESSION_SECRET) — 코드 쪽 주입·XSS·CSRF는 바인딩·React 이스케이프·SameSite로 이미 막힌다.
- 정적 SPA(화면 전환이 새로고침 없이 되는 웹앱) + `functions/api/[[path]].ts` 하나로 프론트·API를 한 프로젝트에 올리고, 서버 코드를 그대로 재사용한다.
- Pages 프로젝트의 "직접 업로드/Git 연동"은 생성 시 정해지고 못 바꾼다 — 자동배포가 안 되면 push(백업)와 배포(수동)를 분리하는 게 깔끔하다.
- Pages는 `wrangler pages deploy`, Workers는 `wrangler deploy` — 대상이 다르니 명령을 헷갈리면 빌드가 죽는다.
- 폰트 같은 자산은 `public/`에 두어 자체 호스팅하면 외부 의존이 사라진다.
- 스키마 변경은 배포와 별개로, 원격 마이그레이션을 코드 배포보다 먼저 수동 적용한다.
