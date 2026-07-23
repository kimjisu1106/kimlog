---
layout: post
title: 모래게임 Sandrop TIL 8
date: 2026-07-16
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 밝은 색에서 부풀려지는 HLS 채도 대신 chroma로 흰색을 판정하고, 색을 움직이는 보정 뒤에 병합을 수렴시키고, 실패한 명도 벌리기를 전수 검사로 잡아내고, 비활성 상태를 색이 아니라 X축 카드 뒤집기로 옮긴 기록.
tags:
  - Dart
  - Flutter
  - Python
---
## 색 판정 — "이게 흰색인가"를 어떻게 재는가

### 밝은 색의 선명함을 재는 흔한 공식은 값이 부풀려진다

백조 도안의 몸통이 회색으로 나왔다. 코드를 보니 흰색 판정을 HLS의 saturation으로 하고 있었다.

```python
# ❌ 밝은 색에서 무너지는 판정
def _is_near_white(c):
    _, lum, sat = colorsys.rgb_to_hls(*(v / 255 for v in c))
    return lum > 0.70 and sat < 0.35
```

문제는 이 "선명함(saturation)" 공식이 밝은 색에서 이상하게 커진다는 점이다. 색이 밝을수록, 아주 조금만 색기가 돌아도 이 공식은 그 작은 색차를 "엄청 선명한 색"으로 뻥튀기한다. 그래서 눈으로 보면 그냥 흰색인 백조 몸통이 "선명한 색"으로 잘못 분류된다. 계산으로 뜯어보면, 이 공식의 분모(`2 - (max + min)`)가 색이 밝을수록 0에 가까워져 작은 차이를 큰 값으로 부풀리기 때문이다.

백조 몸통 `(214, 236, 243)`을 넣어 보면 이렇다.

```
max=243, min=214 → 차이는 겨우 29 (거의 무채색)
l = (243+214)/2/255 = 0.90
sat = (243-214) / (2*255 - 243 - 214) = 29 / 53 = 0.55   ← 0.35를 훌쩍 넘음
```

RGB 차이가 29밖에 안 나는, 눈으로 보면 그냥 흰색인 색이 "채도 55%인 선명한 색"으로 분류된다. 그래서 백조 몸통은 흰색 분기를 못 타고, 배경과 대비를 확보하는 과정에서 회색으로 눌렸다.

---

### 밝기에 흔들리지 않는 척도로 바꾼다 (chroma)

해법은 분모로 나누지 않는 척도를 쓰는 것이다. chroma는 가장 밝은 채널과 가장 어두운 채널의 차이(`max - min`)일 뿐이라 밝기에 영향을 안 받는다.

```python
def _chroma(c):
    """색의 순수 채도 = (max-min)/255.

    HLS의 saturation은 쓰지 않는다 — 밝은 색일수록 분모(2-max-min)가 0에 가까워져
    거의 흰색인 색(백조 몸통 214,236,243)이 sat 0.55로 잡힌다. chroma는 밝기와
    무관해 "이게 흰색/회색인가"를 안정적으로 가른다.
    """
    return (max(c) - min(c)) / 255


def _value(c):
    return max(c) / 255
```

같은 색들을 두 방식으로 재 본 결과다.

| 색 | HLS sat | chroma | 구 판정 | 신 판정 |
| --- | --- | --- | --- | --- |
| 백조 몸통 (214,236,243) | 0.55 | 0.114 | ❌ 아님 | ✅ 흰색 |
| 연한 하늘 (219,237,241) | 0.44 | 0.086 | ❌ 아님 | ✅ 흰색 |
| 늑대 회색 #B1B1B1 | 0.00 | 0.000 | ❌ 아님 | ❌ 아님 |
| 초밥 밥 #FAFAFA | 0.00 | 0.000 | ✅ 흰색 | ✅ 흰색 |

---

### 흰색 판정 = 밝고(value) + 무채색에 가깝고(chroma)

