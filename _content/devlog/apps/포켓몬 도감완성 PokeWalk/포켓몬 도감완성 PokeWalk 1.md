---
layout: post
title: 포켓몬 도감완성 PokeWalk 1
date: 2026-05-30
categories:
  - apps
  - log
  - today-i-learn
project: poke-walk
project_name: 포켓몬 도감완성 PokeWalk
video_id: vxKyth_LZMU
app_url: https://kimlog0415.github.io/pokewalk/
status: finished
tags:
  - React
  - JavaScript
  - CSS
---
## 설계 의도

### 갈림길은 왜 "4단계"인가

- 결정: 갈림길을 4번 선택 → 16개 종착지(서식지).
- 이유: 단계 수는 곧 `2^n`개의 칸이고, 이 칸을 7개 서식지에 포켓몬 수에 비례해서 나눠야 난이도가 균등해진다. 칸이 너무 적으면 비례 배분이 안 되고, 너무 많으면 게임이 길어진다.

| 단계  | 칸 수 | 문제                                                 |
| --- | --- | -------------------------------------------------- |
| 3단계 | 8칸  | 7서식지에 거의 1칸씩 → 포켓몬 35마리 서식지와 13마리 서식지가 같은 확률 (불공평) |
| 4단계 | 16칸 | 포켓몬 많은 서식지에 칸을 더 줄 수 있어 난이도 균등화 가능                 |
| 5단계 | 32칸 | 선택을 5번 → 방치형 한 판 템포가 너무 늘어짐                        |

16칸도 완벽한 비례는 아니다(35마리를 4칸=8.75, 13마리를 1칸=13). 하지만 격차를 의도적으로 좁게 잡았다.

---

### 서식지 슬롯은 "포켓몬 수 ÷ 슬롯 = 난이도"로 배분

- 결정: 포켓몬이 많은 서식지에 슬롯을 더 준다.
- 이유: 슬롯당 포켓몬 수 = 한 번 탐험에서 특정 포켓몬을 만날 확률의 역수다. 이 값이 서식지마다 들쭉날쭉하면 "어떤 포켓몬은 너무 안 나와서" 도감 완성이 고통스러워진다. 그래서 이 값을 최대한 평평하게 맞췄다.

|서식지|포켓몬|슬롯|슬롯당(=난이도)|
|---|---|---|---|
|sea|15|2|7.5 (제일 쉬움)|
|mountain+rough|26|3|8.6|
|grassland|35|4|8.75|
|waters-edge|19|2|9.5|
|forest|21|2|10.5|
|urban|22|2|11|
|cave+rare|13|1|13 (제일 어려움)|

- 결과: 최대 13 − 최소 7.5 = 격차 5.5. 만약 슬롯을 균등(각 서식지 비슷하게)하게 줬다면 35마리 서식지는 한없이 안 모이고 13마리 서식지는 금방 끝나서 격차가 훨씬 컸을 것.

---

### 포획은 왜 "가위바위보"인가

- 결정: 전투 대신 가위바위보로 포획 판정.
- 이유:
	- 방치형과 궁합 — 운 기반이라 깊은 전략이 필요 없고, 자동선택해도 게임이 굴러간다.
	- 승률 33% — 너무 쉽지도 어렵지도 않게 한 판에 한 번 정도 잡히는 템포.
	- 구현 단순 — 스탯·타입·레벨 시스템 없이 포켓몬 "수집"이라는 핵심에만 집중.

---

### 자동선택 타이머 (방치형의 핵심)

- 결정: 갈림길·가위바위보에서 입력이 없으면 3초 후 랜덤 자동선택.
- 이유: 이 게임의 정체성이 "손 안 대도 도감이 차는 것"이다. 사용자가 자리를 비워도 진행돼야 하므로 모든 선택지에 타임아웃 자동선택을 넣었다. 타이머 바(progress bar)로 남은 시간을 시각화해서 "곧 자동으로 넘어간다"를 알려준다.

- 왜 3초? 너무 짧으면 직접 누를 틈이 없고, 너무 길면 방치 시 지루하다. 걷기/전환 같은 연출은 그보다 길게(2~5초) 둬서 화면이 휙휙 바뀌지 않게 조율.

---

### 데이터·에셋을 "안 만드는" 결정들

