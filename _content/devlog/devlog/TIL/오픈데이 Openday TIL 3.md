---
layout: post
title: 오픈데이 Openday TIL 3
date: 2026-08-24
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 서버 없이 구글 계정에 연결해 이용자 본인 드라이브에 기록을 저장하고, 두 기기가 같은 기록을 건드려도 서로 지우지 않게 합치는 법 — 그리고 못 한 일을 넘기는 사슬을 끊기지 않게 짜면서 만난 조용한 버그들까지.
tags:
  - TypeScript
  - React
  - OAuth
  - CSS
  - Cloudflare
---

오늘은 오픈데이에 구글 계정 연결을 붙였다. 서버를 두지 않기로 한 상태에서 붙였더니 인증 흐름부터 다시 배워야 했고, 기록이 두 기기에 생기면서 합치는 규칙도 새로 정해야 했다.

---

## 구글 계정에 연결하기

### 브라우저가 토큰을 바로 받는 흐름은 비밀키를 안 쓴다

구글 로그인을 붙이려면 서버가 필요하다고 알고 있었는데, 그건 흐름이 두 가지인 걸 몰라서였다.

- 인증 코드 흐름 — 구글이 코드를 주고, 서버가 그 코드와 비밀키를 함께 보내 토큰으로 바꾼다. 비밀키가 들어가니 서버가 있어야 한다
- 토큰 흐름 — 브라우저가 토큰을 바로 받는다. 비밀키를 안 쓴다

앱 데이터를 읽고 쓰는 정도면 토큰 흐름으로 충분하다. 클라이언트 ID는 공개해도 되는 값이라 코드에 그대로 둔다. 어차피 등록한 주소에서만 동작하기 때문에 남이 가져가도 자기 사이트에서는 못 쓴다.

### initTokenClient는 콜백으로 토큰을 준다

돌려주는 값이 아니라 콜백으로 온다. 다루기 편하게 Promise로 감싼다.

```ts
const client = google.accounts.oauth2.initTokenClient({
  client_id: CLIENT_ID,
  scope: SCOPE,
  callback: (response) => {
    if (!response.access_token) {
      reject(new Error('연결하지 못했어요.'))
      return
    }
    accessToken = response.access_token
    resolve()
  },
  error_callback: () => reject(new Error('연결이 취소됐어요.')),
})
client.requestAccessToken()
```

### prompt를 빈 문자열로 주면 창을 안 띄운다

새로고침하면 토큰이 사라지는데, 그때마다 계정 선택 창이 뜨면 쓰기 싫어진다. 이미 허락한 계정이고 구글 로그인이 살아 있으면 창 없이 토큰만 다시 받을 수 있다.

```ts
client.requestAccessToken(silent ? { prompt: '' } : undefined)
```

조용히 받기가 실패하면 그때만 연결 버튼을 보여준다. 실패해도 화면에 아무 일도 일어나지 않는 게 핵심이다.

### 취소는 오류가 아니라 error_callback으로 온다

사용자가 창을 닫으면 `callback`이 안 불리고 `error_callback`이 불린다. 이걸 안 잡으면 Promise가 영영 안 끝나서 버튼이 계속 눌린 상태로 남는다.

### 외부 스크립트는 Promise를 기억해 한 번만 붙인다

구글 로그인 스크립트를 붙이는 코드가 여러 번 불릴 수 있다. 붙이는 Promise를 변수에 담아 두고 두 번째부터는 그걸 그대로 돌려준다.

```ts
let scriptLoad: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (scriptLoad) return scriptLoad
  scriptLoad = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('불러오지 못했어요.'))
    document.head.appendChild(script)
  })
  return scriptLoad
}
```

### 접근 토큰과 새로고침 토큰은 다르다

- 접근 토큰 — 실제로 API를 부를 때 쓴다. 한 시간쯤 살고 짧다
- 새로고침 토큰 — 접근 토큰이 죽었을 때 새로 받아오는 데 쓴다. 길게 산다

새로고침 토큰을 브라우저에 두면 안 된다. 오래 살기 때문에 한 번 새면 피해가 크고, 브라우저 저장소는 스크립트가 읽을 수 있다. 그래서 이건 서버가 보관하는 물건이고, 서버를 두지 않기로 한 이상 우리는 못 가진다.

가진 게 접근 토큰뿐이면 새로고침할 때마다 사라진다. 그걸 조용히 다시 받는 것으로 메웠다.

### 권한은 필요한 것 하나만 고른다

드라이브 권한에도 등급이 있다. 전체 드라이브를 보는 것부터, 앱이 만든 파일만 보는 것까지.

```text
https://www.googleapis.com/auth/drive.appdata
```

이건 앱 데이터 폴더 안, 그러니까 우리가 만든 파일만 접근한다. 이용자의 다른 파일은 목록조차 못 본다. 권한을 좁게 잡으면 동의 화면에 뜨는 문구도 순해지고, 사고가 나도 잃을 게 없다.

### 등록하는 칸이 두 군데이고 성격이 다르다

여기서 제일 오래 막혔다. 콘솔에 주소를 넣는 곳이 둘인데 받는 게 다르다.

- 승인된 JavaScript 원본 — 로그인 창을 띄우는 페이지의 주소. 호스팅 주소가 그대로 들어간다
- 동의 화면의 승인된 도메인 — 소유를 증명한 도메인만 들어간다. 남의 호스팅 주소는 거절된다

「최상위 비공개 도메인이어야 합니다」는 두 번째 칸에서 나오는 말이다. 첫 번째 칸에 넣을 때는 안 나온다. 같은 주소를 넣는데 한 곳은 되고 한 곳은 안 되니 오래 헤맸다.

### origin_mismatch는 주소를 안 등록했다는 뜻이다

400 오류에 `origin_mismatch`가 붙어 있으면 지금 열고 있는 주소가 승인된 원본에 없다는 것이다. 와일드카드가 안 되므로 미리보기 주소를 쓸 때마다 등록해야 한다. 그래서 개발 중 확인은 로컬 주소에서 한다.

### 연결을 끊을 때는 토큰을 폐기한다

변수에서 지우기만 하면 토큰 자체는 남아 있다. 구글 쪽에 폐기를 알린다.

```ts
google.accounts.oauth2.revoke(accessToken)
```

### 401이 오면 조용히 한 번 다시 받고 재시도한다

토큰이 한 시간쯤 살기 때문에 오래 켜 두면 중간에 죽는다. API를 부르는 곳마다 이걸 신경 쓰면 코드가 지저분해지니 감싸개 하나에 몰아넣는다.

