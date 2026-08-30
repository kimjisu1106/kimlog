---
layout: post
title: 오픈데이 Openday TIL 1
date: 2026-08-20
permalink: "devlog/devlog/TIL/오픈데이 Openday TIL 1"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 나중에 서버로 옮길 것을 전제로 저장 구조를 짜는 법, 오늘 만난 CSS 버그 셋의 공통 원인, 애니메이션을 React에서 다시 재생시키는 법, 스크롤을 조상까지 흔들지 않고 옮기는 법까지 — 근무 트래커를 0에서 만들며 배운 것들.
tags:
  - TypeScript
  - React
  - CSS
  - JavaScript
---
근무 트래커를 빈 폴더에서 시작해 하루 만에 쓸 수 있는 상태까지 만들었다. 그 사이에 배운 것을 모았다.

---

## 저장 구조는 옮길 것을 전제로 짠다

### 저장하는 쪽을 인터페이스 뒤에 숨긴다

화면 코드가 "브라우저 저장소에 어떻게 넣는지"를 알면, 나중에 서버로 옮길 때 화면을 전부 고쳐야 한다. 그래서 화면은 함수 이름만 알고 구현은 모르게 갈라 뒀다.

```ts
export interface Store {
  loadDay(date: string): DayRecord | null
  saveDay(record: DayRecord): void
  loadMonth(month: string): DayRecord[]
}
```

지금은 이 약속을 브라우저 저장소로 구현했고, 계정이 붙는 날 서버 구현으로 갈아끼우면 화면은 한 줄도 안 바뀐다. 인터페이스는 "무엇을 할 수 있는지"만 적고 "어떻게 하는지"는 안 적는다는 게 핵심이다.

### 정의와 기록을 나눈다

"매주 금요일에 뜨는 업무"는 정의이고 "8월 20일에 그걸 끝냈다"는 기록이다. 둘을 한 덩어리로 두면 업무 이름을 고칠 때 지난 기록의 이름까지 같이 바뀐다.

기록은 이름을 복사하지 않고 정의를 id로 가리키기만 한다.

```ts
interface TaskProgress {
  templateId: string   // 이름이 아니라 id로 가리킨다
  done: boolean
  count: number
}
```

### 구조 버전을 데이터 안에 넣는다

데이터 모양은 반드시 바뀐다. 바뀔 때 옛 데이터를 못 읽으면 그동안 쌓인 기록이 날아간다. 그래서 저장할 때 구조 버전을 같이 넣고, 읽을 때 버전을 보고 변환한다.

```ts
function readDay(key: string): DayRecord | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  const stored = JSON.parse(raw)
  return stored.schemaVersion === SCHEMA_VERSION ? stored : migrateDay(stored)
}
```

버전을 저장소 키에 넣으면 안 된다. 키가 `openday.v1.day...`면 버전을 올리는 순간 옛 데이터가 다른 이름표를 달고 안 보이게 된다. 버전은 키가 아니라 데이터 안에 둔다.

### 변환할 때 원본을 지우지 않는다

옛 키를 읽어 새 구조로 바꿔 새 키에 저장했다. 이때 옛 키는 지우지 않았다. 변환 코드가 틀렸을 때 되돌아갈 자리가 없으면 그걸로 끝이기 때문이다.

### 개발용과 실사용 저장을 키로 가른다

브라우저 저장소는 주소가 같으면 같은 곳을 본다. 개발하면서 테스트하다 실제 사용 기록을 덮어쓰면 복구할 방법이 없다. 그래서 개발 모드일 때만 접두어를 다르게 붙였다.

```ts
const PREFIX = import.meta.env.DEV ? 'openday.dev' : 'openday'
```

### 지우기 전에 그것을 가리키는 것이 있는지 본다

업무를 지우면 지난 기록이 가리키던 이름이 사라져 기록실이 빈칸이 된다. 그래서 도장을 찍은 적 있는 업무는 목록에서 감추기만 하고(보관), 한 번도 안 쓴 업무만 진짜로 지운다.

무엇이 쓰였는지는 전체 기록을 훑어서 모았다.

```ts
usedTemplateIds() {
  const used = new Set<string>()
  for (let i = 0; i < localStorage.length; i++) {
    const day = readDay(localStorage.key(i) ?? '')
    if (!day) continue
    for (const p of day.progress) {
      if (p.done || p.count > 0) used.add(p.templateId)
    }
  }
  return used
}
```

