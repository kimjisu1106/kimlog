---
layout: post
title: 온실 GreenHouse TIL 2
date: 2026-07-27
permalink: "devlog/devlog/TIL/온실 GreenHouse TIL 2"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: hidden 속성을 이기는 display, _redirects의 302와 301 캐시, 배포 직후 신·구 버전이 섞이는 이유, HTML을 스크린샷 찍어 이미지 에셋 만들기, 그리고 SDK 제공자가 지는 의무 — 온실을 실배포하며 걸린 것들.
tags:
  - JavaScript
  - Cloudflare
---
온실 GreenHouse를 실제로 배포하고 광고 9건을 채운 날. 정적 사이트 하나로 광고 플랫폼 흉내를 내다 보니 브라우저·CDN의 경계에서 걸린 것들이 있었다.

---

## CSS display는 hidden 속성을 이긴다

HTML의 `hidden` 속성은 브라우저 기본 스타일의 `display: none`으로 동작한다. 그런데 그 요소에 CSS로 `display: flex`를 지정하면 작성자 스타일이 기본 스타일을 이겨서, `hidden`을 붙여도 그대로 보인다.

```css
#adForm { display: flex; }          /* ❌ hidden 속성이 무력화됨 */

#adForm[hidden] { display: none; }  /* ✅ 숨김 상태를 명시적으로 복원 */
```

레이아웃 때문에 display를 지정한 요소를 JS에서 `el.hidden = true`로 숨길 계획이라면, `[hidden]` 재지정을 짝으로 넣어야 한다.

---

## Cloudflare Pages — _redirects와 302/301

- 루트에 `_redirects` 파일을 두면 서버 코드 없이 리다이렉트가 된다. `/ /admin 302` 한 줄로 루트 404를 해결했다.
- 301(영구)이 아니라 302(임시)로 한 이유 — 301은 브라우저가 영구 캐시해서, 나중에 루트에 진짜 랜딩 페이지를 만들어도 캐시된 사용자는 계속 리다이렉트된다. 용도가 바뀔 수 있는 경로엔 302가 안전하다.

---

## 배포 직후엔 신·구 버전이 섞여 응답된다

Cloudflare Pages에 push하고 바로 확인하면, 요청마다 새 버전과 예전 버전이 번갈아 나오는 구간이 몇 분 있다. 엣지 서버마다 새 배포가 도달하는 시점이 달라서다(최종 일관성). 확인 스크립트를 "한 번 성공하면 끝"으로 짜면 예전 버전을 보고 실패로 오판하거나 그 반대가 된다.

```bash
# 연속 3회 새 버전이 나와야 수렴으로 판정
streak=0
while [ $streak -lt 3 ]; do
  curl -s "$URL" | grep -q "$NEW_MARKER" && streak=$((streak+1)) || streak=0
  sleep 10
done
```

---

## HTML을 스크린샷 찍어 이미지 에셋 만들기

포토샵 없이 배너 이미지를 만드는 파이프라인. 250×250 HTML 카드를 만들고 헤드리스 브라우저로 창 크기를 그 크기에 맞춰 스크린샷을 찍으면 그대로 에셋이 된다.

```powershell
& msedge --headless=new --window-size=250,250 --hide-scrollbars `
  --screenshot="banner.png" "file:///.../banner.html"
```

- 디자인 수정이 CSS 편집이라 색·문구를 바꾼 변형 생산이 쉽다. 템플릿에 {% raw %}`{{TITLE}}`{% endraw %} 같은 토큰을 두고 치환하면 6장도 루프 한 번
- fetch 등 비동기 작업 후의 화면을 찍어야 하면 `--virtual-time-budget=5000`을 줘야 한다. 기본은 로드 직후에 찍어서 빈 화면이 나온다

---

## SDK를 서빙하는 쪽이 지는 의무

광고 SDK를 앱에 붙이는 쪽 이야기는 소리꽃 KeyBloom TIL 27에 있고, 여기는 스크립트를 서빙하는 제공자 쪽에서 배운 것.

- init API는 하위호환 계약이다 — 앱은 재빌드 없이 SDK 갱신을 받으므로, 배포하는 순간 모든 앱이 새 코드를 실행한다. 필드 의미 변경·제거는 금지, 확장은 선택 필드 추가로만.
- 계정 보안이 곧 앱 보안이다 — 도메인·repo·배포 계정을 쥔 쪽이 모든 소비자 앱에서 코드를 돌릴 수 있으니, 실질 방어선은 코드가 아니라 GitHub·Cloudflare 계정 2FA다. SDK 자체엔 eval·외부 리소스 로드를 두지 않는다.
- 부수 팁 — SDK 안에서 `document.currentScript.src`의 origin으로 데이터 주소를 만들면, 로컬 서버에서 테스트할 때도 코드 수정 없이 그 서버의 ads.json을 본다.
