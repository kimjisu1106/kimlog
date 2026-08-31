---
layout: post
title: 소리꽃 KeyBloom TIL 40
date: 2026-08-10
permalink: "6s9bm2sz"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 웹폰트 자체 호스팅과 언어별 스택, 라이선스 게이트(라이브 판정 vs 빌드 고정)와 plus 앱 전용, Tauri 서명 릴리스, 그리고 웹뷰 confirm이 안 떠 생긴 자동 업데이트 팝업 버그·확장자 아이콘 NSIS 오버라이드·릴리스 영구 직링·빌드 타임 버전 주입까지 런칭 배선에서 배운 것들.
tags:
  - TypeScript
  - Rust
  - CSS
---
KeyBloom 런칭 배선(폰트·라이선스·서명 릴리스)과 그 뒤 배포·버그 수정(자동 업데이트 팝업·파일 아이콘·버전 표기)에서 배운 것들을 한 데 모았다.

---

## 폰트

### 언어별 폰트를 스택 순서로 자동 분리 + 자체 호스팅

영어는 Archivo, 한글은 Noto Sans KR로 쓰고 싶었다. "언어별로 다른 폰트"는 font-family 스택 순서만으로 해결된다 — 브라우저가 글자마다 앞 폰트부터 찾고, 없으면 다음으로 떨어지기 때문이다. Archivo엔 한글 글리프가 없어 영어·숫자는 Archivo, 한글은 Noto Sans KR로 자동으로 갈린다.

```css
/* 영어=Archivo, 한글=Noto Sans KR, 폴백 Malgun Gothic */
font-family: "Archivo", "Noto Sans KR", "Malgun Gothic", sans-serif;
```

이건 웹폰트라 로드가 필요한데, 네이티브 앱(오프라인)·외부 CDN 금지 원칙을 지키려고 CDN이 아니라 자체 호스팅으로 넣었다. `@fontsource` 패키지를 쓰면 Vite가 폰트 파일을 로컬로 번들한다(외부 호출 0).

```ts
import "@fontsource/archivo/400.css";
import "@fontsource/noto-sans-kr/400.css";
```

Noto Sans KR은 한글 글리프가 많아 `@fontsource`가 unicode-range(폰트가 담당할 글자 범위를 지정하는 것)로 조각내 두는데, 브라우저는 화면에 쓰는 조각만 내려받는다. 둘 다 SIL Open Font License라 상업 사용·번들이 되고, 크레딧에 고지만 하면 된다.

---

## 라이선스 게이트

### 활성화해도 안 풀리는 게이트 — 라이브 판정 vs 빌드 시점 고정

라이선스를 활성화했는데 워터마크는 바로 사라지는데 내보내기의 알파 옵션은 잠긴 채였다. 이유는 판정 시점이 달라서다.

- 워터마크는 렌더 루프에서 매 프레임 `!isPro()`를 다시 보므로 활성화 즉시 반영된다.
- 내보내기 드롭다운의 잠금·배지는 앱 시작 시점에 한 번 만들어져 고정돼 있다.

그래서 라이선스가 바뀔 때 그 잠금·배지를 다시 칠하는 재적용 함수를 붙였다.

```ts
onLicenseChange(() => {
  document.body.classList.toggle("pro", isPro()); // 광고·CSS 게이트
  refreshPro(); // 빌드 시점 고정된 알파 옵션·배지·disabled 다시 칠하기
});
```

교훈 — 게이트를 "매 프레임 판정"과 "빌드 시점 1회"로 나눠 인식해야 한다. 후자는 상태가 바뀌면 명시적으로 재적용해야 한다.

### plus를 앱 전용으로 — 게이트를 기능 성격으로 나눈다

유료(plus) 판정은 `IS_NATIVE && 유효 라이선스`다. 즉 웹은 라이선스가 있어도 항상 무료다. 처음엔 "plus 웹 = 워터마크 제거"로 적어놨다가, 실제 게이트가 앱 전용이라 어긋난 걸 뒤늦게 발견했다.

```ts
export function isPro(): boolean {
  return IS_NATIVE && licensed; // 웹은 항상 false
}
```