chroma만으로는 부족하다. 검정도 chroma가 0이다. 밝기 조건을 같이 건다.

```python
VALUE_WHITE = 0.80
CHROMA_WHITE = 0.12

def _is_white(c):
    """밝고 무채색에 가까우면 흰색 계열 — 흰색으로 살릴 대상."""
    return _value(c) >= VALUE_WHITE and _chroma(c) <= CHROMA_WHITE
```

`value >= 0.80` 이라는 하한이 중요하다. 늑대의 회색 `#B1B1B1`은 chroma가 0이지만 value가 0.69라 흰색이 아니다. 이 하한이 없으면 늑대가 통째로 흰 덩어리가 된다.

---

## 색 줄이기 순서 — 보정이 색을 움직이면, 합치기는 그 뒤에

도안 한 장의 원본 사진에는 색이 수백 가지다. 이걸 게임에 쓰려면 몇 개의 대표색으로 줄여야 하는데, 이 "색 줄이기" 작업이 양자화다. 이때 비슷한 색을 합치는 일과 색을 보정하는 일의 순서가 결과를 가른다.

### 색 합치기를 먼저 하면 소용이 없다

기존 파이프라인의 순서는 이랬다.

```
1. 비슷한 색 병합 (dist < 48)
2. 흰색 계열 전경을 250 쪽으로 끌어올림   ← 색이 움직인다
3. 배경과 가까운 전경을 어둡게 감쇠        ← 색이 움직인다
```

1번에서 아무리 잘 합쳐 놔도, 2·3번이 색을 다시 움직여 새로운 쌍둥이 색을 만들어 낸다. 실제로 이런 것들이 나왔다.

```
120 alarmclock: #FAFAFA vs #F6F3F2  → 거리 11   (흰색 살리기가 각각 250 쪽으로 당김)
135 unicorn:    #F5F5F5 / #EFF0F1 / #F1ECE9 → 3형제
136 wolf:       #B1B1B1 vs #A8A8A8  → 거리 16   (감쇠가 회색끼리 수렴시킴)
```

거리 11이면 사람 눈엔 완전히 같은 색이다. 그런데 게임은 이걸 서로 다른 바스켓으로 준다. 플레이어는 "흰색이래서 눌렀는데 그 흰색이 아니네"를 겪는다.

---

### 합치기와 대비 벌리기는 서로를 망친다 — 더 안 겹칠 때까지 번갈아

보정 뒤에 합치기를 한 번 더 넣는 것으로는 부족했다. 두 작업이 서로를 망치기 때문이다.

- 두 색을 합쳐 평균을 내면 → 그 평균색이 배경 색과 가까워질 수 있다
- 배경과 대비를 주려고 색을 어둡게 밀면 → 이번엔 다른 전경색과 붙어버릴 수 있다

한쪽을 고치면 다른 쪽이 어긋나니, 더 이상 겹치는 색이 없을 때까지 두 작업을 번갈아 반복했다.

```python
# 최종 가독성 패스 — 병합과 대비 확보가 서로를 깨므로 수렴할 때까지 번갈아 돈다.
for _ in range(6):
    _merge_pass(keep, reps, sizes, FINAL_MERGE_DIST2, alias)
    fix_bg_for_white()
    for ci in keep:
        if ci in forced_white:
            continue  # 흰색으로 살린 전경은 어둡게 누르지 않는다
        reps[ci] = ensure_contrast(reps[ci])
    if not any(_dist2(reps[keep[i]], reps[keep[j]]) < FINAL_MERGE_DIST2
               for i in range(len(keep)) for j in range(i + 1, len(keep))):
        break
```

병합 루프 자체는 초반·최종 두 번 쓰이므로 함수로 뽑았다.

