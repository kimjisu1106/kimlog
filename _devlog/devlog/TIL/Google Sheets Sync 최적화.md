---
layout: post
title: Google Sheets Sync 최적화
date: 2026-04-13
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
## 문제

Google Sheets → DB sync 시 1,000행 기준 쿼리가 7,000번 발생하고 디스크 flush도 행마다 일어나서 느렸음.

---

## 해결 1 — `transaction.atomic()` : 커밋 오버헤드 제거

SQLite는 기본적으로 autocommit 모드. `update_or_create` 호출마다 `SQL 실행 → 디스크 flush → fsync` 반복. `transaction.atomic()` 묶어서 마지막 한 번만 `flush` & `fsync`.
* `flush`: 메모리(RAM)에 있는 것을 디스크에 저장.
* `fsync`: 실제로 다 저장됐는지 OS에 확인 요청. 시간이 많이 걸리는 작업.
* `SQL`: Structured Query Language. DB에 명령하는 언어(CRUD).
* 메모리와 디스크 차이
	* 메모리  → 빠름, 전원 꺼지면 사라짐 (임시)
	- 디스크  → 느림, 전원 꺼져도 남아있음 (영구)

```python
# 기존: 행마다 flush
for row in rows:
    Model.objects.update_or_create(...)

# 개선: 마지막에 한 번만 flush
with transaction.atomic():
    for row in rows:
        Model.objects.update_or_create(...)
```

```
1,000행 × 5ms(fsync) = 5,000ms
→ 1,000번 SQL + 1번 flush = 수백ms
```

---

## 해결 2 — FK 사전 캐싱: 쿼리 횟수 자체를 줄임

DB조회 시 사용되는 FK를 미리 캐싱해두고 가져옴.
C++실습에서 arrResults에 구구단 캐싱해뒀다가 꺼내쓴 것과 같은 원리.

```python
# 기존: 루프 안에서 행마다 FK 조회
for row in rows:
    vendor = Vendor.objects.filter(pk=vendor_id).first()  # 매번 SELECT

# 개선: 루프 전에 1번만 SELECT, 이후 dict 조회 (O(1))
vendor_cache = {str(v.pk): v for v in Vendor.objects.all()}
for row in rows:
    vendor = vendor_cache.get(vendor_id)
```

```
FK가 6개인 경우:
1,000행 × 6 = 6,000번 SELECT → 6번 SELECT
```

---

## 결과

|       | 기존           | 개선            |
| ----- | ------------ | ------------- |
| DB 쿼리 | 행 수 × (FK+1) | FK 종류 수 + 행 수 |
| 디스크   | 행마다 1회       | 전체 1회         |
| 총 쿼리  | ~7,000번      | ~7번           |

---

## 단점 및 이 프로젝트에서의 판단

| 단점                                | 영향도 | 이유                      |
| --------------------------------- | --- | ----------------------- |
| SQLite 쓰기 잠금 (sync 중 다른 쓰기 대기)    | 낮음  | 소규모 사용자, 의도적으로 실행하는 작업  |
| 중간 실패 시 전체 롤백                     | 낮음  | sync는 멱등성* 있어서 재실행하면 그만 |
| 캐시 staleness (sync 중 추가된 FK miss) | 낮음  | 동시에 FK 대상 추가할 가능성 희박    |
| 대형 테이블 전체 메모리 로딩                  | 낮음  | 로컬 DB라 테이블 크기 제한적       |
- 멱등성: 몇 번 실행해도 결과가 같음

고트래픽 서비스였다면 트랜잭션 범위를 세밀하게 나눠야 하지만, 이 프로젝트에서는 단점보다 이득이 훨씬 큼.