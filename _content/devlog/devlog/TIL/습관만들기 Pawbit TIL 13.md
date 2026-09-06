---
layout: post
title: 습관만들기 Pawbit TIL 13
date: 2026-07-21
permalink: "nqmb1pqn"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 없는 에셋을 errorBuilder가 조용히 삼켜 버그가 숨는 함정과, 미완성 화면을 삭제 대신 보관하는 법, 위젯 하나를 숨길 때 미사용 경고가 연쇄되는 이유를 정리.
tags:
  - Flutter
  - Dart
---
## 에셋

### 없는 에셋을 errorBuilder가 조용히 삼킨다

강아지가 "아파요"라고 하는데 그림은 멀쩡했다. 원인은 단순했다 — 코드는 아플 때 `state_Sick.png`를 쓰는데 그 파일이 처음부터 없었다.

```dart
if (s.isSick) return 'assets/dog/state_Sick.png'; // 이 파일이 없음
```

`Image.asset`은 파일이 없으면 예외를 던지지만, `errorBuilder`가 있으면 대신 그걸 그리고 조용히 넘어간다. 문제는 그 폴백이 하필 "건강한 그림"이었다는 것.

```dart
// ❌ 실패하면 '정상' 그림 → 아픈데 멀쩡해 보임 = 버그가 안 보임
errorBuilder: (_, _, _) => Image.asset('assets/dog/state_Normal.png', ...),
```

크래시도 안 나고 로그도 안 남으니 몇 달을 모르고 지나갔다. 실제로 저장소 전체와 모든 git 히스토리를 뒤져도 그 파일은 존재한 적이 없었다 — 기능을 넣은 커밋이 이미지 6종만 추가하고 Sick을 빠뜨린 거였다.

고친 방향은 "폴백 대상을 상황에 맞게" 고르는 것.

```dart
// ✅ 아플 땐 원인이 된 케어의 '심각' 그림으로 → 최소한 아파 보인다
String _dogFallbackPath(DogCareStatus s) {
  if (s.isSick) {
    if (s.foodLevel == 3) return 'assets/dog/state_HeavilyHungry.png';
    if (s.walkLevel == 3) return 'assets/dog/state_HeavilyRestless.png';
    return 'assets/dog/state_HeavilyDirty.png';
  }
  return 'assets/dog/state_Normal.png';
}
```

교훈 — 폴백은 "실패를 감추는 값"이 아니라 "실패해도 의미가 유지되는 값"이어야 한다. 원래 경로(`state_Sick.png`)는 그대로 둬서, 나중에 파일만 넣으면 코드 수정 없이 적용되게 했다.

---

## 미완성 기능 다루기

### 삭제 말고 "보관" — 라우팅만 빼고 파일은 남긴다

디자이너 맵이 아직이라 마을 화면을 단순한 카드 목록으로 바꿔야 했다. 그런데 이미 만들어 둔 지도 좌표계 + 점선 트랙 + 강아지 산책 애니메이션을 지우기는 아까웠다.

- git 히스토리에만 두기 — 지우면 나중에 "몇 번 커밋이었지"부터 찾아야 한다
- 주석 처리 — 수백 줄이면 파일이 지저분해진다
- ✅ 별도 파일로 보관 — 화면 파일을 `village_map_screen.dart`로 옮기고 클래스명을 `VillageMapScreen`으로 바꾼 뒤, 라우팅에서만 뺐다

라우팅에서 빠지면 화면엔 안 나오지만 여전히 컴파일 대상이라, 나중에 다른 코드가 바뀌어도 같이 검사돼서 썩지 않는다(`flutter analyze` 통과 확인). 복원은 탭 목록에서 클래스 하나만 바꾸면 끝이다.

파일 맨 위에 "왜 여기 있는지 + 어떻게 되살리는지"를 적어 두는 게 핵심이다.

```dart
// ⚠️ 보관용 — 현재 라우팅되지 않음.
// 디자이너 마을 맵이 확정되면 이 화면으로 되돌린다.
// 되살리는 법: main_screen.dart의 VillageScreen() → VillageMapScreen()
```

---

## 숨기기

### 위젯 하나를 숨기면 경고가 연쇄된다

숲속 화면에서 요정 멘트(말풍선) 하나만 빼려 했는데, 빼는 순간 경고가 줄줄이 떴다.

```text
warning - The declaration '_SpeechBubble' isn't referenced   (unused_element)
warning - The value of the field '_message' isn't used        (unused_field)
warning - Unused import: 'dart:math'                          (unused_import)
```

말풍선 하나에 딸려 있던 것들이다.

| 딸린 것 | 왜 미사용이 됐나 |
|---|---|
| `_SpeechBubble` 클래스 | 유일한 사용처가 사라짐 |
| `_message` 필드 | 쓰기만 하고 읽는 곳이 없어짐 |
| `_messages` 멘트 풀 | `_message`에만 쓰였음 |
| `dart:math` import | 멘트 랜덤 선택(`Random()`)에만 쓰였음 |

특히 `_message`가 헷갈렸는데, 대입은 "사용"으로 안 쳐준다. Dart 분석기는 private 선언이 읽히지 않으면 미사용으로 본다. 그래서 여기저기서 값을 넣고 있어도 경고가 뜬다.

결국 위젯 하나를 숨기려면 딸린 것까지 한 세트로 처리해야 한다.

---

### 마커 주석으로 일괄 숨김·복원

숨길 게 여러 파일·여러 지점에 흩어지니, 나중에 되살릴 때 빠뜨릴 게 뻔했다. 그래서 숨긴 자리마다 같은 마커 문자열을 달았다.

```dart
// [리뮤 숨김] 요정 멘트 — 아트 확정 전까지 숨김. 복원 시 주석 해제.
// _SpeechBubble(message: _message),
```

이렇게 해두면 나중에 `[리뮤 숨김]`만 검색해서 숲속·온보딩에 흩어진 지점(배경 이미지, 캐릭터 이미지, 멘트, 멘트 풀, 상태 필드, import)을 한 번에 되살릴 수 있다. CLAUDE.md에도 "이 마커로 검색하면 된다"고 적어 뒀다.

주석 처리한 코드는 보통 안 좋지만, "기능이 완성됐는데 에셋만 기다리는" 상태에선 지우는 것보다 낫다고 판단했다.

---

## 요약

- `errorBuilder`는 실패를 조용히 삼킨다. 폴백은 실패해도 의미가 유지되는 값으로 골라야 버그가 드러난다.
- 미완성 화면은 지우지 말고 라우팅만 빼서 보관 — 컴파일 대상으로 남아 썩지 않는다.
- 위젯 하나를 빼면 딸린 private 선언·import가 줄줄이 미사용이 된다. 대입만으론 "사용"이 아니다.
- 여러 곳에 흩어진 임시 숨김은 마커 주석을 달아 검색 한 번으로 복원되게 한다.