```python
def _merge_pass(keep, reps, sizes, thresh2, alias):
    """대표색이 thresh2보다 가까운 클러스터를 크기 가중 평균으로 합친다."""
    merged = True
    while merged and len(keep) > 1:
        merged = False
        for i in range(len(keep)):
            for j in range(len(keep) - 1, i, -1):
                a, b = keep[i], keep[j]
                if _dist2(reps[a], reps[b]) < thresh2:
                    wa, wb = sizes[a], sizes[b]
                    reps[a] = tuple(
                        (reps[a][k] * wa + reps[b][k] * wb) // (wa + wb)
                        for k in range(3))
                    sizes[a] = wa + wb
                    reps[b] = reps[a]
                    alias[b] = a
                    keep.pop(j)
                    merged = True
            if merged:
                break
```

---

### 실패한 시도 — 명도 벌리기가 51개 레벨을 깨뜨렸다

처음엔 "합치기엔 멀지만 헷갈리는 쌍(거리 60~90)은 명도를 벌리자"는 단계를 넣었다.

```python
# ❌ 폐기한 코드 — 밝은 쪽을 더 밝게, 어두운 쪽을 더 어둡게
hi, lo = (a, b) if sum(reps[a]) >= sum(reps[b]) else (b, a)
reps[hi] = _tint(reps[hi], 0.16)
reps[lo] = tuple(int(v * 0.84) for v in reps[lo])
```

그럴듯해 보였는데 두 가지가 터졌다.

- 이 게임의 배경은 항상 밝은 파스텔이다. 밝은 쪽을 더 밝게 미는 건 곧 배경 쪽으로 미는 것이라, 이미 확보해 둔 배경 대비가 200레벨 중 51개에서 깨졌다
- A(밝음)·B·C가 있을 때 B와 C를 벌리려고 B를 밝게 밀면, B가 A와 새로 부딪힌다

결국 이 단계를 통째로 버렸다. 사용자가 지적한 사례가 전부 거리 9~33이라 합치기(기준 60)만으로 다 잡히기 때문이다. 없어도 되는 걸 넣었다가 51개를 깬 셈이다.

---

### 흰 전경은 누르지 않는다 — 대신 배경을 내린다

흰색을 살려 놓고 대비가 부족하다고 다시 어둡게 누르면 원점이다. 반대로 배경을 진하게 내린다.

```python
def fix_bg_for_white():
    """흰 전경은 절대 누르지 않는다 — 대신 배경을 진하게 내려 대비를 확보한다.
    f를 끝까지 내리면 배경이 base(=전경색)와 같아지므로 바닥을 둔다."""
    nonlocal f, bg
    while f > BG_TINT_FLOOR and any(
            _dist2(reps[ci], bg) < MIN_FG_BG_DIST2
            for ci in forced_white if ci in keep):
        f = max(BG_TINT_FLOOR, f - 0.08)
        bg = _tint(base, f)
```

`BG_TINT_FLOOR = 0.22` 라는 바닥이 필요하다. 배경은 `base + (250-base)*f` 로 만드는데 `f`가 0이 되면 배경이 base와 완전히 같아진다. base는 전경색이므로, 배경과 전경이 같은 색이 되는 최악이 된다.

---

### 배경 base는 진짜 유채색에서 고른다

139 레벨이 "배경도 흰색, 메인도 흰색"이던 원인이 여기 있었다. 배경 base로 "가장 채도 높은 색"을 뽑는데, 구 판정에선 연한 하늘색이 sat 0.44로 가장 선명한 색으로 잡혔다. 그걸 틴트하니 배경까지 흰색이 됐다.

```python
# 배경 base는 진짜 유채색에서 고른다. 연한 하늘색(chroma 0.09)을 골라
# 틴트하면 배경까지 흰색이 되어 흰 전경과 겹친다(레벨 139 tea).
colored = [ci for ci in keep if ci not in forced_white]
best = max(colored, key=lambda ci: _chroma(reps[ci])) if colored else None
if best is not None and _chroma(reps[best]) >= 0.10:
    base, f = reps[best], 0.55
else:
    base, f = BG_ACHROMATIC, 0.30  # 무채색 도안(늑대) — 모래톤 배경
```

