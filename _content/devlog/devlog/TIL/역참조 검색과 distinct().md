---
layout: post
title: 역참조 검색과 distinct()
date: 2026-05-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Django
  - Python
---
- 문제점: M2M이나 역방향 FK를 검색 조건에 넣으면 JOIN이 발생해 같은 결과가 여러 번 뜬다.
- 방안: 역참조가 포함된 쿼리셋에 `.distinct()` 추가.

---

### 왜 중복이 생기나

스펙이 3개인 모델을 검색하면 JOIN 결과가 3행으로 늘어난다. `.distinct()`가 없으면 목록에 같은 항목이 3번 표시된다.

```python
SEARCH_FIELDS = _apply_search_fields(MyModel) + [
    "manufacturer__name",   # FK → 정방향이라 중복 없음
    "specs__name",          # 역참조(related_name) → JOIN 발생
    "specs__value",         # 역참조 → JOIN 발생
    "categories__name",     # M2M 역참조 → JOIN 발생
]

qs = apply_search(qs, search, SEARCH_FIELDS).distinct()
#                                             ↑ 역참조 포함 시 필수
```

역방향 FK / M2M이 검색 필드에 하나라도 있으면 `.distinct()` 필수.
