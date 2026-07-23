---
layout: post
title: 모래게임 Sandrop TIL 4
date: 2026-07-12
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 로프·물음표 기믹의 합법 수 판정과 짝 해방 가정 검사, 두 언어 엔진의 슬롯 방향 파리티 버그, 기믹 밀도 스케줄과 수요 비례 버킷, 데드락 슬로우모션 시계, 양자화 대비 하한까지.
tags:
  - Dart
  - Flutter
  - Python
---
## 규칙 엔진 (Dart · Python 크로스스택)

### "선택 가능"과 "실제로 올릴 수 있는 수"를 나눈다 — 합법 수(liftable)

기믹이 없을 땐 둘이 같았다 — 꺼낼 수 있는 바스켓 = 지금 둘 수 있는 수. 그런데 로프가 생기면 갈라진다. 로프로 묶인 바스켓은 혼자 선택 가능해도, 짝의 사정 때문에 지금 둘 수 없는 수일 수 있다. 그래서 개념을 둘로 쪼갰다.

- `selectablePositions()` — 통로로 출구에 닿는가(순수 경로 판정)
- `liftablePositions()` — 그중 실제로 둘 수 있는 수(로프 조건까지 통과)

핵심은 이 `liftable` 하나를 승리/패배 판정의 단일 기준으로 삼은 것. 봇도, 데드락(막힘) 판정도, 버튼 활성도 전부 이걸 본다. 기준이 갈라지면 "봇은 둘 수 있다는데 화면에선 안 되는" 어긋남이 생긴다.

```dart
// 합법 수 = 선택 가능하면서, 로프 조건(_ropeOk)까지 통과한 것만
List<int> liftablePositions() {
  final selectable = selectablePositions();
  final set = selectable.toSet();
  return [ for (final bi in selectable) if (_ropeOk(bi, set)) bi ];
}

bool canLift() => _freeRailSlot() != null && liftablePositions().isNotEmpty;
```

---

### 로프 짝은 한쪽만 적어도 양방향으로 잇는다

레벨 데이터에는 로프를 `ropeWith: [col, row]`로 한쪽 바스켓에만 적는다. 엔진이 로드할 때 이걸 양방향 참조로 풀어준다 — A가 B를 가리키면 B도 A를 가리키게. 이렇게 해두면 이후 판정에서 "내 짝이 누구냐"를 어느 쪽에서 물어도 바로 나온다. 데이터는 한 번만 적고(중복·불일치 방지), 런타임 편의는 로드 시점에 만든다.

```dart
for (final spec in level.baskets) {
  final rw = spec.ropeWith;
  if (spec.gimmick != 'rope' || rw == null) continue;
  final a = board[level.boardIndex(spec.col, spec.row)]!;
  final b = board[level.boardIndex(rw[0], rw[1])];
  if (b != null) { a.ropePartnerId = b.id; b.ropePartnerId = a.id; }
}
```

---

### 로프 1칸 풀기 — 자리가 하나뿐이면 밧줄을 끊고 하나만

로프로 묶인 둘은 원칙적으로 같이 벨트로 올라간다. 그런데 벨트(레일) 빈자리가 1칸뿐이면 둘을 다 못 올린다. 이때 규칙은 "밧줄을 풀고 탭한 것만 올린다"(남은 짝은 평범한 바스켓이 됨). 그래서 `takeFromBoard`가 몇 개가 나가는지 모르니 리스트를 반환하고, 지금 빈 용량(capacity)을 인자로 받는다.

```dart
List<Basket>? takeFromBoard(int boardIndex, {int capacity = 1}) {
  if (!liftablePositions().contains(boardIndex)) return null;
  final b = board[boardIndex]!;
  final partnerIdx = b.ropePartnerId == null ? null : _boardIndexOfId(b.ropePartnerId!);
  final withPartner = partnerIdx != null && capacity >= 2;  // 2칸+면 동반
  final taken = <Basket>[b];
  // ...탭한 것 반출...
  if (partnerIdx != null) {
    if (withPartner) { /* 짝도 반출 */ }
    else { p.ropePartnerId = null; b.ropePartnerId = null; } // 1칸 — 밧줄 끊기
  }
  return taken;
}
```

---

### 짝의 유일한 걸림돌이 나 자신이면 — 가정 검사로 탭 허용

이게 오늘 플레이 중 직접 발견해 고친 부분이다. A·B가 묶였는데 B가 나갈 길을 A가 막고 있는 배치. A를 먼저 치우면 B가 뚫리는데, 초기 규칙은 "둘 다 지금 선택 가능해야 함"이라 A 탭이 거부돼 막힌 것처럼 굳었다.

