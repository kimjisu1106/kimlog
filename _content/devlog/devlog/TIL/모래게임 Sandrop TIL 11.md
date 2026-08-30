---
layout: post
title: 모래게임 Sandrop TIL 11
date: 2026-07-22
permalink: "devlog/devlog/TIL/모래게임 Sandrop TIL 11"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 색 수와 색 구분은 별개 문제라는 걸 두 번의 실패로 배우고, 레벨 생성을 80분에서 3분으로 줄이면서 만난 병렬 처리·자원 회계·도구 만들기의 기록.
tags:
  - Dart
  - Flutter
  - Python
---
## 색과 이미지 처리

### 색 수를 채워도 색이 비슷하면 똑같이 안 읽힌다

"색이 3개라 뭉개진다"는 인식 후 색을 4개 이상으로 늘렸다. 그런데 여전히 안 읽히는 판이 나왔다. 재보니 색은 4개인데 서로 거의 같았다.

```python
# 레벨 207의 팔레트 — 색은 5개인데
["#ABD3DC", "#829AA5", "#F9F8F8", "#729AA3", "#7C8B90"]
#            ^^^^^^^^^            ^^^^^^^^^  ^^^^^^^^^
#            이 셋의 RGB 거리가 16 ~ 27 — 화면에서 구분 불가
```

색 수(count)와 색 구분(distance)은 다른 축이다. 둘 다 봐야 한다.

```python
def _palette_ok(result) -> bool:
    """색 수(≥MIN_PALETTE)와 색 구분(≥MIN_PALETTE_DIST)을 둘 다 본다."""
    if result is None or len(result["palette"]) < MIN_PALETTE:
        return False
    rgb = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in result["palette"]]
    for i in range(1, len(rgb)):
        for j in range(i + 1, len(rgb)):
            if _dist2(rgb[i], rgb[j]) < MIN_PALETTE_DIST ** 2:
                return False
    return True
```

---

### 목표를 채울 때까지 기준을 단계적으로 푸는 적응형 재시도

이미지를 몇 가지 색으로 줄일 때, 비슷한 색을 합치는 임계값이 결과 색 수를 정한다. 임계를 하나로 고정하면 어떤 그림은 3색이 되고 어떤 그림은 7색이 된다.

목표 색 수를 정해두고, 못 채우면 임계를 낮춰 다시 뽑는다.

```python
MIN_PALETTE = 4
MERGE_LADDER = ((22, 28, 0.004), (16, 20, 0.002), (10, 12, 0.001))

def quantize_adaptive(path):
    saved = (MERGE_DIST2, FINAL_MERGE_DIST2, MIN_CLUSTER_FRAC)
    try:
        best = quantize_png(path)
        if _palette_ok(best):
            return best
        for merge, final, frac in MERGE_LADDER:   # 점점 느슨하게
            globals().update(MERGE_DIST2=merge ** 2,
                             FINAL_MERGE_DIST2=final ** 2,
                             MIN_CLUSTER_FRAC=frac)
            r = quantize_png(path)
            if _palette_ok(r):
                return r
        return None      # 끝까지 못 채움 — 이 그림은 포기한다
    finally:
        MERGE_DIST2, FINAL_MERGE_DIST2, MIN_CLUSTER_FRAC = saved
```

94종 중 79종이 이 사다리로 목표를 채웠고 15종은 버렸다.

---

### 색을 억지로 벌리면 배경 대비가 깨진다

색이 비슷한 걸 고치려고 밝기를 벌려봤다. 전경끼리는 잘 떨어졌는데 그중 하나가 배경 쪽으로 밀려났다.

```python
# ❌ 전경끼리만 보고 벌리기
for k in range(len(order) - 1):
    i, j = order[k], order[k + 1]
    if dist(fg[i], fg[j]) < FLOOR:
        push_apart(fg[i], fg[j])      # 배경은 계산에 없다
```

결과가 명확했다.

