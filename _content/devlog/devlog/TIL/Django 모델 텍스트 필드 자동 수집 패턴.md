---
layout: post
title: Django 모델 텍스트 필드 자동 수집 패턴
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
- 문제점: list.html마다 검색이 필요한데, 각 모델의 필드를 하나씩 하드코딩하다 보니 새 필드가 추가되면 빠뜨리는 경우가 생겼다. 
- 해결방법: 고급검색 기능을 만들었다. 버튼을 누르면 헤더가 확장되면서 각 필드별 필터 입력란이 나타나고, 표시할 필드 목록을 `_model_text_fields()`로 자동 수집한다.

---

### 핵심 유틸리티

```python
def _model_text_fields(model, excludes=()):
    result = []
    for f in model._meta.get_fields():
        if not hasattr(f, 'get_internal_type'):
            continue
        if f.get_internal_type() not in ('CharField', 'TextField'):
            continue
        if f.name in excludes:
            continue
        result.append(f.name)
    return result
```

모델의 `CharField`/`TextField` 이름을 리스트로 반환한다. 새 필드가 추가되면 고급검색에 자동 반영된다.

### 사용 예

```python
SEARCH_FIELDS = _model_text_fields(
    MyModel, excludes=("id", "status")
) + [
    "location__name",   # FK 경로는 수동으로만 추가
    "tags__name",
]
```

- `_meta.get_fields()` — Django 모델의 모든 필드 메타데이터 반환
- `get_internal_type()` — DB 타입을 문자열로 확인 (`'CharField'`, `'IntegerField'` 등)
- FK / 역참조 경로(`location__name` 등)는 자동 수집 불가 → 수동으로 추가
