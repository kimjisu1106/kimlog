---
layout: post
title: Unreal Engine 5 Dev Log 2 ― 시네마틱(Portal Exit)
date: 2025-08-30
categories:
  - devlog
  - ue5
  - summary
project: cinematic-portal-exit
project_name: 시네마틱(Portal Exit)
video_id: 8hCDR3biZro
redirect_to:
status: public
---
![](https://blog.kakaocdn.net/dna/btyLwe/dJMcaiWrN28/AAAAAAAAAAAAAAAAAAAAADFZKT6OmBGU4-RflvRbHa1Wmms-cHIxFCJWH3vOZ-w5/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=uLV0ErYiioGs%2B9L%2B34iXzY4NNVg%3D)

## 도입

언리얼엔진 5로 시네마틱 영상 만드는 튜토리얼이 있길래 따라 해봤다.  
작성일 기준 5일 전에 올라온 따끈따끈한 영상.  
그동안 보던 건 대부분 1~2년 전 튜토리얼이라 메뉴나 용어가 조금씩 달라 헷갈렸는데,  
이번엔 최신 버전이라 그런 피로감이 없어서 반가웠다.

튜토리얼 주제는 Portal Exit 컨셉 애니메이션이었고,  
사용된 애니메이션은 현재 무료로 다운로드 가능했다.  
결론부터 말하면…  
7시간 작업해서 26초짜리 영상을 만들었다!

---

## 오늘 좋았던 포인트

1. 시네마틱을 만든다고 꼭 '시네마' 프리셋으로 시작하지 않아도 된다는 것
2. 마네킹에 캐릭터를 입히는 법을 조금은 알 것 같아졌다는 것
3. "언리얼로 만든 영상이 이렇게 멋질 수 있구나" 하는 충격

---

## 사용한 리소스

1. 캐릭터
    1. Player: Erika Archer (Mixamo)  
        → 원래는 검사 캐릭터를 쓰고 싶었는데, 옷차림이 너무 헐벗어서 결국 전부 껴입은 궁수로 선택 😂
    2. Villain: Maw J Laygo (Mixamo)  
        → 화면을 압도할 만큼 거대한 보스 같은 느낌이 좋아서 골랐다.
2. 애니메이션
    1. Player: Portal Exit (Narrative Motion)
    2. Villain: *Mutant Roaring* (Mixamo)
3. 컨셉: RPG 보스전 인트로 씬

---

## 작업 과정 요약

1. 프로젝트 생성
    1. 게임 모드 3인칭 시점으로 시작. 기본 마네킹이 있어서 편리했다.
2. 머테리얼 초기화
    1. 처음엔 배경을 멋지게 꾸며볼까 했다가, 이번엔 카메라 연출이 더 중요하다 생각해 결국 튜토리얼처럼 다 벗김.
3. 플레이어 배치 & 애니메이션 적용
    1. 애니메이션 입히는 게 서툴렀는데 "리타겟팅"이란 기능을 알게 됐다.
    2. 적용하고 보니 틀어짐 없이 잘 들어맞아 만족.
4. 빌런 배치 & 스케일 조절
    1. CAM02로 전환될 때 화면을 압도하는 느낌이 나오도록 크게 확대.
5. 카메라 연출
    1. 두 대의 카메라로 포커스 전환.
    2. 배경은 흐리고 캐릭터에 집중하도록 Focus 세팅.
    3. AE나 Cubase처럼 키프레임 찍는 방식이라 금방 익숙해졌다.
6. Portal 제작 (나이아가라)
    1. 여러 레퍼런스 참고해서 테두리만 남는 포털 제작.
    2. 색상은 VLAST CI 컬러인 핑크(#DB1D64).
    3. 가운데는 거울 대신 ‘호수(Lake)’ 머테리얼을 적용해서 불투명하게 처리.
    4. Player가 비치면서도 바로 Villain이 드러나지 않아 오히려 더 괜찮았다.
7. 빌런 포효 + 연기
    1. 스타터킷 Smoke 사용.
    2. 원래는 불/얼음도 고민했지만 캐릭터 외형과 맞지 않아 Smoke로 결정.
    3. 아쉬운 건 퍼지면서 사라지는 연출이 잘 안 됐다는 점. (Opacity 공부 필요!)
8. 사운드 작업
    1. 포털: 스파클러 같은 소리 (wind라는 이름이 붙어 있었음 😅)
    2. Player: 발소리, 옷 터는 소리
    3. Villain: 발구르기 쿵, Roar + 트림 소리(!) 합성 → 속도를 늦춰 Pitch 낮추기
    4. BGM: 점점 커지다가 Villain이 비춰지는 타이밍에 빵!
    5. 언리얼 내부 믹스는 제한적이었지만 생각보다 자연스럽게 섞여서 놀랐다.

---

## 아쉬운 점 & 다음에 해보고 싶은 것

1. Opacity 조절을 몰라서 포털/연기 사라지는 연출이 어색했다.
2. Villain의 발구르기에 맞춰 크랙이나 카메라 흔들림을 넣었다면 더 좋았을 것.
3. 사운드에서 Reverb, Pan, EQ 같은 디테일을 언리얼 안에서 다루는 방법을 익히고 싶다.

---

## 오늘의 결론

26초 영상이지만, "나도 언리얼로 이렇게 연출할 수 있다"는 걸 직접 경험한 게 가장 큰 수확이었다.  
멀미와 아쉬움은 남았지만, 만족감이 더 크다.

---

## 결과

{% include youtube.html id=page.video_id %}

---

{% assign current_project = page.project | default: post.project %}  
  
{% assign related = site.devlog  
| where_exp: "p", "p.categories contains 'ue5'"  
| where_exp: "p", "p.project == current_project"  
| sort: "date"  
%}  
  
{% if related.size > 1 %}  
## Related Post
  
{% for item in related %}  
{% unless item.url == page.url %}  
- {{ item.date | date: "%Y-%m-%d" }} · [{{ item.title }}]({{ item.url | relative_url }})  
{% endunless %}  
{% endfor %}  
{% endif %}