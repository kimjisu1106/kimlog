---
layout: post
title: MiniMacro TIL 2
date: 2026-08-18
permalink: "lh80he8p"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: tkinter 창을 clam 테마로 다시 칠하며 배운 것 — 테마가 몰래 걸어둔 기본값, 배치 순서가 공간을 가르는 규칙, 떠 있는 창과 단축키 캡처, 그리고 자동 검증이 닿지 않는 자리.
tags:
  - Python
---
MiniMacro의 창을 시안대로 다시 짰다. 윈도우 기본 위젯을 쓰던 것을 직접 칠하는 테마로 갈아탔는데, 함정은 그리는 쪽이 아니라 테마가 미리 걸어둔 기본값과 배치 순서에 있었다. 정리한다.

---

## 직접 칠하는 테마로 갈아타며

tkinter(파이썬에 기본 포함된 GUI 툴킷)의 ttk 위젯은 테마가 그린다. 윈도우 기본 테마(vista)는 OS가 그려서 색을 바꿀 수 없고, 색을 직접 정하려면 clam으로 갈아타야 한다. 대신 갈아탄 순간부터 모든 위젯을 직접 칠해야 한다.

```python
style = ttk.Style()
style.theme_use("clam")
```

### 테마가 몰래 걸어둔 기본값이 레이아웃을 망친다

바꾸자마자 버튼이 전부 뚱뚱해지고, 편집 줄의 끝 버튼 두 개가 창 밖으로 밀려났다. 글자는 두 글자인데 버튼은 112px이었다.

원인은 clam이 버튼에 걸어둔 기본값이었다. 스타일 값을 직접 물어보니 드러났다.

```python
ttk.Style().lookup("TButton", "width")   # -11
```

`width`가 음수면 "최소 이만큼"이라는 뜻이라, 모든 버튼이 최소 11글자 폭을 차지하고 있었다. 0으로 풀어야 글자에 맞는 폭이 나온다.

지정하지 않은 값이 이미 들어 있을 수 있다는 것 — 새 테마로 갈아탈 때 가장 먼저 의심할 자리다. `lookup()`으로 물어보면 바로 보인다.

### 테두리는 지정만으로 그려지지 않는다

테두리 색을 줬는데도 흰 헤더 위의 흰 버튼이 통째로 보이지 않았다. 색은 맞게 넣었지만 `relief`(테두리를 어떤 모양으로 그릴지)가 `flat`이면 아예 안 그린다. 색은 "그릴 때 쓸 색"이지 "그리라는 지시"가 아니다.

```python
style.configure("TButton", bordercolor=BORDER,
                relief="solid", borderwidth=1, width=0, padding=(11, 5))
```

### 스타일 이름은 점으로 상속된다

`Small.TButton`처럼 점 앞에 단어를 붙이면 `TButton`의 설정을 물려받고, 다시 지정한 것만 덮어쓴다. 그래서 색을 다시 적을 필요 없이 여백만 바꾸면 된다.

```python
style.configure("Small.TButton", padding=(9, 4))   # 색·테두리는 TButton에서 상속
```

### 얇은 선은 진행 막대 위젯으로 안 나온다

3px짜리 얇은 진행선을 만들려다 두 번 실패했다. 두께를 줄이면 위젯의 테두리가 높이를 먹어 선이 2px로 잘렸고, 테두리를 0으로 없애니 이번엔 채워지는 부분이 아예 안 그려졌다.

결국 캔버스에 사각형 둘로 직접 그렸다. 배경은 위젯 자체의 색, 채움은 사각형 하나.

```python
self.progress = tk.Canvas(parent, height=3, bg="#e4e6ea", highlightthickness=0)
self._fill = self.progress.create_rectangle(0, 0, 0, 3, fill=ACCENT, outline=ACCENT)
```

위젯이 안 되는 모양을 억지로 맞추기보다 직접 그리는 게 짧고 확실할 때가 있다. 판단 기준은 "상호작용이 필요한가"다. 진행선은 보여주기만 하니 캔버스로 충분하다.

---

## 배치

### 자동 크기를 끄면 높이도 직접 줘야 한다

숫자가 바뀔 때마다 막대 폭이 들썩이는 게 싫어 크기를 고정했다. 그런데 폭만 주고 높이를 빼먹으니 세로로 찌그러져 글자가 잘리고 진행선이 사라졌다.

`pack_propagate(False)`는 "자식에 맞춰 늘어나지 마라"라서, 폭뿐 아니라 높이도 지정한 값을 그대로 쓴다. 한쪽만 주면 다른 쪽은 거의 0이 된다.

```python
text_col = tk.Frame(pad, width=250, height=36)
text_col.pack(side="left")
text_col.pack_propagate(False)   # 폭·높이 둘 다 준 뒤에 끈다
```

### 화면에 자리 잡기 전에는 폭이 1이다

캔버스에 진행선을 그렸는데 계속 0으로 보였다. 채울 길이를 위젯 폭에서 계산했는데, 그 시점엔 아직 배치가 끝나지 않아 폭이 1이었다.

