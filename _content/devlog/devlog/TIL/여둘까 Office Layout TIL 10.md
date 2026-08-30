---
layout: post
title: 여둘까 Office Layout TIL 10
date: 2026-08-28
permalink: "devlog/devlog/TIL/여둘까 Office Layout TIL 10"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 조용한 성공이 실패처럼 보이는 이유, 초기 상태를 두 곳에서 정하면 생기는 버그, 그리고 설치 없이 브라우저를 자동으로 조작해 UI를 검사하는 법.
tags:
  - JavaScript
  - WebAPI
---
"저장이 안 된다"는 제보의 정체는 오류가 아니라 침묵이었다. 같은 날 브라우저를 자동으로 띄워 전 기능을 훑는 방법도 만들었다.

---

## 조용한 실패, 조용한 성공

### 결과를 안 보여주면 성공도 실패처럼 보인다

파일을 한 번 저장하고 나면 그다음부터는 선택창 없이 그 파일에 덮어쓴다. 코드로는 완벽한 성공이지만 화면에는 아무 변화가 없다. 사용자에게는 "눌렀는데 아무 일도 없다"와 똑같다.

```js
saveStatus("저장 중…");
// ...
saveStatus("저장됨 · " + handle.name + " · " + new Date().toLocaleTimeString());
```

기능이 끝나는 지점은 코드가 성공하는 곳이 아니라 사용자가 결과를 확인하는 곳이다. 특히 조용히 성공하는 경로일수록 표시가 필요하다.

---

### 오류도 화면에 띄운다

이 도구를 쓰는 사람이 개발자 도구를 열 이유는 없다. 어딘가 예외가 나면 콘솔에만 남고 화면은 멀쩡해 보이니, 결국 "눌러도 반응이 없다"로만 전달된다.

```js
window.addEventListener("error", (e) => reportError("오류", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => reportError("오류", e.reason));
```

파일 맨 앞에 둬야 초기화 도중 나는 오류까지 잡힌다. 상태줄이 아직 없을 수 있으니 그때는 경고창으로 대신한다.

---

### 초기 상태를 두 곳에서 정하면 "새로 열었을 때만" 다르다

모드를 바꾸는 함수가 화면 이동 잠금까지 정하는데, 그 함수가 시작할 때는 안 불렸다. 그래서 캔버스를 만들 때 준 초기값이 남아, 새로 연 창에서만 예전 동작을 했다. 모드 버튼을 한 번 누르면 고쳐지니 재현이 들쭉날쭉했다.

```js
const stage = new Konva.Stage({ ..., draggable: false });   // 생성값도 같은 결론으로
setMode("select");                                          // 초기화에서 한 번 부른다
```

상태를 정하는 곳은 하나여야 한다. 생성자에 초기값을 쓰더라도 그 값은 상태 함수의 결론과 같아야 하고, 시작할 때 그 함수를 한 번 부르는 편이 안전하다.

---

### 확정 시점이 다른 입력칸은 단위 변환에서 갈린다

설정에서 글자 크기를 500으로 고치고 단위를 바꾸면 500이 사라졌다. 단위를 바꾸면 모든 입력칸을 저장된 값 기준으로 다시 채우는데, 글자 크기는 「저장」을 눌러야 확정되는 칸이라 아직 확정 안 된 입력이 그때 덮인 것이다.

```js
// 단위를 바꾸기 전에, 칸에 적힌 값을 옛 단위로 먼저 확정한다
titleFs = Math.max(10, fromUnit(+document.getElementById("titleFs").value) || titleFs);
distUnit = e.target.value;
applyUnitToInputs();
```

같은 화면의 격자 칸은 값이 바뀔 때마다 확정돼 멀쩡했다. 입력칸을 새로 만들 때는 "언제 모델에 들어가는가"를 정하고, 표시를 갈아엎는 동작보다 먼저 확정할 것.

---

## 설치 없이 브라우저를 자동으로 조작하기

