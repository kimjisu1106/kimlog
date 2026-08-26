---
layout: post
title: MiniMacro TIL 1
date: 2026-08-15
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 마우스·키보드 자동화 툴을 만들며 배운 것 — 한 번만 정해지는 DPI 인식과 import 순서, 물리 픽셀 좌표계, 전역 후킹 녹화, tkinter의 스레드 경계, 그리고 비상 정지 설계.
tags:
  - Python
---
마우스·키보드 반복 작업 자동화 툴 MiniMacro(Python + tkinter)를 만들었다. tkinter는 파이썬에 기본으로 들어 있는 GUI 툴킷이다 — 창·버튼 같은 화면 요소를 코드로 만든다. 클릭을 흉내 내는 코드 자체보다 좌표계(DPI·듀얼 모니터)와 스레드 경계에서 더 많이 걸렸다. 정리한다.

---

## 좌표계와 듀얼 모니터

### 프로세스의 DPI 인식은 한 번만 정해진다

DPI 인식(DPI awareness)은 윈도우가 프로그램에게 화면 배율(125%, 150% 등)을 얼마나 그대로 알려줄지 정하는 프로세스 속성이다. 비인식 → 시스템 수준 → 모니터별(Per-Monitor V2) 순으로 정확해지는데, 프로세스당 최초 한 번만 설정할 수 있다.

함정은 pyautogui가 import되는 순간 스스로 시스템 수준으로 설정해 버린다는 것. 그 뒤에 모니터별 설정을 호출하면 조용히 실패하고, 모니터마다 배율이 다른 환경에서 재생 좌표가 배율만큼 어긋난다. 그래서 DPI 설정이 import보다 먼저 와야 한다.

```python
_set_dpi_awareness()  # Per-Monitor V2. 반드시 pyautogui보다 먼저

import pyautogui  # noqa: E402
```

지금 어느 수준인지는 아래로 확인할 수 있다. 1이면 시스템, 2면 모니터별이다.

```python
ctx = ctypes.windll.user32.GetThreadDpiAwarenessContext()
ctypes.windll.user32.GetAwarenessFromDpiAwarenessContext(ctx)
```

### 전역 후킹 좌표는 항상 물리 픽셀이다

저수준 마우스 훅(운영체제가 모든 마우스 이벤트를 프로그램에 흘려주는 통로)이 주는 좌표는 프로세스 설정과 무관하게 항상 물리 픽셀이다. 반면 커서를 옮기는 API(SetCursorPos)는 프로세스의 DPI 인식 수준에 따라 좌표를 다르게 해석한다.

그래서 "녹화된 좌표 값은 그대로인데 재생만 어긋난다"면 녹화가 아니라 실행 쪽 좌표 해석을 의심해야 한다. 프로세스를 모니터별 인식으로 올리면 두 좌표계가 물리 픽셀로 일치한다.

### pyautogui는 보조 모니터를 클릭하지 못한다

pyautogui는 마우스 좌표를 주 모니터 범위로 잘라내서(클램프), 보조 모니터 좌표(주 모니터 왼쪽·위에 있으면 음수)로 이동하면 가장자리에 걸린다. pynput의 마우스 컨트롤러는 가상 데스크톱 전체 좌표를 그대로 받으므로 이동·클릭 실행을 pynput으로 바꿔 우회했다. 키보드 입력은 모니터와 무관해 pyautogui를 그대로 쓴다.

```python
MOUSE = mouse.Controller()
MOUSE.position = (x, y)   # 음수 좌표 포함 가상 데스크톱 전체 지원
MOUSE.click(mouse.Button.left, 1)
```

### hover 메뉴 때문에 커서는 순간이동으로 옮긴다

커서를 경로를 따라 부드럽게 움직이면 도중에 다른 요소들을 지나며 hover 메뉴가 닫힌다. 좌표로 순간이동하면 경로가 없어 이 문제가 사라지고, 도착 지점의 hover 이벤트는 순간이동이어도 정상 발생한다. hover로 열리는 메뉴는 "이동 → 대기(메뉴 열릴 시간) → 클릭" 세 단계로 구성한다.

---

## 전역 입력 후킹과 녹화

### pynput 리스너로 앱 밖 입력까지 녹화한다

pynput의 Listener는 자기 창이 아니라 화면 전체의 마우스·키보드 이벤트를 후킹한다. 녹화는 이벤트를 시각과 함께 쌓았다가 단계 목록으로 변환하는 문제가 된다 — 이벤트 사이 0.3초 이상 간격은 대기 단계로, 0.4초·5px 안의 연속 클릭은 더블클릭 하나로 병합했다. 녹화 종료는 버튼이 아니라 키(F9)로 받는다. 종료 버튼을 클릭하면 그 클릭까지 녹화되기 때문이다.

```python
mouse.Listener(on_click=self._on_click).start()
keyboard.Listener(on_press=self._on_press, on_release=self._on_release).start()
```

### Ctrl 조합은 제어문자로 들어온다

Ctrl을 누른 채 문자 키를 누르면 후킹에는 'c'가 아니라 제어문자(Ctrl+C면 \x03)가 들어온다. 알파벳 26자에 1~26이 순서대로 대응하므로 96을 더해 원래 글자로 복원한다.

