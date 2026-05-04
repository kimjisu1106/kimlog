---
layout: post
title: "Jekyll 코드블록 안의 Liquid 태그"
date: 2026-05-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Jekyll
  - Liquid
---
Jekyll은 마크다운 코드블록 안에 있는 내용도 Liquid 템플릿으로 처리한다.

즉, 코드 예시로 `{% raw %}{{ variable }}{% endraw %}`나 `{% raw %}{% if ... %}{% endraw %}`를 그대로 넣으면 Jekyll이 실행하려 해서 글이 깨진다.

---

### `{% raw %}`...`{% endraw %}`: Liquid 템플릿 엔진의 **이스케이프 태그

Liquid 코드를 예시로 보여줄 때는 `{% raw %}`와 `{% endraw %}`로 감싸면 Jekyll이 해당 블록을 처리하지 않는다.

{% raw %}
```liquid
{% if include.category %}
  {% assign graph_posts = site.devlog | where_exp: "p", "p.categories contains _cat" %}
{% endif %}
```
{% endraw %}

`{% raw %}`는 코드블록 밖에 있어야 한다. 코드블록 안에 넣어도 효과 없음.

---

### 덤: 코드블록 안의 `#`

JS 코드를 설명할 때 `#`을 주석으로 쓰면 마크다운 헤더로 렌더링될 수 있다. `//` 주석 사용 권장.