크기가 정해질 때 알려주는 신호(`<Configure>`)에 다시 그리기를 걸어 두면 해결된다. 비율만 기억해 두고, 폭이 정해질 때마다 그 비율로 다시 그린다.

```python
self._percent = 0.0
self.progress.bind("<Configure>", lambda _e: self._draw_fill())

def _draw_fill(self):
    width = self.progress.winfo_width()
    self.progress.coords(self._fill, 0, 0, width * self._percent / 100.0, 3)
```

### 배치 순서가 공간을 가른다

상태줄을 "아래쪽"으로 붙였는데 화면에 안 나왔다. `side="bottom"`은 위치를 정할 뿐이고, 공간은 먼저 배치된 순서대로 가져간다. 본문을 남는 공간 전부 차지하게(`expand=True`) 먼저 붙여 버리면 뒤에 오는 것에게 줄 자리가 없다.

그래서 늘어나는 본문은 항상 마지막에 붙인다.

```python
self._build_header()      # 위
self._build_status()      # 아래 — 본문보다 먼저 자리를 잡아야 한다
body.pack(fill="both", expand=True)   # 남은 공간 전부
```

### 목록은 줄 단위까지만 칠할 수 있다

목록 줄마다 종류별로 색 띠를 두려 했는데, 표 위젯(Treeview)은 줄에 태그를 붙여 글자색·배경색을 바꿀 수 있을 뿐 칸 하나만 따로 칠하거나 줄 앞에 색 막대를 두는 건 안 된다. 하려면 줄마다 작은 그림을 만들어 붙여야 한다.

할 수 있는 선까지만 쓰기로 하고 색 띠는 뺐다. 대기 줄은 흐리게, 꺼둔 줄은 더 흐리게, 실행 중인 줄만 강조색으로 — 줄 단위 태그로 충분했다.

```python
self.tree.tag_configure("wait", foreground=MUTED)
self.tree.tag_configure("off", foreground=FAINT)
self.tree.tag_configure("current", background=ACCENT_TINT, foreground=ACCENT)
```

---

## 위젯과 입력

### 탭으로 나누고, 상태는 위치에서 끌어낸다

단계 종류를 고르는 라디오 버튼 일곱 개가 한 줄에 늘어서 있던 걸 마우스·키보드·대기 세 탭으로 나눴다. 이때 "지금 무슨 종류인가"를 따로 저장하지 않고 화면 상태에서 끌어냈다. 어느 탭이 열려 있는지와 그 탭 안에서 무엇을 골랐는지를 합치면 답이 나온다.

```python
def _current_type(self):
    tab = self.nb.index(self.nb.select())
    if tab == 0:
        return self.mouse_action.get()
    if tab == 1:
        return self.key_action.get()
    return "wait"
```

같은 것을 두 군데(변수와 화면)에 두면 어긋나는 순간이 오는데, 한쪽에서 끌어내면 어긋날 수가 없다.

### 눌러 나눈 버튼은 버튼과 메뉴를 붙여 만든다

버튼 본체는 기본 동작, 옆 화살표는 선택지를 여는 형태를 만들었다. 전용 위젯은 없고 버튼 둘을 붙인 뒤 화살표에 메뉴를 다는 식이다. 메뉴는 버튼 아래 좌표를 계산해 띄운다.

```python
def _popup_play_menu(self):
    self.play_menu.entryconfigure(
        1, state="normal" if self.selected_indices() else "disabled")
    self.play_menu.tk_popup(
        self.play_btn.winfo_rootx(),
        self.play_arrow.winfo_rooty() + self.play_arrow.winfo_height() + 2)
```

띄우기 직전에 조건을 보고 항목을 잠그는 것도 여기서 한다. 목록에서 아무것도 안 골랐으면 "선택한 단계부터"는 흐리게 둔다.

### 항상 위에 떠 있는 작은 창

재생·녹화 중에 진행 상황을 보여줄 작은 막대를 별도 창으로 만들었다. 제목 표시줄을 없애고 항상 위로 올리면 된다.

```python
self.overrideredirect(True)        # 제목 표시줄·테두리 없앰
self.attributes("-topmost", True)  # 항상 위
```

대신 제목 표시줄이 없으면 끌어서 옮길 수도 없다. 옮기는 기능을 직접 달아야 한다. 누른 지점과 창 위치의 차이를 기억했다가, 마우스가 움직이는 동안 그 차이를 유지하도록 창을 옮긴다.

```python
def _drag_start(self, event):
    self._dx = event.x_root - self.winfo_x()
    self._dy = event.y_root - self.winfo_y()

def _drag_move(self, event):
    self.geometry(f"+{event.x_root - self._dx}+{event.y_root - self._dy}")
```

자동 입력 툴에서 이 이동 기능은 편의가 아니라 필요다. 막대가 매크로가 클릭할 자리를 가리면 곤란하기 때문이다.

### 단축키 캡처는 조합키가 아닌 키에서 끝난다

키 이름을 외워 타이핑하는 대신 실제로 눌러서 채우게 만들었다. 구현은 "조합키는 모아두고, 조합키가 아닌 키가 눌리면 그때 조합을 완성해 끝낸다"가 전부다.