해결은 가정 검사(hypothetical check) — "A를 잠깐 보드에서 뺐다고 치고, 그러면 B가 선택 가능해지나?"를 실제로 계산해보고 원상복구한다. 되면 탭을 허용한다(A가 먼저 나가고 B가 따라 나감).

```dart
bool _partnerFreedByTake(int tappedIdx, int partnerIdx) {
  final saved = board[tappedIdx];
  board[tappedIdx] = null;                       // 임시로 뺀 셈 치고
  final freed = _selectableRaw().contains(partnerIdx);
  board[tappedIdx] = saved;                       // 반드시 원상복구
  return freed;
}

bool _ropeOk(int bi, Set<int> selectableSet) {
  final pid = board[bi]!.ropePartnerId;
  if (pid == null) return true;                   // 로프 없음 — 통과
  final partnerIdx = _boardIndexOfId(pid)!;
  return selectableSet.contains(partnerIdx) ||    // 짝이 지금 가능하거나
      _partnerFreedByTake(bi, partnerIdx);        // 내가 빠지면 가능해지거나
}
```

상태를 잠깐 바꿔 판정하고 되돌리는 패턴은 안전하지만, 원상복구를 빠뜨리면 판정하다 보드를 망가뜨린다. try 없이 즉시 되돌리도록 두 줄을 붙여 뒀다.

---

### 판정용 목록엔 "부작용"이 섞이면 안 된다 — raw / 공개 래퍼 분리

물음표 바스켓은 선택 가능해지는 순간 색이 공개된다. 그런데 위의 가정 검사(`_partnerFreedByTake`)는 selectable을 여러 번 호출한다. 만약 selectable이 호출될 때마다 물음표를 공개해버리면, "가정만 해본 것"인데 실제로 색이 까발려지는 부작용이 남는다.

그래서 `selectablePositions()`를 두 겹으로 나눴다. 몰래 상태를 바꾸는 버전과 아무것도 안 바꾸는 버전을 따로 두고, 시험 삼아 해보는 계산에는 안 바꾸는 쪽만 쓴다.

- `_selectableRaw()` — 순수 판정만, 아무것도 안 바꿈 (가정 검사가 이걸 씀)
- `selectablePositions()` — raw를 부른 뒤 물음표 공개까지 하는 진짜 진입점

```dart
List<int> _selectableRaw() { /* 경로 판정만 */ }

List<int> selectablePositions() {
  final result = _selectableRaw();
  for (final bi in result) {                 // 공개는 여기서만 (진짜 조회 시점)
    final b = board[bi]!;
    if (b.isQuestion && !b.revealed) b.revealed = true;
  }
  return result;
}
```

교훈은, "조회"처럼 보이는 함수가 사실 상태를 바꾸면(부작용), 그걸 판정에 재사용하는 순간 사고가 난다. 부작용 있는 버전과 없는 버전을 분리해두면 재사용이 안전해진다.

---

### 물음표 공개는 단조롭게 — 한 번 열리면 다시 안 닫힌다

물음표는 "선택 가능해진 순간" 공개하는데, 게임이 진행되며 그 바스켓이 다시 막힐 수도 있다. 그때 색을 도로 숨기면 플레이어 입장에선 "봤는데 왜 또 가려져?"가 된다. 그래서 공개는 단조(monotonic) — 한 방향으로만 간다. `revealed`가 true가 되면 이후 어떤 상황에서도 유지되고, 보드를 떠나는 순간에도 확실히 공개 처리한다(해방된 물음표 짝까지).

```dart
for (final t in taken) {
  t.revealed = true; // 보드를 떠나는 순간 공개 (풀려난 물음표 짝도 포함)
}
```

---

### 봇은 안 보는 정보는 추적하지 않는다 — Python 엔진은 물음표를 안 든다

같은 규칙을 Dart(게임)와 Python(레벨 검증 봇) 양쪽에 구현하지만, 물음표는 Python에서 아예 추적하지 않는다. 이유는 봇의 행동이 색 공개 여부와 무관해서다. 봇은 "지금 선택 가능한 것"만 살피는데, 선택 가능해지는 순간이 곧 공개 순간이라 봇이 그 색을 볼 땐 이미 공개돼 있다. 즉 물음표는 사람에겐 정보 은닉이지만 봇 판정엔 아무 영향이 없다. 그래서 Python `Basket`은 로프 짝만 들고 물음표 필드는 뺐다.