```ts
async function ask<T>(url: string, init: RequestInit = {}, retried = false): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } })
  if (!response.ok) {
    if (response.status === 401 && !retried) {
      accessToken = null
      await connect(true)
      return ask<T>(url, init, true)
    }
    throw new Error('드라이브에 닿지 못했어요')
  }
  return response.json() as Promise<T>
}
```

`retried` 자리표가 중요하다. 이게 없으면 다시 받는 것도 실패했을 때 무한히 반복한다.

---

## 드라이브에 파일 두기

### 앱 데이터 폴더는 따로 있는 공간이다

드라이브에는 일반 파일이 있는 공간과 앱 데이터 공간이 따로 있다. 앱 데이터 공간의 파일은 이용자의 드라이브 화면에 안 보인다. 실수로 지울 일이 없다는 게 장점이고, 작정하고 지우려면 설정에서 앱 연결을 끊어야 한다.

넣을 때도 찾을 때도 그 공간을 지정한다.

```ts
// 만들 때
body: JSON.stringify({ name: 'openday.json', parents: ['appDataFolder'] })

// 찾을 때 — 주소에 spaces=appDataFolder를 붙인다
'/files?spaces=appDataFolder&q=' + query + '&fields=files(id)'
```

### 필요한 항목만 fields로 받는다

드라이브가 돌려주는 파일 정보는 항목이 많다. `fields=files(id)`처럼 적으면 그것만 온다. 응답이 작아지는 것보다, 코드가 무엇을 쓰는지 한눈에 보이는 게 더 좋았다.

### 만들기와 내용 넣기를 나눈다

파일을 만들면서 내용까지 한 번에 넣으려면 multipart 요청을 손으로 조립해야 한다. 경계 문자열을 직접 만들고 본문을 이어 붙이는 일이라 잔실수가 나기 쉽다. 두 번 부르면 그럴 필요가 없다.

```ts
// 1) 빈 파일을 만들고
const created = await ask({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }),
})

// 2) 내용을 넣는다 — uploadType=media
await ask('/files/' + created.id + '?uploadType=media', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(backup),
})
```

주소가 다른 것도 알아 뒀다. 정보를 다루는 요청은 `drive/v3`, 내용을 올리는 요청은 `upload/drive/v3`다.

### 내용을 받을 때는 alt=media

같은 주소를 그냥 부르면 파일 정보가 오고, `alt=media`를 붙이면 내용이 온다.

```ts
const response = await fetch(DRIVE + '/files/' + fileId + '?alt=media', { headers: headers() })
```

### 내려받은 것도 모양을 검사한다

우리가 올린 파일이니 믿어도 될 것 같지만, 옛 형식이거나 중간에 깨졌을 수 있다. 검사하지 않고 넣으면 화면이 통째로 안 뜬다.

```ts
if (data?.app !== 'openday' || !Array.isArray(data.days)) {
  throw new Error('드라이브에 있는 파일이 오픈데이 기록이 아니에요.')
}
```

---

## 두 기기의 기록을 합치기

### 파일 통째로 나중 것이 이기게 하면 하루가 사라진다

제일 쉬운 방법은 "나중에 올린 파일이 이긴다"이다. 그런데 회사에서 도장을 찍어 올려 두고, 집에서 그 사실을 모른 채 뭔가를 고쳐 올리면 회사에서 찍은 하루가 통째로 사라진다. 덮어쓴 쪽은 자기가 뭘 지웠는지도 모른다.

### 열쇠를 무엇으로 잡느냐가 전부다

통째로 비교하는 대신 작은 단위로 나눠 비교한다. 나누는 기준이 열쇠다.

- 하루 기록 — 가게와 날짜를 합쳐서 열쇠로 삼는다
- 업무·가게 — 각자의 `id`가 열쇠다

```ts
const key = (d: DayRecord) => d.spaceId + '|' + d.date

for (const day of mine.days) days.set(key(day), day)
for (const day of theirs.days) days.set(key(day), newer(days.get(key(day)), day))
```

열쇠가 다르면 둘 다 살아남는다. 같은 열쇠를 양쪽에서 고쳤을 때만 나중 것이 이긴다. 실제로는 회사에서 회사 가게를, 집에서 개인 가게를 만지니까 부딪히는 일 자체가 드물다.

### 시각은 바뀐 것에만 찍는다

무엇이 나중인지 판단하려면 각 기록에 고친 시각이 있어야 한다. 여기서 실수하기 쉬운 게, 저장할 때 전부 다 새로 찍는 것이다. 그러면 아무것도 안 건드린 쪽이 "방금 고친 것"이 되어 이겨 버린다.

바뀐 것만 골라 찍는다. 이전 것과 비교해서 같으면 이전 것을 그대로 쓴다.

```ts
const old = before.get(item.id)
const same = old && JSON.stringify(strip(old)) === JSON.stringify(strip(item))
return same ? old : { ...item, updatedAt: now }
```

### 합친 결과를 저장할 때도 다시 찍으면 안 된다

합치기가 끝나면 결과를 저장소에 넣는데, 그때 저장 함수가 시각을 새로 찍으면 방금 진 쪽이 다시 최신이 된다. 다음번에 합칠 때 승부가 뒤집힌다. 합쳐진 것을 넣는 경로는 시각을 안 찍는 경로로 따로 뒀다.

### 지움은 이 방식으로 표현이 안 된다

한쪽에서 지운 것이 다른 쪽에는 그대로 남아 있으면, 합칠 때 남아 있는 쪽이 살아서 되살아난다. "지웠다"는 사실 자체를 기록으로 남겨야 제대로 되는데(묘비를 세운다고 한다) 그만큼 복잡해진다.

우리는 그걸 안 만드는 대신 지움을 거의 안 쓰게 설계했다. 도장 이력이 있는 업무·가게는 완전 삭제가 아니라 보관이고, 보관은 상태 값이라 정상적으로 합쳐진다. 되살아나는 건 한 번도 안 쓴 것뿐이라 피해가 작다.

### 올리기는 내려받기 → 합치기 → 올리기다

순서가 전부다. 그냥 올리면 저쪽이 올려 둔 것이 지워진다.

```ts
export async function syncNow(store: Store): Promise<void> {
  const mine = store.exportAll()
  const theirs = await drive.download()
  if (!theirs) {
    await drive.upload(mine)
    return
  }
  const merged = mergeBackups(mine, theirs)
  store.importAll(merged)
  await drive.upload(merged)
}
```

### 손이 멈추면 올리고, 중요한 순간은 바로 올린다

글자를 칠 때마다 올리면 드라이브를 계속 두드린다. 타이머를 걸어 두고 새 변경이 오면 타이머를 다시 건다.

