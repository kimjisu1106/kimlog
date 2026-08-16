---
layout: post
title: 로그스톤 샵 LogStone Shop TIL 2
date: 2026-08-10
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: OG 메타와 헤드리스 이미지 렌더, MoR 구조와 KYC·UBO·DBA 용어, Web Audio 클릭음과 릴리스 직링·Play 정책 URL까지 판매 인프라를 갖추며 배운 것.
tags:
  - Astro
  - SEO
  - JavaScript
---
판매 인프라(OG·도메인·법적 페이지·결제 심사)를 갖추면서 배운 것들. 후반은 Creem 사업자 등록에서 만난 용어 정리.

---

## OG·SEO

### 공유 카드를 위한 메타 풀세트

링크를 카톡·SNS에 붙였을 때 이미지 카드가 뜨려면 head에 og 계열 메타가 있어야 한다. 최소 세트는 `og:title`·`og:description`·`og:image`·`og:url`이고, 여기에 검색용 `canonical`(같은 내용의 대표 URL 선언), 다국어 사이트면 `hreflang`(언어별 대응 URL 선언), 트위터용 `twitter:card`까지가 한 벌이다. `og:image`는 절대 URL이어야 해서 Astro에서는 `new URL(경로, Astro.site)`로 만든다. 권장 크기는 1200×630.

### 디자인 도구 없이 OG 이미지 만들기 — 헤드리스 브라우저

브랜드 폰트(Archivo+Noto Sans KR) 그대로 OG 이미지를 만들고 싶은데 이미지 편집 도구가 없었다. HTML 한 장에 로컬 폰트를 @font-face로 걸고, 엣지를 화면 없이 실행하는 헤드리스 모드로 스크린샷을 찍으면 끝난다.

```text
msedge --headless=new --screenshot="out.png" --window-size=1200,630 "file:///.../og.html"
```

CSS를 아는 사람에게는 이게 가장 정확한 이미지 편집기다. 배율을 키우려면 `--force-device-scale-factor=2`.

---

## 판매 연결

### MoR — 판매자 의무를 통째로 위임하는 구조

MoR(Merchant of Record, 기록상 판매자)은 결제 대행을 넘어 "그 거래의 법적 판매자" 지위를 대신 지는 서비스다. 소비자의 결제·환불 상대방이 Creem이 되고, 부가세(VAT) 같은 국가별 세금 신고도 그쪽 몫이다. 우리 사이트에는 공개 체크아웃 링크 하나만 있고 API 키·시크릿·결제 로직이 전혀 없다 — 정적 사이트로 글로벌 판매가 되는 이유.

### 버튼 스위치는 데이터 필드 null로

구매·다운로드·할인 안내처럼 "준비되면 켜지는" 요소는 데이터 파일의 필드 하나로 스위치를 만들었다. `checkoutUrl`이 null이면 비활성 버튼, URL을 채우면 활성 링크. 심사 대기 중에는 "가격은 보이되 클릭 안 됨" 상태가 필요했는데, 이것도 마크업 조건 하나로 해결된다. 상태 변화가 코드 수정이 아니라 데이터 한 줄이 되게 하는 설계.

### 도메인 이메일은 Email Routing으로 공짜 수신

`support@내도메인`을 만들려고 메일 서버를 살 필요가 없다. Cloudflare Email Routing이 도메인 앞으로 온 메일을 기존 Gmail로 전달해준다(무료, MX 레코드(메일을 받을 서버를 가리키는 DNS 설정) 자동 설정). 수신만 되면 지원 이메일 요건은 충족되고, 답장도 그 주소로 보이게 하려면 Gmail의 send-as를 추가로 설정한다.

### 커스텀 도메인 — 루트와 서브도메인

도메인 하나를 사면 루트(`logstone.net`)와 무제한 서브도메인(`keybloom.logstone.net`…)이 다 내 것이고, Cloudflare Pages에서는 각각을 서로 다른 프로젝트에 붙일 수 있다. 반대로 경로(`/shop`) 단위로 프로젝트를 나누는 건 한 도메인=한 프로젝트 구조라 억지 우회가 필요하다 — 나눌 거면 경로가 아니라 서브도메인으로.

### 이메일 주소가 소스에서 가려 보이는 이유

배포 후 페이지 소스를 보면 이메일이 `[email protected]`으로 바뀌어 있다. Cloudflare의 Email Obfuscation(이메일 수집 방지)이 봇에게만 주소를 가리고 실제 브라우저에는 정상 표시하는 것으로, 고장이 아니라 스팸 방지 기능이다.

---

## 브라우저 데모

### 소리는 사용자 제스처 뒤에만 — 자동재생 정책과 Web Audio 클릭음

브라우저는 사용자가 페이지와 상호작용하기 전에는 소리 재생을 막는다(자동재생 정책). 그래서 메트로놈 데모의 클릭음은 자동으로 켤 수 없고, 스피커 토글을 눌렀을 때 AudioContext를 만들어 시작한다. 클릭음 자체는 오디오 파일 없이 오실레이터(소리 파형을 만들어 내는 발진기)로 즉석 합성 — 첫 박은 높은 음으로 강세를 준다.

```js
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.frequency.value = accent ? 1800 : 1200;
gain.gain.setValueAtTime(accent ? 0.5 : 0.32, t0);
gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05); // 짧은 지수 감쇠
osc.connect(gain).connect(audioCtx.destination);
```