```python
class Basket:
    __slots__ = ("color", "remaining", "rope_partner")  # 물음표는 봇 무영향이라 미추적
```

"양쪽을 똑같이 구현"이 원칙이지만, 판정 결과에 영향이 없다고 증명되면 한쪽은 생략해도 파리티가 깨지지 않는다. 파리티는 같은 규칙을 두 언어(Dart·Python)로 짜서 두 결과가 서로 같은지 맞춰두는 것이다.

---

### 로프 올리기는 1수 — undo가 되돌릴 대상이 복수가 된다

되돌리기는 "마지막 올리기 1수"를 무른다. 그런데 로프를 둘 다 올리면 바스켓 두 개가 한 수로 나간 것. 그래서 스냅샷이 기억하는 "그때 올린 id"를 단수에서 복수(liftedIds)로 바꿨다. 되돌리려면 그 수로 나간 전원이 아직 살아 있어야 한다(하나라도 다 부어 사라졌으면 복원 불가 — 모래 총량이 안 맞게 되니까).

```dart
List<int> get undoTargetIds => _history.isEmpty ? const [] : _history.last.liftedIds;

bool get canUndo {
  final s = _history.last;
  for (final id in s.liftedIds) {                // 전원 생존 확인
    final alive = rail.any((b) => b?.id == id) ||
        buffer.any((b) => b.id == id) || inTransit.contains(id);
    if (!alive) return false;
  }
  final nowTransit = Set<int>.of(inTransit)..removeAll(s.liftedIds);
  return nowTransit.length == s.transitIds.length &&
      nowTransit.containsAll(s.transitIds);       // (스냅샷 정합성은 TIL 1 참고)
}
```

---

### 매그넷은 로프·미공개 물음표에 못 쓴다 — 결제 전에 막는다

매그넷은 "막힌 바스켓을 강제로 뽑는" 유료 아이템이다. 로프로 묶였거나 아직 색이 안 보이는 물음표에 쓰면 규칙이 꼬인다(묶인 짝은? 안 보이는 색을 왜 뽑아?). 그래서 효과를 적용하기 전에 대상이 부적격이면 막는다. 코인·광고를 소모한 뒤 실패하면 최악이므로, 검사는 항상 결제/소모보다 앞에 둔다.

```dart
bool magnet(int boardIndex) {
  final b = board[boardIndex];
  if (b == null) return false;
  if (b.ropePartnerId != null || (b.isQuestion && !b.revealed)) return false; // 결제 전 배제
  // ...적용...
}
```

---

### 봇은 합법 수만 고른다 — 헛수가 무한루프를 만든다

봇이 레벨을 자동으로 풀어 난이도를 재는데, 만약 봇이 "선택 가능"까지만 보고 로프 조건을 무시하면, 로프 때문에 못 두는 수를 계속 고르려다 진행이 멈춘다(같은 부적격 수를 무한히 시도). 그래서 봇의 후보를 `liftable_positions()`(합법 수)로 좁혔다. 사람과 봇이 같은 "둘 수 있는 수" 집합을 봐야 측정이 정확하다.

```python
options = state.liftable_positions()  # selectable이 아니라 — 로프 비적격은 헛수가 된다
```

---

### 두 언어 엔진이 조용히 어긋나 있었다 — 슬롯 채움 방향 파리티

가장 값진 버그. 빈 레일 슬롯을 채우는 방향이 Dart는 오른쪽부터, Python은 왼쪽부터였다. 각각만 보면 멀쩡한데, 붓기가 "왼쪽 슬롯부터 소진"되는 규칙과 겹치면 같은 색 통이 여러 개일 때 어느 통이 먼저 비는지가 두 엔진에서 갈린다. 예를 들어 같은 파란 통이 2개 실렸을 때, 왼쪽부터 채웠느냐 오른쪽부터 채웠느냐에 따라 먼저 비는 통이 달라진다. 결과가 대부분 우연히 같아서 안 드러나다, 레벨 99·200에서 봇 궤적이 어긋나며 표면화됐다.

```python
def _free_rail_slot(self):
    # Dart와 동일하게 오른쪽 슬롯부터 — §3.2 붓기가 "왼쪽부터 소진"이라
    # 채움 방향이 다르면 같은 색 여러 통의 소진 순서가 갈려 두 엔진이 어긋난다.
    for s in range(len(self.rail) - 1, -1, -1):
        if self.rail[s] is None:
            return s
    return None
```