chroma로 바꾸니 연한 하늘색은 흰색으로 분류돼 base 후보에서 빠지고, 진짜 초록이 base가 되어 배경이 연둣빛이 됐다. 흰 찻잔이 그 위에 또렷하게 올라온다.

---

### 무채색 도안엔 고를 base가 없다

늑대처럼 흰색·회색·검정뿐인 도안은 chroma가 전부 0이라 base로 쓸 유채색이 없다. 이럴 땐 따뜻한 모래톤을 고정 배경으로 준다.

```python
BG_ACHROMATIC = (196, 176, 146)  # 무채색 도안(늑대 등)의 배경 — 따뜻한 모래톤
```

`chroma >= 0.10` 이라는 문턱이 "이건 진짜 색이 있는가"를 가른다.

---

### 색을 합치면 길 잃는 그림 조각에 이정표를 남긴다 (alias 체인)

색 합치기를 두 번 하면 문제가 생긴다. 도안의 각 그림 조각(픽셀)은 "몇 번 색을 쓰라"고 팔레트 번호를 가리키는데, 이 대응표는 초반에 한 번 만들어진다. 그런데 나중에 색 A와 B를 합치면 B는 사라진다. B를 가리키고 있던 그림 조각은 이제 없는 색을 가리켜 길을 잃는다.

그래서 색을 합쳐 없앨 때마다 "B는 이제 A를 봐라"라는 이정표(`alias[b] = a`)를 남겨 두고, 최종 번호를 매길 때 이 이정표를 따라간다. B가 다시 C로 합쳐졌다면 이정표가 B→A, A→C로 이어지므로 끝까지 따라가면 살아남은 색에 닿는다.

```python
def _resolve(ci, keep_set, alias):
    seen = set()
    while ci not in keep_set and ci in alias and ci not in seen:
        seen.add(ci)
        ci = alias[ci]
    return ci

# 최종 인덱스 — 초반 remap을 거쳐 최종 병합 alias까지 따라간다
index_of = {
    ci: keep.index(_resolve(remap[ci], keep_set, alias)) + 1 for ci in order
}
```

`seen`으로 이미 지나온 색을 기억해 순환을 막는 게 중요하다. 이정표가 꼬여 A→B→A로 맴돌면 무한 루프에 빠진다.

---

### 단색으로 합쳐진 도형은 자동으로 탈락한다

병합을 강하게 걸었더니 도형 10종이 색 하나로 합쳐졌다. 달걀·눈송이·클로버 같은 것들이다. 기존 품질 게이트가 알아서 걸러냈다.

```python
if result is None or len(result["palette"]) < 3:  # 배경 + 전경 2색 미만
    skipped.append(name)
    continue
```

도안 풀이 226 → 216으로 줄었다. 아쉽지만 색 하나로 뭉개진 도형은 레벨로서도 의미가 없으니 타당한 탈락이다. 200레벨 무반복에는 (절차 도형 10종 포함) 226종이라 여유가 있다.

---

## 검증 — 전부 다시 재보지 않으면 망가진 걸 놓친다

### 200레벨을 전부 재는 스크립트

문제가 보고된 6개 레벨만 고치고 끝냈으면 51개가 깨진 걸 몰랐을 것이다. 기준을 숫자로 박고 전부 쟀다.

```python
for f in sorted(glob.glob('app/assets/levels/level_*.json')):
    d = json.load(open(f, encoding='utf-8'))
    cs = [rgb(p) for p in d['canvas']['palette']]
    bg, fg = cs[0], cs[1:]
    for i in range(len(fg)):
        for j in range(i + 1, len(fg)):
            if dist(fg[i], fg[j]) < 60:   # 전경끼리 헷갈림
                bad_fg.append((d['id'], d['name']))
    for c in fg:
        if dist(bg, c) < 85:              # 배경에 묻힘
            bad_bg.append((d['id'], d['name']))
```