```text
현재            전경 문제 176종 / 배경 문제  1종
명도 벌리기 후   전경 문제  77종 / 배경 문제 36종
```

전경 문제를 100종 줄이고 배경 문제를 35종 만들었다. 순이득이 없다.

원래 비슷한 색으로 그려진 그림은 벌린다고 나아지지 않는다. 그림 자체가 그런 그림이다.

---

### 고칠 수 없으면 버린다

기준을 못 지키는 도안을 고치려 하지 말고 그냥 뺐다. 이게 가능한 조건이 있다.

```text
필요한 도안   500종
가진 도안    1088종
기준 통과     566종  →  충분하니 버려도 된다
```

여유가 있을 때는 품질 기준을 깎는 것보다 개수를 채우는 쪽이 낫다. 모자라면 소스를 더 구하면 된다.

---

## 병렬 처리

### 작업끼리 독립이면 코어 수만큼 그대로 빨라진다

레벨 500개를 만드는데 80분이 걸렸다. CPU를 보니 8코어 중 하나만 100%였다.

레벨끼리는 서로 참조하지 않으니 나눌 수 있다.

```python
WORKERS = max(1, (os.cpu_count() or 4) // 2)   # 물리 코어 기준

def _build_one(job):
    """워커 진입점 — 모듈 최상위여야 Windows spawn 에서 pickle 된다."""
    level_id, name, grid, palette = job
    return level_id, name, _make_level(name, grid, palette, level_id)

with Pool(WORKERS) as pool:
    for lid, nm, d in pool.imap_unordered(_build_one, jobs, chunksize=1):
        ...
```

80분이 3분이 됐다.

---

### 시드를 작업 번호에서 뽑으면 순서가 섞여도 결과가 같다

병렬로 돌리면 처리 순서를 보장할 수 없다. 그런데 난수를 쓰면 순서에 따라 결과가 달라진다.

각 작업이 자기 시드를 자기 번호에서 만들면 이 문제가 사라진다.

```python
def _make_level(name, grid, palette, level_id):
    rng = random.Random(level_id * 7919)          # 전역 난수를 안 쓴다
    ...
    n_ropes, n_questions, n_keys = gimmick_counts(
        level_id, plan.tier, random.Random(level_id * 31337))
```

레벨 42는 몇 번째로 처리되든 항상 같은 레벨 42다.

---

### 먼저 끝난 작업부터 결과를 받는다

`map`은 전부 끝나야 반환한다. `imap_unordered`(끝난 것부터 하나씩 돌려주는 함수)는 완료되는 대로 흘려주니 진행률을 찍을 수 있다.

```python
done = 0
with Pool(WORKERS) as pool:
    for lid, nm, d in pool.imap_unordered(_build_one, jobs, chunksize=1):
        done += 1
        if done % 25 == 0:
            el = time.monotonic() - t1
            eta = el / done * (len(jobs) - done)
            print(f"  {done}/{len(jobs)}  경과 {el/60:.1f}분  "
                  f"남은 예상 {eta/60:.1f}분", flush=True)
```

---

### 계산이 빡센 작업은 코어 개수를 실제 코어로 센다

`os.cpu_count()`는 논리 코어를 준다 — 물리 코어는 실제 계산 유닛의 개수이고, 논리 코어는 그걸 스레드 단위로 나눠 부풀린 수다. 8코어 16스레드면 16이 나온다. 그런데 SMT로 늘어난 스레드는 실행 유닛을 공유해서, 계산이 몰리는 작업(CPU 바운드)에서는 이득이 적다.

```python
WORKERS = max(1, (os.cpu_count() or 4) // 2)   # 논리 16 → 8
```

---

### Windows에서는 워커 함수가 모듈 최상위에 있어야 한다

리눅스는 fork로 프로세스를 복제하지만 Windows는 spawn이라 새 인터프리터를 띄우고 함수를 pickle로 보낸다. 중첩 함수나 람다는 pickle이 안 된다.

