---
layout: post
title: 여둘까 Office Layout TIL 6
date: 2026-08-04
permalink: "tvp13oqx"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 캔버스 글자에 배경을 깔아 읽히게 만드는 법, 브라우저 저장소에 무엇까지 남겨도 되는지 가르는 기준, 표시 단위를 저장 단위와 분리하는 법, 그리고 파일 확장자를 바꾸면서 옛 파일을 안 버리는 법.
tags:
  - JavaScript
  - HTML
  - CSS
  - WebAPI
---
도면 위 숫자가 안 읽히는 것과, 남의 파일을 열었더니 내 팔레트가 바뀐 채 남아 있던 것을 고쳤다. 앞은 캔버스 그리기 문제였고 뒤는 "이 값의 주인이 누구인가"를 정하는 문제였다. 이어서 거리 단위를 고를 수 있게 만들면서, 보여주는 단위와 저장하는 단위를 어디서 갈라야 하는지도 정리했다.

---

## 캔버스 라벨

### 글자 크기에 맞춰 배경이 따라 늘어나는 라벨 — Konva.Label

캔버스에 글자만 그리면 밑에 깔린 그림과 겹쳐 안 읽힌다. 배경을 깔아야 하는데, 사각형을 따로 그리면 글자 길이가 바뀔 때마다 크기를 맞춰줘야 한다.

Konva(캔버스 2D 라이브러리)의 `Label`은 그 짝을 묶어준다. `Label` 안에 배경 역할의 `Tag`와 `Text`를 넣으면, Tag가 Text 크기에 맞춰 자동으로 늘어난다.

```js
const lb = new Konva.Label({ x, y, name });
lb.add(new Konva.Tag({ fill: "rgba(255,255,255,0.92)", stroke: COL.primary }));
lb.add(new Konva.Text({ text, fontFamily: CANVAS_FONT, fill: COL.primary }));
```

Tag를 먼저, Text를 나중에 넣는다. 그리는 순서가 곧 쌓이는 순서라 반대로 넣으면 배경이 글자를 덮는다.

---

### Tag가 알아서 다시 맞춰지는 이유

Label은 자식 Text가 붙을 때 그 Text의 변경 이벤트를 구독한다. `text`, `fontSize`, `padding`, `fontFamily` 같은 크기에 영향 주는 속성이 바뀌면 Label이 Tag 크기를 다시 계산한다.

그래서 줌이 바뀔 때 글자 크기만 바꿔주면 배경은 따라온다. 배경 크기를 직접 계산하는 코드가 필요 없다.

```js
lb.getText().fontSize(14 / s).padding(4 / s); // ← Tag 크기는 여기서 자동 갱신
```

`getText()`/`getTag()`로 자식에 접근한다. 자식을 배열 인덱스로 찾는 것보다 안전하다.

---

### 줌 보정은 글자 크기만이 아니다

앞서 측정선·점·글자를 `1 / scale`로 나눠 화면상 크기를 고정했는데, 배경 칩을 붙이면서 보정할 값이 늘었다. 안여백(padding), 테두리 두께, 모서리 반경, 위치 오프셋까지 전부 좌표공간 값이다.

```js
function layoutMeasureLabel(lb, s) {
  lb.getText().fontSize(14 / s).padding(4 / s);
  lb.getTag().strokeWidth(1 / s).cornerRadius(3 / s);
  // 오프셋도 좌표공간 값이라 함께 환산
  lb.offset({ x: lb.width() / 2, y: lb.height() + 6 / s });
}
```

하나라도 빼먹으면 확대했을 때 그것만 두껍게 부푼다. 여백을 빼먹으면 확대할수록 글자에 배경이 달라붙고, 테두리를 빼먹으면 선이 굵어진다.

기준은 단순하다. 화면에서 몇 픽셀로 보여야 하는 값은 전부 `1 / scale`을 곱한다. 실제 크기(mm)에서 나온 값만 그대로 둔다.

---

### 배치는 offset 하나로 갈라 쓴다

거리 숫자는 선 한가운데 위에, 면적 숫자는 도형 한가운데에, 미리보기는 커서 옆에 붙어야 한다. 위치를 셋 다 따로 계산하는 대신, 좌표는 기준점 그대로 두고 offset만 다르게 준다.

```js
if (place === "center") lb.offset({ x: lb.width() / 2, y: lb.height() / 2 });
else if (place === "above") lb.offset({ x: lb.width() / 2, y: lb.height() + 6 / s });
else lb.offset({ x: -10 / s, y: -10 / s }); // 커서 오른쪽 아래
```

