---
layout: post
title: 로그스톤 샵 LogStone Shop TIL 1
date: 2026-08-09
permalink: "devlog/devlog/TIL/로그스톤 샵 LogStone Shop TIL 1"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: Astro 기본 구조와 i18n·빌드 타임 데이터 페칭, 유튜브 임베드 세 형태, sticky footer와 scroll-snap 캐러셀, 폰트 셀프호스팅과 디자인 핸드오프 이식까지 스토어 구축에서 배운 것.
tags:
  - Astro
  - CSS
  - JavaScript
---
KeyBloom을 파는 스토어를 Astro로 세우면서 배운 것들.

---

## Astro 기초

### 정적 사이트 프레임워크의 기본 구조

Astro(콘텐츠 위주 정적 사이트 프레임워크)는 `src/pages/`의 파일이 곧 URL이 되고, `src/layouts/`와 `src/components/`로 공통 뼈대를 재사용한다. 빌드하면 순수 HTML이 나와서 서버 없이 Cloudflare Pages에 그대로 올라간다. 컴포넌트 파일(.astro) 상단의 `---` 사이 코드는 빌드 시점에 서버에서 한 번 실행되고, 브라우저로는 결과 HTML만 간다.

### 언어별 페이지는 얇은 래퍼 + 공용 컴포넌트로

영어 기본(`/`)과 한국어(`/ko/`)를 만들 때, 내용을 두 번 쓰지 않고 내용 컴포넌트 하나에 `lang` prop을 주고 페이지 파일은 그걸 부르기만 하는 얇은 래퍼로 둔다. 문구는 언어별 사전 객체 하나에 모아 `t('키')`로 꺼낸다.

```astro
---
// src/pages/ko/keybloom.astro — 래퍼는 이게 전부
import KeyBloomPage from '../../components/KeyBloomPage.astro';
---
<KeyBloomPage lang="ko" />
```

### 이미지는 astro:assets가 빌드 때 WebP로

`src/assets/`의 이미지를 `<Image>` 컴포넌트로 쓰면 빌드 시점에 리사이즈·포맷 변환이 된다. 375KB PNG 타일이 4KB WebP로 줄었다. 변환 도구(sharp)가 Astro에 내장이라 별도 설치가 없다.

### 빌드 시점에 외부 데이터를 가져와 정적 페이지로 굽기

유튜브 재생목록의 영상 목록을 페이지에 깔고 싶었다. API 키 없이 가는 방법으로, 유튜브가 재생목록마다 제공하는 RSS 피드(`youtube.com/feeds/videos.xml?playlist_id=…`)를 컴포넌트 frontmatter에서 `fetch`로 받아 정규식으로 영상 ID·제목을 뽑아 카드로 렌더했다. 결과는 정적 HTML이고, 새 영상은 다음 배포 때 자동 반영된다.

```ts
const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${id}`);
const xml = await res.text();
const videos = [...xml.matchAll(/<yt:videoId>([^<]+)<[\s\S]*?<title>([^<]+)</g)]
  .map((m) => ({ id: m[1], title: m[2] }));
