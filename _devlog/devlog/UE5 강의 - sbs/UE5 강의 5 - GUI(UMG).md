---
layout: post
title: UE5 강의 5 - GUI(UMG)
date: 2026-01-24
categories:
  - today-i-learn
project: ue5-class-sbs
project_name: UnrealEngine5 Class
video_id:
app_url:
status:
---
## 오늘 한 일

1. GUI(UMG)
    1. WBP(Widget BluePrint) 기초
        1. GUI: Graphical User Interface. 아이콘이나 버튼 같은 시각적 요소를 통해 사용자가 기기를 쉽게 조작할 수 있도록 하는 것.
        2. UMG: Unreal Motion Graphic. 언리얼 엔진에서 제공하는 HUD, 메뉴 등 사용자 인터페이스(UI)를 비주얼 툴로 제작할 수 있게 하는 기능
        3. 언리얼에서는 WBP에서 UMG를 구현 가능하고 그걸 Create Widget, Add Viewport를 이용해 노출할 수 있게 한다.
2. [실습] 가상 키보드 만들기
    1. '<' : onClicked, 왼쪽으로 이동
    2. '>' : onClicked, 오른쪽으로 이동
    3. 'Center' : onClicked, 가운데로 이동(정지)  
        
        ![](https://blog.kakaocdn.net/dna/q1JoY/dJMcadurysM/AAAAAAAAAAAAAAAAAAAAAEhAUOJ7W9UhJe7azo8cSdqypIdBZHEZ-Jfx_GDKWbqH/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=uFYNAgVIbVucGCuqXkHhJQQediE%3D)
        
        ![](https://blog.kakaocdn.net/dna/upcyc/dJMcahp9bKa/AAAAAAAAAAAAAAAAAAAAAGVL-l_0mKueHuXfaTUZB054agMUIK_qGzg1mhgpbT2O/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=QKjRqp%2FZ9NLFCu5zczaZfXOORs0%3D)
        
        ![](https://blog.kakaocdn.net/dna/bfh0rH/dJMcahwVavJ/AAAAAAAAAAAAAAAAAAAAAH7UYaFOggH83-9pqCLH48KxrHp_y_mSjw8CzPR5wB7Q/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=Sa4ZGcRqIO1B2nZ4FuC6TY%2FmRyc%3D)
        
        ![](https://blog.kakaocdn.net/dna/H7FWY/dJMcac3pefI/AAAAAAAAAAAAAAAAAAAAAAuBCXbst_plnjeNqPMkQMNHXYW20UzpSXrL-tILPezl/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=C6FOfYw98KkjRdfZCiramrsuk5U%3D)
        
          
          
          
          
        
3. [실습] 2D 미니게임(가위바위보)
    1. [DevLog 보기](https://kimlog0415.github.io/devlog/ue5/%EA%B0%80%EC%9C%84%EB%B0%94%EC%9C%84%EB%B3%B4/Unreal%20Engine%205%20Dev%20Log%209%20%E2%80%95%20%EA%B0%80%EC%9C%84%EB%B0%94%EC%9C%84%EB%B3%B4%200/)
    2. ﻿[영상 보기](https://youtu.be/mGDfCV_GyjQ?si=O0aWlNQrN2rzuQsP)  
        
        ![](https://blog.kakaocdn.net/dna/cVdde7/dJMcabKfNdv/AAAAAAAAAAAAAAAAAAAAAFrLurlMEsv7EZiqc90_ZMTrdoFOYMnPMhnJzsGb72Dx/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=1S%2FRiHKUj23%2FG7vS3%2FASUGIcDqw%3D)
        
          

  

---

## 어려웠던 점

1. 자료를 배열에 넣어서 처리한다는 생각에 도달하는데 아직 시간이 좀 걸려서 하드코딩을 하고 있었다. 익숙해지는 중.

---

## 배운 점

1. WBP에서 Anchor를 항상 Center에만 뒀는데 용도에 맞춰서 설정해 사용할 수 있게 되었다.
2. SetInputModeUIOnly: UI 입력만 받도록 처리
3. SetShowMouseCursor: 화면에 마우스 커서가 표시 유무 설정하기

---

## 해야 할 일

1.