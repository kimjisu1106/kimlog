---
layout: post
title: 소리꽃 KeyBloom TIL 26
date: 2026-07-26
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 모션에 따라 슬라이더를 접었다 펴는 법, 체크박스 라벨 폰트 규격화, 그리고 AdFit 자동 갱신이 클라이언트에서 안 되는 진단과 네이티브용 하우스 광고 설계.
tags:
  - TypeScript
  - CSS
---
나선 파라미터를 다듬으며 나온 UI 조각들과, 웹 광고 자동 갱신을 파헤치다 알게 된 AdFit의 한계·하우스 광고 방향을 모아둔다.

---

## UI 조각

### 모션에 따라 슬라이더 표시/숨김

나선 전용 슬라이더는 모션이 나선일 때만 보이면 된다. `selectRow`에 onChange를 주고, 표시/숨김 함수를 syncers에도 등록해 큐 전환 때도 다시 적용되게 한다.

```ts
const syncSpiralVis = () => {
  spiralPit.row.hidden = cur.motion !== "spiral"; // 반경·퍼짐·간격 동일
};
syncers.push(syncSpiralVis);       // 큐 전환 시 재적용
selectRow(..., syncSpiralVis);     // 모션 바꿀 때 즉시
```

### 체크박스 라벨 폰트 규격화

체크박스 행은 라벨을 `<span>`으로 넣어서 `.ctl-row label { font-size }` 규칙이 안 걸려 혼자 커 보였다. 컨테이너 클래스에 font-size를 줘 통일했다.

```css
/* <span> 라벨이라 .ctl-row label을 못 받음 → 여기서 규격화 */
.check-row { font-size: var(--fs-base); }
```

### boolean 파라미터 UI

range 슬라이더뿐이던 컨트롤 팩토리에 `checkRow`(체크박스) 헬퍼를 추가해 on/off 파라미터(발광 토글·가둠)를 UI로 뺐다. 건반 발광 밝기도 고정 알파를 파라미터로 빼 슬라이더로.

---

## 광고

### AdFit 자동 갱신은 사용자 브라우저 쪽에서 안 된다

웹 광고가 자동으로 안 바뀌어 코드를 의심했는데, 정적 스니펫으로 되돌려도·다른 페이지에서도·티스토리에서도 똑같았다. AdFit이 페이지 로드당 광고 1개를 그리고 끝내는 것 — 클라이언트(사용자 브라우저 쪽) 자동 갱신 미지원이 원인이었다. 콘솔의 Topics API deprecated 경고나 도메인 승인은 무관했다. "우리 코드 문제"부터 의심하기 전에 다른 매체에서도 같은지 보는 게 빠른 진단이었다.

### 하우스 광고 — 원격 데이터로 앱 재빌드 없이

네이티브 앱은 승인 도메인이 아니라(`tauri://localhost`) AdFit이 안 뜬다. 대신 내 블로그·앱을 홍보하는 하우스 광고를 넣되, 원격 `ads.json`을 앱이 fetch해 배너로 그리면 앱 재빌드 없이 내용만 바꿔 반영된다. 교차 출처라 Cloudflare `_headers`에 CORS(다른 출처의 요청을 파일 주인이 허락하는 규칙)를 허용하고, 링크는 Tauri opener 플러그인으로 시스템 브라우저에서 연다(앱 속에 넣은 브라우저 화면인 WebView가 자기 창을 덮어쓰지 않게).

---

## 요약

- 조건부 슬라이더는 onChange + syncers 양쪽에 표시/숨김을 등록한다.
- `<span>` 라벨은 `.ctl-row label`을 못 받으니 컨테이너 클래스에서 규격화.
- AdFit 자동 갱신은 클라이언트에서 안 됨 — 다른 매체 비교로 빠르게 진단.
- 원격 데이터(ads.json)를 fetch하면 배포된 앱 내용을 재빌드 없이 갱신할 수 있다.