---

## React에서 배운 것

### 상태는 위에 두고 아래로 내려준다

업무 목록과 오늘 기록을 화면 세 개가 같이 쓴다. 각 화면이 따로 들고 있으면 창고에서 업무를 고쳐도 오늘 화면이 모른다. 그래서 제일 위에서 한 벌만 들고, 화면들은 받아 쓰고 바뀔 때는 위로 알린다.

### 비싼 계산은 useMemo로 붙잡는다

`useMemo`는 "재료가 안 바뀌면 지난번 결과를 그대로 쓰라"는 뜻이다. 전체 기록을 훑는 계산을 화면 그릴 때마다 하면 낭비라 여기에 묶었다.

```ts
const usedIds = useMemo(() => store.usedTemplateIds(), [templates, day])
```

`useCallback`은 같은 개념을 함수에 적용한 것이다. React는 매번 새로 만든 함수를 "달라진 것"으로 치기 때문에, 자식에게 넘기는 함수를 고정해 두면 불필요한 다시 그리기가 준다.

### useRef로 화면 요소를 직접 붙잡는다

React는 보통 "이렇게 보이면 좋겠다"를 적으면 알아서 그려 준다. 그런데 스크롤 위치처럼 직접 만져야 하는 것이 있다. `useRef`는 실제 화면 요소를 붙잡아 두는 손잡이다.

```tsx
const panelRef = useRef<HTMLDivElement>(null)
// ...
<div className="panel" ref={panelRef}>
```

### key가 바뀌면 새로 태어난다

애니메이션은 요소가 화면에 처음 나타날 때 한 번 돈다. 그래서 같은 자리에서 다시 재생시키려면 React가 그것을 "새 요소"로 여기게 해야 하는데, `key`를 바꾸면 그렇게 된다.

다만 이 방법은 값이 바뀌기만 하면 재생된다. 도장을 되돌릴 때도 숫자가 바뀌니 찍히는 연출이 돌아 버렸다. 결국 "방금 올라간 것"만 표시하는 상태를 따로 뒀다.

```tsx
const [flash, setFlash] = useState<{ key: string; n: number } | null>(null)
```

### 일회성 표시는 onAnimationEnd로 지운다

위의 "방금 찍었다" 표시는 애니메이션이 끝나면 필요 없다. 남겨 두면 애니메이션의 마지막 모습이 계속 붙어 있어 다른 효과를 덮는다. 애니메이션이 끝나는 순간 알려 주는 신호가 있어서 거기서 지웠다.

```tsx
<button onAnimationEnd={() => setFlash(null)}>
```

### 우클릭도 그냥 이벤트다

오른쪽 클릭은 `onContextMenu`로 받는다. 브라우저 기본 메뉴가 뜨는 걸 막아야 우리 동작만 남는다.

```tsx
onContextMenu={(e) => {
  e.preventDefault()
  unstamp(t)
}}
```

### 계산해서 나오는 값은 저장하지 않는다

창고에서 업무를 추가하면 오늘 보드에도 자리가 생겨야 한다. 이걸 저장된 데이터에 미리 반영해 두면 두 곳이 어긋날 수 있어서, 화면을 그리는 순간에 맞춰 계산했다.

```tsx
const todayTemplates = templatesForDate(templates, today)
const syncedDay = syncDay(day, todayTemplates)
```

### 부모의 손잡이를 자식에게 넘긴다

카드를 펼치면 그 카드가 목록 위로 올라와야 한다. 카드는 자기 위치는 알지만 목록을 굴릴 권한이 없다. 그래서 부모가 목록 손잡이를 자식에게 넘겨줬다.

```tsx
interface CardProps {
  panelRef: RefObject<HTMLDivElement | null>
}
```

### id는 crypto.randomUUID()로 만든다

브라우저가 겹치지 않는 문자열을 만들어 준다. 별도 라이브러리가 필요 없다. 다만 보안 연결에서만 동작하는데, 로컬 개발 주소는 예외로 취급돼서 개발 중에도 잘 쓰인다.

---

## TypeScript로 종류를 표현하기

### 종류마다 데이터가 다르면 판별 유니온