|결정|이유|
|---|---|
|PokeAPI 사용|151마리 이미지·이름·도감설명을 직접 만들 수 없음. API가 다국어 이름까지 제공 → 에셋 제작 0|
|localStorage 저장|서버 없는 정적 웹앱. 도감은 개인 진행이라 굳이 서버 불필요. 배포·운영 비용 0|
|official-artwork 스프라이트|기본 도트 이미지는 여백이 많아 화면에서 작게 보임 → 고해상도 아트워크로 교체|

---

### BGM은 왜 "encounter부터 flee까지" 한 곡인가

- 결정: 전투 BGM을 포켓몬 조우 시점부터 전투 결과(잡기/도망/중복)까지 끊지 않고 유지.
- 이유: encounter → battle → flee는 하나의 "조우 이벤트" 다. 씬이 바뀔 때마다 곡을 갈면 정신없고 긴장감이 끊긴다. 같은 트랙이면 씬이 바뀌어도 재생을 안 끊도록 처리했다. (caught만 "잡았다!" 팡파레로 전환)

---

### RPS 선택 후 "1초 멈춤" (긴장감 설계)

- 결정: 가위바위보를 내면 결과를 바로 안 보여주고 1초 뒤에 공개.
- 이유: 즉시 결과가 뜨면 "운빨"이 무미건조하다. 1초 동안 버튼을 숨기고 긴장 효과음(`sfx_battlePending`)을 깔아 "두근거리는 순간" 을 만들었다. 그 다음 reveal 카드 + 승패 효과음.

---

### 다국어(KO/JA/EN)를 넣은 이유

- 결정: 처음부터 3개국어 + 언어별 폰트.
- 이유: PokeAPI가 이미 다국어 이름을 주니 데이터 비용이 거의 0이었고, 포트폴리오에서 "국제화(i18n)를 고려했다"는 어필이 됐다. 언어팩을 게임기 카트리지처럼 꽂는 연출로 재미 요소까지.

---

### 화면 전환을 왜 "URL 라우터" 대신 "상태(state)"로 했나

- 결정: React Router 같은 라우팅 없이, `state.scene` 값 하나로 8개 화면을 전환.

```jsx
const [state, setState] = useState({ scene: 'home', ... });
// scene 값만 바꾸면 화면 교체
{state.scene === 'battle' && <BattleScene ... />}
```

- 이유:
	- URL 조작 차단 — 라우터를 쓰면 사용자가 주소창에 `/battle`을 직접 쳐서 순서를 건너뛰거나, 새로고침으로 진행 중인 탐험이 초기화될 수 있다. 갈림길 → 조우 → 전투는 반드시 순서대로 흘러야 하는데, URL은 그 흐름을 깨는 구멍이 된다.
	- 게임기 메타포 — 이건 화면 하나짜리 "게임기 한 대"다. 물리 게임보이에 URL이 없듯, 주소가 바뀔 이유가 없다.
	- 상태 보존 — 탐험 경로(`path`), 만난 포켓몬, 라운드 수가 전부 한 상태 객체에 묶여 있어 씬 전환 시 자연스럽게 이어진다.


> 개발 중엔 `?scene=battle` 같은 디버그 단축키를 잠깐 뒀다가, 배포 전에 제거했다. 정확히 이 "URL로 아무 데나 점프" 위험을 없애기 위해서.

---
### 타이밍 값을 왜 한 곳(`constants.js`)에 모았나

- 결정: 흩어져 있던 `1000`, `1500`, `3000`, `5000` 같은 숫자를 전부 `TIMINGS` 객체로 중앙화.

```js
export const TIMINGS = {
  BATTLE_PENDING:   1000,  // RPS 선택 후 결과 표시 전 대기
  BATTLE_REVEAL:    1500,  // 결과 카드 표시 시간
  HOME_QUESTION:    5000,  // "나갈까?" 질문 주기
  SCENE_EXIT:       5000,  // caught/flee/duplicate → home
  // ...
};
```

