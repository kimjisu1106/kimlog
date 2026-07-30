---
layout: post
title: 습관만들기 Pawbit TIL 14
date: 2026-07-25
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 색을 섞어 명도 대비를 만드는 Color.lerp, 배경·테두리 역할을 뒤집어 흰색까지 수용하는 법, 구제용 rewarded 광고, 그리고 debug APK를 단독 설치하면 코드가 반영 안 되는 함정을 정리.
tags:
  - Flutter
  - Dart
---
## 색

### Color.lerp로 "더 진한 색" 만들기

완료 발바닥을 습관 색으로 칠했더니, 습관 색이 흰색이면 흰 배경에 묻혀 안 보였다. 처음엔 발바닥 뒤에 큰 검정 발바닥을 깔아 외곽선처럼 만들었는데 투박했다. 결국 선택 색보다 진한 원 위에 선택 색 발바닥을 올리는 방식으로 바꿨다.

핵심은 "임의의 색을 조금 더 진하게" 만드는 것. `Color.lerp(a, b, t)`는 두 색을 `t`(0~1)만큼 섞어준다. 검정과 섞으면 어두워진다.

```dart
// color를 검정 쪽으로 35% 섞음 → 같은 계열의 더 진한 색
final darker = Color.lerp(color, Colors.black, 0.35)!;

Container(
  decoration: BoxDecoration(color: darker, shape: BoxShape.circle), // 진한 원
  child: Center(
    child: Image.asset('assets/paw.png', color: color), // 위에 원래 색 발바닥
  ),
)
```

- 흰색이면 → 회색 원 + 흰 발바닥 → 명도 차로 보인다
- 파스텔이면 → 진한 같은 계열 원 + 밝은 발바닥

`Color.lerp`는 nullable(`Color?`)을 반환해서 끝에 `!`가 필요하다(두 색이 non-null이면 항상 값이 나옴).

---

## 레이아웃

### 배경·테두리 역할을 뒤집어 흰색까지 수용

원래 타일 배경을 습관 색으로 칠했는데, 흰색을 고르면 배경이 흰색이라 그 위에 얹는 것들(흰 발바닥 등)이 다 묻혔다. 그래서 아예 배경은 항상 흰색, 지정 색은 테두리로 뒤집었다.

```dart
// before: 배경이 색 → 흰색이면 위에 얹는 게 안 보임
BoxDecoration(color: habitColor, border: Border.all(color: t.border))

// after: 배경 고정 흰색, 색은 테두리로
BoxDecoration(color: Colors.white, border: Border.all(color: habitColor, width: 2.5))
```

부수 효과로 분기 하나가 사라졌다. 전엔 "밝은 배경에선 도장을 더 진하게"라며 `color.computeLuminance()`로 도장 색을 나눴는데, 배경이 항상 흰색이 되니 그 분기가 통째로 필요 없어졌다. 조건을 없앨 수 있으면 없애는 게 낫다.

---

## 광고

### 구제용 rewarded 광고 — 캡 없이

강아지가 아픈데 꿈 조각이 부족하면(치료비 5개 미만) 치료 버튼을 "광고 보고 치료"로 바꿔 광고 1회로 무료 완치하게 했다. 상점의 rewarded 광고 패턴을 그대로 가져왔지만, 두 가지가 달랐다.

- 일일 광고 캡 미적용 — 상점 광고(슬롯·포인트·수정권)는 하루 3회 제한이 있는데, 치료는 *보상이 없는 구제*라 farming 유인이 없어 캡을 안 걸었다.
- 조기 종료 복구 — 광고를 중간에 닫으면 `onUserEarnedReward`가 안 불린다. 이때 처리를 안 하면 "치료 중" 오버레이가 남는다. 그래서 닫힘 콜백에서 상태를 되돌린다.

```dart
onAdDismissedFullScreenContent: (ad) {
  ad.dispose();
  if (mounted) setState(() => _isTreating = false); // 리워드 못 받고 닫아도 복구
},
// 리워드는 별도로:
ad.show(onUserEarnedReward: (_, _) async {
  await db.habitDao.fairyHeal(pieceCost: 0); // 무료
});
```

리워드 획득(`onUserEarnedReward`)과 광고 닫힘(`onAdDismissed`)은 별개 콜백이다. 보상은 획득 콜백에서, UI 상태 복구는 닫힘 콜백에서 — 이렇게 나눠야 어떤 순서로 끝나도 안전하다.

---

## 배포

### debug APK를 adb로 단독 설치하면 코드가 안 실린다

실기기에 최신 빌드를 넣으려고 `flutter build apk --debug` → `adb install -r`을 했는데, 코드 변경이 반영되지 않았다.

원인 — debug 빌드는 `flutter run`으로 붙여 실행하는 걸 전제로 한다. debug APK를 단독으로 `adb install`하면 최신 Dart 코드가 제대로 안 실린다.

- 단독으로 설치해 돌릴 거면 `--profile` 또는 `--release`로 빌드해야 한다.
- 개발 중 확인은 그냥 `flutter run`이 정답. (profile/debug는 `kReleaseMode == false`라 광고도 테스트 광고가 뜬다)

덤으로, `flutter install`은 빌드를 안 하고 완성된 release APK를 찾는데, 없으면 기존 앱을 먼저 삭제하고 실패한다. 그 바람에 기기의 테스트 데이터가 날아갔다. 편의 명령이라고 무심코 쓰면 안 된다.

---

## 요약

- 임의의 색을 진하게: `Color.lerp(color, Colors.black, t)`.
- 어떤 색(흰색 포함)이든 얹으려면, 배경을 고정하고 색은 테두리/원으로 빼는 게 안전하다.
- rewarded 광고는 리워드 획득과 닫힘이 별개 콜백 — 상태 복구는 닫힘에서.
- 개발 중 실기기 확인은 `flutter run`. 단독 설치는 `--profile`/`--release`(debug 아님).