offset은 "그릴 때 이만큼 빼고 그린다"는 뜻이라, 양수를 주면 왼쪽·위로 당겨지고 음수를 주면 오른쪽·아래로 밀린다. 중앙 정렬이 `width / 2`인 이유가 이것이다.

---

### 재계산에 필요한 정보는 노드에 붙여 둔다

줌이 바뀌면 이미 만들어 둔 라벨들을 다시 배치해야 하는데, 그때 "이 라벨은 중앙이었나 위였나"를 알아야 한다. Konva 노드는 임의 속성을 담을 수 있어서 만들 때 같이 적어 둔다.

```js
lb.setAttr("place", place);
// 나중에
const place = lb.getAttr("place");
```

바깥에 별도 맵(Map)을 두고 노드와 짝지어 관리하지 않아도 된다. 노드가 사라지면 정보도 같이 사라지는 것도 장점이다.

---

## 저장 상태의 소유권

### 저장소에는 "현재 상태"가 아니라 "내가 바꾼 것"만 넣는다

가구 프리셋(팔레트 기본값)은 사용자가 편집할 수 있고, 그 값을 localStorage(브라우저에 남는 저장소)에 넣어 다음 방문에도 유지했다. 문제는 저장하는 방식이었다.

```js
// ❌ 지금 적용된 팔레트 전체를 통째로 저장
localStorage.setItem("presetOverrides", JSON.stringify(presetOverrideMap()));

// ✅ 내가 편집한 항목만 저장
myOverrides[it.key] = { name: it.name, w: it.w, h: it.h, color: it.color };
localStorage.setItem("presetOverrides", JSON.stringify(myOverrides));
```

전자는 "지금 화면에 뭐가 있든 그게 내 설정"이라는 뜻이다. 그래서 남의 파일에서 온 값이 화면에 적용된 채로 저장이 한 번 돌면, 그 값이 내 설정이 되어 버린다. 실제로 다른 사람이 바꾼 가구가 내 팔레트에 눌러앉았다.

저장할 때는 "이 값이 어디서 왔는가"를 물어야 한다. 출처를 안 따지는 저장은 언젠가 남의 것을 내 것으로 만든다.

---

### 기본값 스냅샷은 오버라이드를 적용하기 전에 떠 둔다

되돌리려면 원래 값이 필요한데, 오버라이드를 한 번 적용하고 나면 코드에 있던 원본은 이미 덮여 사라진 뒤다.

```js
const PRESET_DEFAULTS = presetOverrideMap(); // 오버라이드 적용 전에 뜬다
let myOverrides = {};

function restoreMyPresets() {
  applyPresetOverrides(PRESET_DEFAULTS); // 먼저 원본으로
  applyPresetOverrides(myOverrides); // 그 위에 내 편집만
}
```

되돌리기는 "차감"이 아니라 "다시 쌓기"로 만든다. 적용한 걸 벗겨내려 하면 무엇을 얼마나 벗길지 추적해야 하지만, 원본에서 다시 쌓으면 추적할 게 없다.

---

### 부분만 저장해도 옛 저장값이 안 깨진 이유

저장 형식을 전체 맵에서 변경분만으로 바꿨는데, 이미 브라우저에 전체 맵이 들어 있는 사용자도 그대로 동작했다. 적용 함수가 처음부터 "있는 것만 덮어쓰는" 모양이었기 때문이다.

```js
function applyPresetOverrides(m) {
  PRESETS.forEach((g) => g.items.forEach((it) => {
    const o = m && m[it.key];
    if (o) { /* 있는 필드만 덮어쓴다 */ }
  }));
}
```

전체 맵이든 한 개짜리든 똑같이 통한다. 읽는 쪽을 "빠진 건 그냥 넘어간다"로 만들어 두면 쓰는 쪽 형식을 나중에 줄여도 마이그레이션이 필요 없다.

---

### 남에게 받은 기본값은 어디까지 적용할지 정해야 한다

프로젝트 파일에 팔레트를 함께 담은 것은 파일을 주고받는 사람끼리 같은 가구 목록을 쓰게 하려는 의도였다. 의도는 맞았는데 범위가 없었다.

적용 범위는 세 단계로 나뉜다.

- 이 프로젝트에만 — 파일을 닫거나 새로 만들면 내 것으로 복귀
- 이번 방문에만 — 새로고침하면 복귀
- 영구히 — 브라우저에 저장

