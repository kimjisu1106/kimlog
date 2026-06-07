---
layout: post
title: Google Sheets를 데이터 버스로(with AppSheet)
date: 2026-05-18
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
  - Google-Sheets
  - AppSheet
---
- 문제점: 서버가 외부 접근 불가한데 현장에서 DB 확인 및 내용 기입이 필요함(현장 실사 등)
- 방안: 현재는 외부 접근 가능하게 할 수 없으므로 Google Sheets를 데이터 버스로 이용하는 파이프라인 구축
- Django → Sheet push → 모바일에서 AppSheet으로 현장 수정 → Sheet pull → Django 반영.

---

### 흐름

```
PC                  Google Sheets              모바일
------              ─────────────             --------
sheet_push →    전체 데이터 rows     ←→   AppSheet 현장 수정
                 (group 컬럼에 작업명)
sheet_pull ←    group 필터링 후
                 변경된 행만 DB 반영
```

### Sheet pull은 2단계

서버에 바로 적용하지 않고 diff 미리보기 → 확인 후 적용.

```python
# 1단계: 변경사항 미리보기만 반환
changes = []
for row in sheet_rows:
    obj = MyModel.objects.get(item_id=row['item_id'])
    diff = {f: (getattr(obj, f), row[f])
            for f in EDITABLE_FIELDS if str(getattr(obj, f)) != row[f]}
    if diff:
        changes.append({'obj': obj, 'diff': diff})
return JsonResponse({'changes': changes})

# 2단계: 확인 후 실제 적용
for item in confirmed_changes:
    MyModel.objects.filter(pk=item['pk']).update(**item['updates'])
```

2단계 구조 덕분에 Sheet에서 잘못 수정된 값이 바로 반영되는 사고를 방지할 수 있다.