- 이유:
	- 밸런싱은 반복 작업 — 방치형 게임의 "느낌"은 결국 타이밍이다. "전투 결과가 너무 빨리 넘어간다", "질문이 너무 자주 뜬다" 같은 조정을 수십 번 하게 된다. 숫자가 코드 곳곳에 박혀 있으면 매번 찾아 헤매야 한다.
	- 한 파일에서 게임 템포 전체를 조망 — `constants.js`만 열면 게임의 모든 박자가 한눈에 보이고, 한 줄만 고치면 반영된다.
	- 매직넘버 제거 — `setTimeout(onDone, 5000)`보다 `setTimeout(onDone, TIMINGS.SCENE_EXIT)`이 "이 5초가 무슨 5초인지" 자체 설명이 된다.


---

## TIL

### 캐릭터 스프라이트 시트

캐릭터 움직임은 영상이 아니라 "이미지 한 장을 빠르게 밀어내는" 것
캐릭터가 걷는 애니메이션은 GIF나 영상이 아니라, 여러 동작이 가로로 나열된 한 장의 이미지(스프라이트 시트) 를 만들고 보이는 창(window)만 옆으로 옮기는 방식이다. 게임 그래픽의 기본이라는 걸 이번에 처음 알았다.

```css
/* 2048×701 한 장에 3프레임이 가로로 들어있음 */
.char {
  width: 64px;            /* 보이는 창은 64px 한 칸 */
  height: 66px;
  background-size: 192px auto;  /* 3프레임 × 64px */
  image-rendering: pixelated;   /* 픽셀 뭉개짐 방지 */
}

@keyframes charWalk {
  from { background-position-x: 0; }
  to   { background-position-x: -192px; }  /* 한 바퀴만큼 밀기 */
}

.anim-walk {
  /* steps(3): 부드럽게가 아니라 3칸 '딱딱' 끊어서 → 프레임 전환처럼 보임 */
  animation: charWalk 0.45s steps(3) infinite;
}
````

핵심은 `steps(3)`. 보통 애니메이션은 값을 부드럽게 보간하는데, 스프라이트는 칸 단위로 끊어야 프레임이 바뀌는 것처럼 보인다.

---

### 무한 스크롤 배경에는 "끊김"과 "점프"라는 함정이 있다

배경(가로로 긴 이미지)이 우→좌로 흐르는데, 매번 같은 곳에서 시작하면 지루하니 `animation-delay`를 음수로 줘서 랜덤한 위치에서 시작하게 했다. 그런데 딜레이가 너무 크면 씬이 끝나기 전에 루프가 한 바퀴 완주해버려 이미지 끝부분(엣지)이 순간 드러난다.

상한 공식: `루프 주기 - 씬 길이`. 이 범위 안에서 시작하면 씬이 끝날 때까지 루프가 완주하지 않는다.

```js
// 배경 루프 주기(10s) - 씬 길이(3s) = 7s
// 이 범위 안에서만 시작하면 씬 종료 전에 루프가 완주해 엣지가 보이는 일이 없음
const BG_DELAY_MAX = 7;
const [bgDelay] = useState(() => `-${(Math.random() * BG_DELAY_MAX).toFixed(2)}s`);
```

---

### 오디오는 왜 OGG여야 하는가 (MP3의 함정)

BGM을 MP3로 넣었더니 루프 지점에서 미세하게 "툭" 끊겼다. 알고 보니 MP3는 인코딩 과정에서 파일 앞뒤에 짧은 무음 프레임이 강제로 들어간다. 그래서 `loop = true`로 돌리면 매 바퀴마다 그 무음만큼 끊긴다.

OGG(Vorbis)는 이 인코더 딜레이가 없어서 코드 한 줄 안 바꾸고 포맷만 교체해도 루프가 매끄러워졌다. DAW에서는 안 끊겨서 추출했음에도 불구하고 약간은 끊김이 발생한다.

```js
const a = new Audio(bgmTravelOgg);  // .mp3 → .ogg
a.loop = true;                      // 이제 이음새 없이 반복
```

SFX는 1회성이라 끊김 이슈는 없지만, 파일 크기/호환성 면에서 OGG가 유리해서 통일했다.

---

### 브라우저는 "사용자가 만지기 전엔" 소리를 못 낸다

자동재생을 막는 브라우저 정책 때문에 페이지 로드만으로는 BGM이 안 나온다. 첫 사용자 입력이 있어야 한다. 그래서 "PRESS START" 오버레이를 만들어 첫 클릭을 자연스럽게 유도했다.

게다가 모바일에선 `pointerdown`이 audio unlock으로 인정 안 되는 경우가 있어 `click`으로 바꿨고, iOS는 "그 순간 직접 만진 오디오 객체만" unlock 되기 때문에 첫 클릭에 모든 트랙을 한꺼번에 깨워야 했다.

```js
// 첫 click에 모든 BGM 트랙을 play→pause로 한 번씩 깨워둠 (iOS 대응)
const resume = () => {
  Object.values(TRACKS).forEach(audio => {
    audio.play()
      .then(() => { if (audio !== currentRef.current) audio.pause(); })
      .catch(() => {});
  });
};
document.addEventListener('click', resume, { once: true });
```

---

### 에셋에는 전부 "출처"가 따라붙는다

가장 크게 배운 건 기술이 아니라 저작권이었다.

- 처음 쓰던 효과음은 출처가 불분명했는데, public 레포에 올리면 리스크가 된다는 걸 알았다.
- RPG Maker 기본 효과음은 "정품 엔진으로 만든 게임에서만" 쓸 수 있어서, React 웹앱인 이 프로젝트엔 쓸 수 없었다.
- 결국 bfxr(직접 생성) · freesound(CC0) · Pixabay로 전부 교체하고 README에 출처를 명시했다.

> 포켓몬 IP 자체는 팬 프로젝트(비영리) 범위에서 사용, README에 권리 귀속을 명시.

---

### 갈림길은 사실 "이진 트리"였다

"여기로 / 저기로"를 4번 고르는 갈림길은 결국 4단계 이진 트리 = 16개 잎(leaf) 이다. 선택 기록(`left`/`right`)을 이진수로 바꾸면 곧장 종착지 인덱스가 된다.

```js
// ['left','right','left','right'] → 0b0101 = 5번 종착지
function pathToIndex(path) {
  return path.reduce((acc, dir) => acc * 2 + (dir === 'right' ? 1 : 0), 0);
}

