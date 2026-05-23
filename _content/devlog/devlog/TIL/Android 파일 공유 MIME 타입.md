---
layout: post
title: Android 파일 공유 MIME 타입
date: 2026-05-21
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
  - Android
---

- 문제점: `share_plus`로 백업 파일을 공유할 때 파일 관리자 앱이 공유 시트 목록에 뜨지 않았다.
- 방안: MIME 타입을 `application/octet-stream` 대신 `*/*`로 지정.

---

### `Share.shareXFiles`의 MIME 타입이 공유 대상 앱을 결정한다

```dart
// ❌ 너무 구체적 — 파일 앱이 자기 형식으로 못 인식해서 목록에 안 뜸
XFile(dest.path, mimeType: 'application/octet-stream')

// ✅ 모든 앱이 공유 대상이 됨
XFile(dest.path, mimeType: '*/*')
```

Android의 share sheet는 각 앱이 `AndroidManifest.xml`에 선언한 `intent-filter`의 MIME 타입과 매칭해서 목록을 구성한다. 파일 관리자 앱들은 보통 `*/*`나 특정 확장자만 처리한다고 선언해놓기 때문에, `application/octet-stream`으로 공유하면 필터링돼서 목록에서 빠진다.

텍스트/이미지처럼 앱이 명확히 정해져 있을 때는 구체적인 MIME가 맞지만, 백업 파일처럼 "아무 데나 저장"이 목적이면 `*/*`가 맞다.

---

### 보너스: `file_picker`의 `FileType.custom`도 같은 이유로 실패한다

```dart
// ❌ Android에서 .db 확장자 미지원 — PlatformException
FilePicker.platform.pickFiles(
  type: FileType.custom,
  allowedExtensions: ['db'],
)

// ✅
FilePicker.platform.pickFiles(type: FileType.any)
```

`file_picker`도 내부적으로 Android의 MIME 매핑을 사용하는데, `.db`는 표준 MIME 타입 매핑이 없어서 `Unsupported filter` 에러가 난다.