### 노드 내장 WebSocket으로 개발자 프로토콜에 직접 말한다

빌드도 테스트 도구도 없는 프로젝트라 테스트 프레임워크를 넣기 부담스러웠다. 그런데 크롬을 디버깅 포트로 띄우면 그 프로토콜(CDP)은 그냥 WebSocket이고, 요즘 노드에는 WebSocket이 내장돼 있다. 설치가 아예 필요 없다.

```bash
chrome --headless=new --remote-debugging-port=9333 --user-data-dir=<임시>
```

```js
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const ws = new WebSocket(list.find(t => t.type === "page").webSocketDebuggerUrl);
ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: "..." } }));
```

`Input.dispatchMouseEvent`·`dispatchKeyEvent`로 진짜 마우스와 키를 보내고, `Page.captureScreenshot`으로 눈으로도 확인한다.

---

### 테스트 전에 캐시를 꺼야 한다

고친 파일을 테스트한다고 믿어도 결과가 그대로일 수 있다. 브라우저가 예전 스크립트를 캐시하기 때문이다.

```js
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
```

이걸 안 켜면 "고쳤는데 안 고쳐졌다"는 가짜 결론이 나온다. 사람이 손으로 확인할 때 강력 새로고침이 필요한 것과 같은 이유다.

---

### 드래그와 파일 선택은 페이지 안에서 만들어 넣는다

HTML5 드래그(팔레트에서 캔버스로 끌어다 놓기)는 마우스 이벤트만으로는 재현되지 않는다. 페이지 안에서 이벤트를 직접 만들어 보내는 편이 확실하다.

```js
const dt = new DataTransfer();
el.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
cont.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt, clientX, clientY }));
```

파일 선택도 같은 방식으로 흉내 낸다. 실제 파일 객체를 만들어 입력칸에 넣고 변경 이벤트를 쏘면, 고르는 창만 건너뛴 채 앱의 코드 경로는 그대로 탄다.

```js
const dt = new DataTransfer();
dt.items.add(new File([바이트], "plan.png", { type: "image/png" }));
input.files = dt.files;
input.dispatchEvent(new Event("change", { bubbles: true }));
```

---

### 내려받기를 폴더로 받으면 저장 왕복까지 검사된다

저장이 진짜 되는지 보려면 파일 내용을 읽어야 한다.

```js
await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: 폴더, eventsEnabled: true });
```

받은 파일을 열어 설정값이 들어갔는지 확인하고, 그 내용을 다시 페이지에 떨어뜨려 복원되는지까지 보면 저장·불러오기 왕복이 한 번에 검사된다. 암호를 건 파일도 같은 방식으로 확인했다.

---

### 헤드리스가 못 하는 것은 다른 브라우저를 흉내 내 우회한다

파일 선택창(File System Access)은 헤드리스에서 뜨지 않는다. 그 경로는 사람이 확인할 수밖에 없다. 대신 그 기능이 없는 브라우저인 척하면 내려받기 경로를 검사할 수 있다.

```js
await send("Page.addScriptToEvaluateOnNewDocument", { source: "delete window.showSaveFilePicker;" });
```

앱이 기능 유무를 보고 갈라지게 짜여 있으면, 이렇게 한 줄로 다른 환경을 재현할 수 있다. 대화상자도 `Page.javascriptDialogOpening`으로 받아 원하는 값을 넣어 준다.

---

### 전역 라이브러리가 있으면 내부를 못 봐도 검증은 된다

앱 코드는 모듈이라 바깥에서 함수를 부를 수 없다. 하지만 캔버스 라이브러리가 전역이라, 그려진 결과는 얼마든지 읽을 수 있다.

```js
Konva.stages[0].getLayers()[2].getChildren().map(n => n._fx);
```

도형 개수·좌표·선 굵기·반전 부호까지 직접 확인하니, 화면 캡처를 눈으로 보는 것보다 정확한 판정이 된다. 라이브러리를 전역으로 쓰는 구조가 테스트에서는 이점이 됐다.
