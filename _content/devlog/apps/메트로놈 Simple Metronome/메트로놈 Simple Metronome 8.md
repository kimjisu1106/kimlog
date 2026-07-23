---
layout: post
title: 메트로놈 Simple Metronome 8
date: 2026-07-10
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
description: 지금 BPM·박자표·사운드 설정을 이름 붙여 저장하고 탭 한 번으로 불러오는 프리셋 기능을 붙이고, 잘 안 쓰던 BPM 기억 기능은 걷어냈다.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 프리셋 저장·불러오기 — 지금 BPM·박자표·사운드·하이햇을 이름 붙여 저장, 행 탭으로 그대로 복원
- 같은 이름으로 저장하면 덮어쓰기(확인 후), 행마다 💾 버튼으로 이름 재입력 없이 갱신, 🗑로 삭제
- 프리셋을 `SharedPreferences`에 JSON 배열로 저장, 목록 행은 코드로 동적 생성
- 프리셋 섹션을 설정 드로어 맨 아래로 이동(개수가 늘 수 있어서), 저장은 헤더 우측 ➕ 버튼으로
- 프리셋과 역할이 겹치던 BPM 기억 기능 제거, 미사용 리소스·스타일·의존성 정리(클린코드)

---

## 막힌 부분

### 덮어쓸 때마다 이름을 다시 치는 게 번거로움

처음엔 "같은 이름으로 저장하면 덮어쓰기"만 넣었는데, 덮어쓰려면 매번 저장 다이얼로그를 열어 같은 이름을 또 입력해야 했다. 목록 행마다 💾 버튼을 두고, 그 행의 `index`를 그대로 `commitPreset`에 넘겨 이름 입력 단계를 건너뛰게 했다.

```kotlin
// idx >= 0이면 그 자리에 덮어쓰기, 아니면 맨 위에 새로 추가
private fun commitPreset(name: String, bpm: Int, idx: Int) {
    val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    val p = Preset(name, date, bpm, viewModel.numerator, viewModel.denominator, soundMode, hihatSubs)
    if (idx >= 0) presets[idx] = p else presets.add(0, p)
    savePresets()
    rebuildPresetList()
}

// 행 💾 버튼 — 이름 재입력 없이 그 행 index로 덮어쓰기
row.findViewById<ImageView>(R.id.presetOverwrite).setOnClickListener {
    AlertDialog.Builder(this)
        .setMessage(getString(R.string.preset_overwrite, p.name))
        .setPositiveButton("Confirm") { _, _ -> commitPreset(p.name, viewModel.currentBpm.value ?: 60, index) }
        .setNegativeButton("Cancel", null)
        .show()
}
```

### 프리셋을 통째로 저장하기

프리셋은 개수가 유동적이라 키를 하나씩 만들기 어렵다. `data class`를 `org.json`으로 직렬화해 배열 문자열 하나로 저장하고, 읽을 땐 역직렬화한다.

```kotlin
private fun savePresets() {
    val arr = JSONArray()
    presets.forEach { p ->
        arr.put(JSONObject().apply {
            put("name", p.name); put("date", p.date); put("bpm", p.bpm)
            put("num", p.num); put("den", p.den); put("sound", p.sound); put("hihat", p.hihat)
        })
    }
    prefs.edit().putString(KEY_PRESETS, arr.toString()).apply()
}
```

저장 항목은 연주 설정(bpm·박자표·사운드·하이햇)만 — 테마·플래시 같은 전역 설정은 넣지 않았다.

### 잘 안 쓰는 기능 걷어내기 (BPM 기억)

BPM 기억 스위치는 "마지막 BPM을 저장했다가 다시 켤 때 복원"인데, 프리셋이 생기면서 역할이 겹쳤다. 필드·`companion` 상수·`prefs` 저장·스위치 리스너·저장 함수까지 한 번에 제거했다. 저장 버튼도 전체폭 버튼을 없애고 헤더 우측 ➕ `ImageView`로 바꿨는데, `id`(`btnSavePreset`)를 유지해서 `setOnClickListener` 핸들러는 그대로 뒀다.

### 첫 박 저지연 재시도 → 되돌림

매 마디 첫 박이 작게 들리는 걸 다시 잡아보려 `AudioTrack`에 `PERFORMANCE_MODE_LOW_LATENCY`를 걸어봤지만 체감 차이가 없어 되돌렸다. PCM 데이터의 gain은 동일해서, 재생 경로 밖(기기 오디오 후처리)의 문제로 잠정 결론짓고 미해결로 유지한다.

---

## 다음에 할 일

- 릴리스 준비 (versionCode 올리고 aab 빌드·업로드, 스크린샷 갱신)
- "첫 박 작게 들림" 실기기 녹음으로 재조사 (헤드폰 vs 스피커)