파일에서 온 값은 첫 번째가 맞다. 남의 파일 하나가 내 도구의 기본값을 영구히 바꾸면, 사용자는 자기가 언제 그걸 승낙했는지도 모른다. 확인창을 띄웠더라도 그 창은 "이 파일을 열까요" 정도로 읽힌다.

---

### 거절한 값도 버리지 않는다

확인창에서 취소를 누르면 파일의 프리셋을 안 쓴다. 그런데 취소를 실수로 눌렀거나, 나중에 마음이 바뀔 수 있다. 그때 파일을 다시 여는 것 말고 방법이 없으면 곤란하다.

```js
filePresets = d.presets || null; // 거절해도 들고 있는다
updatePresetLoadBtn(); // 있으면 버튼 활성, 없으면 비활성
```

거절은 "지금 적용하지 않는다"이지 "존재를 지운다"가 아니다. 되돌릴 수 있게 만들면 확인창의 부담도 같이 줄어든다.

---

## 파일 확장자

### 커스텀 확장자를 저장 대화상자에 등록하기

프로젝트 파일이 `.json`이라 내려받기 폴더에서 다른 JSON들과 구분이 안 됐다. 내용은 그대로 두고 확장자만 `.ol`로 바꿨다.

File System Access API(브라우저가 파일을 직접 읽고 쓰게 해주는 API)의 저장 대화상자는 확장자 목록을 받는다.

```js
const PROJ_TYPES = [
  { description: "여둘까 배치도", accept: { "application/json": [".ol", ".json"] } },
];

await window.showSaveFilePicker({
  suggestedName: safeFileName(name) + ".ol", // 목록에 있는 확장자여야 그대로 붙는다
  types: PROJ_TYPES,
});
```

MIME 타입(파일 종류를 나타내는 문자열) 자리는 실제 내용에 맞춰 두면 된다. 내용이 JSON이니 `application/json`을 그대로 쓰고, 확장자만 커스텀으로 준다. `suggestedName`의 확장자가 목록에 없으면 브라우저가 제 마음대로 바꿔 붙일 수 있다.

---

### 확장자를 바꿔도 옛 파일이 열리게

이미 저장해 둔 `.json` 파일이 있으므로, 쓰기는 새 확장자로 하되 읽기는 둘 다 받아야 한다.

```js
const PROJ_EXT = ".ol"; // 저장은 항상 새 확장자
const PROJ_EXT_RE = /\.(ol|json)$/i; // 파일명에서 확장자 떼기는 둘 다
```

파일명에서 프로젝트 이름을 뽑을 때 옛 정규식(`/\.json$/i`)을 그대로 두면 `내도면.ol`이 이름 그대로 남는다. 확장자를 바꿀 때는 저장·열기 필터뿐 아니라 이름을 다루는 곳까지 같이 훑어야 한다.

---

### input accept에도 커스텀 확장자를

File System Access API를 지원하지 않는 브라우저는 숨겨둔 `<input type="file">`로 넘어간다. 그쪽 필터도 같이 고쳐야 한다.

```html
<input type="file" id="loadUpload" accept=".ol,.json,application/json" hidden />
```

accept는 강제가 아니라 필터라 사용자가 "모든 파일"로 바꾸면 무엇이든 고를 수 있다. 그래도 목록에 넣어두지 않으면 정상 파일이 회색으로 비활성돼 보여 사용자가 먼저 막힌다.

---

### 확장자만 바꾸면 무엇이 달라지나

바뀌는 것은 사람과 운영체제가 파일을 알아보는 방식뿐이다. 폴더에서 구분되고, 더블클릭했을 때 연결 프로그램을 지정할 수 있고, 텍스트 편집기가 JSON으로 색칠하지 않는다.

바뀌지 않는 것은 내용이다. 파싱도 그대로고, 이름만 `.json`으로 되돌리면 전과 똑같이 열린다. 확장자는 파일 안에 든 것을 바꾸지 않는다.

그래서 "포맷을 바꿨다"고 말하면 안 된다. 바꾼 것은 표시일 뿐이다.

---

## 표시 단위와 저장 단위

### 단위는 경계에서만 바꾼다

거리를 mm·cm·m 중에 골라 볼 수 있게 했다. 이때 모델까지 단위를 따라가게 만들면, 저장된 파일마다 숫자의 뜻이 달라져 나중에 무엇이 밀리미터고 무엇이 미터인지 알 수 없게 된다.

계산과 저장은 밀리미터 하나로 고정하고, 화면에 쓸 때와 입력을 읽을 때만 환산한다.