정리하면서 배운 것 — 유료 기능 중 알파(ffmpeg 필요 — 영상·오디오 변환·인코딩 도구)·저지연 라이브(네이티브 오디오)는 웹에서 원천적으로 안 된다. 돈 내는 사람은 그 기능 때문에 어차피 앱을 쓴다. 그래서 plus를 앱 전용으로 두는 게 기술 근거와도 맞는다. 게이트는 "웹에서도 되는 것 / 네이티브라야 되는 것"으로 성격을 나눠 생각한다.

### 라이선스 2기기 — 한도는 결제사, API 키는 계정 단위

라이선스 1개로 2기기까지 쓰게 하는 건 앱 코드가 아니라 결제사(Creem) 상품의 활성화 한도 설정이다. 앱은 기기마다 다른 instance로 활성화하고, 결제사가 한도(2)를 강제한다. API 키는 계정 단위라 plus·pro(미래 별도 상품)가 같은 키를 공유한다 — 상품만 다르면 된다.

---

## 릴리스와 서명

### Tauri 자동 업데이터 릴리스 흐름

첫 서명 릴리스의 순서는 이렇다. 서명 env를 주고 빌드하면 설치파일 + `.sig`(업데이트 서명)가 나온다. 그 서명값과 다운로드 URL을 담은 `latest.json`을 만들어, 공개 릴리스 저장소에 설치파일과 함께 올린다. 앱의 업데이터 endpoint는 그 저장소의 `releases/latest/download/latest.json`을 본다.

```json
{
  "version": "0.1.0",
  "platforms": {
    "windows-x86_64": { "signature": "<.sig 파일 내용>", "url": ".../releases/download/v0.1.0/...-setup.exe" }
  }
}
```

버전을 올려 같은 절차를 반복하면, 기존 사용자가 자동 업데이트를 받는다.

### Tauri 서명 ≠ Windows 코드 서명(SmartScreen)

서명 릴리스인데도 설치할 때 Windows가 "알 수 없는 게시자"로 경고했다. Tauri의 서명(minisign)은 자동 업데이트가 변조 안 됐는지 검증하는 용도지, OS가 신뢰하는 코드 서명(Authenticode)이 아니다. 그래서 SmartScreen에는 아무 도움이 안 된다.

SmartScreen 경고를 없애려면 별도의 코드 서명 인증서(OV·EV, 또는 요즘 저렴한 Azure Trusted Signing)가 필요하다. 초기엔 안내 문구로 가고, 매출 신호가 오면 인증서를 붙이는 게 순서다.

### 자동 업데이트 팝업이 안 떴다 — WebView2의 window.confirm

릴리스를 냈는데 기존 사용자에게 업데이트 확인창이 안 떴다. 업데이트 감지는 됐는데, "지금 설치할까요?"를 묻는 `window.confirm()`이 이 앱의 웹뷰(WebView2 — 윈도우 네이티브 앱이 웹 화면을 띄우는 컴포넌트)에서 렌더되지 않고 즉시 false(=취소)를 반환했다. 그래서 업데이트가 조용히 무시됐다.

```ts
// ❌ WebView2에서 안 뜨고 바로 false → 업데이트 조용히 스킵
if (!confirm(`업데이트가 있습니다. 지금 설치할까요?`)) return;

// ✅ 네이티브 OS 다이얼로그 — 확실히 뜬다
const { ask } = await import("@tauri-apps/plugin-dialog");
if (!(await ask("업데이트가 있습니다. 지금 설치할까요?", { kind: "info" }))) return;
```

같은 문제를 새 프로젝트 저장 물음에서 이미 겪어 자체 창으로 고쳤는데, 업데이터만 `confirm`인 채 빠져 있었다. 교훈 — 웹뷰의 `confirm`·`alert`은 환경에 따라 안 뜬다고 보고 사용자 확인은 네이티브 다이얼로그(`ask`)로. 이 버그가 앞 버전 설치본에 박제돼, 그 사용자는 고친 버전을 한 번은 수동 설치해야 이후 자동 업데이트가 산다.

### GitHub 릴리스 영구 직링 + 서명은 파일 내용 기준

샵 다운로드 버튼을 릴리스 페이지 대신 파일이 바로 받아지는 직링으로 바꿨다. GitHub는 최신 릴리스의 특정 이름 에셋으로 리다이렉트해주는 URL을 준다.