```ts
function syncSoon() {
  if (!drive.isConnected()) return
  window.clearTimeout(syncTimer.current)
  syncTimer.current = window.setTimeout(() => void runSync(), 3000)
}
```

다만 셔터를 내리는 건 하루의 매듭이라 그것만 기다리지 않고 바로 올린다. 전부 미루거나 전부 즉시가 아니라, 무엇이 중요한지에 따라 가른다.

---

## 브라우저 저장소와 수명

### 저장 열쇠에 축을 하나 더 넣을 때

가게가 생기면서 하루 기록의 열쇠가 날짜 하나에서 가게와 날짜 둘로 늘었다. 구조 버전을 올리고 옛 열쇠를 새 자리로 옮기되, 옛 것은 지우지 않는다.

```text
openday.day.me.2026-08-20            (예전)
openday.day.me.company.2026-08-20    (지금)
```

옮겼다는 표시를 따로 남겨서 두 번 옮기지 않게 한다. 이 표시를 지우면 다음에 열 때 다시 옮기는데, 원본을 안 지웠기 때문에 그게 가능하다.

### 접두사로 우리 키만 골라 지운다

브라우저 저장소는 사이트 전체가 같이 쓴다. 통째로 비우면 우리 것이 아닌 것까지 지운다. 우리가 붙인 접두사로 걸러 낸다.

```ts
const doomed: string[] = []
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key && key.startsWith(dayPrefix)) doomed.push(key)
}
for (const key of doomed) localStorage.removeItem(key)
```

돌면서 바로 지우면 안 된다. 지우는 순간 순번이 밀려서 하나씩 건너뛴다. 목록을 먼저 모으고 나서 지운다.

### sessionStorage와 localStorage의 차이가 곧 제품 결정이 된다

둘은 쓰는 법이 똑같고 수명만 다르다.

- `localStorage` — 지우기 전까지 남는다
- `sessionStorage` — 탭을 닫으면 사라진다. 새로고침은 살아남는다

"브라우저를 닫으면 로그아웃"을 어떻게 만들까 고민했는데, 연결했다는 표시를 어디에 두느냐로 끝났다. 세션 저장소에 두면 새로고침은 이어지고 창을 닫으면 풀린다. 기능을 만든 게 아니라 저장소를 고른 것이다.

### 합치는 방식으로 넣는 함수로는 완전 교체가 안 된다

기록을 되살리는 함수를 "있는 것에 얹는다"로 만들어 뒀더니, 드라이브 것으로 갈아탈 때 문제가 됐다. 이 브라우저 것을 버리고 저쪽 것만 쓰고 싶은데 얹기만 하니까 남는다. 먼저 지우고 넣는 순서로 풀었다.

넣는 함수를 만들 때 "얹기인가 교체인가"를 정해 두지 않으면 나중에 반드시 부딪힌다.

---

## 기록을 파일로 주고받기

### 파일 내려주기는 Blob과 가짜 링크로 한다

서버 없이 브라우저에서 만든 내용을 파일로 준다.

```ts
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
const url = URL.createObjectURL(blob)

const link = document.createElement('a')
link.href = url
link.download = '오픈데이 백업.openday'
link.click()
URL.revokeObjectURL(url)
```

화면에 붙이지 않은 링크도 `click()`이 먹는다.

### createObjectURL은 만든 만큼 돌려줘야 한다

이 주소는 페이지가 살아 있는 동안 메모리를 붙잡는다. 쓰고 나면 `revokeObjectURL`로 돌려준다. 한 번 눌러 끝나는 기능이라 티는 안 나지만, 안 돌려주는 습관이 붙으면 목록에서 파일을 여럿 만들 때 그대로 샌다.

### 확장자를 직접 정할 수 있다

`.json`으로 두면 다른 앱이 만든 json도 그럴듯하게 보인다. `.openday`로 두면 파일 고르는 창에서 우리 파일만 보인다.

```tsx
<input type="file" accept=".openday" onChange={onPick} />
```

`accept`는 안내일 뿐이라 사용자가 다른 걸 고를 수 있다. 그래서 검사는 따로 한다.

### 받은 파일은 검사하고, 넣기 전에 한 번 멈춘다

파일을 고르자마자 넣지 않는다. 형식을 확인하고, 무엇이 들어오는지 보여준 다음, 되살리기를 한 번 더 누르게 한다. 되돌릴 수 없는 조작 앞에 멈춤을 하나 두는 것이다.

```ts
const backup = data as Backup
if (backup?.app !== 'openday' || !Array.isArray(backup.days)) {
  setMessage('오픈데이 백업 파일이 아니에요.')
  return
}
setPending(backup)
```

---

## React에서 배운 것

### 파생 상태를 값에서 거꾸로 계산하면 사용자의 선택이 덮인다

오늘 만난 버그 중 원인이 제일 재미있었던 것이다.

반복 편집기에 「격주」「격월」「분기」 같은 자주 쓰는 선택지와 「직접 정하기」가 있다. 지금 무엇이 켜져 있는지를 규칙에서 거꾸로 계산했다. 2주마다면 격주, 2개월마다면 격월, 그 외면 직접 정하기.

```ts
// 이렇게 하면 안 된다 — 값에서 화면 상태를 되짚는다
const preset = presetOf(rule)
```

문제는 「직접 정하기」를 고르고 숫자를 3으로 바꾸는 순간이다. 계산이 다시 돌면서 값을 보고 화면을 다시 정하는데, 사용자가 방금 무엇을 골랐는지는 값 어디에도 안 적혀 있다. 그래서 화면이 자기가 아는 쪽으로 되돌아간다.

```ts
// 고른 것을 따로 기억하고, 고를 때만 바꾼다
const [preset, setPreset] = useState(() => presetOf(rule))
```

계산으로 뽑을 수 있는 값은 상태로 두지 말라는 말을 어제 배웠는데, 오늘은 반대쪽 경계를 봤다. 계산으로 뽑을 수 있어 보여도 그게 사용자의 의도를 담고 있으면 상태여야 한다. 같은 규칙을 만드는 길이 두 개인데, 사용자가 어느 길로 왔는지는 결과에 안 남기 때문이다.

### 숫자 입력은 초안 문자열로 들고, 떠날 때 정리한다

숫자 칸에서 지우면 빈 문자열이 되고, 그걸 숫자로 바꾸면 0이나 NaN이 된다. 최소값으로 밀어 넣으면 지우자마자 1이 튀어나와서 3을 못 친다.

칸이 들고 있는 글자와 실제 값을 나눈다.

