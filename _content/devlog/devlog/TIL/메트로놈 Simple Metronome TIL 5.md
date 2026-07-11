---
layout: post
title: 메트로놈 Simple Metronome TIL 5
date: 2026-07-10
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 메트로놈에 프리셋 저장·불러오기를 붙이며 익힌 것들 — JSON으로 목록 저장, 뷰 동적 생성, ImageView를 버튼처럼 쓰기, 기능을 참조까지 안전하게 걷어내기.
tags:
  - Android-Studio
  - Kotlin
---
설정(BPM·박자표·사운드)을 이름 붙여 저장·불러오는 프리셋 기능을 붙이며 나온 것들. 개수가 유동적인 목록 데이터를 저장하는 법, 그 목록을 코드로 그려내는 법, 아이콘 하나를 버튼처럼 쓰는 법, 그리고 겹쳐서 안 쓰게 된 기능을 참조까지 깔끔히 걷어내는 법까지.

---

## 데이터 저장

### 개수가 유동적인 목록을 JSON으로 SharedPreferences에

프리셋은 몇 개가 될지 모른다. 키를 `preset_1`, `preset_2`…로 늘리면 삭제·순서 변경시 비효율적이므로, `data class` 리스트를 `org.json`으로 배열 문자열 하나로 직렬화해 통째로 저장한다.

```kotlin
private data class Preset(
    val name: String, val date: String, val bpm: Int,
    val num: Int, val den: Int, val sound: String, val hihat: Int
)
private val presets = mutableListOf<Preset>()

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

읽을 땐 문자열을 `JSONArray`로 파싱해 역직렬화한다. 파싱이 깨질 수 있는 지점이라 실패하면 빈 목록으로 떨어뜨린다.

```kotlin
private fun loadPresets(): List<Preset> {
    val json = prefs.getString(KEY_PRESETS, "[]") ?: "[]"
    return try {
        val arr = JSONArray(json)
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Preset(o.getString("name"), o.getString("date"), o.getInt("bpm"),
                o.getInt("num"), o.getInt("den"), o.getString("sound"), o.getInt("hihat"))
        }
    } catch (e: Exception) {
        emptyList()
    }
}
```

저장 항목은 연주 설정(bpm·박자표·사운드·하이햇)만 넣었다. 테마·플래시 같은 전역 설정까지 프리셋에 담으면 "리듬 하나 불러왔을 뿐인데 화면이 바뀌는" 이상한 동작이 된다.

---

### 이름으로 upsert — 같은 이름이면 갱신, 아니면 새로 추가

저장할 때 같은 이름이 이미 있으면 그 자리를 갱신하고(덮어쓰기), 없으면 맨 위에 새로 넣는다. `indexOfFirst`로 위치를 찾아 하나의 `commitPreset`이 두 경우를 다 처리한다.

```kotlin
// idx >= 0이면 그 자리에 덮어쓰기, 아니면 맨 위에 새로 추가
private fun commitPreset(name: String, bpm: Int, idx: Int) {
    val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    val p = Preset(name, date, bpm, viewModel.numerator, viewModel.denominator, soundMode, hihatSubs)
    if (idx >= 0) presets[idx] = p else presets.add(0, p)
    savePresets()
    rebuildPresetList()
}

