---
layout: post
title: 습관만들기 Pawbit TIL 7
date: 2026-07-08
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 신규 유저 보호 기간을 레벨 캡으로 풀고, 예약 알림을 상태 규칙에 맞춰 보정하고, 자정 리셋 없는 일일 카운터·AdMob ID 종류 구분·rewarded 보상 콜백 처리까지 익힌 것들.
tags:
  - Flutter
  - Dart
---
## 상태 파생

### 보호 기간은 "레벨 0 고정"이 아니라 "레벨 캡"으로

신규 유저 보호 기간(입양 후 7일간 강아지가 아프지 않음)을 넣을 때, 보호 중 상태를 레벨 0(건강)으로 고정하면 함정이 생긴다. 보호가 끝나는 순간 마지막 케어로부터 이미 7일이 지나 있으므로, 건강 → 아픔으로 한 번에 점프한다.

```dart
// ❌ 보호 중 레벨 0 고정 → 보호 종료 순간 0 → 3 점프
final level = inGrace ? 0 : _level(type, lastCare);

// ✅ 레벨 2 캡 → 배고픔 단계는 정상 진행, 아픔(3)만 차단
int cap(int v) => inGrace && v > 2 ? 2 : v;
final level = cap(_level(type, lastCare));
```

배고픔(1~2) 표시는 그대로 두면 유저가 케어 시스템을 학습하면서도 페널티(퍼즐 잠금)는 안 받고, 보호 종료 시점에 임계를 넘긴 상태면 그때 자연스럽게 아픔으로 이어진다. 입양 시점은 최초 케어 기록을 fold로 찾는다.

```dart
final adoption = logs
    .map((l) => l.performedAt)
    .fold<DateTime?>(null, (a, b) => a == null || b.isBefore(a) ? b : a);
```

---

## 로컬 알림

### 파생 상태 규칙이 바뀌면 예약 알림도 같이 보정해야 한다

"강아지 상태가 바뀌는 시점"에 맞춰 알림을 미리 예약해뒀는데, 보호 기간이 생기면서 상태 규칙이 바뀌었다. 규칙만 바꾸고 알림을 안 고치면 보호 기간 중에 "아파요" 알림이 오는데 실제로는 안 아픈 불일치가 생긴다.

```dart
// '아픔'(level 3) 알림이 보호 기간 안이면 → 실제 아픔이 시작되는 보호 종료 시점으로
if (level == 3 && graceEnd != null && local.isBefore(graceEnd)) {
  local = graceEnd;
}
```

예약형 알림은 "상태의 미래를 미리 계산한 스냅샷"이라, 상태 도출 규칙이 바뀔 때마다 예약 로직도 같은 규칙으로 보정해야 한다.

---

## 데이터

### 자정 리셋 로직 없는 일일 카운터 — 날짜를 키에 넣기

광고 일일 3회 제한에 "자정에 카운터를 리셋하는" 코드는 없다. 값에 날짜를 함께 저장하고, 읽을 때 오늘 날짜가 아니면 0으로 취급한다.

```dart
// AppSettings 'ad_daily' = 'yyyy-MM-dd:count'
int _parseAdDaily(String? v) {
  if (v == null) return 0;
  final parts = v.split(':');
  if (parts.length != 2 || parts[0] != _todayKey()) return 0; // 어제 값 → 0
  return int.tryParse(parts[1]) ?? 0;
}
```

리셋 타이머·백그라운드 작업 없이 날짜가 바뀌면 자동으로 0부터 시작한다. 로컬 앱의 일일 제한에는 이 패턴이 제일 단순하다.

---

### 재화 지급·카운트는 보상 콜백에서만

rewarded 광고에서 카운트를 로드 시점이나 버튼 탭 시점에 올리면, 유저가 광고를 중간에 닫거나 로드가 실패해도 횟수가 차감된다. 지급과 카운트는 전부 `onUserEarnedReward`(보상 확정 콜백) 안에서만 처리한다.

```dart
ad.show(
  onUserEarnedReward: (_, _) async {
    await dao.incrementAdWatchToday(); // 카운트도
    await dao.addPointRecord(...);     // 지급도 여기서만
  },
);
```

---

## AdMob

### debug 빌드는 무조건 테스트 광고 ID — kReleaseMode 분기

개발 중에 실광고를 띄우고 클릭하면 무효 트래픽으로 AdMob 계정이 제재될 수 있다. 실 ID는 release 빌드에서만 쓰이도록 분기한다. `const`는 조건 분기가 안 되므로 `static get`으로 바꾼다.

```dart
// ❌ 실 ID를 const로 박으면 debug에서도 실광고
static const String rewardedAdUnitAndroid = 'ca-app-pub-XXXX/YYYY';

// ✅ release만 실 ID, debug/profile은 Google 테스트 ID
static String get rewardedAdUnitAndroid =>
    kReleaseMode ? _prodRewardedAndroid : _testRewardedAndroid;
```

---

### 앱 ID(~)와 광고 단위 ID(/)는 다른 것

AdMob ID는 두 종류다. 구분자만 다르고 형태가 비슷해서 헷갈리기 쉽다.

- 앱 ID `ca-app-pub-XXXX~YYYY` (물결) — SDK 초기화용. AndroidManifest `APPLICATION_ID` meta-data에 넣는다. debug에서도 실 ID 사용이 공식 가이드.
- 광고 단위 ID `ca-app-pub-XXXX/YYYY` (슬래시) — 광고 로드용. 코드에서 사용하고, debug는 테스트 ID로 분기.

단위 ID만 실 ID로 바꾸고 매니페스트를 테스트 앱 ID로 두면 실광고가 안 나온다. 그리고 rewarded 단위 하나를 여러 배치(슬롯/포인트/수정권)에서 재사용해도 된다 — 배치별 분리는 리포팅 목적의 선택사항.

---

### 광고 단위 ID는 비밀이 아니다

광고 단위 ID는 모든 APK에서 그대로 추출되는 클라이언트 식별자라, 공개 저장소에 있어도 표준 관행상 문제가 없다. "코드에 넣으면 안 되는 것"의 기준은 노출 시 권한이 생기는 자격증명(API 키·토큰·키스토어 비밀번호)이지, 어차피 클라이언트에 배포되는 식별자가 아니다.

---

## UI

### 버튼 비활성은 onPressed에 null — 라벨도 같이 바꾸기

Flutter 버튼은 `onPressed: null`이면 자동으로 비활성 스타일이 된다. 콜백 파라미터를 nullable로 선언하면 "비활성 상태"를 별도 bool 없이 표현할 수 있고, null 여부로 라벨도 같이 바꿀 수 있다.

```dart
required VoidCallback? onPressed, // null = 오늘 광고 소진

FilledButton(
  onPressed: onPressed,
  child: Text(onPressed == null ? '내일 다시' : '광고 보기'),
);
```
