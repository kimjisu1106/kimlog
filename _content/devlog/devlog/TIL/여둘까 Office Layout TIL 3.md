---
layout: post
title: 여둘까 Office Layout TIL 3
date: 2026-06-29
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - HTML
  - WebAPI
  - Python
---
## Konva

### Transformer 리사이즈는 남는 scale을 mm에 구워넣어야 한다

Konva Transformer로 크기를 바꾸면 노드의 `scaleX`/`scaleY`가 그대로 남는다. 그 상태에서 또 조정하면 scale이 곱해지며 누적돼, 외곽선 두께·라벨까지 같이 늘어나 찌그러진다. 손을 뗀 순간(`transformend`)에 scale을 읽어 실측(mm)에 곱해 넣고, 노드를 다시 그려 scale을 1로 되돌리면 누적이 끊긴다. 화면 표현(scale)과 데이터(mm)를 분리하는 게 핵심이다.
요약: 도형을 늘린다 = 늘어난 크기의 mm를 계산해 기존 도형을 지우고 새로 그린다. 
이유: scale 값을 mm에 흡수시켜, 배율이 누적되지 않게

```js
node.on("transformend", () => {
  const sx = Math.abs(node.scaleX()), sy = Math.abs(node.scaleY());
  fx.w = fx.w * sx;       // scale을 mm 모델에 흡수
  fx.h = fx.h * sy;
  rebuildNode(node);      // buildNode가 scale=1로 새로 생성 → 누적 차단
});
```

---

### 그룹은 균등(비율 고정) 리사이즈만 가능하다 — shear를 표현할 수 없어서

노드의 변환은 `이동 · 회전 · 크기(scale)`뿐, 전단(shear) 항이 없다. 회전된 도형이 섞인 그룹을 한 변만 늘리면 직각이 무너진 평행사변형이 되는데, 이건 shear라서 이 모델(w/h/rot)로는 표현이 불가능하다. 그래서 그룹은 `keepRatio`로 비율을 고정하고, 비균등을 만드는 변(side) 핸들을 빼서 모서리 4개만 남겼다.

엄밀히는 절대 불가능한 건 아니다. 도형을 affine 행렬(`matrix(a,b,c,d,e,f)`)로 저장하고 `sceneFunc`로 직접 그리면 평행사변형도 표현할 수 있다. 다만 그러면 mm 기반 크기 입력·객체 스냅·내보내기를 전부 다시 손봐야 한다. 모델을 갈아엎으면 가능하지만 굳이 그럴 가치가 없어서 균등으로 제한한 것 — 표현 불가가 아니라 비용 대비 가치의 문제다.

```js
const isGroup = selectedNodes.length > 1;
tr.keepRatio(isGroup);                 // 균등 강제
tr.enabledAnchors(isGroup
  ? ["top-left", "top-right", "bottom-left", "bottom-right"]  // 모서리만 = 비균등 차단
  : ["top-left", "top-center", "top-right", "middle-right",
     "middle-left", "bottom-left", "bottom-center", "bottom-right"]);
```

---

### z-order는 children 순서가 곧 저장 순서다

겹침 순서를 별도 필드로 둘 필요가 없었다. Konva `mainLayer`의 children 배열 순서가 그대로 z-order이고, 저장 스냅샷도 그 순서대로 직렬화한다. 그래서 `moveToTop()` 류만 호출하면 저장·불러오기·undo에 자동으로 영속된다.

```js
function changeZOrder(op) {
  const ordered = selectedNodes.slice().sort((a, b) => a.zIndex() - b.zIndex());
  if (op === "top")    ordered.forEach(n => n.moveToTop());
  if (op === "bottom") ordered.slice().reverse().forEach(n => n.moveToBottom());
  // moveUp / moveDown ...
}
```

---

### cancelBubble은 "언제 막을지"를 조건부로

도형의 click 핸들러가 무조건 `cancelBubble = true`로 전파를 끊고 있었다. 그래서 거리·면적 측정 모드에서 도형 위를 클릭하면 stage 핸들러까지 이벤트가 못 가, 그 자리에 점이 안 찍혔다. 선택 모드일 때만 전파를 막도록 바꾸니, 측정 중엔 도형 위 클릭도 stage로 흘러가 점이 정상으로 찍힌다. `cancelBubble`(= stopPropagation)은 강력해서 무조건 쓰면 안 되고, 막을 조건을 정해야 한다.

```js
g.on("click", (e) => {
  if (mode !== "select") return;   // 측정·보정 중엔 stage로 통과
  e.cancelBubble = true;           // 선택 모드에서만 전파 중단
  selectNodes(getGroupMates(g));
});
```

---

## 기하

### 다각형 면적은 신발끈 공식(Shoelace)으로

범위를 다각형으로 받아 면적을 구할 때, 꼭짓점 좌표만으로 신발끈 공식을 쓰면 한 번에 계산된다. 인접한 두 점의 외적(`x_i·y_{i+1} − x_{i+1}·y_i`)을 모두 더해 절댓값의 절반이 면적이다. 좌표공간 px²로 나온 값을 `pxPerMm²`로 나누면 실제 면적(mm²)이 되고, 100만으로 나누면 m²가 된다.

```js
function polyAreaPx(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;   // 외적 누적
  }
  return Math.abs(a) / 2;
}
// 면적(mm²) = polyAreaPx / (pxPerMm  2),  1평 = 3.3058 m²
```

---

## 배포

### OG 이미지는 절대 URL이어야 카톡에서 뜬다 (+ 용량 최적화)

링크 공유 썸네일(`og:image`)에 상대경로를 넣으면 카카오톡 스크래퍼가 무시한다. 반드시 `https://도메인/...` 절대 URL로 줘야 한다. 또 OG 이미지가 5MB면 너무 커서 스크래퍼가 건너뛸 수 있어, PIL로 1200px·JPEG 85%로 줄였더니 84KB가 됐다(60배 감소). 

```python
from PIL import Image
im = Image.open("src.png").convert("RGB").resize((1200, 1200), Image.LANCZOS)
im.save("og.jpg", "JPEG", quality=85, optimize=True)   # 5MB → 84KB
```

```html
<meta property="og:image" content="https://office-layout.pages.dev/assets/og.jpg">
```

---

### PIL(Pillow) — 코드로 이미지를 다루는 파이썬 라이브러리

위에서 OG 이미지를 줄일 때 쓴 PIL은 Python Imaging Library, 코드로 이미지를 열고·편집하고·저장하는 라이브러리다. 말하자면 *코드로 돌리는 기본 포토샵*. 포맷 변환(PNG↔JPEG), 리사이즈·크롭·회전, 알파 제거(`convert("RGB")`), 필터, 텍스트 그리기까지 된다. 사람이 포토샵을 일일이 클릭하는 대신 스크립트로 자동·반복 처리할 때 쓴다(이미지 1장이든 1000장이든).

핵심은 `Image` 객체다. `Image.open()`으로 불러와 `.resize()`·`.convert()` 같은 메서드로 편집하고 `.save()`로 내보낸다.

```python
from PIL import Image
im = Image.open("a.png")       # 이미지 → 객체
im = im.resize((1200, 1200))   # 메서드로 편집
im.save("b.jpg")               # 저장
```

원조 PIL은 2011년 개발이 끊겼고, 지금 쓰는 건 그걸 이어받은 포크 Pillow다. 그런데 설치는 `pip install Pillow`, 코드는 `import PIL` 이다. PIL이라 쓰지만 실제론 Pillow.