export function getHabitat(path) {
  return FORK_TREE[pathToIndex(path)];  // 16칸 배열에서 서식지 꺼내기
}
```

서식지별 슬롯 수를 조절(grassland 4칸, cave 1칸…)해서 출현 난이도까지 이 구조로 설계했다.

---

### localStorage는 스키마가 바뀌면 "옛날 데이터"를 만나게 된다

저장 구조를 `[숫자]` → `{id, nameKo}` → `{id, names:{ko,ja,en}}` 로 두 번 바꿨는데, 기존 유저의 옛 데이터를 깨뜨리지 않으려면 불러올 때 형태를 감지해 변환해야 했다. 서버 DB의 마이그레이션 개념을 클라이언트에서 직접 구현한 셈.

```js
function load() {
  const data = JSON.parse(localStorage.getItem(KEY)) ?? [];
  if (data.length === 0) return data;
  if (typeof data[0] === 'number')  // 1세대: 숫자 배열
    return data.map(id => ({ id, names: { ko: `#${id}`, ... } }));
  if ('nameKo' in data[0])          // 2세대: 한국어 이름만
    return data.map(p => ({ id: p.id, names: { ko: p.nameKo, ... } }));
  return data;                      // 현재 버전
}
```

사실 배포 전이라 유저가 나 혼자였으니 localStorage 그냥 지워도 됐다. 그래도 마이그레이션 패턴 자체는 배웠으니 OK.

---

### React StrictMode는 일부러 effect를 두 번 실행한다

효과음이 두 번 재생되길래 로직 버그인 줄 알았는데, 개발 모드의 StrictMode가 부작용을 잡으려고 `useEffect`를 의도적으로 2번 실행하는 거였다. (프로덕션에선 1번) `useRef` 플래그로 "이미 울렸으면 skip" 처리했다.

```js
const sfxPlayed = useRef(false);
useEffect(() => {
  if (sfxPlayed.current) return;  // StrictMode 2번째 호출 차단
  sfxPlayed.current = true;
  playSfx();
}, []);
```

---

### `useState` — 화면은 "상태"가 바뀌면 다시 그려진다

React의 출발점. 변수를 직접 바꾸는 게 아니라, 상태를 바꾸면 React가 알아서 화면을 다시 그린다.

```jsx
const [lang, setLang] = useState('ko');   // [현재값, 바꾸는함수]
// setLang('en') 호출 → lang이 'en'으로 바뀌고 화면 자동 갱신
```

이 게임의 전체 화면 전환도 결국 상태 하나로 돌아간다:

```jsx
const [state, setState] = useState({ scene: 'home', ... });
// state.scene이 'home'→'travel'로 바뀌면 다른 화면이 렌더됨
```

---

### `useEffect` — "렌더 후에 일어날 일" + 반드시 뒷정리

타이머, 이벤트 등록 같은 부수 효과는 여기서. 그리고 `return`으로 치우는 함수를 꼭 줘야 메모리 누수/중복이 안 생긴다.

```jsx
useEffect(() => {
  const timer = setTimeout(onDone, 5000);
  return () => clearTimeout(timer);   // 컴포넌트 사라질 때 타이머 제거
}, [onDone]);                          // [의존성]: 이 값 바뀌면 다시 실행
```

---

### `useRef` — 리렌더 없이 값을 기억하는 상자

`useState`와 달리 바꿔도 화면이 안 그려진다. 타이머 ID나 "이미 실행했나" 플래그처럼 화면과 무관한 값에 쓴다.

```jsx
const revealTimerRef = useRef(null);
revealTimerRef.current = setTimeout(...);   // 바꿔도 리렌더 안 됨
```

DOM 요소를 직접 만질 때도 쓴다:

```jsx
const charRef = useRef(null);
<div ref={charRef} />
charRef.current.style.left = '100px';   // React 안 거치고 직접 조작
```

---

### `useCallback` — 함수가 매번 새로 태어나는 걸 막기

컴포넌트가 리렌더될 때마다 안의 함수도 새로 만들어진다. 그게 `useEffect` 의존성에 들어가면 무한 재실행이 날 수 있어서 함수를 고정한다.

```jsx
const go = useCallback((nextScene, patch = {}) => {
  setState(s => ({ ...s, scene: nextScene, ...patch }));
}, []);   // [] → 한 번 만들고 계속 재사용
```

---

### `useContext` — props 안 거치고 깊은 곳까지 값 전달

언어 설정(ko/ja/en)을 모든 컴포넌트가 써야 하는데, props로 일일이 내리면 번거로우니 Context로 한 번에 공유한다.

```jsx
// 만들기 (전역 통로)
export const LangContext = createContext('ko');
export const useLang = () => useContext(LangContext);