업무 일정은 세 종류인데 각각 필요한 정보가 다르다. 상시는 추가 정보가 없고, 요일별은 요일 목록이 있고, 일회성은 날짜가 하나 있다. 이걸 한 모양에 다 넣고 "요일별일 때만 이 칸을 쓴다"고 약속하면 지켜지지 않는다.

```ts
export type Schedule =
  | { kind: 'always' }
  | { kind: 'weekly'; weekdays: number[] }
  | { kind: 'once'; date: string }
```

`kind`를 확인하면 그 안에서 나머지 칸이 자동으로 정해진다. 상시인데 요일 목록을 꺼내려 하면 편집기가 바로 막는다.

```ts
if (t.schedule.kind === 'once') return t.schedule.date === date
return t.schedule.weekdays.includes(weekday)
```

### 라벨 표는 Record로

종류마다 화면에 보일 한국어를 표로 뒀다. `Record`를 쓰면 종류를 하나 추가했을 때 라벨을 안 적으면 바로 걸린다.

```ts
const STAMP_LABELS: Record<StampKind, string> = {
  check: '완료/미완료',
  count: '횟수',
  none: '하위만',
}
```

### 규칙은 화면 밖으로 뺀다

"오늘 배치될 업무는 무엇인가", "도장이 몇 개 찍혔나" 같은 건 화면과 상관없는 계산이다. 별도 파일로 빼 두니 세 화면이 같은 규칙을 나눠 쓰고, 나중에 서버로 옮길 때도 그대로 가져갈 수 있다.

---

## 오늘 버그 셋의 범인은 전부 CSS 기본값이었다

### overflow는 한 축만 적으면 나머지가 따라 바뀐다

세로 스크롤만 켰는데 가로 스크롤바가 깜빡였다. CSS는 한 축이 `visible`이 아니면 나머지 축의 `visible`을 `auto`로 계산한다. 가로를 안 적었으니 자동으로 스크롤 가능 상태가 된 것이다.

```css
.task-list {
  overflow-y: auto;
  overflow-x: hidden; /* 안 적으면 auto가 된다 */
}
```

### 세로 flex는 공간이 모자라면 자식을 줄인다

카드 하나를 펼쳤더니 다른 카드들이 눌려 글자가 잘리고, 펼친 카드도 남은 만큼만 커져서 내용이 잘렸다. 두 증상의 원인이 하나였다. flex 자식은 기본적으로 "필요하면 줄어들어도 좋다"는 상태다.

```css
.panel-scroll > * {
  flex: none; /* 줄어들지도 늘어나지도 말고 내용 크기대로 */
}
```

### flex-basis: 100%는 줄바꿈이 켜져야 듣는다

"다음 줄을 통째로 차지하라"고 지정했는데 같은 줄에 끼어들었다. flex는 기본이 한 줄에 다 밀어 넣기라, 줄바꿈을 켜지 않으면 그 지정이 무시된다.

```css
.detail-list li {
  display: flex;
  flex-wrap: wrap; /* 이게 없으면 flex-basis: 100%가 무시된다 */
}
```

### 스타일이 안 먹으면 오타보다 우선순위를 먼저 센다

켜진 탭에 마우스를 올리면 글자가 사라졌다. 글자색은 켜진 탭 쪽에 적어 뒀는데도 마우스 올림 규칙이 이겼다. 클래스 하나짜리보다 클래스에 상태 조건이 붙은 쪽이 더 구체적이라 우선하기 때문이다.

```css
/* 이 둘이 부딪치면 아래가 아니라 :hover가 이긴다 */
.tab:hover { color: 갈색; }
.tab--on { background: 갈색; color: 흰색; }
```

### :not()으로 규칙이 닿는 범위를 줄인다

위 문제는 마우스 올림 효과를 꺼진 탭에만 주는 것으로 풀었다. 이기는 규칙을 더 세게 만들기보다, 애초에 겹치지 않게 하는 쪽이 읽기 쉽다.

```css
.tab:not(.tab--on):hover {
  color: var(--frame);
}
```

---

## 연출을 CSS로 만들기

### 셔터는 무늬를 반복해서 그린다

가게 셔터의 가로 골은 그림 파일 없이 그라디언트를 반복해 만들었다. 색 구간을 촘촘히 끊으면 금속 골처럼 보인다.

```css
background: repeating-linear-gradient(
  180deg,
  #b7bec6 0 9px,
  #a7b0b9 9px 18px,
  #98a1ab 18px 21px
);
```