```python
# Ctrl 조합은 제어문자(\x01~\x1a)로 오므로 원래 글자로 복원
if self.mods and len(char) == 1 and 1 <= ord(char) <= 26:
    char = chr(ord(char) + 96)
```

### 한글 입력은 클립보드로 우회한다

pyautogui.write는 ASCII만 입력할 수 있어 한글 텍스트가 그냥 무시된다. pyperclip으로 클립보드에 복사한 뒤 ctrl+v를 보내면 어떤 문자든 들어간다. 대신 사용자의 클립보드 내용을 덮어쓰는 부작용이 있다.

```python
if text.isascii():
    pyautogui.write(text, interval=0.02)
else:
    pyperclip.copy(text)
    pyautogui.hotkey("ctrl", "v")
```

### IME 타이핑은 후킹으로 정확히 안 잡힌다

한글은 IME(입력기)가 자모 키 여러 개를 조합해 글자를 만든다. 후킹에는 조합되기 전의 키 이벤트만 보이므로 한글 타이핑을 녹화해도 재생이 정확하지 않다. 한글이 필요한 구간은 녹화 대신 텍스트 단계로 직접 넣는 게 정석이다.

---

## tkinter GUI

### 다른 스레드에서 위젯을 만지지 않는다

tkinter 위젯은 메인 루프가 도는 스레드에서만 조작해야 한다. pynput 콜백(리스너 스레드)이나 재생 스레드에서 화면을 바꾸고 싶으면 root.after로 메인 스레드에 작업을 넘긴다.

```python
def _record_done(self, new_steps):
    # pynput 스레드에서 호출되므로 tk 작업은 after로 넘긴다
    self.root.after(0, self._apply_recording, new_steps)
```

### Toplevel과 grab_set으로 모달 다이얼로그를 만든다

단계 추가/수정 창은 Toplevel(별도 창)에 grab_set을 걸어 모달(이 창을 닫기 전엔 본창 조작 불가)로 만들었다. 결과는 반환값이 아니라 콜백 함수로 전달한다 — 다이얼로그가 닫히는 시점과 호출부의 흐름이 분리된다.

```python
class StepDialog(tk.Toplevel):
    def __init__(self, parent, on_ok, step=None):
        super().__init__(parent)
        self.grab_set()
        self.on_ok = on_ok   # 확인 시 on_ok(step_dict) 호출
```

### Treeview로 목록 UI를 만든다

ttk.Treeview는 컬럼 있는 목록 위젯이다. 행마다 고유 id(iid)를 붙여 선택 행을 인덱스로 되돌리고, 더블클릭 이벤트에 수정 다이얼로그를 연결했다.

```python
self.tree = ttk.Treeview(frame, columns=("desc",), show="headings", selectmode="browse")
self.tree.insert("", "end", iid=str(i), values=(f"{i + 1}.  {desc}",))
self.tree.bind("<Double-1>", lambda e: self.edit_step())
```

### 입력 프레임 둘이 StringVar 하나를 공유한다

tkinter의 StringVar는 값이 바뀌면 바인딩된 모든 위젯에 반영된다. 클릭 프레임과 이동 프레임의 좌표 입력칸이 같은 StringVar를 물게 해서, F8 좌표 캡처가 어느 프레임이 떠 있든 한 코드로 채워지게 했다.

---

## 실행 제어

### 긴 대기는 쪼개서 자면서 중지 신호를 본다

time.sleep(30)을 통째로 자면 그동안 ESC를 눌러도 안 멈춘다. threading.Event를 중지 신호로 두고, 대기를 0.1초 단위로 쪼개 매번 신호를 확인하면 수십 초짜리 대기 중에도 즉시 멈춘다.

```python
def _sleep(self, seconds):
    end = time.time() + seconds
    while time.time() < end:
        if self.stop_event.is_set():
            return False
        time.sleep(min(0.1, end - time.time()))
    return True
```

### 자동 입력 툴은 비상 정지가 요구사항이다

재생이 시작되면 마우스를 툴이 계속 빼앗으므로 사용자가 화면의 정지 버튼을 누를 수 없다. 그래서 UI 밖의 정지 수단이 처음부터 있어야 한다 — ESC 전역 리스너와 커서 (0,0) 도달 검사를 이중으로 뒀다. pyautogui의 모서리 비상 정지(FAILSAFE)는 pyautogui 함수 호출에만 걸리므로, 마우스를 pynput으로 실행하면 직접 검사해야 한다.

### pythonw로 콘솔 없이 실행한다

python 대신 pythonw로 실행하면 콘솔 창 없이 GUI만 뜬다. bat 파일에서 start와 조합하면 더블클릭 실행기가 된다.

```text
start "" pythonw "%~dp0mini_macro.py"
```

### 재생은 목록 스냅샷으로 돈다

재생 스레드에 self.steps를 그대로 넘기면 재생 중 목록을 편집할 때 진행 중인 재생이 영향을 받는다. 시작 시점에 list()로 복사한 스냅샷을 넘기면 재생과 편집이 분리된다.

```python
play_steps = list(self.steps[start_index:])
threading.Thread(target=self._play_thread, args=(play_steps, ...)).start()
```
