---
layout: post
title: 습관만들기 Pawbit TIL 10
date: 2026-07-11
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 전역 bool 설정을 StateProvider + main() prefs override로 DB 없이 처리하고, 값을 지금 한 번만 쓰는 콜백에선 watch 대신 read를 쓰는 기준을 정리.
tags:
  - Flutter
  - Riverpod
  - Dart
---
## 상태 관리

### 앱 전역 설정 = StateProvider + main() prefs override

완료 진동, 주 시작 요일처럼 간단한 전역 bool 설정은 DB 테이블 없이 `StateProvider` 하나로 둔다. 앱 시작 때 `main()`에서 SharedPreferences 값으로 override해 실제 값을 주입하고, 위젯은 provider만 `watch`한다.

```dart
// game_providers.dart — 기본값(초기 로드 전 fallback)
final hapticEnabledProvider = StateProvider<bool>((ref) => true);
```

```dart
// main.dart — 시작 시 저장된 값으로 주입
final hapticEnabled = prefs.getBool('haptic_enabled') ?? true;
runApp(ProviderScope(
  overrides: [
    hapticEnabledProvider.overrideWith((ref) => hapticEnabled),
  ],
  child: const PawbitApp(),
));
```

```dart
// settings_screen.dart — 토글 시 provider와 prefs 양쪽 갱신
onChanged: (value) async {
  ref.read(hapticEnabledProvider.notifier).state = value;
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool('haptic_enabled', value);
},
```

provider 기본값은 override가 적용되기 전 잠깐의 fallback일 뿐, 실제 값은 항상 `main()`의 override로 들어온다. 설정 하나 추가하는 데 DAO도 마이그레이션도 필요 없다.

---

### 완료 순간의 진동은 watch가 아니라 ref.read

설정값을 화면에 계속 반영해야 하면 `watch`지만, "습관 완료를 누른 그 순간" 진동 여부만 한 번 정하는 거라면 `watch`가 오히려 손해다. `watch`로 읽으면 값이 바뀔 때마다 위젯이 rebuild되는데, 이벤트 핸들러에선 그 순간의 스냅샷만 있으면 된다.

```dart
Future<void> _onToggle(BuildContext context, WidgetRef ref, ...) async {
  // ...
  if (ref.read(hapticEnabledProvider)) {
    HapticFeedback.lightImpact(); // 켜져 있을 때만
  }
  // ...
}
```

기준 — 빌드 결과에 값이 흘러야 하면 `watch`, 콜백·이벤트에서 그 순간 한 번 집으면 `read`. 설정 토글이 켜져 있는 위젯은 `watch`(재빌드로 스위치 반영), 완료 콜백은 `read`(스냅샷만).

---

## 요약

- 전역 bool 설정은 `StateProvider` + `main()` prefs override면 DB 없이 충분하다.
- 값을 "지금 이 순간"만 쓰면 `read`, 화면에 지속 반영하면 `watch`.