교훈은, 두 구현이 "대체로 같은 결과"를 내면 다른 부분이 오래 숨는다는 것. 순서·방향처럼 눈에 안 띄는 규칙일수록 문서에 파리티 필수 항목으로 못 박고, 공통 fixtures가 그 차이를 관측할 수 있게 짜야 한다.

---

## 레벨 생성 (Python)

### 기믹은 데뷔 후 서서히 늘린다 — 밀도 램프 스케줄

새 기믹을 처음부터 잔뜩 뿌리면 낯설고 어렵다. 그래서 데뷔 레벨엔 딱 하나만 단독으로 내보내 개념을 가르치고(로프 51, 물음표 101), 이후 확률·티어에 따라 밀도를 올린다. "언제 몇 개 나올지"를 레벨 번호의 함수로 정의했다.

```python
ROPE_DEBUT = 51
QUESTION_DEBUT = 101

def gimmick_counts(level_id, tier, rng):
    if level_id == ROPE_DEBUT: return 1, 0      # 데뷔 — 로프 하나만
    if level_id == QUESTION_DEBUT: return 0, 1  # 데뷔 — 물음표 하나만
    ropes = questions = 0
    if level_id > ROPE_DEBUT:
        if tier in ("hard", "veryhard"): ropes = 2
        elif rng.random() < 0.40: ropes = 1     # 이후 밀도 램프
    # ...물음표도 유사...
    return ropes, questions
```

---

### 기믹 수는 레벨 시드로 고정한다 — 재시도해도 안 흔들리게

레벨 하나를 만들 때 생성기는 배치를 수십 번 재시도한다(난이도 밴드에 맞을 때까지). 이때 기믹 개수까지 매 시도 무작위면, 시도마다 "로프 1개 레벨"이 됐다 "2개 레벨"이 됐다 흔들린다. 그래서 기믹 수는 레벨 번호로 시드를 고정한 난수로 한 번만 뽑는다 — 같은 레벨은 항상 같은 기믹 수를 갖고(결정성), 배치 재시도와 독립적이다. 시드는 같은 번호를 넣으면 늘 같은 결과가 나오는 고정된 주사위라고 보면 된다.

```python
n_ropes, n_questions = gimmick_counts(
    level_id, plan.tier, random.Random(level_id * 31337))  # 레벨 고정 시드
```

---

### 로프는 인접 셀만, 물음표는 최상단 행 제외

기믹을 아무 데나 붙이면 안 된다. 로프는 밧줄로 묶인 시각이라 두 바스켓이 붙어 있어야 자연스러워서, 상하좌우 이웃인 쌍만 고른다. 물음표는 "숨긴 색을 나중에 공개"가 핵심인데, 최상단 행 바스켓은 처음부터 선택 가능(=시작하자마자 공개)이라 숨기는 의미가 없다. 그래서 최상단 행은 물음표 후보에서 뺀다.

```python
# 물음표 후보 — 최상단 행(r==0) 제외
candidates = [i for i, (c, r) in enumerate(cells) if r > 0 and i not in used]
```

---

### 도안이 반복되지 않게 — 수요 비례 버킷

도안(그림)은 내재 난이도가 제각각이라 티어별 칸(버킷)에 나눠 담는다. 처음엔 이 칸을 고정 비율로 잘랐는데, 50레벨에선 됐지만 200레벨에서 깨졌다. normal 난이도 레벨이 약 140개나 필요한데 고정 비율 칸엔 그만큼 도안이 안 들어가, 모자란 만큼 같은 그림이 반복됐다.

해결은 칸 경계를 실제 티어 수요에 비례해 잡는 것. "이 분량에서 각 티어가 몇 레벨 필요한가"를 먼저 세고, 그 누적 비율로 도안 풀을 나눈다.

```python
demand = {"tutorial": 0, "easy": 0, "normal": 0, "top": 0}
for lid in range(1, count + 1):
    t = tier_for(lid)
    demand["top" if t in ("hard", "veryhard") else t] += 1
edges, cum = [0], 0
for t in ("tutorial", "easy", "normal", "top"):
    cum += demand[t]
    edges.append(round(cum * n / count))  # 총수요=count → 마지막 경계=풀 크기 n
```

교훈은, 분배 비율을 상수로 박으면 규모가 커질 때 깨진다. 실제 수요로부터 비율을 도출하면 분량이 바뀌어도 저절로 맞는다.

---

### 연한 색이 배경에 묻히던 문제 — 전경-배경 대비 하한