```tsx
const [draft, setDraft] = useState(String(value))

// 입력 중에는 관대하게
onChange={(e) => {
  setDraft(e.target.value)
  const n = Number(e.target.value)
  if (e.target.value && n >= min) onCommit(Math.floor(n))
}}
// 떠날 때 바로잡는다
onBlur={(e) => commit(e.target.value)}
```

### 판별 유니온은 종류가 늘어도 그대로 넓어진다

어제 만든 배치 규칙에 반복이 하나 더 붙었다.

```ts
export type Schedule =
  | { kind: 'always' }
  | { kind: 'weekly'; weekdays: number[] }
  | { kind: 'once'; date: string }
  | RepeatSchedule
```

반복 안에서 또 갈라지는 것(요일들 / 며칟날 / n번째 무슨 요일)도 같은 방식으로 한 겹 더 나눴다.

```ts
export type RepeatPick =
  | { by: 'weekday'; weekdays: number[] }
  | { by: 'day'; day: number }
  | { by: 'nth'; nth: number; weekday: number }
```

종류를 늘리면 그 종류를 다루는 곳에서 빠뜨린 가지를 타입 검사가 짚어 준다. 화면 네 곳을 고쳐야 하는데 세 곳만 고치는 일이 안 생긴다.

### 두 축으로 화면을 고른다

가게가 여러 채가 되면서 "어디에 있나"와 "어느 방인가"가 따로 놀게 됐다.

```tsx
const [place, setPlace] = useState<Place>('village')  // 마을 / 가게 / 관리
const [room, setRoom] = useState(0)                    // 오늘 / 창고 / 기록실
```

화면 하나를 상태 하나로 고르려 하면 조합이 늘 때마다 경우가 곱해진다. 축을 나눠 두면 가게가 열 채가 돼도 방은 그대로 셋이다.

### 마운트에 한 번만 도는 효과와 뒷정리

새로고침 뒤 조용히 다시 연결하는 것은 화면이 처음 뜰 때 한 번만 하면 된다. 의존성 목록을 비워 둔다.

```tsx
useEffect(() => {
  if (!drive.wasConnected() || drive.isConnected()) return
  void (async () => {
    await drive.connect(true)
    await runSync()
  })()
}, [])
```

타이머를 거는 곳에서는 화면이 사라질 때 지우는 것도 같이 둔다. 안 지우면 없어진 화면을 향해 타이머가 돈다.

```tsx
useEffect(() => () => window.clearTimeout(syncTimer.current), [])
```

### 이전 값을 봐야 할 때는 함수형 업데이트

기록을 지우면 보고 있던 가게가 없어질 수 있다. 그때 마을로 돌려보내야 하는데, 지금 어디를 보고 있는지를 알아야 판단이 된다.

```tsx
setPlace((prev) =>
  prev === 'village' || nextSpaces.some((s) => s.id === prev) ? prev : 'village',
)
```

바깥 변수를 읽어서 판단하면 그 값이 낡았을 수 있다. 갱신 함수 안으로 받으면 항상 최신이다.

---

## CSS

### 바깥 상자를 가로 배치로 바꾸면 그 자식이 전부 칸이 된다

마을을 넣으면서 맨 바깥 상자를 가로 배치로 바꿨다. 그랬더니 아래에 있던 광고가 사이드바 오른쪽으로 붙어 올라갔다.

당연한 결과인데도 놓쳤다. 가로 배치의 자식은 전부 칸이 되고, 광고도 그 바깥의 자식이었기 때문이다.

```css
.page {
  display: flex; /* 사이드바 | 본문 — 이 안의 모든 자식이 칸이 된다 */
}
```

배치를 바꿀 때는 그 상자의 자식을 전부 세어 봐야 한다. 새로 넣는 것만 보면 원래 있던 것이 딸려 간다. 광고를 본문 안으로 옮겨서 풀었다.

### 켜짐은 색만이 아니라 형태로도 보이게 한다

사이드바에서 문 연 가게를 색으로만 구분했더니 켜진 건지 아닌지 확실하지 않다는 말을 들었다. 색은 화면과 조명에 따라 달라 보이고, 옆에 비교 대상이 없으면 더 그렇다. 형태를 하나 더 얹으면 하나만 있어도 읽힌다.

---

## 반복 날짜 계산

### 그 달의 n번째 무슨 요일

"매년 8월 첫 금요일"을 날짜로 바꾸려면, 어떤 날이 그 달의 몇 번째 그 요일인지 셀 수 있어야 한다. 1일부터 7일까지가 첫 번째, 8일부터 14일까지가 두 번째다.

```ts
if (new Date(year, month - 1, day).getDay() !== pick.weekday) return false
if (pick.nth === -1) return day + 7 > lastDayOfMonth(year, month)
return Math.floor((day - 1) / 7) + 1 === pick.nth
```

「마지막 그 요일」은 몇 번째인지 셀 수 없다. 달마다 넷일 때도 다섯일 때도 있기 때문이다. 대신 "일주일 뒤가 이 달을 넘어가면 마지막"으로 뒤집어 본다.

### N개월마다는 월을 절대 수로 바꿔서 센다

두 날짜가 몇 개월 떨어져 있는지를 달 이름만 보고 세면 해가 바뀔 때 틀린다. 해와 달을 하나의 수로 펴서 뺀다.

```ts
const months = (year - since.getFullYear()) * 12 + (month - 1 - since.getMonth())
if (months % rule.every !== 0) return false
```

주 단위도 같은 문제가 있다. 요일이 달라도 같은 주면 같은 회차로 세야 해서, 그 주의 일요일끼리 비교한다.

```ts
const startOfWeek = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
const weeks = daysBetween(startOfWeek(since), startOfWeek(target)) / 7
```

### 31일로 잡은 것을 짧은 달에 어떻게 할까

「매달 31일」로 잡아 두면 2월에는 그런 날이 없다. 그 달을 통째로 건너뛰면 두 달에 한 번 하는 일이 되어 버린다. 그 달의 마지막 날로 당겨서 띄운다.

```ts
return day === Math.min(pick.day, lastDayOfMonth(year, month))
```

그 달의 마지막 날은 다음 달 0일로 구한다.

```ts
new Date(year, month, 0).getDate()
```

### 종료일은 날짜만으로 비교한다

날짜를 `2026-08-24` 같은 글자로 들고 다니면 시각이 안 섞인다. 비교할 때도 시각을 떼고 날짜만 남겨서 뺀다.

```ts
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b - a) / 86400000)
}
```