### 안쪽 그림자로 깊이를 만든다

그림자를 바깥이 아니라 안쪽에 넣으면 판이 앞으로 튀어나온 것처럼 보인다. 셔터 위아래에 넣어 무대 안쪽에 걸린 느낌을 냈다.

```css
box-shadow: inset 0 -18px 30px rgba(0, 0, 0, 0.18);
```

### 캐러셀은 통째로 옮긴다

가게 세 채를 가로로 늘어놓고, 보이는 창은 고정한 채 안쪽 줄을 왼쪽으로 민다. 이동 거리는 가게 폭에 사이 간격을 더한 값이라 계산식으로 적었다.

```css
.street-track--1 {
  transform: translateX(calc(-1 * (var(--shop-w) + var(--gap))));
}
```

### 애니메이션은 transition보다 세다

도장에 평소 기울기를 `transform`으로 주고, 찍힐 때 애니메이션도 `transform`으로 줬더니 서로 부딪쳤다. 애니메이션이 도는 동안에는 그쪽이 이기고, 끝난 뒤 마지막 모습을 유지하는 설정이면 계속 이긴다.

그래서 애니메이션 마지막 장면을 평소 모습과 같게 맞추고, 끝나면 애니메이션 표시를 떼도록 했다.

### 튕기는 느낌은 이징 곡선으로 만든다

값이 목표를 살짝 넘었다 돌아오게 하면 도장이 눌러 찍힌 느낌이 난다. 네 숫자로 속도 곡선을 정하는데, 세 번째 값을 1보다 크게 주면 넘어갔다 온다.

```css
animation: stamp-hit 360ms cubic-bezier(0.2, 1.5, 0.4, 1);
```

### 도장 모양은 원 + 기울기

정사각형에 모서리를 절반으로 둥글리면 원이 된다. 거기에 살짝 기울이면 손으로 찍은 것처럼 보인다.

```css
border-radius: 50%;
transform: rotate(-12deg);
```

### :has()로 자식 상태를 보고 부모를 바꾼다

셔터가 내려와 있을 때 무대 전체를 살짝 어둡게 하고 싶었다. 부모가 자식 상태를 보고 스타일을 정하는 선택자가 생겨서 자바스크립트 없이 됐다.

```css
.shop--today:has(.shutter:not(.shutter--up)) .stage {
  filter: brightness(0.96);
}
```

---

## 정렬과 레이아웃

### 숫자는 폭을 고정해야 안 흔들린다

도장 안 숫자가 1에서 2로 바뀔 때 글자 폭이 달라 원 안에서 미세하게 움직였다. 숫자를 모두 같은 폭으로 그리게 하는 설정이 있다.

```css
font-variant-numeric: tabular-nums;
```

### 앞에 붙는 뱃지는 최소 폭을 정해 준다

업무 앞 일정 뱃지가 "상시"와 "월수금"처럼 길이가 달라서 제목 시작점이 들쭉날쭉했다. 최소 폭을 정하고 가운데 정렬하니 제목이 세로로 나란해졌다.

### 달력은 7칸 격자

요일 머리글과 날짜 칸을 같은 격자에 넣으면 자동으로 줄이 맞는다. 그 달 1일이 무슨 요일인지 계산해 앞에 빈 칸을 그만큼 깔았다.

```css
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
```

### 들여쓰기 값은 앞 요소 폭에서 거꾸로 센다

하위 항목을 22px 들여썼는데 들여쓴 티가 안 났다. 그 값이 하필 앞에 놓인 토글 폭(14px)과 간격(8px)의 합과 같아서, 하위가 상위 제목 시작점에 딱 맞물린 것이다. 들여쓰기는 눈대중이 아니라 앞에 무엇이 얼마나 있는지 세어서 정해야 한다.

### 스크롤바를 감추면 종이처럼 보인다

기록실은 달력과 상세를 이어서 굴리는데, 스크롤바가 보이면 문서가 아니라 창처럼 보인다. 브라우저마다 방법이 달라 두 줄을 같이 쓴다.

```css
.panel--scroll {
  scrollbar-width: none;
}
.panel--scroll::-webkit-scrollbar {
  display: none;
}
```

---

## 스크롤을 직접 다루기

### scrollIntoView는 조상까지 굴린다

