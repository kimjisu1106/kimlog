---
layout: post
title: AssetManifest — Flutter 빌드 타임 asset 목록 런타임 조회
date: 2026-05-25
categories:
  - today-i-learn
project: today-i-learn
project_name:
video_id:
app_url:
status:
tags:
  - Flutter
  - Dart
---
### AssetManifest — Flutter 빌드 타임 asset 목록 런타임 조회

문제: 앱 제공 퍼즐 목록이 코드에 하드코딩되어 있어서 그림 추가 시마다 코드 수정 필요했음.

```dart
// 이전 — 코드 수정 없이는 그림 추가 불가
const _availablePuzzles = ['puzzle_01', 'puzzle_02', 'puzzle_03'];
```

해결: `AssetManifest`로 `assets/puzzles/` 폴더를 런타임에 스캔.

```dart
// puzzle_select_screen.dart
Future<void> _loadPuzzleList() async {
  final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
  final ids = manifest
      .listAssets()
      .where((k) => k.startsWith('assets/puzzles/') && k.endsWith('.png'))
      .map((k) => k.split('/').last.replaceAll('.png', ''))
      .toList()
    ..sort();
  if (mounted) setState(() => _availablePuzzles = ids);
}
```

---

Flutter는 빌드 시 `AssetManifest.json`을 자동 생성함. 런타임에 이걸 읽으면 등록된 asset 전체 목록을 동적으로 가져올 수 있음.

```dart
import 'package:flutter/services.dart'; // rootBundle 포함

final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
final allAssets = manifest.listAssets(); // List<String>
```

- `pubspec.yaml`에 폴더 단위로 등록 (`- assets/puzzles/`)하면 그 안의 모든 파일이 목록에 포함됨
- 파일명 알파벳 정렬로 순서 보장하려면 zero-padding 필수 (`puzzle_0001` vs `puzzle_1` — 후자는 10번째에서 순서 꼬임)
- `rootBundle`은 `flutter/services.dart`에서 import