시각이 섞이면 서머타임이 있는 곳에서 하루가 어긋난다. 여기서 `Date.UTC`를 쓰는 건 시간대를 바꾸려는 게 아니라, 두 날짜를 같은 기준의 수로 바꿔 빼기 위한 것이다.

---

## 배포와 운영

### 라이브 브랜치를 나누면 밀어 넣는 게 무섭지 않다

쓰는 사람이 생기면 코드를 올릴 때마다 화면이 바뀐다. 호스팅에서 어느 가지를 라이브로 볼지 정할 수 있어서, 개발용과 라이브용을 갈랐다.

- `main` — 개발. 밀어 넣어도 미리보기만 바뀐다
- `release` — 라이브. 여기로 합치는 순간 실제 화면이 바뀐다

배포가 한 단계 늘어난 게 아니라, 배포하지 않을 자유가 생긴 것이다.

### 미리보기 주소와 로그인 원본 등록은 서로 안 맞는다

가지마다 미리보기 주소가 생기는데, 로그인은 등록한 주소에서만 된다. 와일드카드가 안 되니 가지를 만들 때마다 등록해야 한다. 그래서 로그인이 걸린 것을 확인할 때는 로컬 주소에서 본다.

### 캐시 때문에 아직 안 올라온 것처럼 보인다

다른 쪽에 문서 갱신을 요청하고 살아 있는 페이지를 열었더니 갱신일이 그대로였다. 안 올라온 줄 알았는데 호스팅 캐시가 옛 페이지를 들고 있었다. 캐시를 우회해 다시 받으니 갱신된 내용이 나왔다.

```bash
curl -s -H 'Cache-Control: no-cache' 'https://example.com/privacy/?cb=1' | head
```

"안 보인다"와 "없다"는 다르다. 남에게 다시 하라고 말하기 전에 이 둘을 갈라야 한다.

---

## 판단으로 배운 것

### 되돌릴 수 없는 조작은 버튼 하나로 두지 않는다

연결 직후에 쓰라고 「드라이브에 올리기」와 「드라이브에서 가져오기」를 나란히 뒀는데, 올리기가 합치지 않고 덮어쓰는 동작이었다. 다른 기기에서 올려 둔 것이 그 순간 사라진다.

두 버튼을 걷어내고 「지금 맞추기」 하나로 합쳤다. 맞추기는 내려받아 합친 뒤에 올리니까 어느 쪽도 안 사라진다. 위험한 조작에 확인 창을 붙이는 것보다, 위험한 조작 자체를 없애는 쪽이 낫다.

### 틀린 판단은 지우지 말고 왜 틀렸는지를 남긴다

문서에 "어느 쪽이든 서버가 필요하다"고 적혀 있었는데 틀렸다. 그 줄을 조용히 지우면 다음에 같은 자리에서 또 헷갈린다. 취소선을 긋고 무엇이 틀렸는지, 대신 어떤 제약이 따라왔는지를 함께 적었다.

틀린 판단은 그 자체로 정보다. 왜 그렇게 생각했는지가 적혀 있어야 다음에 같은 실수를 알아본다.

### 기본값이 남의 상황이면 첫인상이 정리부터 하세요가 된다

처음 열었을 때 보이는 기본 업무가 특정한 한 사람 상황에 맞춘 예시였다. 남이 열면 자기 일이 아니라서 지우는 것부터 해야 한다. 첫 화면이 할 일을 주는 게 아니라 숙제를 주는 셈이다.

기본 업무를 사용법 안내로 바꿨다. 눌러 보면 익혀지고, 자기 업무를 만들기 시작하면 자연스럽게 밀려난다. 지워야 할 것을 주는 대신 해 볼 것을 주는 쪽으로.

### 못 되살리는 것을 받아들이고 그만큼 겹으로 막는다

기록을 이용자 드라이브에 두기로 하면서 하나를 잃었다. 이용자가 자기 손으로 지우면 우리가 못 되살린다.

되살려 주려면 우리도 사본을 가져야 하는데, 그 순간 "우리 서버로 아무것도 가지 않습니다"가 거짓이 되고 개인정보 부담이 서버에 두는 것과 같아진다. 둘 다 가질 수는 없다.

그래서 못 되살리는 쪽을 받아들이고, 지워지는 일 자체가 잘 안 일어나게 겹을 뒀다. 앱 데이터 폴더는 드라이브 화면에 안 보이고, 덮어쓰기는 합치기가 막고, 파일 내보내기가 최후 보루다. 되돌릴 수단이 없으면 되돌릴 일을 줄이는 것으로 대신한다.

---

여기서부터는 계정을 붙이고 나서, 못 한 일을 다음 근무일로 넘기는 길을 내며 배운 것이다.

## 세는 기준을 어디에 두나

### 기록에 남은 자리를 기준 삼으면 유령이 생긴다

매월 5일에 하는 일이 24일 기록실에 「미완료」로 떠 있었다. 그날 할 일이 아닌데도.

원인은 세는 기준이었다. 기록실이 「그날 기록에 남아 있는 자리」를 그대로 미완료로 세고 있었다. 그런데 그 자리는 배치와 상관없이 이런저런 이유로 생긴다 — 업무를 만든 순간, 일정을 바꾼 순간에 오늘 기록에 빈 자리가 하나 놓인다.

기준을 「그날 배치」로 바꿨다.

```ts
const scheduled = templatesForDate(spaceTemplates, record.date, record.carriedIn)
const done = record.progress.filter((p) => 도장이 찍혔나)
const todo = scheduled.filter((t) => !done.some((r) => r.t.id === t.id))
```

"무엇이 기록에 있나"와 "그날 무엇을 했어야 하나"는 다른 질문이다. 미완료는 두 번째 질문에 속한다.

### 혹시 모르니 남겨두자가 유령을 만든다

빈 자리가 계속 따라다닌 건 이런 규칙 때문이었다.

```ts
// 배치에서 빠졌지만 기록이 남은 업무는 버리지 않고 뒤에 붙인다
const orphans = day.progress.filter((p) => !templates.some((t) => t.id === p.templateId))
```

의도는 좋았다. 창고에서 업무를 지워도 어제 찍은 도장은 남아야 한다. 그런데 도장이 하나도 없는 자리까지 같이 붙잡고 있었다.

```ts
const orphans = day.progress.filter(
  (p) =>
    !templates.some((t) => t.id === p.templateId) &&
    (p.done || p.count > 0 || p.memo.length > 0 || p.children.some((c) => c.done || c.count > 0)),
)
```

