---
layout: post
title: UE5 강의 5 - GUI(UMG)
date: 2026-01-24
categories:
  - today-i-learn
project: ue5-class-sbs
project_name: UnrealEngine5 Class
video_id: 1SDfay71rGQ
app_url: https://kimlog.pages.dev/devlog/ue5/Number%20Run/Unreal%20Engine%205%20Dev%20Log%2010%20%E2%80%95%20Number%20Run%200/
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
        ![](/assets/images/for-posts/ue5-20260124_01.png)
        ![](/assets/images/for-posts/ue5-20260124_02.png)
        ![](/assets/images/for-posts/ue5-20260124_03.png)
        ![](/assets/images/for-posts/ue5-20260124_04.png)
        
3. [실습] 2D 미니게임(가위바위보)
    1. [DevLog 보기](https://kimlog0415.github.io/devlog/ue5/%EA%B0%80%EC%9C%84%EB%B0%94%EC%9C%84%EB%B3%B4/Unreal%20Engine%205%20Dev%20Log%209%20%E2%80%95%20%EA%B0%80%EC%9C%84%EB%B0%94%EC%9C%84%EB%B3%B4%200/)  
        ![](/assets/images/for-posts/ue5-20260124_05.png)

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