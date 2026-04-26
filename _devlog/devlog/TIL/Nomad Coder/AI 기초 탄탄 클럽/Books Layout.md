---
layout: post
title: "노마드코더 AI 기초 탄탄 클럽 #5 Books Layout"
date: 2026-04-25
categories:
  - today-i-learn
project: nomad-coder-ai-bagic
project_name: 노마드코더 - AI 기초 탄탄 클럽
video_id:
app_url:
status:
tags:
  - "#HTML"
  - CSS
---
노마드코더에서 수강 가능한 풀스택 웹 기초를 6주만에 훑는 챌린지.
해당 강의: 코코아톡 크론코딩
`#5`는 Books Layout을 구성하는 것이라 네이버 시리즈를 참고해서 작성했고, items는 내가 재미있게 감상한 것들로 배치했다.

p.s. AI를 활용하는 수업인데 AI 안쓰고 MDN만 참고해서 작성 중.

---

### 스크롤바 숨기기

브라우저마다 방법이 달라서 둘 다 써야 함.

```css
.scroll-hidden {
    /* IE, 구버전 Edge */
    -ms-overflow-style: none;
    
    /* 파이어폭스(Firefox) */
    scrollbar-width: none;
}

/* 크롬, 사파리, 에지(Chromium 기반), 오페라 */
.scroll-hidden::-webkit-scrollbar {
    display: none;
}
```

---

### `>*` 선택자로 직계 자식 전체에 일괄 적용**

자식 요소에 일일히 클래스 안 줘도 됨.
단, >는 직계 자식에게만 적용됨.
손자 이하에도 적용하려면 > 없이 공백으로

```css
.item-detail-header > * { /*직계 자식에게만 적용*/
  margin-bottom: 10px;
}

.item-detail-header * { /*손자 이하에도 적용*/
  margin-bottom: 10px;
}
```

---

### `hr` 커스터마이징

```css
hr {
  background: var(--light-gray);
  height: 1px;
  border: 0;  /* 기본 border 제거해야 background 보임 */
}
```

---

### CSS Cascading

1. 중요도(Importance): `!important`가 붙었는가?
2. 명시도(Specificity): `!important`가 없다면, 점수가 얼마나 높은가?`(ID > Class > Tag)`
	1. 같은 선택자일 때는 숫자가 많으면 이김
	2. 선택자가 다를 때는 체급이 높은 선택자가 무조건 이김
3. 소스 순서(Source Order): 얼마나 늦게 정의되었나?

```html
<div class="item-detail-header">
  <div id="item-detail-title" class="item-detail-title">
	<div>
	  <span class="badge badge-update">UP</span>
	</div>
	<span class="item-title">어느 마법사의 식당</span>
  </div>
  <span class="item-artist">차씨</span>
</div>  
```

1. `!important`
```css
.item-detail-header * {
  padding: 10px !important; /*이게 적용됨*/
}

.badge {
  padding: 5px;
}
```
- `item-detail-header *`가 적용됨(1번)

2-1. `Specificity` 다른 선택자: 체급
```css
#item-detail-header * {
  padding: 10px; /*이게 적용됨*/
}

.badge {
  padding: 5px;
}
```

2-2. `Specificity` 동일 선택자:갯수
```css
.item-detail-header *{
  padding: 10px; ``` /* 클래스 1개급 (10점) */
}

.badge.badge-update{
  padding: 5px; /* 클래스 2개 (20점) → 이게 적용됨*/
}
```

3. `Source Order` 동일 선택자
```css
.item-detail-header * {
  padding: 10px; /* 클래스 1개급 (10점) */
}

.badge {
  padding: 5px; /* 클래스 1개급 (10점) → 이게 적용됨*/
}
```

**주의사항** | 다양한 선택자로 스타일을 짤 경우 유지보수에 비효율적이므로 Class위주의 스타일을 짤 것.

![](/assets/images/for-posts/n_20260425_01.png)