관용은 공짜가 아니다. "혹시 모르니 남겨두자"는 남길 값어치가 있는 것과 없는 것을 가르고 나서 해야 한다. 여기서 경계는 명확했다 — 도장이나 메모가 있으면 그날의 진짜 기록이고, 아무것도 없으면 그냥 빈칸이다.

---

## 이월을 설계하면서 배운 것

### 하루짜리 이월은 받는 날을 놓치는 순간 끊긴다

못 한 일을 다음 근무일로 넘기는 걸 이렇게 만들었다. 넘기기를 누른 그 순간, 받는 날 기록에 "이 업무가 넘어옴"이라고 한 번 적는다.

만들고 나서 따져 봤다. 수요일에 목요일로 넘겼는데 목요일이 공휴일이면?

목요일에 아무도 앱을 안 여니까 그 기록은 그대로 남는다. 금요일 보드는 금요일 기록의 「넘어옴」만 보므로 그 업무가 안 뜬다. 데이터는 남아 있는데 눈에는 안 보인다 — 실질적으로는 사라진 것이다.

### 처리될 때까지 따라오게 한다

고친 방향은 "받는 날을 정확히 맞히기"가 아니라 "못 맞혀도 살아남기"였다.

```ts
export function pendingCarry(days, templates, today) {
  const pending = []
  for (const day of days) {
    if (day.date >= today) continue
    for (const id of day.carriedIn ?? []) {
      const template = templates.find((t) => t.id === id)
      if (!template || template.archived) continue
      const progress = day.progress.find((p) => p.templateId === id)
      if (progress && isStamped(progress, template)) continue          // 그날 했다
      if ((day.carriedOut ?? []).some((c) => c.templateId === id)) continue  // 다시 넘겼다
      pending.push({ date: day.date, templateId: id })
    }
  }
  return pending
}
```

조건이 "넘어왔는데 하지도, 다시 넘기지도 않은 것" 하나다. 그러면 목요일을 건너뛰든 일주일을 건너뛰든 다음에 여는 날로 따라온다.

### 데려온 뒤 자국을 안 남기면 무한히 되살아난다

여기서 한 번 걸렸다. 금요일에 데려오기만 하면, 목요일 기록은 여전히 "넘어왔는데 안 한 것"인 채로 남는다. 다음 주 월요일에 또 훑으면 그게 또 걸린다. 금요일에 이미 처리했는데도.

그래서 데려온 뒤 멈춰 있던 그 날에 매듭을 짓는다.

```ts
store.saveDay({
  ...source,
  carriedOut: [...(source.carriedOut ?? []), ...moved.map((c) => ({ templateId: c.templateId, to: today }))],
})
```

"찾아서 쓴다"만 만들고 "찾았다는 사실을 적는다"를 빼먹으면, 매번 같은 것을 처음 보는 것처럼 다시 찾는다.

### 어느 날에서 멈췄는지까지 돌려줘야 했다

처음에는 업무 id만 모아서 돌려줬다. 그런데 자국을 남기려면 "어느 날의 자국인가"를 알아야 한다. 같은 업무가 여러 날에 걸쳐 있을 수 있으니 id만으로는 어느 날에 찍을지 못 고른다.

```ts
export interface PendingCarry {
  date: string
  templateId: string
}
```

돌려주는 값을 정할 때는 부르는 쪽이 그다음에 무엇을 하는지까지 봐야 한다.

### 양쪽에 자국을 남기는 이유

넘긴 날에는 `carriedOut`, 받는 날에는 `carriedIn`을 적는다. 한쪽만 두면 각각 이렇게 막힌다.

- 받는 쪽만 있으면 — 넘긴 날에서 취소를 못 한다. 어디로 보냈는지 모르니까
- 넘긴 쪽만 있으면 — 받는 날이 자기 배치를 못 짠다. 지나간 날을 다 뒤져야 한다

같은 사실을 두 곳에 적는 건 대개 나쁜 신호인데, 여기서는 두 날이 서로를 가리켜야 해서 필요했다. 대신 고칠 때 반드시 같이 고쳐야 한다.

### 바깥을 아는 것보다 안에서 버티는 게 근본이다

같은 문제를 공휴일 달력으로도 풀 수 있었다. 목요일이 공휴일인 걸 알면 애초에 금요일로 넘겼을 테니까.

그런데 그건 목요일만 푼다. 갑자기 아파서 쉰 날, 출장 간 날, 그냥 안 연 날은 여전히 못 잡는다. 바깥 사정을 데이터로 들여오는 방식은 들여온 만큼만 맞는다.

"못 맞히면 어떻게 되나"를 견디게 만들어 두면 맞히는 일 자체가 덜 급해진다. 실제로 보류해 둔 공휴일 처리가 이걸 넣고 나서 덜 급해졌다.

### 화면 뜰 때 저장소를 손보는 것의 타이밍

이 훑기를 화면이 처음 뜰 때 한 번 돌린다.

```tsx
useEffect(() => {
  // ...훑고 저장소를 고친다
  if (touched) reloadFromStore()
}, [])
```

한계가 하나 있다. 드라이브에서 내려받아 합치는 것보다 먼저 돈다. 그래서 다른 기기에서 넘긴 것이 이번에 열 때는 안 잡히고 다음에 열 때 잡힌다. 하루가 밀리는 셈인데, 다음에 열면 반드시 잡히므로 사라지지는 않는다. 사라지는 것과 늦는 것은 무게가 다르다.

---

## 날짜 계산

### 근무 요일 집합에서 다음 날 찾기

"다음 근무일"은 계산이 아니라 탐색이다. 하루씩 앞으로 가면서 근무 요일에 걸리는 첫 날을 고른다.

```ts
export function nextWorkday(date: string, workdays: number[]): string {
  const [y, m, d] = date.split('-').map(Number)
  for (let step = 1; step <= 14; step++) {
    const next = new Date(y, m - 1, d + step)
    if (workdays.length === 0 || workdays.includes(next.getDay())) return dateKey(next)
  }
  return dateKey(new Date(y, m - 1, d + 1))
}
```

상한 14를 둔 건 근무 요일을 하나도 안 골랐을 때 영원히 도는 걸 막기 위한 것이다. 그 경우는 위에서 이미 걸러지지만, 도는 코드에는 빠져나갈 길을 하나 더 둔다.

### Date는 달·해 넘김을 알아서 접는다

날짜에 더할 때 이번 달의 마지막 날인지 따질 필요가 없다.

```ts
export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + delta))
}
```

`new Date(2026, 11, 35)`는 오류가 아니라 2027년 1월 4일이다. 범위를 벗어난 값을 넣으면 알아서 넘겨 준다.

---

## 달력 입력에서 겪은 것