### JS 없이 순차 점등 — animation-delay

홈 카드의 비트 점 4개는 keyframes 애니메이션 하나에 `animation-delay`만 0 / 0.5 / 1 / 1.5초로 다르게 줘서 순서대로 깜빡인다. 주기 2초 = 정확히 120 BPM — 스크립트 없이 CSS만으로 도는 미니 데모.

### 스토어 그래픽을 웹으로 옮길 때 — 텍스트는 굽지 않는다

완성된 스토어 그래픽 PNG를 그대로 페이지에 얹으면 그 안의 문구 언어가 고정된다. 대신 구도(폰 프레임 기울임, 배경, 발광 연출)만 HTML·CSS로 재조립하고 문구는 마크업에 두면 — 다국어가 살고, 폰트도 사이트 표준으로 교체되고, 문구 수정에 재캡처가 필요 없다. 원본과 이질적인 룩(라운드·글로우)은 그래픽 재현 영역에만 한정하면 본문 디자인 시스템과 공존한다.

---

## 배포·스토어 운영

### GitHub 릴리스 직링 — latest/download와 고정 파일명 계약

`releases/latest/download/파일명`은 최신 릴리스의 그 자산으로 항상 리다이렉트되는 직링이라, 사이트 버튼 하나로 "항상 최신 설치 파일 다운로드"가 된다. 대신 계약이 생긴다 — 모든 릴리스가 같은 자산 이름을 유지해야 한다. 파일명에 버전을 넣는 순간(예: Setup-0.2.0.exe) 링크가 404가 된다. 릴리스마다 자산 이름이 같아도 릴리스 단위로 분리돼 있어 충돌하지 않는다.

### Play Store 앱은 개인정보처리방침 URL이 필수

구글 플레이는 모든 앱에 공개 접근 가능한 정책 URL을 요구한다. 설정 위치가 스토어 등록정보가 아니라 정책 → 앱 콘텐츠 메뉴에 있어서 찾기 어렵다. URL을 바꾸기 전 확인할 것은 문서가 그 앱의 실제 수집을 커버하는가 — 메트로놈은 AdMob 배너가 있어서, 사이트 통합 정책으로 교체하기 전에 광고 식별자 고지(AdMob 조항)부터 보강했다.

---

## Creem 사업자 등록에서 배운 것 — 용어 정리

### 계정 심사가 실제로 보는 것

결제 플랫폼은 입점 전에 계정 심사(account review)를 한다. 금지 상품 목록 대조 외에 사이트에서 확인하는 것들 — ① Privacy Policy·이용약관이 방문자에게 접근 가능한가 ② 지원 이메일이 사이트에 표시되고 등록 정보와 일치하는가 ③ 가격이 결제 전에 투명하게 보이는가 ④ 제품이 실재하고 작동하는가. 지원 이메일은 Gmail 같은 개인 메일이 거부되고 자기 도메인 주소여야 해서, "커스텀 도메인은 나중에" 계획이 이 요건 때문에 앞당겨졌다.

### KYC — 결제 회사가 신원을 확인하는 이유

KYC(Know Your Customer)는 금융 규제상 결제를 다루는 회사가 "돈을 받는 사람이 실제 누구인지" 확인해야 하는 절차다. 자금세탁 방지 규제라 어느 결제 플랫폼을 가도 같은 폼을 만난다. 생년월일·주소 같은 개인 정보를 물어도 이상한 게 아니다.

### Control Person / UBO / DBA / Sole Proprietor

- Control Person — 사업을 실질적으로 경영·통제하는 사람(대표 등). 1인 사업자는 본인.
- UBO(Ultimate Beneficial Owner) — 지분 25% 이상을 가진 실소유자. 1인 사업자는 본인 100%라 추가 등록할 사람이 없다.
- DBA(Doing Business As) — 법적 이름과 별개로 고객에게 보이는 상호. 영수증에 찍힐 수 있어 해외 고객 기준 라틴 표기(LOGSTONE)가 안전하고, 등록증 상호(로그스톤)의 로마자 표기를 쓰는 건 문제없다.
- Sole Proprietor — 개인사업자. 법인이 아니어도 사업자등록증(business registration)과 사업자등록번호(tax ID)가 있으므로 플랫폼의 Business/Individual 구분에서는 Business에 해당한다.

### 영문 사업자 증빙은 홈택스에서 즉시

해외 KYC에 낼 법적 존재 증명은 개인사업자의 경우 사업자등록증이 그 역할인데, 한국어 원본 대신 홈택스에서 영문 사업자등록증명을 무료·즉시 발급받을 수 있다. 발급 시 영문 성명을 직접 입력할 수 있다.

### 프리미엄 도메인과 TLD 선택

도메인은 정가만 있는 게 아니다 — 이미 선점된 이름은 프리미엄 매물로 수천 달러가 붙는다(logstone.com은 $3,000). 그 돈을 낼 이유는 거의 없고, `.net`(대중 인지도 최상급, 연 $11 수준)·`.app`·`.studio` 같은 대체 TLD(.com·.net처럼 도메인 맨 뒤 최상위 이름)로 가면 된다. 브랜드 보호는 도메인이 아니라 상표 출원이 하는 일이라, TLD가 뭐든 사업에는 지장이 없다. 

그래도 .com이 선점된 것은 기분이 나쁘다.