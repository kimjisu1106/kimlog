---
layout: post
title: 소리꽃 KeyBloom TIL 29
date: 2026-08-02
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 웹에선 멀쩡한데 네이티브 앱(Tauri WebView)에서만 나던 문제 셋을 잡으며 배운 것 — 웹뷰가 화면 드래그를 가로채는 것, OS 색창이 앱 밖에 떠서 색 선택기를 직접 만든 것, 그리고 네이티브 오디오가 라이브 진입 때 처음 데워져 첫 소리가 늦던 것.
tags:
  - TypeScript
  - Rust
  - CSS
---
같은 코드인데 웹에선 되고 네이티브 앱(Tauri WebView)에선 안 되는 문제가 셋 나왔다. 큐 순서 변경(드래그)이 안 되고, 색 선택기가 앱 밖에 뜨고, 라이브 첫 소리가 늦었다. 원인이 다 달라서 하나씩 팠고, 다 "네이티브 WebView라서" 생긴 것들이었다.

---

## 웹뷰가 화면 안 드래그를 가로챈다

큐 탭을 드래그해 순서를 바꾸는 게 웹에선 되는데 네이티브에선 안 됐다. 큐 재정렬은 HTML5 드래그앤드롭(`draggable`·`dragstart`·`drop`)을 쓰는데, Tauri 웹뷰의 파일 드래그드롭 핸들러가 기본 켜져 있어 OS 레벨에서 드래그 이벤트를 가로채 화면 안 DnD가 죽는다(파일을 창에 떨어뜨리는 걸 앱이 받으려는 기능).

```json
// tauri.conf.json — 창 설정에서 끈다(설정 변경이라 재빌드 필요)
"windows": [{ "dragDropEnabled": false }]
```

웹은 이 핸들러가 없으니 원래 정상이었다. "웹에선 되는데 네이티브만 안 되는 UI 상호작용"은 웹뷰가 이벤트를 가로채는지부터 의심하면 빠르다.

---

## OS 색창이 앱 밖에 뜬다 → 앱 안에 직접 만든다

`<input type="color">`를 누르면 네이티브 WebView가 Windows 색 대화상자를 별도 OS 창으로 띄운다. 이 창은 위치를 웹 쪽에서 제어할 수 없어 앱 밖에 떠 버린다. 기본 input으로는 "앱 안에 뜨게"가 불가능해서, 색 선택기를 DOM에 직접 그렸다.

핵심은 HSV 모델이다 — 채도/명도 사각형 + hue 슬라이더. 사각형 배경은 hue별로 동적이라 인라인으로 준다.

```ts
// hue 색을 base로, 흰색(채도)·검정(명도) 그라데를 얹으면 SV 사각형
sv.style.background =
  `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`;
// 드래그 위치 → 채도(x)·명도(1-y), hue 슬라이더 → 0~360. HSV↔hex 변환은 직접.
```

### undo 위임에 끼워 넣기

기존엔 `input[type=color]`의 `change`를 위임 리스너로 잡아 undo 한 단계로 커밋했다. 커스텀 선택기는 네이티브 input이 아니라 `change`가 안 난다. 그래서 팝업이 닫힐 때 스와치에 `change`를 직접 디스패치하고, 위임 셀렉터에 스와치 클래스를 넣었다.

```ts
// 팝업 닫힘 → anchor(스와치)에 change 버블 → 위임 리스너가 커밋
anchor.dispatchEvent(new Event("change", { bubbles: true }));
// 시작(pointerdown)/끝(change) 셀렉터에 .color-swatch 추가
```

이러면 드래그로 색을 계속 바꿔도(중간 set 여러 번) 열 때 시작·닫을 때 끝으로 한 단계 undo가 된다. 이펙트·건반·팔레트 색을 전부 같은 선택기로 통일했다.

### 스포이드는 EyeDropper API로

기본 색 input엔 스포이드(화면 색 추출)가 딸려 있었는데 걷어내며 사라졌다. Chromium `EyeDropper` API로 되살렸다(WebView2도 Chromium이라 지원, 없으면 버튼 생략).

```ts
new EyeDropper().open().then((res) => setFromHex(res.sRGBHex)).catch(() => {});
```

---

## 네이티브 오디오는 라이브에 처음 데워진다

시작할 때 로딩바로 피아노 샘플을 다 부르는데도, 프로젝트 > 실시간 연주로 들어가 첫 음을 치면 소리가 늦었다. 알고 보니 샘플이 두 벌이었다 — 웹 재생용(Web Audio, 로딩바가 부름)과 네이티브 저지연용(Rust 엔진). 로딩바는 웹 것만 불렀고, Rust 샘플은 라이브에 처음 진입할 때 디코드가 시작돼 그 시간만큼 첫 소리가 밀렸다.

우선 시작할 때 미리 데우게 했다(cpal은 브라우저 오토플레이 제스처가 필요 없어 시작 시 호출 가능). 그런데 그것만으론 부족했다 — 로딩바가 끝나도 Rust 디코드는 아직일 수 있어서다.

### "언제 준비됐나"를 어디서 아나

`audio_init`을 그냥 await하면 될 것 같지만 안 된다. 디코드(`load_bank`)가 커맨드가 아니라 스폰된 오디오 스레드 안에서 돌아서, `audio_init` invoke는 디코드가 시작되기도 전에 반환된다.

준비 완료 신호는 따로 있었다 — 장치 지연(latency) 값은 디코드가 끝나고 스트림 콜백이 처음 돈 뒤에야 채워진다. 즉 `audio_latency > 0`이 곧 "준비됨"이다. 이 값을 폴링해 resolve하는 promise를 만들고, 시작 로딩을 웹·네이티브 둘 다 기다리게 묶었다.

```ts
// audio_latency > 0 될 때까지 폴링 → 준비 신호. 타임아웃도 resolve(로딩 안 가둠)
init(): Promise<void> { /* poll until latency>0 */ }
// 시작 로딩바를 웹 샘플 + 네이티브 디코드 둘 다에 묶는다
Promise.all([audio.ready(onProgress), audio.warmNative()]).then(() => loading.done());
```

이제 로딩바가 끝난 뒤 라이브로 들어가면 첫 노트부터 지연이 없다. Rust는 안 건드리고, 이미 있던 지연 값을 준비 신호로 재활용한 게 요점이다.

---

## 요약

- "웹에선 되는데 네이티브만 안 되는" UI는 웹뷰가 이벤트를 가로채는지 의심 — Tauri 파일 드래그드롭이 화면 DnD를 먹으면 `dragDropEnabled: false`.
- `<input type="color">`는 네이티브 WebView에서 OS 색창을 앱 밖에 띄운다 → 앱 안 DOM에 HSV 선택기 직접 구현. 커스텀은 `change`가 안 나므로 닫힐 때 디스패치해 undo 위임에 끼운다. 스포이드는 `EyeDropper` API.
- 웹 샘플과 네이티브(Rust) 샘플은 별개다 — 후자는 라이브 진입에 처음 디코드돼 지연을 만든다. 시작에 미리 데우고, 준비 신호(`audio_latency>0`)까지 로딩바를 묶는다.
- invoke가 작업 완료 전에 반환하면(디코드가 스레드에서 돎) 그 invoke를 await하지 말고 별도 준비 신호를 폴링한다.
