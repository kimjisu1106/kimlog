---
layout: post
title: xlsx 다운로드와 로딩 오버레이 충돌
date: 2026-05-20
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Django
  - JavaScript
  - HTML
---
- 문제점: xlsx, csv 등 파일 다운로드 버튼을 클릭하면 로딩 오버레이가 뜨고 사라지지 않는 버그. 파일 다운로드는 페이지 이동이 아니라서 `pageshow` 이벤트가 발생하지 않기 때문이다.
- 방안: 다운로드 링크에 `data-no-loading` 속성을 추가해 전역 핸들러가 건너뛰도록 처리.

---

### 원인

링크 클릭 시 로딩 오버레이를 표시하는 전역 JS 핸들러가 모든 `<a>` 클릭에 반응한다.

```js
document.addEventListener('click', function(e) {
  const link = e.target.closest('a[href]');
  if (!link) return;
  if (link.hasAttribute('data-no-loading')) return;  // ← 이 체크로 스킵
  // ... 오버레이 표시
});
```

### 해결

다운로드 링크에 `data-no-loading` 속성 추가.

```html
{% raw %}
<a href="{% url 'export_xlsx' obj.pk %}"
   class="btn btn-sm btn-outline-secondary"
   data-no-loading>
  <i class="bi bi-file-earmark-excel me-1">
  </i>Excel
</a>
{% endraw %}
```

`data-no-loading`이 있으면 핸들러가 early return 해서 오버레이를 띄우지 않는다.
