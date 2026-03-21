---
layout: post
title: 메트로놈 Simple Metronome ― 처음 만든 앱, Google Play 출시기
date: 2025-08-19
categories:
  - android-studio
  - devlog
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
redirect_to:
status:
---
![](https://blog.kakaocdn.net/dna/b0bkr4/dJMcabJQDec/AAAAAAAAAAAAAAAAAAAAAEe6nNiE99iaudMzSQil8OV9O11Ohgj3JIn0DxHAzcw-/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=fisT8GfMgyP61GrBihXIa1Oepk0%3D)

[메트로놈 Simple Metronome ― Google Play 바로가기](https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome)


## 1. 왜 만들었는가

피아노를 치고 싶어 연습실을 등록해 다니기 시작했다. 연습할 때 메트로놈이 꼭 필요했는데, 처음에는 기존에 올라온 무료 앱을 다운받아 사용했다.

하지만 피아노를 두 시간 정도 치는 동안, 앱 하단에는 계속 구글 광고가 흘러갔다. “이럴 바에 내가 직접 만들어서, 내 계정에 연결된 광고를 붙이면 어떨까?”라는 욕심이 생겼다. 결국 내가 직접 쓸 메트로놈 앱을 만들기로 결심했다.
  
---
## 2. 개발 과정

#### 진입장벽 낮추기 ― ChatGPT

개발을 시작하면서 가장 크게 도움받은 건 ChatGPT였다. 그 당시 사용하던 모델은 GPT-4, 조금 더 깊게 생각하는 모드였다. 내가 할 수 있는 건 클론코딩으로 HTML, CSS, JS, Python 정도를  맛본 수준이었는데, 챗지는 Kotlin과 Android Studio를 권했다. 낯설었지만 일단 시작했다.
돌이켜보면 너무 당연하게 “내가 만든 앱은 당연히 Play Store에 올려야지”라고 생각한 것도 웃긴다. 
그리고 개발자 계정을 예전에 결제해둔 게 있었는데, 올린 앱이 없어서 이미 계정이 삭제돼 있었다. 
“그때의 나는 대체 무슨 배짱으로 계정을 결제했던 걸까?”

#### 첫 시도와 리셋

2025년 6월 초, 처음 만든 버전은 소리 간격이 불안정했다. 그래도 이때 앱 아이콘과 메인 컬러 팔레트는 정했다.

- Teal: #00797F
- Dark Charcoal: #1E1F22
- Light Gray: #D7D7D7
- Pink Accent: #FF1763

검정 대신 짙은 차콜을 쓴 이유는 완전 검정은 오히려 눈이 아프기도 했고, 2시간동안 화면이 켜져있어야 하니 악보에 집중하기 위함이었다. #1E1F22는 내가 사용하던 Android Studio 코드 편집기 배경색이었다.

하지만 타이밍 문제는 해결되지 않았고, 결국 6월 말 프로젝트를 갈아엎었다.
이 때 챗지를 "더 많이 생각하는 모드"로 바꾸었다.

---
##  3. 핵심 기능들

1. Rotate 지원  
    피아노 위에 세로로 두면 스피커가 가려지고, 가로로 두면 화면이 불편했다. 그래서 기기 설정과 상관없이 세로/가로 전환이 가능하도록 만들었다. BPM도 그대로 유지되도록 했다.
2. Indicator  
    원래는 소리만 맞추면 된다고 생각했지만, 동생이 “시각적 요소도 필요하다”고 조언했다. 그래서 박자에 맞춰 화면에서 인디케이터가 움직이도록 구현했다.
3. BPM 조절  
    중앙 표시 좌우에 버튼(±1, ±5)과 SeekBar 두 가지 방식으로 조절할 수 있게 했다. 자리 수가 바뀌어도 UI가 깨지지 않도록 공간을 고정했다.
4. Play / Stop 버튼  
    직관적으로 한눈에 알아볼 수 있게 단순하게.
5. 광고  
    하단 배너 광고만 넣었다. 피아노 칠 때 방해받지 않도록 전면 광고는 제외했다.

---

## 4. 비공개 테스트 (Closed Test)

7월 말, Google Play Console에서 비공개 테스트를 진행했다. 개인 계정이라 최소 인원이 12명이었고, 지인과 가족을 총동원해 “정예 12명”을 꾸렸다. 중간에 누군가 빠져나가면 망하는 구조라 커피 쿠폰까지 돌려가며 관리했다.

이 기간 동안 받은 피드백과 내 사용 경험을 반영해 Beats per Bar와 Sub per Beat 기능을 추가했다.

- 4/4 → Beats=4, Sub=1
- 6/8 → Beats=2, Sub=3
- 12/8 → Beats=4, Sub=3

덕분에 다양한 박자 연습이 가능해졌다.

---
##  5. Play Store 등록

8월 초, 비공개 테스트가 끝나자마자 바로 프로덕션에 올렸다.  
처음이라 모든 게 새로웠다.

- 업데이트하려면 무조건 버전 바꿔야 한다는 사실
- 앱 구동 화면 캡처를 반드시 제출해야 한다는 점
- 서명키 때문에 헤맸던 경험
- 업데이트 노트를 작성하는 뿌듯함

이 모든 과정이 신기했다.

---
## 6. 마무리

드디어, 내가 만든 앱이 Google Play에 올라갔다.  
생각만 하던 게 실제로 구현된 걸 보니까, 말로 다 못할 만큼 기분이 좋았다.

앞으로는 코드를 더 이해해야 하고, 불편한 게 생기면 바로 업데이트해야 한다.  
이제 첫 앱을 출시했으니, 더 어려운 것도 한번 도전해볼 수 있을 것 같다.

  
  

![](https://blog.kakaocdn.net/dna/cyGWqp/dJMcabJQDed/AAAAAAAAAAAAAAAAAAAAADmDz34nrPI5g9sqt2_btUCCVzA6mhWhWNsgdAouBtZm/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=NdVZ4g4RR9DRsFiASP3yTFCKbSg%3D)

  

  