// 감싸기 (App 최상단)
<LangContext.Provider value={lang}> ... </LangContext.Provider>

// 어디서든 꺼내쓰기 (깊은 자식도)
const lang = useLang();
```

---

### 커스텀 훅 — 반복되는 로직을 함수로 묶어 클린코드

`use~`로 시작하는 내 함수를 만들면 상태 로직을 재사용할 수 있다. 이 프로젝트의 핵심 정리 도구였다.

```jsx
// 도감 데이터 관리를 통째로 캡슐화
const { pokedex, catchPokemon, isDuplicate } = usePokedex();

// 3초 자동선택 타이머도 훅으로
const ratio = useAutoTimer(3, () => autoSelect());
```

---

### 의존성 배열의 함정 — "오래된 값"(stale closure)

`useEffect`가 옛날 props를 기억해버리는 문제. 자주 바뀌는 함수는 ref에 담아 의존성에서 빼서 타이머가 멋대로 재시작하는 걸 막았다.

```jsx
// onExpire는 매 렌더 새로 오지만, ref에 담으면 항상 최신을 가리킴
const expireRef = useRef(onExpire);
expireRef.current = onExpire;

useEffect(() => {
  const interval = setInterval(() => {
    if (left <= 0) expireRef.current();   // 의존성에 안 넣고도 최신 호출
  }, 100);
  return () => clearInterval(interval);
}, [seconds, active, resetKey]);   // onExpire는 일부러 제외
```

---

### 성능 — 60fps 움직임은 상태로 하면 안 된다

캐릭터를 1초에 60번 움직이는데 매번 `setState`하면 React가 60번 리렌더한다. 그래서 위치는 `requestAnimationFrame` + ref로 DOM을 직접 움직이고, 방향이 바뀔 때만 리렌더했다.

```jsx
const tick = () => {
  charXRef.current += speed;                          // ref라 리렌더 X
  charRef.current.style.left = `${charXRef.current}px`; // DOM 직접 조작
  rafRef.current = requestAnimationFrame(tick);
};
```