```python
# ❌ 중첩 함수 — Windows에서 pickle 실패
def generate(count):
    def build(job): ...
    pool.map(build, jobs)

# ✅ 모듈 최상위
def _build_one(job): ...
```

호출부도 `if __name__ == "__main__":` 안에 있어야 한다. 없으면 워커가 모듈을 import할 때 다시 실행돼 프로세스가 무한히 늘어난다.

---

### 전역 상태가 있으면 그 단계만 떼어 순차로

레벨마다 서로 다른 도안을 줘야 해서 "이미 쓴 도안" 집합이 필요했다. 이건 전역 상태라 병렬화가 안 된다.

전체를 포기할 필요는 없다. 비싼 부분과 순차인 부분을 나누면 된다.

```python
# 1단계 (순차, 몇 초) — 시뮬레이션이 없어서 빠르다
for lid in targets:
    name = pick(lid, tier_for(lid), set())
    assigned[lid] = name
    used.add(name)

# 2단계 (병렬, 대부분의 시간) — 레벨끼리 독립
with Pool(WORKERS) as pool:
    ...
```

---

### 시도와 채택을 구분하지 않으면 자원 회계가 깨진다

같은 실수를 하루에 두 번 했다. 둘 다 "써봤다"와 "썼다"를 구분 안 해서 생겼다.

첫 번째는 거짓 경고다.

```python
# ❌ 후보를 돌려주는 시점에 셈 — 버려질 후보까지 센다
def pick(level_id, tier, exclude):
    ...
    recycled.append(level_id)     # 이건 "시도"다
    return src[(level_id - 1) % len(src)]
```

"도안 재사용 164개"라고 경고했는데 실제 결과물의 중복은 0이었다. 거짓 경고는 나중에 진짜 문제를 무시하게 만든다.

두 번째는 자원 고갈 오판이다.

```python
# ❌ used에 시도한 도안이 전부 쌓임 — 나중에 대체돼도 안 빠진다
# → 구제 단계가 "예비가 없다"고 판단해 멀쩡한 96종을 두고 재사용

# ✅ 실제로 채택된 것만 남긴다
used = {v[2] for v in best.values()}
```

병렬화하면서 "배정"과 "채택"이 분리됐는데, 회계 코드는 그대로 배정 시점에 있었다.

---

## Flutter UI

### 좁으면 배지가 0까지 눌려 사라진다

가로 폭이 모자라 오버플로가 나서 `Flexible`(남는 폭에 맞춰 자식을 늘였다 줄였다 하는 위젯)로 감쌌다. 오버플로는 사라졌는데 이번엔 배지가 아예 안 보였다.

```dart
// ❌ 좁으면 배지가 0까지 눌려 사라진다
Row(children: [
  Text('Lv $levelId'),
  Flexible(child: Container(child: Text(badge.label))),
])

// ✅ 줄을 나누면 폭 경쟁 자체가 없어진다
Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
  Text('Lv $levelId'),
  const SizedBox(height: 3),
  Container(child: Text(badge.label, softWrap: false)),
])
```

"넘침"을 "사라짐"으로 바꾼 셈이었다. 둘 다 버그다.

---

### 영역 밖에 놓인 배지는 그려져도 안 눌린다

아이콘 우하단에 작은 배지를 `Stack`(위젯을 겹쳐 쌓는 레이아웃)으로 달고 탭 영역을 넓히려 했다. 바깥으로 넓히면 안 눌리고, 안쪽으로 넓히면 아이콘을 먹는다.

```dart
// ❌ clipBehavior: Clip.none 은 그리기만 허용한다 — 탭은 부모 영역까지만
Stack(clipBehavior: Clip.none, children: [
  icon,
  Positioned(right: -12, bottom: -12, child: badge),   // 안 눌림
])
```

`RenderBox.hitTest`가 `_size.contains(position)`을 먼저 확인하기 때문이다. 영역 밖은 자식까지 내려가지도 않는다.