```text
https://github.com/OWNER/REPO/releases/latest/download/KeyBloom-Setup.exe
```

단 에셋 이름에 버전이 박혀 있으면(`KeyBloom_0.1.2_x64-setup.exe`) 다음 버전에 링크가 깨지므로, 릴리스마다 설치본을 버전 없는 고정 이름(`KeyBloom-Setup.exe`)으로 올려야 한다. 빌드 산출물을 그 이름으로 복사만 하면 된다. "이름을 바꾸면 업데이트 서명이 깨지나?"가 걱정이었는데, minisign 서명은 파일 내용(바이트) 기준이라 이름을 바꿔도 검증은 정상이다. 업데이터는 `latest.json`의 url·signature만 맞으면 되므로, 고정 이름으로 rename해 그 url을 가리키면 그만이다.

### 서명 빌드는 어떻게 도는가

서명 릴리스 빌드는 서명 키 경로·비번을 환경변수로 주입해 돌린다.

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "$env:USERPROFILE\.tauri\keybloom.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "..."
npm run tauri:build
```

순서가 Rust 컴파일 → 프론트엔드 빌드 → NSIS로 설치본 생성 → 그 설치본에 서명이다. 그래서 설치 스크립트(NSIS) 오류는 서명(비번) 단계 전에 드러난다 — 비번 없이 돌려도 같은 지점에서 실패하므로, 훅 수정 검증은 비번 없이도 할 수 있다.

---

## 자잘한 것

### 조건부 컨트롤 표시 — 등록해두고 상태 바뀔 때 재적용

발광 슬라이더는 발광을 켰을 때만 보이게 했다. 표시/숨김 함수를 만들어 (1) 토글 즉시 실행하고 (2) 큐 전환 때도 다시 적용되게 syncers 배열에 등록한다.

```ts
const sync = () => { glowLen.row.hidden = !cur.keyGlow; };
syncers.push(sync); // 큐 전환 시 재적용
checkRow(t("발광", "Glow"), () => cur.keyGlow, (v) => (cur.keyGlow = v), sync); // 토글 즉시
```

### .kbloom 파일 아이콘 — 연결 등록만으론 아이콘이 안 바뀐다

`tauri.conf.json`의 `bundle.fileAssociations`로 확장자를 등록하면 `.kbloom`이 앱에 연결되지만, "그 확장자에 이 아이콘"을 지정하는 옵션이 없어 기본적으로 앱 실행파일 아이콘이 붙는다.

```json
"fileAssociations": [{ "ext": ["kbloom"], "name": "KeyBloom Project" }]
```

전용 아이콘을 붙이려면 두 가지가 필요했다.

첫째, 아이콘을 다중 해상도 `.ico`로 만든다. 브랜드 SVG(건반에서 하트 파티클이 피어오르는 그림)를 여러 크기로 래스터해 한 `.ico`에 담는다. 탐색기가 표시 상황에 맞는 크기를 골라 쓴다.

```js
// sharp로 각 크기 PNG 래스터 → png-to-ico로 한 파일에 패킹
const pngs = await Promise.all(sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer()));
await writeFile("kbloom-file.ico", await pngToIco(pngs));
```

둘째, 설치 후 실행되는 NSIS 훅에서 아이콘을 실제로 건다. 관건은 "시스템이 .kbloom에 붙인 식별자(ProgId) 이름을 하드코딩하지 않는 것"이었다. Tauri가 붙인 ProgId를 레지스트리에서 읽어 그 `DefaultIcon`만 우리 `.ico`로 덮어쓰면, 프레임워크가 ProgId 규칙을 바꿔도 안 깨진다.

```nsis
!macro NSIS_HOOK_POSTINSTALL
  ReadRegStr $0 SHCTX "Software\Classes\.kbloom" ""     ; 시스템이 붙인 ProgId
  StrCmp $0 "" +3 0
  WriteRegStr SHCTX "Software\Classes\$0\DefaultIcon" "" "$INSTDIR\icons\kbloom-file.ico"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'   ; 아이콘 캐시 갱신