```js
const UNIT_DIV = { mm: 1, cm: 10, m: 1000 };
function toUnit(mm) { return +(mm / UNIT_DIV[distUnit]).toFixed(UNIT_DEC[distUnit]); }
function fromUnit(v) { return v * UNIT_DIV[distUnit]; }

// 채울 때
document.getElementById("pW").value = toUnit(fx.w);
// 읽을 때
fx.w = Math.max(10, fromUnit(+document.getElementById("pW").value) || fx.w);
```

이 도구는 원래 화면 픽셀과 실제 mm를 분리해 두고 있었다. 표시 단위는 그 위에 얹는 세 번째 층이다. 층을 하나 더 쌓아도 아래층이 안 흔들리면 바꾸는 값은 늘 한 곳이다.

---

### 왕복해도 값이 안 깎이려면 단위별 소수 자리를 정한다

1234mm를 미터로 보여주려고 `toFixed(2)`를 쓰면 1.23이 되고, 그 값을 그대로 저장하면 1230mm가 된다. 보기만 하고 저장은 안 할 때는 문제가 없지만, 입력칸은 채운 값이 곧 다음 저장값이라 손실이 그대로 남는다.

```js
const UNIT_DEC = { mm: 0, cm: 1, m: 3 }; // 1mm까지 표현되는 자리수
```

기준은 단순하다. 가장 작은 단위(1mm)가 표현되는 소수 자리를 준다. cm는 한 자리, m는 세 자리다. 끝의 0은 숫자로 바꾸면서 저절로 떨어져 나가니 `1.2`처럼 깔끔하게 보인다.

보여주기용 반올림과 저장용 값은 다르다. 둘이 같은 칸을 쓰는 순간 반올림이 곧 데이터 손실이 된다.

---

### 입력칸은 값만 바꾸면 끝이 아니다

단위를 바꾸면 딸린 것이 여럿이다. 라벨 글자, 화살표 증감 폭, 최솟값, 그리고 이미 열려 있는 패널의 값까지.

```js
function applyUnitToInputs() {
  document.querySelectorAll(".unit-label").forEach((el) => { el.textContent = distUnit; });
  ["pW", "pH", "pmW", "pmH", "gridInput"].forEach((id) => {
    document.getElementById(id).step = UNIT_STEP[distUnit]; // mm 10 / cm 1 / m 0.01
  });
  const gi = document.getElementById("gridInput");
  gi.min = toUnit(10);
  gi.value = toUnit(gridMm);
  if (selected) syncProps(); // 열려 있는 패널도 다시 채운다
}
```

증감 폭을 안 바꾸면 미터 단위에서 화살표 한 번에 10m씩 뛴다. 최솟값을 안 바꾸면 `min="10"`이 10m가 되어 아무 값도 못 넣는다. 숫자 입력칸은 값·폭·한계가 한 세트라 같이 움직여야 한다.

라벨은 `<span class="unit-label">mm</span>`처럼 단위 글자만 따로 감싸 두면 한 줄로 전부 갈아 끼울 수 있다.

---

### 예시값과 기본값도 단위를 따라야 한다

축척 보정은 두 점을 찍고 실제 거리를 묻는데, 안내 문구에 예시가 들어 있었다.

```js
const sample = toUnit(5000); // mm면 5000, m면 5
const real = prompt("이 두 점의 실제 거리(" + distUnit + ")를 입력하세요\n예: " + sample, String(sample));
const mm = fromUnit(parseFloat(real));
```

미터로 쓰는 사람에게 "예: 5000"을 보여주면 5000m를 넣는다. 예시는 단순한 장식이 아니라 사용자가 따라 하는 형식이다.

---

### 안내 문구에 단위를 못 박지 않는다

도움말과 보정 안내에 "실제 거리(mm)를 입력하세요"가 여러 군데 적혀 있었다. 단위를 고를 수 있게 된 순간 그 문장들은 전부 틀린 말이 된다.

설정으로 바뀌는 값은 정적 문구에 넣지 않는다. 굳이 쓴다면 화면에서 읽어 채우거나, 아예 단위를 빼고 "실제 거리를 입력"으로 둔다.

---

## 접기 UI

### 토글 대신 상태 함수로 만들면 부수효과를 한 곳에 모을 수 있다

광고 접기 버튼은 원래 클래스를 뒤집고 그 반환값으로 글자를 바꿨다. 여기에 "접으면 타이머 시작, 펴면 타이머 취소"가 붙자 분기가 흩어지기 시작했다.