해결은 자리를 미리 비우는 것이다.

```dart
// ✅ 카드 우하단에 배지 자리를 만들고, 배지를 그 위에 얹는다
Stack(children: [
  Padding(padding: EdgeInsets.only(right: _badgeInset, bottom: _badgeInset),
          child: card),
  Positioned(right: 0, bottom: 0, child: badge),
])
```

---

### 보여주기만 하는 배지는 탭을 안 받게 한다

배지가 탭을 가로채서 아이템을 쓰려는 손이 구매 창으로 샜다. 배지는 상태를 보여주기만 하면 되니 `IgnorePointer`(탭을 자기 위로 안 받고 뒤로 흘려보내는 위젯)로 아예 탭을 안 받게 했다.

```dart
Positioned(
  right: 0, bottom: 0,
  child: IgnorePointer(child: Container(...)),
)
```

`onTap: null`과는 다르다. `IgnorePointer`는 히트 테스트에서 통째로 빠져서 뒤에 있는 위젯이 탭을 받는다.

---

## 도구와 프로세스

### 느린 파이프라인에는 표본 미리보기를 먼저 만든다

35분 걸리는 생성을 하루에 다섯 번 돌렸다. 설정을 바꿀 때마다 결과를 보려면 그 방법뿐이었다.

표본만 만드는 경로를 열었더니 15초가 됐다.

```python
def generate(count: int, only: set[int] | None = None):
    for level_id in range(1, count + 1):
        if only is not None and level_id not in only:
            continue
        ...
```

중요한 건 진짜 경로를 그대로 탄다는 것이다. 처음엔 도안 하나를 고정해서 재는 간이 측정을 만들었는데, 실제 배정과 달라서 "고쳤다"는 잘못된 결론을 냈다.

---

### 출력을 바로 내보내지 않으면 파이프에서 안 보인다

백그라운드로 돌리면서 진행률을 찍었는데 아무것도 안 나왔다. 파이프로 연결되면 출력이 블록 단위로 모였다가 나가기 때문이다. `flush=True`는 모아두지 말고 즉시 내보내라는 옵션이다.

```python
print(f"  {done}/{total}", flush=True)
```

---

### 누적 평균으로 계산한 ETA는 늘어날 수 있다

진행률에 남은 시간을 같이 찍었더니 계속 늘어났다.

```python
eta = elapsed / done * (total - done)      # 지금까지의 평균 속도
```

작업이 뒤로 갈수록 무거우면 평균이 계속 나빠져서 예상 시간이 늘어난다.

```text
  1~ 25    1.2초/레벨
 26~ 50    3.4초/레벨
 51~ 75    6.7초/레벨
 76~100   10.6초/레벨
```

최근 구간 속도로 계산하는 게 맞다. 다만 늘어나는 ETA도 정보다 — 뭔가 예상과 다르게 무거워지고 있다는 신호다.

---

### UTF-8 파일에 BOM이 없으면 Windows 편집기가 cp949로 읽는다

로그를 열었더니 한글이 깨져 있었다. 파일은 정상 UTF-8이었다.

```python
d = open('last-run.log', 'rb').read()
print('BOM:', d[:3] == b'\xef\xbb\xbf')   # False
d.decode('utf-8')                          # 정상
```

한국어 Windows는 BOM이 없으면 기본 인코딩(cp949)으로 추측한다. 읽는 쪽에서 명시하거나 쓸 때 BOM을 붙이면 된다.

```powershell
Get-Content $log -Encoding UTF8
```

```python
open(path, "w", encoding="utf-8-sig")   # BOM 포함
```

---

### PowerShell로 로그 실시간 추적

```powershell
Get-Content $path -Wait -Tail 5 -Encoding UTF8
```

`-Wait`가 새 줄을 기다린다. 화면을 통째로 다시 그리려면 반복문으로 감싼다.

```powershell
while ($true) {
  Clear-Host
  Get-Content $log -Tail 14 -Encoding UTF8
  Start-Sleep -Seconds $Every
}
```