// 저장 다이얼로그: 같은 이름이 있으면 덮어쓰기 확인부터
val idx = presets.indexOfFirst { it.name == name }
if (idx >= 0) confirmOverwrite { commitPreset(name, bpm, idx) } else commitPreset(name, bpm, -1)
```

---

### String 리소스에 포맷 인자로 이름 끼워 넣기

"'출근길 리듬' 프리셋에 덮어쓸까요?"처럼 이름이 들어가는 문구는 문자열을 코드에서 이어붙이지 않고, 리소스에 위치 인자 `%1$s`를 두고 `getString`으로 채운다. 번역·수정이 리소스 한 곳에 모인다.

```xml
<string name="preset_overwrite">\'%1$s\' 프리셋에 덮어쓸까요?</string>
```

```kotlin
.setMessage(getString(R.string.preset_overwrite, p.name))
```

---

## 목록 UI — 코드로 그리기

### 뷰를 동적으로 inflate해서 컨테이너에 쌓기

프리셋은 개수가 변하니 XML에 미리 못 박을 수 없다. 행 레이아웃(`item_preset.xml`)을 `LayoutInflater`로 찍어내 컨테이너 `LinearLayout`에 `addView`하고, 갱신할 땐 `removeAllViews` 후 다시 그린다.

```kotlin
private fun rebuildPresetList() {
    val container = binding.settingsPanel.presetList
    container.removeAllViews()
    for ((index, p) in presets.withIndex()) {
        val row = layoutInflater.inflate(R.layout.item_preset, container, false)
        row.findViewById<TextView>(R.id.presetName).text = p.name
        row.findViewById<TextView>(R.id.presetDate).text = "${p.date} · ${p.bpm} ${p.num}/${p.den}"
        row.setOnClickListener { loadPreset(p) }
        // …아이콘 리스너…
        container.addView(row)
    }
}
```

RecyclerView를 쓸 수도 있지만, 프리셋은 많아야 수십 개라 어댑터 오버헤드보다 이 방식이 단순하다.

---

### 행 리스너에서 index와 item을 클로저로 캡처

각 행의 💾/🗑 버튼은 "그 행"이 무엇인지 알아야 한다. `withIndex()`로 도는 루프 안에서 `index`와 `p`를 그대로 람다에 담으면, 리스너가 자기 행의 값을 기억한다.

```kotlin
row.findViewById<ImageView>(R.id.presetOverwrite).setOnClickListener {
    // 이름 재입력 없이 이 행 index로 덮어쓰기
    confirmOverwrite { commitPreset(p.name, viewModel.currentBpm.value ?: 60, index) }
}
row.findViewById<ImageView>(R.id.presetDelete).setOnClickListener {
    presets.removeAt(index)
    savePresets()
    rebuildPresetList()
}
```

삭제 후 `rebuildPresetList()`로 통째로 다시 그리기 때문에, 캡처된 `index`가 오래돼 어긋날 걱정이 없다.

---

### ImageView를 버튼처럼 쓰기

행의 아이콘 액션은 `Button`이 아니라 `ImageView`다. `clickable`/`focusable`을 켜고 `selectableItemBackgroundBorderless`로 리플을 주면 버튼처럼 눌린다. 아이콘만 있는 버튼은 `contentDescription`을 꼭 달아야 스크린리더가 읽는다.

```xml
<ImageView
    android:id="@+id/presetDelete"
    android:background="?attr/selectableItemBackgroundBorderless"
    android:clickable="true"
    android:focusable="true"
    android:contentDescription="@string/preset_delete"
    android:padding="8dp"
    android:src="@drawable/ic_trash"
    android:tint="?attr/mtIndicatorOff" />
```

---

### Vector Drawable을 pathData로 직접 만들기

쓰레기통·플로피·더하기 아이콘은 이미지가 아니라 벡터다. Material 아이콘의 `pathData`를 그대로 `<vector>`에 넣으면 되고, 색은 `android:tint`(테마 attr)로 입혀 다크/크림 테마에 자동 대응한다.

```xml
<vector android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFF"
        android:pathData="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />   <!-- 더하기 -->
</vector>
```

---

### weight로 헤더 배치 — 좌측 제목 + 우측 아이콘

프리셋 헤더는 "프리셋" 제목을 왼쪽에, ➕ 저장 버튼을 오른쪽 끝에 둔다. 가로 `LinearLayout`에서 제목에 `layout_weight="1"`을 줘 남는 폭을 다 먹게 하면, 아이콘이 자연히 우측 끝으로 밀린다.

```xml
<LinearLayout android:orientation="horizontal" android:gravity="center_vertical">
    <TextView android:layout_width="0dp" android:layout_weight="1" android:text="@string/preset" />
    <ImageView android:id="@+id/btnSavePreset" android:src="@drawable/ic_add" />
</LinearLayout>
```

---

## 다이얼로그

### AlertDialog 확인창 + EditText 입력받기

덮어쓰기·삭제는 되돌리기 어려우니 `AlertDialog`로 한 번 확인한다. 이름 입력은 `EditText`를 `setView`로 다이얼로그에 꽂아 받는다.

```kotlin
val et = EditText(this).apply {
    inputType = InputType.TYPE_CLASS_TEXT
    setText(default)          // "120 4/4" 같은 기본 이름
    setSelection(text.length) // 커서를 끝으로
}
AlertDialog.Builder(this)
    .setTitle(R.string.preset_save)
    .setView(et)
    .setPositiveButton("Confirm") { _, _ -> /* et.text 사용 */ }
    .setNegativeButton("Cancel", null)
    .show()