```js
// ❌ 뒤집기와 뒷정리가 한 덩어리
adToggle.onclick = () => {
  const c = adSlot.classList.toggle("ad-collapsed");
  adToggle.textContent = c ? "광고 보기" : "✕";
};

// ✅ "이 상태로 만든다"를 함수로, 클릭은 상태만 정한다
function setAdCollapsed(c) {
  adSlot.classList.toggle("ad-collapsed", c);
  adToggle.textContent = c ? "광고 보기" : "✕";
  clearTimeout(adReopenTimer);
  if (c) adReopenTimer = setTimeout(() => setAdCollapsed(false), AD_REOPEN_MS);
}
adToggle.onclick = () => setAdCollapsed(!adSlot.classList.contains("ad-collapsed"));
```

`classList.toggle(name, force)`는 두 번째 인자로 켜고 끄기를 강제할 수 있다. 이게 있어야 "뒤집기"가 아니라 "이 상태로 맞추기"를 쓸 수 있고, 타이머가 스스로 펴는 것과 사용자가 펴는 것이 같은 길을 지난다.

---

### 되돌아오는 타이머 — 접어둔 것을 30분 뒤 자동으로 편다

광고는 접을 수 있어야 하지만 영구히 사라지면 안 된다. 접을 때 타이머를 걸고, 펼 때 지운다.

```js
const AD_REOPEN_MS = 30 * 60 * 1000;
clearTimeout(adReopenTimer); // 접든 펴든 항상 먼저 지운다
if (c) adReopenTimer = setTimeout(() => setAdCollapsed(false), AD_REOPEN_MS);
```

`clearTimeout`을 조건 밖에 두는 게 요점이다. 접었다 폈다를 반복해도 타이머가 겹쳐 쌓이지 않고, 마지막 접은 시점부터 다시 센다.

---

### 항목 하나를 지우면 정렬 규칙이 남는다

광고 아래 줄에는 개인정보 링크와 접기 버튼이 양쪽 끝으로 벌어져 있었다. 링크만 지우니 버튼이 왼쪽에 혼자 남았다.

```css
/* 두 개일 때: 양 끝으로 */
#adBar { justify-content: space-between; }
/* 하나만 남으면: 오른쪽으로 */
#adBar { justify-content: flex-end; }
```

`space-between`은 "남는 공간을 사이에 넣는다"라 항목이 하나면 사이가 없어 그냥 앞쪽에 붙는다. 요소를 지울 때는 그 요소만 볼 게 아니라 부모의 배치 규칙이 몇 개를 전제하고 있었는지 봐야 한다.

---

## 드롭다운 UI

### 메뉴 안의 링크를 버튼과 같은 모양으로

파일 메뉴 항목은 전부 `<button>`인데, 개인정보처리방침만 다른 페이지로 가는 `<a>`다. 그대로 두면 혼자 파란 밑줄 링크로 보인다.

```css
.menu-list button,
.menu-list .menu-file,
.menu-list a {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 8px 10px;
}
.menu-list a {
  color: inherit;
  text-decoration: none;
}
```

기존 선택자에 `a`를 얹고, 링크 기본 스타일(파란색·밑줄)만 지우면 된다. `color: inherit`은 부모 글자색을 그대로 쓰겠다는 뜻이라, 나중에 메뉴 색이 바뀌어도 따라간다.

동작이 링크면 태그도 `<a>`여야 한다. 버튼에 이동 코드를 붙이면 새 탭으로 열기나 주소 복사가 안 된다.

---

### 버튼 가로 배치는 인라인 style 말고 클래스로

설정 모달에 버튼 두 개를 나란히 놓을 때 `style="display:flex; gap:6px"`를 붙이고 싶어지는데, 같은 모양이 세 번째로 필요해지는 순간 흩어진다.

```css
.prop-row .btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
```

이 프로젝트는 스타일을 `style.css` 한 곳에만 두기로 했다. 규칙을 어기는 예외는 벤더가 형식을 강제하는 경우(광고 스니펫의 `style="display:none"`) 정도로 한정한다.

---

### 새 폼 요소는 이미 있는 규칙에 얹는다

단위 선택 상자를 넣으면서 보니 `select`는 어떤 규칙에도 안 걸려 있어 혼자 브라우저 기본 모양이었다.

```css
.prop-row input,
.prop-row select {
  width: 100%;
  padding: 5px 7px;
  border: 1px solid #ced4da;
  border-radius: 5px;
}
```

새 규칙을 만들지 않고 기존 선택자에 얹는다. 그래야 전에 있던 다른 `select`도 같이 맞춰지고, 다음에 하나 더 늘어도 손댈 곳이 안 생긴다.