```python
if name in CAPTURE_MODIFIERS:
    self.capture_mods.add(CAPTURE_MODIFIERS[name])
    return          # 조합키만으로는 안 끝난다
...
self.after(0, self._finish_key_capture, combo_string(self.capture_mods, main))
```

그래서 `ctrl+alt+shift`처럼 조합키만으로 된 단축키는 이 방식으로 잡을 수 없다. 끝나는 시점을 알 수 없기 때문이다. 한계로 남기고 그건 직접 적게 뒀다.

shift는 한 겹 더 있다. `shift+tab`은 조합으로 잡아야 맞지만, `shift+1`은 후킹에 이미 `!`로 들어온다. 여기서 shift를 남기면 `shift+!`가 되어 엉뚱한 게 입력된다.

```python
# '!'처럼 shift가 이미 글자에 반영된 경우엔 shift를 빼야 그 글자가 나온다
if not main.isalpha() and self.capture_mods == {"shift"}:
    self.capture_mods = set()
```

---

## 설계와 검증

### 녹화 중 화면에 버튼을 두면 그 클릭까지 녹화된다

녹화 막대에도 재생 막대처럼 종료 버튼을 달려다 뺐다. 녹화 중에는 화면의 모든 클릭이 기록되니, 그 버튼을 누르는 클릭도 시나리오에 들어간다.

그래서 녹화 막대에는 "F9로 종료"라는 안내 글자만 두고 종료는 키로만 받는다. 재생 중에는 기록하지 않으니 중지 버튼을 그대로 둬도 된다.

같은 화면 요소라도 그 순간 프로그램이 무엇을 하고 있느냐에 따라 놓을 수 있고 없고가 갈린다.

### 돌아가는 동안은 잠그고, 기억한 것은 드러낸다

재생 중에는 편집 버튼과 설정 입력을 한꺼번에 잠근다. 잠글 위젯을 만들 때 목록에 모아두면 한 줄로 끝난다.

```python
def _set_locked(self, locked, note=""):
    state = "disabled" if locked else "normal"
    for w in self.edit_btns + self.setting_widgets:
        w.config(state=state)
```

반대로 드러내야 하는 것도 있다. 재생 시작점(처음부터 / 선택한 단계부터)을 기억하게 만들었는데, 기억만 하고 표시하지 않으면 어제 고른 값 때문에 오늘 엉뚱한 데서 시작한다. 마우스를 실제로 움직이는 도구에서 그건 사고다. 그래서 기억한 값을 버튼 글자에 그대로 띄웠다.

```python
def _sync_play_button(self):
    self.play_btn.config(text="▶ 선택부터" if self.play_from_selected else "▶ 재생")
```

편의를 위한 기억은 눈에 보여야 안전하다.

### 다른 스레드의 예약은 창이 돌고 있을 때만 된다

작업 스레드에서 화면을 바꿀 때는 메인 스레드로 넘겨야 한다(`root.after`). 그런데 이걸 테스트하려고 창을 짧게 갱신하는 방식(`update()` 반복)으로 돌렸더니 이렇게 죽었다.

```text
RuntimeError: main thread is not in main loop
```

`after`로 예약하려면 창의 이벤트 루프(`mainloop`)가 실제로 돌고 있어야 한다. 실제 앱은 `mainloop`으로 도니 문제가 없고, 문제는 테스트 방식이었다. 그래서 검증도 `mainloop` 안에서 `after`로 단계를 이어 붙이는 식으로 바꿨다.

```python
def run(i=0):
    if i >= len(script):
        root.destroy()
        return
    fn, delay = script[i]
    fn()
    root.after(delay, run, i + 1)

root.after(200, run)
root.mainloop()
```

검증 환경이 실제 실행 환경과 다르면, 코드가 아니라 검증이 틀렸을 수 있다.

### 녹화를 단계로 바꾸는 건 판정 문제다

녹화는 이벤트를 그대로 저장하는 게 아니라 "사람이 뭘 하려던 건지"로 바꾸는 일이다. 규칙 몇 개로 정리했다.

- 누른 좌표와 뗀 좌표가 8px 넘게 벌어지면 클릭이 아니라 드래그
- 0.4초·5px 안의 연속 클릭은 더블클릭 하나로
- 가까운 자리에서 이어진 휠 이벤트는 한 단계로 합침
- 0.3초 이상 벌어진 간격은 대기 단계로

```python
if abs(int(x) - x0) > DRAG_MIN or abs(int(y) - y0) > DRAG_MIN:
    self.events.append(("drag", t0, x0, y0, int(x), int(y), btn))
else:
    self.events.append(("click", t0, x0, y0, btn))
```

숫자는 전부 임의로 정한 값이라 언제든 어긋날 수 있다. 그래서 녹화 결과를 그대로 쓰게 두지 않고 목록에서 고칠 수 있게 두는 게 중요하다. 판정이 틀려도 사람이 고치면 되는 구조면 판정을 완벽하게 만들 필요가 없다.