```

---

## 정리 — ViewBinding · 기능 제거

### 뷰 타입을 바꿔도 id를 유지하면 핸들러는 그대로

저장 버튼을 전체폭 `MaterialButton`에서 헤더 우측 `ImageView`로 바꿨는데, `id`(`btnSavePreset`)를 유지했더니 ViewBinding이 같은 이름으로 다시 생성해 Kotlin 쪽은 한 줄도 안 고쳤다. `setOnClickListener`는 `View`의 것이라 타입이 달라도 동일하게 붙는다.

```kotlin
// 레이아웃에서 Button → ImageView로 바뀌었지만 이 줄은 그대로
binding.settingsPanel.btnSavePreset.setOnClickListener { showSavePresetDialog() }
```

---

### 안 쓰는 기능은 참조까지 전부 걷어내기

프리셋이 생기면서 "BPM 기억" 스위치는 역할이 겹쳤다. 지우려면 스위치 XML만 지우면 안 되고, 필드·`companion` 상수·`prefs` 저장·리스너·전용 함수까지 흩어진 참조를 다 찾아야 한다. 지우기 전에 관련 심볼을 grep해 목록부터 확보했다.

```
rememberBpmEnabled | swRemember | remember_bpm | REMEMBER | SAVED_BPM | saveBpmIfNeeded
→ 필드 1 · 상수 2 · onCreate 배선 · observer 호출 · 함수 1 · 레이아웃 스위치 · string 1
```

지운 뒤 같은 검색으로 "No matches"를 확인해 죽은 참조가 없음을 검증했다.

---

### 미사용 리소스는 빌드가 아니라 눈으로 찾아 지우기

기능을 걷어내면 drawable·style·의존성이 고아로 남는다. 리소스 미사용은 컴파일 에러가 안 나서 조용히 쌓이므로, 폐기한 기능(강아지 얼굴 아이콘, 옛 스피너 스타일, `gridlayout` 의존성)을 직접 추적해 삭제했다.

---

## 재생에 즉시 반영

### 프리셋 로드는 상태 키가 같아도 강제 재시작

프리셋을 불러오면 재생 중이라도 새 BPM·박자표로 곧장 바뀌어야 한다. 평소 재시작은 "상태 키(bpm·박·분할)가 실제로 달라졌을 때만" 도는데, 프리셋 로드는 값이 우연히 같아도 확실히 다시 시작해야 해서 `forceRestartIfPlaying()`을 쓴다.

```kotlin
private fun loadPreset(p: Preset) {
    viewModel.numerator = p.num; viewModel.denominator = p.den
    soundMode = p.sound; hihatSubs = p.hihat
    // …라디오/prefs 반영…
    viewModel.setBpm(p.bpm.coerceIn(1, 240))
    recomputeMeter()
    forceRestartIfPlaying()   // 상태 키 무시하고 무조건 재시작
    binding.drawer.closeDrawer(GravityCompat.END)
}
```

---

### 안 되는 최적화는 되돌리는 것도 결론

매 마디 첫 박이 작게 들리는 이슈를 다시 잡아보려 `AudioTrack`에 `PERFORMANCE_MODE_LOW_LATENCY`를 걸었지만 체감 차이가 없었다. PCM의 gain은 동일하니 데이터 문제가 아니라 재생 경로 밖(기기 오디오 후처리)의 문제로 보고, 시도한 fast path를 되돌렸다. "효과 없음을 확인하고 원복"도 남겨둘 가치가 있는 결과다.

---

## 요약

- 개수가 유동적인 목록은 키를 늘리지 말고 `org.json`으로 직렬화해 SharedPreferences에 통째로 저장한다.
- 목록 UI는 `LayoutInflater` + `addView`로 그리고, 행 액션은 `withIndex()`로 `index`/item을 클로저에 캡처한다.
- 아이콘 버튼은 `ImageView` + `selectableItemBackgroundBorderless` + `contentDescription`, 아이콘 자체는 `pathData` 벡터로.
- 뷰 타입을 바꿔도 `id`를 유지하면 ViewBinding 핸들러는 무변경.
- 기능을 지울 땐 grep으로 참조를 전부 확인하고, 지운 뒤 "No matches"로 검증한다.