### 버튼이 네이티브 달력을 연다

날짜 칸을 화면에 늘어놓지 않고 버튼 하나로 달력만 띄우고 싶었다.

```tsx
<input ref={...} className="date-hidden" type="date" min={tomorrow} onChange={...} />
<button onClick={() => openCalendar(t.id)}>넘기기</button>
```

```ts
const el = dateRefs.current[templateId]
el.showPicker()
```

`showPicker()`는 사용자 조작 안에서 불러야 한다. 상태를 바꾸고 나서 효과에서 부르면 조작이 끝난 뒤라 거절당한다. 그래서 클릭 처리 안에서 바로 불렀다.

### 같은 값을 고르면 change가 안 온다

오늘 만난 버그 중 가장 조용했던 것이다.

오늘만 할 일을 만들고 넘기기를 눌러 달력이 떴는데, 내일 날짜를 고르면 아무 일도 안 일어났다. 다른 날짜는 됐다.

달력을 이렇게 열고 있었다.

```tsx
value={carriedTo(t.id) ?? carryTarget}   // 기본값 = 다음 근무일
```

달력이 이미 그 날짜가 골라진 채로 열린다. 거기서 같은 날짜를 다시 누르면 값이 안 바뀌고, 값이 안 바뀌면 브라우저는 `change`를 쏘지 않는다. 그래서 하필 기본값과 같은 날 — 대개 고르고 싶은 바로 그 날 — 만 조용히 넘어갔다.

```ts
function openCalendar(templateId: string) {
  const el = dateRefs.current[templateId]
  if (!el) return
  el.value = ''   // 비우고 연다
  el.showPicker()
}
```

`change`는 "값이 바뀌었다"이지 "사용자가 골랐다"가 아니다. 이 둘을 같은 것으로 여기면, 이미 그 값인 경우에만 조용히 안 먹는 코드가 나온다.

### 편의로 넣은 기본값이 기능을 막았다

기본값을 넣은 건 친절해 보였기 때문이다. 달력을 열면 다음 근무일이 미리 골라져 있으니까. 그 친절이 정확히 그 값을 고르는 길을 막았다.

둘 다 가질 수는 없어서 "고른 게 확실히 먹는 쪽"을 택했다. 미리 표시해 주는 편의보다, 누른 대로 되는 것이 먼저다.

### 값을 채우지 않기 위해 제어를 놓는다

React에서는 입력에 `value`를 물려 제어하는 게 기본이다. 그런데 여기서는 값을 안 물리는 게 목적이었다.

```tsx
<input type="date" min={tomorrow} onChange={(e) => e.target.value && onCarry(t.id, e.target.value)} />
```

`value` 없이 두고 `onChange`만 받는다. 화면에 보이지 않는 칸이라 무엇이 들어 있는지 보여줄 이유도 없다. 기본을 따르는 것보다 왜 그 기본이 있는지를 보고 고르는 게 낫다.

### 숨긴 칸은 지우면 안 된다

달력만 쓰려고 칸을 숨겼는데, 아예 없애면 열 대상이 사라진다.

```css
.date-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
```

`display: none`이 아니라 크기와 투명도로 감춘다. 안 보이는 것과 없는 것은 다르다.

### 아무 일도 안 일어나는 실패가 제일 찾기 어렵다

오류가 나면 최소한 어디를 볼지는 알려준다. 이 버그는 오류도 경고도 없었고 그냥 아무 일도 안 일어났다.

"다른 날짜는 되는데 내일 날짜만 안 된다"는 말이 없었으면 한참 헤맸을 것이다. 되는 경우와 안 되는 경우의 차이가 원인을 가리킨다 — 안 되는 것만 보면 그 차이가 안 보인다.

---

## React에서 더 배운 것

### 목록의 여러 요소를 ref로 붙잡기

`useRef`는 보통 하나를 붙잡는 데 쓰는데, 목록에서는 id로 나눠 담는다.

```tsx
const dateRefs = useRef<Record<string, HTMLInputElement | null>>({})

<input ref={(el) => { dateRefs.current[t.id] = el }} />
```

### ref 콜백에서 값을 반환하면 안 된다

위 코드에서 중괄호가 중요하다.

```tsx
ref={(el) => (dateRefs.current[t.id] = el)}   // ❌ 대입 결과가 반환된다
ref={(el) => { dateRefs.current[t.id] = el }} // ✅ 아무것도 안 돌려준다
```

ref 콜백이 무언가를 돌려주면 React 19는 그걸 정리 함수로 여긴다. 요소가 사라질 때 그 함수를 부르려 하고, 함수가 아니면 문제가 된다. 화살표 함수에서 중괄호를 빼면 대입한 값이 그대로 반환된다는 걸 잊기 쉽다.

---

## 데이터 모양을 바꿀 때

### 배열 원소의 모양이 바뀌면 읽는 쪽에서 거른다

넘긴 자국을 처음에는 id만 담았다.

```ts
carriedOut?: string[]
```

날짜를 고를 수 있게 되면서 어디로 넘겼는지도 있어야 했다.

```ts
carriedOut?: { templateId: string; to: string }[]
```

이미 저장된 것에는 옛 모양이 들어 있다. 읽을 때 걸러 낸다.

```ts
carriedOut: (stored.carriedOut ?? []).filter(
  (c): c is CarryOut => typeof c === 'object' && c !== null && 'to' in c,
)
```

여기서 옛 항목을 살릴 수도 있었다. 그런데 옛 모양에는 목적지가 없어서, 어디로 넘겼는지를 다른 날 기록을 다 뒤져 알아내야 한다. 살리는 값어치보다 품이 크다.

### 아직 안 나간 변경은 버려도 된다

그 판단을 할 수 있었던 건 그 데이터가 아직 라이브에 안 나갔기 때문이다. 개발 중에만 쓰는 저장 열쇠에 있었고 실제 이용자 기록은 없었다.

같은 코드라도 "이미 남의 기기에 있는가"에 따라 할 수 있는 일이 달라진다. 변환 코드를 쓸지 버릴지는 코드를 보고 정하는 게 아니라 나갔는지를 보고 정한다.

---

## 화면에서 배운 것

### 한 줄 안에 세로 갈래를 나란히 세우기

가로로 나란히 놓되 각 갈래 안은 세로로 쌓는다. 바깥은 행, 안은 열이다.

```css
.admin-parts {
  display: flex;      /* 갈래를 가로로 */
  gap: 20px;
  flex-wrap: wrap;
}

.admin-parts .admin-part {
  flex: 1 1 260px;    /* 260px 아래로 좁아지면 접힌다 */
  min-width: 0;
  display: flex;
  flex-direction: column;  /* 갈래 안은 세로로 */
}
```

