---
layout: post
title: 습관만들기 Pawbit TIL 8
date: 2026-07-09
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: Drift 마이그레이션으로 기존 값 정정, sortOrder 기본값 0의 함정, 한글 조사 받침 판별, kDebugMode로 DEV 위젯을 release에서 빼기, showDialog<bool> 확인 다이얼로그까지.
tags:
  - Flutter
  - Dart
  - Drift
---
## 데이터

### 스키마 변경 없는 Drift 마이그레이션 — 기존 값 정정에도 쓴다

Drift `onUpgrade`는 보통 `ALTER TABLE`(스키마 변경)에 쓰지만, 스키마는 그대로 두고 기존 행의 값만 바꾸는 데도 쓸 수 있다. 색 팔레트를 파스텔로 교체하면서 기존 습관의 `colorHex`에 구 진한 색이 남아 타일 배경으로 튀었는데, v7 마이그레이션에서 값만 변환했다.

```dart
if (from < 7) {
  const colorMap = {'4CAF50': 'CDE9C1', 'F44336': 'F7C9C9', /* ... */};
  for (final e in colorMap.entries) {
    await customStatement(
      "UPDATE habits SET color_hex = '${e.value}' WHERE color_hex = '${e.key}'",
    );
  }
}
```

컬럼 추가 없이 `schemaVersion`만 올리면 되고, 마이그레이션은 "이미 배포된 데이터 정정" 용도로도 유효하다.

---

### sortOrder 기본값 0의 함정 — 전부 0이면 건드리지 마라

새 습관에 항상 "맨 뒤(`max+1`)"를 주면, 아직 수동 재정렬을 한 번도 안 한 유저(모든 `sortOrder=0`)의 기본 정렬이 깨진다. 정렬이 `sortOrder → 시간순` 순인데, 새 습관만 1을 받으면 시간순 그룹에서 튕겨나간다.

```dart
Future<int> getNextSortOrder() async {
  final all = await select(habits).get();
  final max = all.fold<int>(0, (m, h) => h.sortOrder > m ? h.sortOrder : m);
  return max == 0 ? 0 : max + 1; // 전부 0이면 0 유지 → 기본 정렬 보존
}
```

`기본값 0`이 "미지정"의 의미까지 겸할 때는, 신규 추가 로직이 그 의미를 깨뜨리지 않는지 봐야 한다.

---

## 문자열

### 한글 조사(가/이)는 유니코드 받침으로 판별

"○○가 배고파요"는 받침 있는 이름("구름")에서 어색하다. 한글 음절은 유니코드에 규칙적으로 배열돼 있어서 받침 유무를 산술로 안다.

```dart
String _subjectParticle(String name) {
  if (name.isEmpty) return '가';
  final code = name.codeUnitAt(name.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return '가'; // 한글 아니면 '가'
  return (code - 0xAC00) % 28 == 0 ? '가' : '이가'; // 종성 인덱스 0 = 받침 없음
}
```

한글 음절 코드 = `(초성×21 + 중성)×28 + 종성`. 그래서 `(code - 0xAC00) % 28`이 종성 인덱스이고, 0이면 받침 없음 → '가', 그 외 → '이가'.

---

## 배포 안전

### kDebugMode로 DEV 위젯을 release에서 제외

개발 중 홈 화면 맨 아래에 디버그 패널(`_DebugSection`)을 붙여뒀다. 그 안엔 이런 버튼들이 있다.

```dart
_DebugChip(label: 'pt+50',        onTap: () => _addPoints(50)),   // 포인트 공짜 지급
_DebugChip(label: '조각+10',      onTap: () => _addPieces(10)),   // 꿈 조각 공짜 지급
_DebugChip(label: '💸 잔고 초기화', onTap: _resetEconomy),          // 포인트 원장 삭제
_DebugChip(label: '케어 -1일',     onTap: _shiftCareBack),         // 강아지 상태 되감기
_DebugChip(label: '🔄 온보딩 초기화', onTap: _resetOnboarding),      // 습관 전체 삭제
```

테스트할 땐 편하지만, 이게 release에 그대로 나가면 두 가지가 터진다.

- 경제 붕괴 — `pt+50` · `조각+10`으로 재화를 무한히 찍을 수 있으면 습관을 완료하거나 광고를 볼 이유가 사라진다. 스티커 구매·슬롯 광고로 짜놓은 밸런스와 광고 수익이 통째로 무너진다.
- 데이터 파괴 — `잔고 초기화` · `온보딩 초기화`는 확인 절차 없이 유저의 포인트와 습관 전체를 지운다. 실유저가 실수로 누르면 복구가 안 된다.

즉 "개발자만 봐야 하고 유저 손에 들어가면 안 되는" 위젯이라, 배포본에는 화면에서 숨기는 정도가 아니라 아예 존재하지 않아야 한다.

```dart
if (kDebugMode) _DebugSection(ref: ref),
```

`kDebugMode` / `kReleaseMode`는 컴파일 타임 상수라, release 빌드에선 이 분기가 `if (false)`로 접혀 tree-shaking으로 위젯째 빠진다 — 렌더링만 막는 게 아니라 APK에 코드 자체가 안 들어간다. (한 줄 가드는 임시 안전핀이고 최종적으론 코드째 삭제가 맞지만, 삭제 전까지의 실수 유출을 확실히 막아준다.)

---

## UI

### `showDialog<bool>`로 확인 받기 — 취소·바깥 탭 한 번에

포인트 소비처럼 되돌리기 힘든 액션은 오탭 방지 확인을 받는다. `showDialog`는 `Navigator.pop`에 넘긴 값을 그대로 반환하므로 `<bool>`로 예/아니오를 받는다.

```dart
final ok = await showDialog<bool>(
  context: context,
  builder: (_) => AlertDialog(
    actions: [
      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
      FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('구매')),
    ],
  ),
);
if (ok != true) return; // 취소(false)와 바깥 탭(null) 둘 다 커버
```

바깥을 탭해 닫으면 `null`이 오므로, `== true`가 아니라 `!= true`로 처리하면 취소·null을 한 번에 막는다.

---

### HapticFeedback으로 손맛

습관 완료(도장 찍기) 순간에 가벼운 진동을 넣으면 애니메이션과 합쳐져 "찍었다"는 촉감이 산다. 비용은 거의 0.

```dart
import 'package:flutter/services.dart';

HapticFeedback.lightImpact(); // 완료 토글 시
```
