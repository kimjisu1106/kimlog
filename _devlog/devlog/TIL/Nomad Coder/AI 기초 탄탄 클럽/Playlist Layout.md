---
layout: post
title: "노마드코더 AI 기초 탄탄 클럽 #4 Playlist Layout"
date: 2026-04-24
categories:
  - today-i-learn
project: nomad-coder-ai-bagic
project_name: 노마드코더 - AI 기초 탄탄 클럽
video_id:
app_url:
status:
tags:
  - HTML
  - CSS
---
노마드코더에서 수강 가능한 풀스택 웹 기초를 6주만에 훑는 챌린지.
해당 강의: 코코아톡 크론코딩
`#4`는 Playlist Layout을 구성하는 것이라 YoutubeMusic을 참고해 내 맘대로 배치했다.

아직까지는 AI없이 그냥 작성 중.

---

### `white-space: nowrap`과 애니메이션의 조합

긴 노래 제목이 박스를 뚫고 나가지 않게 하면서 흐르는 효과(Marquee).
marquee태그가 비표준이기 때문에 텍스트가 한 줄을 넘지 않게 고정(`nowrap`)하고, 넘치는 부분은 숨긴(`overflow: hidden`) 뒤, `transform` 애니메이션을 이용해 흐르는 듯한 UX를 구현함.

```css
@keyframes flow {
	0% {
	transform: translateX(0);
	}
	25% {
	transform: translateX(0);
	}
	100% {
	transform: translateX(-100%);
	}
}
  
.music-title {
	font-size: 18px;
	font-weight: 600;
	margin-bottom: 10px;
	overflow: hidden;
	white-space: nowrap;
}

.music-title > span {
	display: inline-block;
	padding-left: 0%;
	animation: flow 10s ease-in 3s infinite;
}
```

---

### `width: inherit`의 활용과 주의점

width 지정 시 `inherit`을 사용하여 부모의 너비를 물려받게 설정함.
`inherit`는 부모의 속성을 강제로 복사해 오기 때문에 부모가 `padding`을 가지고 있다면 자식의 크기 계산에 문제가 발생할 수 있음. 따라서 `border-box`를 사용하는 것이 권장됨.

| 구분                      | 주요특징                                | 장점                                                 | 단점                                                            |
| ----------------------- | ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `box-sizing:border-box` | 패딩과 테두리를 너비(width) 안에 포함시켜 계산함      | 예측 가능성 극대화. 패딩을 추가해도 박스 전체 크기가 변하지 않아 레이아웃이 깨지지 않음 | 기존 `content-box` 방식에 익숙한 경우 내부 콘텐츠 영역 계산이 생소할 수 있음            |
| `width: 100%`           | 부모 요소의 콘텐츠 영역 너비를 기준으로 자신의 너비를 꽉 채움 | 가장 직관적이고 흔히 쓰임. 부모의 크기가 변하면 실시간으로 반응하여 가득 채움       | `content-box` 환경에서는 패딩/테두리 추가 시 부모 영역 밖으로 넘치는(Overflow) 현상 발생 |
| `width: inherit`        | 부모에게 설정된 `width` 속성값을 그대로 물려받음      | 부모와 자식의 너비를 완전히 동기화해야 할 때 유용함(예: 고정 너비 컴포넌트 내부 요소) | 부모의 너비가 `auto` 이거나 명시적이지 않을 경우, 예상치 못한 크기로 렌더링 될 확률이 높음       |

---

### 단일 클래스 재사용과 `Modifier` 패턴

`.music-card`라는 동일한 클래스를 사용하면서, 현재 재생 중인 곡에만 `.now-playing`을 추가해 스타일을 완전히 다르게(가로 배치 → 세로 배치) 바꿈.

- 공통 구조: `.music-card`로 이미지와 설명을 묶는 기본 틀을 유지.
- 차별화(Modifier): `.now-playing` 클래스가 붙었을 때만 `flex-direction: column`으로 변경하고 폰트 크기를 키움.
- 명시도 활용: `.now-playing .music-title` 처럼 작성하여 기본 `.music-title`의 스타일을 자연스럽게 덮어쓰도록 설계함.
- 아직 사용하지는 않았으나 scss를 활용하면 변수 관리나 구조 파악에 좀 더 직관적이이다. 단 정적 수치는 scss변수로, 동적 상태는 css변수로 선언하면 성능 극대화가 가능.

```html
<div class="music-card now-playing">
	<div class="music-img now-playing">
	  <img
		src="https://i.scdn.co/image/ab67616d0000b273e13ab134bdec59e2d0e82290"
	  />
	</div>
	<div class="music-descriptions">
	  <div class="music-title">
		<span>Love yourself123456789123456789</span>
	  </div>
	  <span class="music-artist">Justin Bieber</span>
	</div>
  </div>
```

```css
.music-card {
  width: inherit;
  height: fit-content;
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  margin-top: 20px;
}

.music-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  overflow: hidden;
  white-space: nowrap;
}

.music-title > span {
  display: inline-block;
  padding-left: 0%;
  animation: flow 10s ease-in 3s infinite;
}

.music-artist {
  font-size: 12px;
  color: gray;
}

.music-card.now-playing {
  width: inherit;
  height: fit-content;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;
  margin-top: 20px;
}

.now-playing .music-title {
  font-size: 28px;
}

.now-playing .music-artist {
  font-size: 18px;
  color: gray;
}

.now-playing .music-img > img {
  width: inherit;
}

.music-card {
  width: inherit;
}
```

![](/assets/images/for-posts/n_20260424_01.webp)