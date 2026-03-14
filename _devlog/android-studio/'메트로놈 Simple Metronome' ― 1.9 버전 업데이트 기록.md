---
layout: post
title: 메트로놈 Simple Metronome
date: 2025-08-21
categories:
  - android-studio
  - devlog
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
redirect_to:
status: public
---
![](https://blog.kakaocdn.net/dna/b0bkr4/dJMcabJQDec/AAAAAAAAAAAAAAAAAAAAAEe6nNiE99iaudMzSQil8OV9O11Ohgj3JIn0DxHAzcw-/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=fisT8GfMgyP61GrBihXIa1Oepk0%3D)

[메트로놈 Simple Metronome ― Google Play 바로가기](https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome)


## 1. 마지막 BPM 기억하기 (Book Mark)

연습하다 보면 매번 템포를 다시 60에서 시작하는 게 은근히 귀찮았다.  
게다가 피드백에서도 “이전 템포를 기억했으면 좋겠다”는 요청이 들어왔다.  
그래서 북마크 기능을 넣었다.

- 상단의 북마크 아이콘이 활성화된 상태에서 BPM을 바꾸면, 앱을 껐다 켜도 그대로 유지된다.
- 비활성화면 예전처럼 60부터 시작.

---

## 2. BPM 조절 방법 시각화

SeekBar가 있었는데… 의외로 “이걸로 BPM 조절되는지 몰랐다”는 피드백이 들어왔다.  
그래서 좌우에 Slow / Fast를 붙여줬다.  
이제는 한눈에 “아, 이걸 옆으로 움직이면 템포가 바뀌는구나” 알 수 있다.

---
## 3. BPM 직접 입력하기

버튼(±1/±5), SeekBar만으로는 뭔가 부족했다.  
그래서 이번엔 중앙 BPM 숫자를 **터치하면 직접 입력**할 수 있게 했다.

덕분에 이제는 3가지 방식으로 BPM을 조절할 수 있다:

1. ± 버튼
2. SeekBar
3. 직접 입력