이 검사가 명도 벌리기의 51개 회귀를 즉시 잡아냈다. "고쳤다"는 느낌과 실제로 고쳐졌는지는 다르다.

---

### 결정적 생성이라 팔레트만 비교할 수 있다

레벨 생성기는 레벨 id로 시드를 고정한다.

```python
rng = random.Random(level_id * 7919)
```

덕분에 재생성해도 배치·난이도가 그대로고, 팔레트만 바뀌었는지 확인할 수 있다. 실제로 어제 색 보정 때는 픽셀 데이터·보드·난이도가 완전히 동일하고 팔레트만 달랐다.

```python
print('pixels identical:', o['canvas']['pixels'] == n['canvas']['pixels'])  # True
```

주의할 게 하나 있다. 파이썬의 `hash()`는 실행할 때마다 내부 소금값이 달라져서, 두 번의 파이썬 실행 결과를 hash로 비교하면 늘 다르게 나온다. 처음에 이걸로 "그리드가 바뀌었다"고 잘못 판단했다. 문자열을 직접 비교해야 한다.

---

### 풀이 줄면 배정이 밀린다

도형 10종이 빠지자 레벨 번호와 도안의 짝이 통째로 밀렸다. 120번이 자명종에서 판다로, 124번이 백조에서 나무늘보로 바뀌었다.

그래서 "120번 고쳐줘" 식으로 레벨 번호로 특정 도안을 지목할 수 없다. 도안 이름으로 찾아야 하고, 검증도 특정 번호가 아니라 전수로 해야 한다.

---

### 손으로 쓴 데이터도 같은 기준으로 검사한다

자동 파이프라인을 다 고쳤는데도 레벨 11·18·36이 계속 걸렸다. 이유는 그것들이 이모지가 아니라 코드로 그린 도형(절차 도형)이고, 팔레트를 손으로 적어 둬서 색 줄이기(양자화)를 안 거치기 때문이었다.

```python
# ❌ 손으로 쓴 팔레트 — 자동 검사를 안 거쳐 그대로 통과
["#F7EBD5", "#F2C63D", "#E8A33D", "#FFF3C2"],  # 금색 두 개가 거리 36, 파스텔이 배경과 22
```

같은 잣대로 12종을 전부 재서 3종을 고쳤다. 자동화한 규칙이 있으면 손으로 쓴 데이터에도 같은 규칙을 적용해 봐야 한다.

---

## 양동이 엎기 — 상태를 색이 아니라 방향으로

### 색으로 상태를 표현하면 색 정보가 망가진다

팔레트를 다 정리했는데도 "비활성 모래가 어두워져서 색이 달라 보인다"는 피드백이 왔다. 범인은 한 줄이었다.

```dart
// ❌ 명도만 낮추는 게 아니라 색상 자체를 회색과 섞는다
final tint = dimmed ? Color.lerp(c, AppColors.textMuted, 0.45)! : c;
```

`Color.lerp`는 두 색을 비율대로 섞는다. 빨강을 회색과 45% 섞으면 채도가 뚝 떨어져 탁한 벽돌색이 된다. 플레이어 입장에선 다른 색이다. 팔레트에서 쌍둥이를 없앤 효과를 이 한 줄이 다시 뭉개고 있었다.

배운 것은 이거다. 색이 정보를 지고 있는 화면에서 상태를 색으로 표현하면, 상태를 얻는 대신 정보를 잃는다.

---

### X축 카드 뒤집기

상태를 방향으로 옮겼다. 못 꺼내는 양동이는 엎어두고, 꺼낼 수 있게 되면 뒤집히며 열린다.

