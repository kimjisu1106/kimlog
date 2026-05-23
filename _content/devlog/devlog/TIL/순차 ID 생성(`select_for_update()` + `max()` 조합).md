---
layout: post
title: 순차 ID 생성(`select_for_update()` + `max()` 조합)
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
- 문제점: `count()` 기반 순차 ID는 동시 요청 시 같은 번호가 두 번 발급되고, 레코드가 삭제된 경우에도 중복이 생긴다.
- 방안: `select_for_update()` + `max()` 조합으로 DB 레벨에서 직렬화.

---

### 해결

`select_for_update()` + `max()` 조합.

```python
with transaction.atomic():
    last = (
        MyModel.objects.select_for_update()   # 트랜잭션 끝날 때까지 행 잠금
        .filter(item_id__regex=r'^ITEM-\d+$')
        .order_by()
        .aggregate(max_num=Max('number_field'))
    )
    num = (last["max_num"] or 0) + 1
    self.item_id = f"ITEM-{num:05d}"
```

- `count()` → 삭제된 레코드가 있으면 중복 가능
- `max()` → 항상 현재 최대값+1이라 안전
- `select_for_update()` → 동시 요청이 와도 첫 번째 트랜잭션이 끝날 때까지 두 번째가 대기