```

### Dev Toolbar는 개발 서버 전용

`npm run dev` 화면 아래에 뜨는 Astro 버튼(Dev Toolbar)은 빌드 결과물에는 포함되지 않아 고객에게 안 보인다. 개발 중에도 거슬리면 `astro.config.mjs`에 `devToolbar: { enabled: false }`.

---

## 유튜브 임베드

### 재생목록 임베드가 한 곡만 나올 때 — 세 가지 형태

재생목록 임베드에는 형태가 셋 있다. ① `embed/videoseries?list=` — 표준이지만 youtube-nocookie 도메인에서 목록을 못 불러오고 단일 영상처럼 동작할 때가 있다. ② `embed/영상ID?list=` — 첫 영상을 지정하면 목록 카운터(1/6)와 이전·다음이 안정적으로 붙는다. ③ 아예 영상별 카드로 펼치기 — 목록 UI를 유튜브에 기대지 않아 제일 확실하다. 결국 ③으로 갔다.

### 클릭 전에는 썸네일만 — 파사드 패턴

iframe은 무거워서 페이지 로드 때 다 심으면 느려진다. 처음엔 썸네일 이미지(`i.ytimg.com/vi/영상ID/hqdefault.jpg`)와 재생 버튼만 두고, 클릭했을 때 그 자리만 iframe으로 교체하는 파사드(겉모습만 먼저 보여주는 대리 요소) 방식을 썼다. 쿠키를 줄이는 `youtube-nocookie.com` 도메인도 이때 같이 쓴다.

---

## CSS 레이아웃·테마

### 푸터를 바닥에 붙이는 flex 세 줄

내용이 짧은 페이지에서 푸터가 화면 중간까지 올라온다. 여백 문제가 아니라 배치 문제다.

```css
body { min-height: 100vh; display: flex; flex-direction: column; }
main { flex: 1; }
```

### 컨테이너 폭은 변수 하나로

헤더 880px, 본문 1160px처럼 폭을 따로 하드코딩하면 페이지마다 어긋난다. `--content-max` 변수 하나를 모든 컨테이너가 쓰게 하고, 폭이 달라야 하는 페이지는 body 클래스에서 그 변수만 덮는다.

### body 클래스로 테마 변수를 통째로 덮기

제품 페이지는 다크모드에서도 슬라이드와 같은 라이트 룩이어야 했다. `body.kb-body`에서 사이트의 색 변수(`--bg`, `--text`, `--muted`…)를 전부 라이트 값으로 재정의하면, 헤더·푸터까지 포함해 그 페이지만 고정 테마가 된다. 컴포넌트를 고치지 않고 변수 레이어에서 해결하는 게 요점.

### JS 없는 가로 캐러셀 — scroll-snap

```css
.carousel { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; }
.card { flex: 0 0 auto; scroll-snap-align: start; }
```

넘김 버튼·라이브러리 없이 네이티브 스크롤로 카드가 한 장씩 걸린다.

### 스크롤바도 테마를 따르게

파이어폭스는 `scrollbar-color: var(--thumb) transparent`, 크롬·엣지는 `::-webkit-scrollbar-thumb` — 두 계열을 다 써야 하고, 색을 테마 변수로 두면 라이트·다크가 자동으로 맞는다. 트랙은 투명, 썸은 라운드가 요즘 결.

### 큰 이미지에서 원하는 부분만 — object-fit + object-position

1920px 슬라이드 PNG의 오른쪽 앱 화면 부분만 보여주고 싶을 때, 컨테이너에 원하는 영역의 `aspect-ratio`를 주고 이미지에 `object-fit: cover; object-position: 100% 0`을 주면 잘라내기 없이 CSS만으로 크롭된다.

---

## 폰트·디자인 핸드오프

### 외부 CDN 없이 폰트 셀프호스팅 — @fontsource

Google Fonts CDN 대신 `@fontsource/archivo` 같은 npm 패키지를 깔고 CSS를 import하면 폰트 파일이 빌드에 번들된다. 런타임 외부 요청이 0이 되고, 한글 폰트(Noto Sans KR)는 유니코드 구간별로 서브셋이 나뉘어 있어 실제 쓰인 글자 구간만 로드된다.

### 1920px 슬라이드 스펙을 반응형 웹으로

디자인 핸드오프는 1920×1080 고정 슬라이드 기준의 px 값들이다. 웹으로 옮길 때는 비율을 살려 축소(대략 0.55~0.6배)하고, 제목처럼 크기 폭이 큰 것은 `clamp(최소, vw, 최대)`로, 컬럼은 좁은 화면에서 세로로 접히게 미디어 쿼리를 더한다. 색·자간·굵기·2px 룰 같은 토큰은 그대로 가져와야 "같은 디자인"으로 보인다.

### 캔버스 데모 모듈 — 시드 고정·화면 밖 정지

핸드오프에 딸려온 파티클 렌더러를 그대로 재사용했다. 배울 점 둘 — 같은 시드(난수 시작값)면 항상 같은 그림이 나오는 결정적 렌더라 캡처 재현이 되고, IntersectionObserver(요소가 화면에 들어왔는지 감지하는 브라우저 기능)로 캔버스가 화면 밖이면 애니메이션 루프를 쉬게 해서 캔버스 8개를 띄워도 부담이 없다.
