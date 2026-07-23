---
layout: post
title: 습관만들기 Pawbit TIL 6
date: 2026-07-07
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Flutter
  - Dart
---
## 로컬 알림

### 예약형 로컬 알림은 발화 시점에 내 코드가 안 돈다 → 시점을 미리 계산해 예약

로컬 알림(`flutter_local_notifications`)은 미리 예약해두면 정해진 시각에 OS가 띄운다. 문제는 **발화 순간에 내 코드가 실행되지 않는다**는 것 — 알림 내용은 예약할 때 고정된다. "강아지 상태가 바뀌면 알림"을 하려는데, 상태는 앱이 꺼져 있어도 시간이 지나며 바뀐다. 발화 때 상태를 계산할 수 없으니 곤란했다.

해결은 상태가 바뀌는 **시점을 미리 계산**해서 그 시각에 예약하는 것. 케어 상태는 "마지막 케어 + 임계일"에 단계가 바뀌므로 결정적이다.

```dart
// 마지막 케어 기준으로 각 단계(배고픔/많이/아픔)가 되는 날을 미리 예약
for (var level = 1; level <= 3; level++) {
  final days = thresholds[level - 1]; // 예: food [1, 2, 3]
  final when = baseDate.add(Duration(days: days))
                       .add(const Duration(hours: 10)); // 아침 10시
  if (!when.isAfter(now)) continue;   // 이미 지난 시점은 스킵
  await plugin.zonedSchedule(id, 'Pawbit', '$name가 ${msgs[level - 1]}', when, ...);
}
```

케어를 하면(= 마지막 케어 시각 갱신) 다시 계산해 재예약한다.

---

### 매일 반복 vs 일회성 — matchDateTimeComponents

- **매일 같은 시각 반복**: `matchDateTimeComponents: DateTimeComponents.time` (습관 목표 시간 알림)
- **특정 시점 한 번**: `matchDateTimeComponents` 없이 그 datetime에 예약 (강아지 상태 알림)

```dart
// 매일 반복 (시:분만 매칭)
await plugin.zonedSchedule(
  id, 'Pawbit', body, next,
  matchDateTimeComponents: DateTimeComponents.time,
);
```

> 요일별 반복(`dayOfWeekAndTime`)은 스케줄의 요일이 로컬 타임존 기준이어야 정확한데, `tz.local`을 안 잡고 UTC로 래핑하면 자정 근처에서 요일이 어긋난다. time-only / 일회성엔 문제없어서 요일 필터는 후속으로 미룸.

---

### 재예약은 "ID 대역 취소 + DB에서 재구성"

습관을 지우거나 아카이브하면 그 알림도 사라져야 한다. 그런데 삭제된 습관의 ID를 일일이 기억하지 않는다. 그래서 **예약된 알림 중 해당 대역을 싹 취소하고, 현재 DB 상태로 다시 예약**한다.

```dart
Future<void> syncAllNotifications(AppDatabase db) async {
  // 습관 알림 대역(100000~) 전부 취소 후, 활성 습관으로 재예약
  await _cancelRange(100000, 199999);
  final habits = await db.habitDao.watchActiveHabits().first;
  for (final h in habits) {
    if (h.alarmOn && h.targetTime != null) await _scheduleHabitAlarm(h);
  }
}

Future<void> _cancelRange(int min, int max) async {
  for (final p in await plugin.pendingNotificationRequests()) {
    if (p.id >= min && p.id <= max) await plugin.cancel(p.id);
  }
}
```

ID를 **대역으로 설계**(기본 = 1, 습관 = `100000 + habitId`, 상태 = `2000 + …`)해두면 종류별로 한 번에 취소·재구성할 수 있다. 이 `sync`를 습관 CRUD·케어·앱 진입·설정 토글 때마다 호출하면 알림이 항상 최신 상태와 일치한다.

---

## 디자인

### ThemeExtension 토큰으로 톤 통일 — 시맨틱 색은 남기고 chrome만 교체

파스텔 톤으로 화면을 통일할 때 하드코딩 색을 무작정 바꾸면 안 된다. 색을 두 부류로 나눴다.

- **chrome(껍데기)** — 카드 배경·테두리·보조 텍스트 → 토큰으로 교체(`context.tokens.surface / border / textMuted`)
- **시맨틱(의미)** — 케어 상태 초록/노랑/빨강, 경고 amber, 위험 red → **그대로 유지** (뜻이 있는 색이라 톤 통일 대상이 아님)

```dart
// 케어 3칸: 채운 칸 수의 색은 의미(건강/주의/위험) → 유지
final color = switch (filled) {
  3 => green,
  2 => yellow,
  1 => red,
  _ => t.border, // 빈 칸만 토큰(회색)으로
};
```

`ThemeExtension`으로 토큰을 `Theme`에 얹으면 `context.tokens.xxx`로 어디서든 참조 가능해서, 화면마다 흩어진 `Colors.grey.shadeXXX`를 일괄로 걷어낼 수 있었다. 이미지 배경 위에 흰/검 오버레이로 짠 아트 화면(마을 맵·갤러리)은 애초에 chrome이 아니라서 리스킨 대상에서 뺐다.