---

### 셸 래퍼를 죽여도 자식 프로세스는 남는다

백그라운드 작업을 중단했는데 CPU가 계속 돌고 있었다. 래퍼 셸만 죽고 그 아래 파이썬은 살아 있었다.

```powershell
Get-Process python | Select-Object Id, CPU, StartTime
```

CPU 값이 계속 오르면 살아 있는 것이다. 같은 폴더에 쓰는 작업이 둘이면 결과가 섞인다.

```powershell
Stop-Process -Id 27880 -Force
```

---

## 게임 설계

### 게임 상수는 안전망에서도 양보하면 안 된다

레벨 생성기가 조건에 맞는 배치를 못 찾으면 안전망으로 빠지는데, 거기서 레일 칸 수를 늘려 풀리게 만들고 있었다. 37개 레벨이 5칸이 아니라 6칸으로 나갔다.

레일 5칸은 플레이어가 배우는 규칙이고 화면 배지(`n/5`)와 광고 버튼의 의미가 거기 묶여 있다. 레벨마다 다르면 안 된다.

양보 순서를 명시적으로 정했다.

```text
1. 밴드 적중        — 먼저 포기
2. 색 규칙          — 그다음 (로그에 남김)
3. 도안 무중복       — 마지막 (로그에 남김)
4. 클리어 가능·레일 5칸 — 절대 양보 안 함
```

무엇을 먼저 포기할지 정해두지 않으면 코드가 그때그때 편한 걸 포기한다.

---

### 두 목표가 같은 예산을 나눠 쓰면, 하나를 고정하면 다른 하나가 안 움직인다

보드에 바스켓이 별로 없어서 최소 바스켓 개수를 지정했더니 난이도가 목표를 크게 벗어났다.
알고보니 난이도 조절 시 바스켓 개수와 벽 개수 서로 영향을 받고 있었다.

생성기가 난이도를 조절할 때 실제로 탐색하는 축이 그 값 하나뿐이었다. 벽 개수·매장 깊이는 레벨마다 한 번 뽑고 고정이라 탐색 대상이 아니었다.

```python
# ❌ 하한 = 상한 → 탐색 여지가 사라진다
pc_lo = pc_hi = cap_per_color

# ✅ 하한만 두고 여지를 남긴다
pc_lo = min(max(plan.per_color[0], need_per_color,
                round(pc_hi * DENSITY_FLOOR)), pc_hi)
```

무언가를 고정하기 전에 "이게 다른 무엇을 조절하는 손잡이는 아닌가"를 봐야 한다.

---

### 이름만으로 같은 것 판정하면 출처를 구분할 칸이 필요하다

직접 그린 도안과 외부에서 받은 도안이 같은 이름(`tiger`)을 갖고 있었다. 중복 판정이 이름 기준이라 하나를 쓰면 나머지가 영영 안 나왔다.

```python
# ✅ 출처를 이름에 박는다
("kr_tiger", _tiger(), [...])
```

이렇게 이름 앞에 출처를 붙여 같은 이름을 서로 다른 칸에 두는 걸 네임스페이스라고 한다. 경고도 안 나고 테스트도 통과한다. 그냥 조용히 한 종이 사라진다.

---

## 요약

오늘 잡은 것 중 다섯 개가 테스트를 전부 통과한 상태였다. 도안 이름 충돌, 레일 6칸, 난이도 배지 누락, 거짓 경고, 예비 자원 오판. 규칙상 문제가 없어서 자동 검증에 안 걸렸고, 직접 플레이하거나 숫자를 다시 재보고 나서야 드러났다.

그리고 도구를 먼저 만들었어야 했다. 35분짜리 확인을 다섯 번 돌린 뒤에야 15초짜리 미리보기를 만들었고, 병렬화는 반나절 걸릴 줄 알았는데 30분이면 됐다. 미루는 동안 기다린 시간이 훨씬 길었다.