특정 요소를 화면에 보이게 하는 표준 기능이 있는데, 대상까지 가는 길에 있는 스크롤 가능한 상위 영역을 전부 함께 굴린다. 우리 구조에는 가게 세 채가 늘어선 거리가 상위에 있어서, 자칫 캐러셀 위치가 틀어질 수 있었다.

### 굴릴 상자를 직접 지정한다

그래서 대상 요소가 아니라 상자를 붙잡고, 그 안에서의 위치만큼 굴렸다. 상자에 위치 기준을 잡아 둬야 `offsetTop`이 그 상자 기준으로 나온다.

```ts
panelRef.current.scrollTo({
  top: detailRef.current.offsetTop - 12,
  behavior: 'smooth',
})
```

```css
.panel--scroll {
  position: relative; /* offsetTop이 이 상자 기준이 된다 */
}
```

### 상태가 바뀐 뒤에 굴려야 한다

날짜를 누르면 상세가 나타나고 그리로 굴러가야 한다. 누르는 순간 굴리면 상세가 아직 없어서 위치가 안 나온다. 화면이 갱신된 뒤에 도는 자리에서 굴렸다.

---

## 날짜 다루기

### toISOString()은 한국 오전을 전날로 민다

날짜를 문자열로 만들 때 흔히 쓰는 함수가 세계 표준시로 바꿔 준다. 한국은 그보다 아홉 시간 빠르니, 아침 아홉 시 이전 기록이 전날로 밀린다. 그래서 로컬 값을 직접 조립했다.

```ts
export function dateKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

### 그 달의 일수는 다음 달 0일로 구한다

날짜에 0을 넣으면 그 전 달의 마지막 날이 된다. 달마다 며칠인지 표를 만들 필요도, 윤년을 따질 필요도 없다.

```ts
const total = new Date(year, monthNum, 0).getDate()
```

### 달력 첫 칸은 1일의 요일만큼 비운다

그 달 1일이 무슨 요일인지 구해서 그만큼 빈 칸을 앞에 깔면 요일이 맞는다.

```ts
const offset = new Date(year, monthNum - 1, 1).getDay()
```

---

## 도구

### 스캐폴드는 임시 폴더에 받아 설정만 꺼낸다

프로젝트 생성 도구는 예제 화면과 로고 파일을 같이 넣어 준다. 이미 파일이 있는 폴더에 바로 만들면 덮어쓸지 묻는 상황이 생기고, 만들고 나면 예제를 지우는 일이 남는다. 임시 폴더에 받아서 설정 파일만 꺼내오니 지울 것이 없었다.

### 개발 전용 화면은 빌드에서 빠지게 표시한다

기록을 지우는 버튼처럼 개발할 때만 필요한 것이 있다. 개발 모드인지 알려 주는 값으로 감싸면 배포본에서는 아예 빠진다.

```tsx
{import.meta.env.DEV && (
  <button onClick={resetForDev}>[개발용] 오늘 기록 지우기</button>
)}
```

### 타입 검사와 빌드를 따로 돌린다

타입 검사만 돌리면 결과 파일을 만들지 않아 빠르다. 고치는 중에는 검사만 돌리고, 마지막에 빌드까지 돌려 확인했다.

---

## 만들면서 정한 판단 기준

### 되돌리기 없는 조작은 실수를 못 고친다

도장을 실수로 찍으면 지울 방법이 없었다. 우클릭으로 되돌리게 하고 횟수는 0에서 멈추게 했다. 누르는 기능을 만들 때는 되돌리는 방법도 같이 정하는 게 맞다.

### 상태가 안 변하는데 연출만 돌면 거짓말이다

이미 완료인 도장을 다시 눌러도 애니메이션이 재생됐다. 바뀐 것이 없는데 화면이 반응하니 눌린 것처럼 보인다. 아무 일도 안 일어나야 하는 자리에서는 아무 일도 안 일어나야 한다.

### 같은 정보라도 화면마다 접는 기본값이 다르다

하위 집계를 두 화면에 넣었는데, 오늘 화면은 바로 아래에 하위 목록이 이미 펼쳐져 있어 접을 이유가 없었고, 기록실은 그 집계가 유일한 내역이라 펼쳐 두는 게 맞았다. 같은 요소라도 주변에 무엇이 있느냐에 따라 기본값이 갈린다.
