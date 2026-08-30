---
layout: post
title: 메트로놈 Simple Metronome 12
date: 2026-08-11
permalink: "devlog/apps/메트로놈 Simple Metronome/메트로놈 Simple Metronome 12"
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status:
description: ±5 버튼이 너무 작아 누르기 불편하다는 피드백을 받아, 텍스트 버튼의 글자·패딩·최소 높이를 키워 탭 영역을 넓힌 작업.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- ±5 버튼(`TextStep` 스타일)의 글자(14→18sp)·좌우 패딩(8→16dp)·최소 높이(0→44dp)를 키워 탭 영역 확보

---

## 막힌 부분

### ±5 버튼이 눌리는 영역이 작았다

±5는 테두리 없는 텍스트 버튼(`Widget.MaterialComponents.Button.TextButton`)인데, `minWidth`·`minHeight`를 0으로 둬서 글자 크기(14sp)만큼만 탭 영역이 잡혔다. Material의 권장 최소 탭 타깃은 48dp인데 한참 못 미쳐, 실제로 누르기 불편하다는 피드백이 왔다. `minHeight`와 패딩으로 영역을 넓히되, ±1 원형(48dp)보다는 작게 둬 "±1이 주, ±5가 보조"라는 위계는 유지했다.

```xml
<style name="Widget.SimpleMetronome.TextStep" parent="Widget.MaterialComponents.Button.TextButton">
    <item name="android:textSize">18sp</item>        <!-- 14 → 18 -->
    <item name="android:minHeight">44dp</item>       <!-- 0 → 44 (탭 타깃) -->
    <item name="android:paddingLeft">16dp</item>     <!-- 8 → 16 -->
    <item name="android:paddingRight">16dp</item>
    ...
</style>
```

세로·가로 공통 스타일이라 한 곳만 고치면 양쪽에 반영된다.

---

## 다음에 할 일

- v1.14 심사 통과 후, ±5 등 UI 변경을 반영해 `versionCode 15`로 재빌드·재출시