```dart
Transform(
  alignment: Alignment.center,
  transform: Matrix4.identity()
    ..setEntry(3, 2, 0.0012)   // 원근 — 뒤집힐 때 두께감
    ..rotateX(math.pi * fl),
  child: Transform.rotate(
    angle: math.pi * t,
    child: fl > 0.5
        // 후반부는 스프라이트를 되돌려야 엎은 통이 거꾸로 서지 않는다.
        ? Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()..rotateX(math.pi),
            child: _bucketSprite('assets/images/bucket-upside-down.png', tint),
          )
        : Stack(
            fit: StackFit.expand,
            children: [
              _bucketSprite('assets/images/bucket-topdown.png', tint),
              sand,
            ],
          ),
  ),
)
```

`setEntry(3, 2, 0.0012)`가 원근 성분이다. 이게 없으면 그냥 세로로 납작해졌다 펴지는 느낌이고, 넣으면 카드가 실제로 넘어가는 두께감이 생긴다.

`fl > 0.5`에서 스프라이트를 갈아 끼우는데, 그때 부모가 이미 π 가까이 돌아 있으므로 자식을 π만큼 되돌려야 엎은 통이 똑바로 선다. 이걸 빼먹으면 엎은 양동이가 거꾸로 매달린다.

---

### 축을 나눠 의미 충돌을 피한다

이미 벨트에선 "부을 수 있으면 뒤집혀 쏟는" 연출이 있었다.

```dart
Transform.rotate(angle: math.pi * t)   // Z축 — 벨트에서 쏟기
```

여기에 "뒤집힘 = 비활성"을 더하면 같은 그림이 정반대 두 뜻을 갖는다(벨트에선 활성, 보드에선 비활성). 그래서 엎기는 X축으로 잡았다. 축이 다르니 실루엣이 달라 헷갈리지 않는다. 보드 양동이는 쏟지 않고 벨트 양동이는 엎어지지 않으므로 둘이 동시에 걸릴 일도 없다.

---

### 스프라이트 하나로 모든 색을 낸다

레벨마다 팔레트가 달라 양동이 색은 사실상 무한하다. 색마다 이미지를 만들 순 없다. 밝은 크림톤 원본에 색을 곱한다.

```dart
/// 밝은 크림톤 원본에 모래색을 곱해(modulate) 착색 — 색마다 스프라이트를 따로
/// 그리지 않아도 되고, 원본의 명암이 곱셈으로 보존된다.
static Widget _bucketSprite(String asset, Color tint) => Image.asset(
  asset,
  color: Color.lerp(tint, Colors.white, 0.22),
  colorBlendMode: BlendMode.modulate,
  fit: BoxFit.contain,
  filterQuality: FilterQuality.medium,
);
```

두 스프라이트(정면·엎음)가 같은 착색 규칙을 쓰므로 헬퍼로 묶었다. 엎어둔 통도 이렇게 착색되니 모래가 안 보여도 무슨 색인지는 읽힌다 — 플레이어가 묻힌 색으로 계획을 세우기 때문에 이 정보는 지켜야 한다.

---

### 보간은 이미 있는 패턴을 재사용한다

쏟기 기울임을 위한 `_tipFrac`(id → 0..1) 맵과 게임 루프 보간이 이미 있었다. 엎기도 성질이 같아서 그대로 따라 했다.

```dart
final selectable = _state.selectablePositions().toSet();
final boardIds = <int>{};
for (var i = 0; i < _state.board.length; i++) {
  final b = _state.board[i];
  if (b == null) continue;
  boardIds.add(b.id);
  final unrevealed = b.isQuestion && !b.revealed;
  final active = _magnetMode ? !unrevealed : selectable.contains(i);
  final target = active ? 0.0 : 1.0;
  // 한꺼번에 여러 개가 뒤집히면 시끄럽다 — id로 속도를 흩어 물결처럼 도착시킨다.
  final speed = _flipSpeed * (0.75 + 0.5 * ((b.id * 2654435761) % 1000) / 1000);
  final cur = _flipFrac[b.id] ?? target;   // 첫 프레임은 연출 없이 제자리
  final next = target > cur
      ? math.min(target, cur + dt * speed)
      : math.max(target, cur - dt * speed);
  if (next != cur || !_flipFrac.containsKey(b.id)) {
    _flipFrac[b.id] = next;
    changed = true;
  }
}
_flipFrac.removeWhere((id, _) => !boardIds.contains(id));
```

