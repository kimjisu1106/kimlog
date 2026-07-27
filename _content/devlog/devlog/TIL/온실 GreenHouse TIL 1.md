---
layout: post
title: 온실 GreenHouse TIL 1
date: 2026-07-26
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: JSON과 JavaScript의 관계, 교차 출처 fetch를 여는 CORS와 Cloudflare Pages의 _headers, 브라우저만으로 파일을 만들어 내려주는 Blob, 그리고 Windows에서 대소문자만 다른 폴더 이름 바꾸기 — 자체 광고 시스템 첫날에 걸린 것들.
tags:
  - JavaScript
  - Cloudflare
---
자체 광고 시스템 온실 GreenHouse를 세운 첫날. 서버 없는 정적 사이트 하나가 데이터 파일(ads.json)과 편집기 페이지로만 이루어져 있어서, 걸린 것들도 "브라우저만으로 어디까지 되나"에 몰려 있다.

---

## JSON은 언어가 아니라 데이터 형식

### .json 파일은 실행되지 않고 읽히기만 한다

JSON은 JavaScript Object Notation의 약자라 문법이 JS에서 왔지만, 지금은 언어와 무관한 범용 데이터 형식이다. 코드처럼 실행되는 게 아니라 구조화된 텍스트로 읽히기만 한다.

```json
{ "title": "KimLog 개발 블로그", "weight": 1 }
```

```js
const data = await (await fetch("ads.json")).json(); // 텍스트를 JS 객체로 해석
```

그래서 광고 목록을 JSON으로 두면 "무엇을 보여줄지"는 데이터가 되고, "어떻게 그릴지"만 앱 코드에 남는다. 데이터 파일만 갈아끼우면 앱을 재빌드하지 않아도 내용이 바뀌는 구조의 근간이다.

---

## CORS — 다른 출처의 fetch는 파일 주인이 허락해야 한다

### 네이티브 WebView의 fetch는 교차 출처 요청이다

브라우저(와 WebView)는 페이지의 출처(origin)와 다른 곳으로의 fetch를 기본적으로 막는다. 네이티브 앱의 WebView는 출처가 `tauri://localhost`라서, 광고 서버의 `https://…/ads.json`을 가져오는 건 교차 출처 요청이 된다. 파일을 서빙하는 쪽이 응답 헤더로 허락해줘야 통과한다.

### Cloudflare Pages는 _headers 파일 하나로 헤더를 붙인다

서버 코드 없이, repo 루트의 `_headers` 파일에 경로와 헤더를 적으면 된다.

```text
/ads.json
  Access-Control-Allow-Origin: *
```

`*`는 "어느 출처든 허용"이다. 광고 데이터는 공개 파일이라 문제없다.

### 언더스코어 파일은 Jekyll 프로젝트였다면 함정이었다

Jekyll은 `_`로 시작하는 파일을 빌드 결과에서 제외한다. 블로그(Jekyll)에 얹었다면 `_config.yml`에 `include: ["_headers"]`를 추가해야 CORS가 조용히 빠지는 걸 막을 수 있었다. 빌드 도구 없는 순수 정적 사이트로 분리한 덕에 이 함정 자체가 사라졌다.

---

## 브라우저만으로 파일 만들기·복사하기

### Blob + URL.createObjectURL — 서버 없이 다운로드

서버가 파일을 만들어주는 게 아니라, 브라우저 메모리에서 파일 내용을 만들고 임시 주소를 붙여 다운로드 링크처럼 클릭시킨다.

```js
const blob = new Blob([json], { type: "application/json" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob); // 메모리 속 데이터에 임시 URL 부여
a.download = "ads.json";
a.click();
URL.revokeObjectURL(a.href); // 다 썼으면 임시 URL 회수
```

### 클립보드는 실패할 수 있는 API다

`navigator.clipboard.writeText()`는 권한·보안 문맥에 따라 거부될 수 있어 항상 실패 경로를 둔다. 편집기에선 실패 시 "다운로드를 이용하세요"로 안내했다.

```js
try {
  await navigator.clipboard.writeText(json);
} catch (_) {
  // 막힌 환경 — 다운로드 버튼으로 유도
}
```

---

## 사용자 입력을 화면에 넣을 땐 textContent

입력값을 `innerHTML`로 꽂으면 입력에 섞인 태그가 실제로 해석된다(XSS). 텍스트는 텍스트로만 들어가는 `textContent`를 쓰고, 구조는 `createElement`로 만든다.

```js
li.innerHTML = `<b>${ad.title}</b>`; // ❌ 제목에 <script>가 들어오면 실행됨
name.textContent = ad.title; // ✅ 무엇이 들어와도 글자로만 표시
```

편집기는 어차피 내 손으로만 쓰는 도구지만, 공개 페이지라 습관처럼 지키는 게 맞다.

---

## localStorage로 편집 초안 유지

폼 입력(input 이벤트)마다 상태 배열을 통째로 저장하고, 페이지를 열 때 복원한다. 저장 버튼 없이도 새로고침·실수 닫기에 편집 내용이 살아남는다.

```js
localStorage.setItem(KEY, JSON.stringify(ads)); // input마다
const draft = localStorage.getItem(KEY); // 시작할 때
```

값은 문자열만 저장되므로 넣을 때 `JSON.stringify`, 꺼낼 때 `JSON.parse`가 항상 짝으로 붙는다.

---

## Windows에서 대소문자만 다른 폴더 이름 바꾸기

Windows 파일시스템은 대소문자를 구분하지 않아서 `Greenhouse`와 `GreenHouse`를 같은 이름으로 취급한다. 그래서 곧장 바꾸면 "이미 있는 이름"이 되고, 임시 이름을 경유하는 2단계로 바꾼다.

```powershell
Rename-Item ".\Greenhouse" "Greenhouse_tmp"
Rename-Item ".\Greenhouse_tmp" "GreenHouse"
```

그런데 어떤 프로세스든 그 폴더(또는 안의 파일) 핸들을 잡고 있으면 이름 변경 자체가 Access denied로 거부된다. 탐색기에서 바꾸면 실패할 때 어느 프로그램이 잡고 있는지 이름을 보여줘서, 명령이 안 될 때는 탐색기가 진단 도구가 된다. 참고로 폴더 이름이 바뀌어도 안의 git repo는 영향이 없다 — git은 폴더 위치를 기억하지 않는다.