!macroend
```

참고로 아이콘 SVG의 하트 6개는 `<symbol>` 하나를 `<use>`로 여러 번 배치해 만들었다. objectBoundingBox(도형 크기에 맞춰 좌표를 잡는 방식) 그라데이션이라 크기·위치가 달라도 하트마다 같은 그라데이션이 제 박스에 맞춰 들어간다.

### 출력 파일명 충돌 자동 접미사 (Rust)

내보내기 파일이 지정 폴더에 이미 있으면 덮어쓰지 않고 `이름 (1).ext`, `(2)`… 안 겹치는 경로를 찾게 했다. 파일을 여는 Rust 커맨드 앞에 공용 헬퍼로 끼웠다.

```rust
fn dedup_path(path: &str) -> String {
  let p = std::path::Path::new(path);
  if !p.exists() { return path.to_string(); }
  // stem·ext 분리 후 "stem (n).ext"를 n=1,2… 로 시도해 없는 걸 반환
}
```

### 앱 버전을 빌드 타임에 주입해 표기

정보·크레딧에 현재 버전을 보이게 했다. 버전 문자열을 코드에 하드코딩하면 릴리스마다 어긋나므로, 버전의 소스(`tauri.conf.json`)를 빌드 도구가 읽어 상수로 주입한다. 웹·네이티브가 같은 번들을 쓰므로 한 방식으로 둘 다 해결된다.

```ts
// vite.config.ts — tauri.conf.json의 version을 상수로 define
const appVersion = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf-8")).version;
export default defineConfig({ define: { __APP_VERSION__: JSON.stringify(appVersion) } });
// 코드에서: `버전: v${__APP_VERSION__}` (타입은 d.ts에 declare const)
```

### Cloudflare Worker 변수는 배포해야 반영된다

라이선스 프록시 워커의 결제사 주소를 테스트→라이브로 바꿀 때 `wrangler.toml`의 값만 고치고 끝인 줄 알았는데 반영이 안 됐다. `[vars]`는 파일을 바꿔도 `wrangler deploy`를 해야 실제 워커에 올라간다. 재배포는 idempotent(여러 번 실행해도 결과가 같은 성질)라, 확신이 없으면 그냥 다시 배포하면 현재 파일 상태로 맞춰진다.

### 파티클·건반 기본색을 공용 상수로

기본 그라데이션 색을 바꿀 때 파티클과 건반이 각자 색을 하드코딩하고 있으면 한쪽만 바뀌어 어긋난다. 두 곳이 같은 상수를 쓰게 해두면 한 줄만 고쳐도 함께 바뀐다(파랑 → 소프트 핑크 `#dbb7c9`).

```ts
const GRAD_MIN = "#dbb7c9"; // 파티클·건반 공용 — 각자 하드코딩하면 어긋남
colorMin: GRAD_MIN, keyColorMin: GRAD_MIN,
```

---

## 요약

- "언어별 폰트"는 font-family 스택 순서로 글자별 자동 폴백(영어 Archivo/한글 Noto Sans KR), `@fontsource`로 자체 호스팅(외부 CDN 없이)
- 게이트는 "매 프레임 판정"과 "빌드 시점 고정"을 나눠 인식 — 후자는 상태 변경 시 재적용해야 함
- plus는 앱 전용(`IS_NATIVE && licensed`) — 알파·라이브가 네이티브 기술 게이트라 게이트를 기능 성격으로 나눔
- Tauri 서명(업데이트 검증)과 Windows 코드 서명(SmartScreen)은 별개 — 후자는 Authenticode 인증서가 필요
- 웹뷰의 `confirm`·`alert`은 환경 따라 안 뜸 → 사용자 확인은 네이티브 `ask`로
- 확장자별 아이콘은 `fileAssociations`로 안 됨 → 설치 훅에서 ProgId의 `DefaultIcon`을 덮어쓰기(ProgId는 레지스트리에서 읽어 버전 비의존). `.ico`는 SVG를 sharp+png-to-ico로 다중 해상도 패킹
- GitHub 릴리스 영구 직링은 고정 이름 에셋 + `releases/latest/download/<이름>`; minisign 서명은 내용 기준이라 rename 무방
- 앱 버전은 빌드 타임에 `tauri.conf.json`에서 주입(웹·네이티브 공용). Cloudflare Worker `[vars]`는 `wrangler deploy` 해야 반영