도안 배경은 주조색(제일 많은 색)의 옅은 틴트로 깐다. 문제는 흰색에 가까운 전경색(사탕 포장재, 눈사람 몸통)이 이 옅은 틴트와 거의 같아 그림이 안 보이던 것. 그래서 전경색마다 배경과의 색 거리를 재고, 너무 가까우면 충분히 대비될 때까지 조금씩 어둡게 당긴다(0.88배씩 반복 감쇠, 안전상 12회 상한).

```python
MIN_FG_BG_DIST2 = 85 ** 2  # 전경↔배경 최소 대비(제곱거리)

def ensure_contrast(c):
    for _ in range(12):
        if _dist2(c, bg) >= MIN_FG_BG_DIST2:
            return c
        c = tuple(int(v * 0.88) for v in c)  # 아직 묻힌다 — 더 어둡게
    return c
```

---

## 연출 · UI (Flutter)

### 데드락은 슬로우모션으로 멈춘 뒤 알린다 — 게임 시계에 배율을 건다

막혀서 끝날 때 모달이 즉시 뜨면 "왜 막혔는지" 볼 틈이 없다. 그래서 게임 세계의 시간에 배율(timeScale)을 걸어 1.1초에 걸쳐 0까지 감는다. 벨트·모래가 다 같이 느려지다 멎고, 완전히 멈춘 뒤 정적 비트(300ms)를 두고 모달을 띄운다.

포인트는 실제 프레임 간격(rawDt)과 게임 시계(dt)를 분리한 것. 슬로우모션 감속 자체는 rawDt로 계산하고(안 그러면 자기가 자기를 멈춰 영영 안 끝남), 게임 내 모든 움직임은 `dt = rawDt × timeScale`을 쓴다.

```dart
if (!_showDeadlockOverlay && _timeScale > 0 && _runtimeStatus == GameStatus.deadlock) {
  _timeScale = math.max(0, _timeScale - rawDt / _slowdownSecs);  // 감속은 실시간으로
  if (_timeScale == 0) {
    Future.delayed(const Duration(milliseconds: _freezeBeatMs), () {
      if (mounted && _runtimeStatus == GameStatus.deadlock) {
        setState(() => _showDeadlockOverlay = true);            // 멈춘 뒤 모달
      }
    });
  }
}
final dt = rawDt * _timeScale;  // 게임 세계의 시계 — 슬로우모션에 함께 걸린다
```

---

### 벽을 벽처럼 — 아이콘·그라디언트를 걷어내고 바탕색 하나로

플레이 피드백에서 벽이 무슨 칸인지 안 읽힌다는 지적이 나왔다(산 아이콘 붙은 회색 그라디언트 블록). 오히려 장식을 덜어내는 게 답이었다 — 벽을 트레이(작업대) 바탕과 같은 밝은 갈색 단색으로. "아직 파지 않은 땅"처럼 보여서 못 지나가는 게 자연스러워졌다.

```dart
// 그라디언트·테두리·아이콘 전부 제거 → 트레이 바탕색 단색
return Container(
  width: size, height: size,
  decoration: BoxDecoration(
    color: AppColors.trayBg,
    borderRadius: BorderRadius.circular(size * 0.16),
  ),
);
```

시각을 더 그려서가 아니라 주변과 같은 재질로 뭉개서 의미를 전달한 경우. "칸이 아니라 배경"이라는 메시지엔 장식이 오히려 방해였다.

---

### 강조 링을 한 종류로 일반화 — undo 복귀와 물음표 공개가 같이 씀

되돌리기로 바스켓이 보드에 되돌아올 때, 그리고 물음표 색이 공개될 때 — 둘 다 "이 칸 봐" 하는 강조 링 연출이 필요했다. 원래 undo용으로 단일 셀만 강조하던 걸, 여러 셀을 받는 공용 강조 링으로 일반화해 물음표 공개도 같은 연출을 재사용하게 했다. 로프 연결선(밧줄 곡선 + 매듭)과 미공개 물음표 타일(색·잔량을 가린 중립 `?` 칸)도 이때 함께 그렸다.

두 기능이 "화면의 한 칸을 잠깐 강조"라는 같은 니즈면, 연출을 하나로 모으고 대상만 리스트로 넘기는 게 코드도 톤도 일관된다. 기믹 도입 레벨 상수(로프 51·물음표 101)는 UI(`GameConfig`)와 생성기가 각자 들고 있어, 한쪽만 바꾸면 어긋나므로 "일치 유지" 주석으로 묶어 뒀다.
