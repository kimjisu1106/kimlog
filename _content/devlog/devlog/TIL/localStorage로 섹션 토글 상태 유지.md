---
layout: post
title: localStorage로 섹션 토글 상태 유지
date: 2026-05-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - Django
  - HTML
---
- 문제점: Draft detail 페이지를 예로 들면, 이 기안을 참조하는 Payment, Work, Contract 리스트를 함께 보여줘야 하는데 하드코딩 되고 있었다.
- 방안: 역참조 섹션이 모델마다 늘어나면 하드코딩 대신 재사용 가능한 카드 컴포넌트로 만들고, 어떤 섹션을 펼치고 가릴지 사용자가 직접 선택할 수 있게 했다.

모델명을 key로 `localStorage`에 저장하면 같은 모델의 모든 detail 페이지에 토글 상태가 공통 적용된다.

---

### 마크업

```html
{# 페이지 상단 — 모델 식별자 #}
<div data-section-model="mymodel"></div>

{# 각 섹션 카드 #}
<div class="card mt-3"
     data-section-id="related-items"
     data-section-label="연관 항목">
```

### JS 핵심

```js
var STORAGE_PREFIX = 'sections__';

function getModel() {
  var el = document.querySelector('[data-section-model]');
  return el ? el.getAttribute('data-section-model') : null;
}

// 저장: 'sections__mymodel' → ['related-items', 'logs'] (숨길 섹션 ID 목록)
localStorage.setItem(STORAGE_PREFIX + model, JSON.stringify(hiddenIds));

// 복원: 페이지 로드 시
var hidden = JSON.parse(localStorage.getItem(STORAGE_PREFIX + model) || '[]');
hidden.forEach(id => {
  var el = document.querySelector(`[data-section-id="${id}"]`);
  if (el) el.style.display = 'none';
});
```

key가 `sections__mymodel`이면 MyModel detail 어느 페이지를 가도 같은 설정이 적용된다.