`flex: 1 1 260px`의 셋째 값이 기준 너비다. 둘이 나란히 서다가 자리가 모자라면 알아서 아래로 내려간다. 화면 크기마다 규칙을 따로 적을 필요가 없다.

### 버튼처럼 안 보이는 버튼은 없는 버튼이다

「기록 지우기」를 글자 링크 모양으로 만들어 뒀더니 안 보인다는 말을 들었다. 실제로 누를 수 있었는데도.

테두리를 주니 보였다.

```css
.danger-btn {
  border: 1px solid var(--stamp);
  color: var(--stamp);
  background: transparent;
}

.danger-btn:hover {
  background: var(--stamp);
  color: var(--sign-text);
}
```

누를 수 있다는 걸 알려주는 건 기능이 아니라 생김새다. 글자 링크는 "덜 중요한 것"이라는 뜻으로 읽히므로, 있어야 할 것에 쓰면 없는 것이 된다.

### 채움과 선은 크기에 따라 다르게 보인다

작은 아이콘을 채움 도형으로 그렸다가 크기를 키우니 뭉개져 보였다.

- 채움 — 작을 때 형태가 또렷하다. 커지면 덩어리져 보인다
- 선 — 작으면 선끼리 붙는다. 커질수록 깔끔하다

같은 모양이라도 놓일 크기를 정하고 나서 그리는 방식을 골라야 한다.

### 아이콘은 경로만 옮겨 심는다

결국 Font Awesome Free의 아이콘을 썼다. CC BY 4.0이라 상업적으로도 쓸 수 있고 조건은 저작자 표시다.

```html
<i class="fa-regular fa-pen-to-square"></i>
```

이 방식은 안 썼다. 아이콘 CSS나 폰트 파일을 불러와야 해서 외부 의존이 생긴다. SVG 경로만 컴포넌트로 옮기면 의존 없이 같은 모양이 나온다.

```tsx
/**
 * Font Awesome Free 7 「pen-to-square」(CC BY 4.0, © Fonticons, Inc.)
 * https://fontawesome.com/license/free
 */
function PencilIcon() {
  return (
    <svg viewBox="0 0 640 640" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M505 122.9L517.1 135C..." />
    </svg>
  )
}
```

표시할 곳이 마땅치 않으면 주석이 그 자리다. 지워질 일이 없는 곳에 두는 게 중요하다.

### 안 쓰게 된 규칙은 그때 걷어낸다

버튼을 연필로 바꾸면서 `memo-btn` 규칙이 아무도 안 쓰는 것이 됐다. 남겨 두면 나중에 "이건 어디서 쓰지"를 한 번 더 확인해야 한다. 만든 사람이 그 자리에서 지우는 게 제일 싸다.

---

## 설정을 어디에 두나

### 앱 전체 값과 가게별 값을 가른다

근무 요일을 어디서 정하게 할지 정해야 했다. 기준은 하나였다 — 이 값이 하나뿐인가, 가게마다 다른가.

근무 요일은 가게마다 다르다. 회사는 월~금이지만 개인 가게는 매일일 수 있다. 앱 전체 설정 화면에 두면 가게별로 못 정한다. 이 한 줄로 후보 하나가 떨어졌다.

### 방마다 성격이 있다

남은 후보는 창고와 기록실이었다.

- 창고 — 그 가게가 무슨 일을 언제 하는가를 정하는 방
- 기록실 — 지나간 것을 보는 방

근무 요일은 첫 번째 질문에 속한다. 요일별 업무를 만들 때 근무일이 바로 위에 있으면, 근무일이 아닌 요일에 업무를 배치해 둔 것이 눈에 보인다.

기록실에 두면 방의 성격이 흐려진다. 화면 하나에 뭘 더 넣을지는 자리가 남았는지가 아니라 그 화면이 무엇을 하는 곳인지로 정한다.

---

## 판단으로 더 배운 것

### 자동과 고르기 사이

못 한 일을 넘기는 걸 자동으로 할지 고르게 할지 정해야 했다.

- 자동 — 신경 쓸 게 없다. 대신 안 넘겨도 될 것까지 따라온다
- 고르기 — 원하는 것만 넘어간다. 대신 손이 한 번 더 간다

둘 다 두고 한쪽을 끌 수 있게 했다. 업무마다 있는 넘기기는 항상 있고, 셔터를 내릴 때 물어보는 건 설정으로 끈다. 고르는 부담이 싫은 사람은 끄면 되고, 매번 확인하고 싶은 사람은 켜 두면 된다.

기본은 켜 두는 쪽으로 했다. 물어보는 것이 안 물어보는 것보다 되돌리기 쉽다.

### 어차피 다음 날에도 뜨는 것은 넘길 수 없다

넘기기 대상에서 상시 업무를 뺐다. 매일 뜨는 일을 "내일로 넘긴다"는 말이 성립하지 않고, 셔터를 내릴 때 목록에 매일 끼면 정작 골라야 할 것이 안 보인다.

```ts
const carryable = (t: TaskTemplate) => templatesForDate([t], carryTarget).length === 0
```

기능을 만들 때는 "무엇을 할 수 있게 할까"만 보게 되는데, "무엇은 하지 않아도 되나"를 같이 정해야 목록이 짧아진다.

### 만들 때는 잘 되는 길만 보인다

이월을 만들 때 머릿속에 있던 그림은 하나였다. 수요일에 넘기면 목요일에 뜬다. 그 길은 잘 됐다.

"목요일이 공휴일이면?"은 만들고 나서 따로 시간을 내서 따져 봤을 때 나왔다. 만드는 동안에는 안 보인다. 잘 되는 길을 좇는 것과 안 되는 길을 찾는 것은 다른 일이라, 다른 시간에 해야 한다.

### 사용법은 순서가 있다

처음 여는 사람에게 보이는 안내 업무에 "오른쪽 클릭으로 되돌릴 수 있다"를 넣었다. 어디에 넣을지가 문제였다.

- 완료 도장 눌러보기
- 여러 번 하는 일 세어보기
- 오른쪽 클릭으로 되돌려 보기 (완료도, 건수도)
- 창고에서 만들어보기
- 계정 연결하기

되돌리기를 세 번째에 뒀다. 두 도장 방식을 다 본 뒤라야 "완료도, 건수도"가 무슨 말인지 안다. 첫 번째 다음에 뒀으면 건수 도장은 아직 본 적이 없는 것이 된다.

가르칠 것을 정하는 것과 순서를 정하는 것은 다른 일이다.