`removeWhere`로 사라진 바스켓의 값을 지우는 것까지 같은 패턴이다. 안 지우면 맵이 계속 자란다.

---

### 동시 뒤집힘은 해시로 흩는다

양동이 하나를 꺼내면 경로가 다시 계산돼 여러 개가 한꺼번에 선택 가능해진다. 5~10개가 동시에 똑같이 뒤집히면 정신없다.

지연 시작을 주려면 바스켓마다 "남은 지연" 상태를 또 들고 있어야 한다. 대신 속도를 제각각으로 흩었다.

```dart
final speed = _flipSpeed * (0.75 + 0.5 * ((b.id * 2654435761) % 1000) / 1000);
```

id에 큰 소수를 곱해 하위 비트를 섞으면 0.75~1.25배로 고르게 퍼진다. 동시에 출발하지만 도착이 갈려서 물결처럼 보인다. 추가 상태 없이 해시만으로 된다.

---

### 첫 프레임은 연출 없이 제자리에

`_flipFrac`이 비어 있는 첫 프레임에 0(열림)으로 시작하면, 레벨에 들어가자마자 못 꺼내는 양동이가 우르르 엎어지는 연출이 나온다. 시작 상태는 애니메이션 없이 정답이어야 한다.

```dart
// 상태 쪽 — 처음 보는 id는 목표값에서 시작(움직임 없음)
final cur = _flipFrac[b.id] ?? target;

// 렌더 쪽 — 아직 값이 없으면 목표값으로 그린다
flip: flipFrac[b.id] ?? (active ? 0.0 : 1.0),
```

렌더에도 같은 폴백을 둬야 첫 프레임(틱 이전)이 올바르게 그려진다.

---

### 두 곳이 같은 판정식을 공유해야 한다

받침 패드 글로우와 양동이 엎기는 같은 것을 표현한다. 판정식이 어긋나면 "바닥은 빛나는데 통은 엎어져 있는" 모순이 보인다.

```dart
// 매그넷 모드에서 미공개 물음표는 매그넷 불가(§3.4)라 강조하지 않는다.
// 이 식은 양동이 엎기(_tick의 flip 목표)와 반드시 같아야 한다.
final active = magnetMode ? !unrevealed : canPick;
children.add(at(center, tile, _BasketPad(size: tile, glow: active)));
```

한 판정을 두 곳에서 쓰면 언젠가 어긋난다. 지금은 주석으로 묶어 뒀지만, 늘어나면 계산을 한 곳으로 올려야 한다.

---

## 요약

- 밝은 색의 "선명함"을 HLS saturation으로 재면 분모가 0에 수렴해 값이 폭증한다. 밝기와 무관한 chroma(max−min)를 쓴다
- 색을 움직이는 보정이 있으면 합치기는 그 뒤에, 그리고 합치기와 대비 확보는 서로를 깨므로 더 안 겹칠 때까지 번갈아
- 없어도 되는 단계(명도 벌리기)를 넣었다가 51개 레벨을 깼다. 전수 검사가 없었으면 몰랐다
- 자동화한 규칙은 손으로 쓴 데이터에도 적용해 봐야 한다
- 색이 정보를 지고 있으면 상태를 색으로 표현하지 말고 방향으로 옮긴다
- 같은 것을 표현하는 두 곳은 같은 판정식을 써야 모순이 안 생긴다
