---
layout: post
title: Unreal Engine 5 Dev Log 6 ― 웨딩 영상 인트로 제작기 (UE5 + Blender)
date: 2025-10-04
categories:
  - devlog
  - ue5
  - summary
project: wedding-intro
project_name: 웨딩 영상 인트로
video_id: spik3FuBHJ8
app_url:
status: finished
---
## 요약

- Blender에서 피드 카드 + 풍선 글씨 제작
- UE5에서 카드 36장 배치 + 사진/영상 미디어 적용
- 카메라 무빙 + 조명 + MRQ 렌더
- 최종 결과: 총 40초 인트로 완성

---

## 제작 동기

- 남편이 편집 중인 동생 결혼 인터뷰 영상에 들어갈 인트로 제작.
- 처음엔 단순히 10초 정도 분량을 맡았다가, 길이가 짧다고 느껴 40초로 늘었고 결국 인트로를 담당하게 됨.

---

## 목표 설정

- 작업 기간: 2025.10.01.~2025.10.03.(14h)
- 하고자 한 것:
    - 여러 영상과 사진을 한 화면에서 동시에 보여주기
    - 카메라 무빙 추가
    - 단순 2D 합성이 아닌, 3D 씬으로 연출하기
    - SNS 피드를 참고한 카드 프레임 안에서 사진/영상 표현
    - (계획) 나이아가라 반짝이 → 실제 본편에서 가려져 제외

---

## 주요 작업

### Blender

- 피드 카드 제작
    - 유저 네임, 버튼 UI (add, like, search) 포함
    - 주요 계정명만 지정, 나머지는 “congratulation”, “happy” 같은 기본 네임으로 채워 재사용 가능 카드 제작 (총 11개)
    - 사진/영상 영역을 위해 홈을 파줬는데, 실제론 Plane/MediaPlate로 얹는 방식이라 불필요했음
- 인트로용 풍선 글씨
    - 텍스트 정렬(center align) 처리 첫 경험
    - 텍스트 지오메트리 두께 조절 기능 학습
    - Cloth Filter 기능 사용해봄
    - 머티리얼: 색상·러프니스 설정 → UE 기본 하늘색과 어울리도록 재조정

### Unreal Engine

- 카드 배치 / 미디어 적용
    - Static Mesh 결합 후 import (처음만 Material 포함)
    - 이후 Material은 파라미터 조정 → Instance 생성 → 각 카드에 적용
    - 총 36장 배치
    - 처음엔 카드+사진/영상을 하나의 액터로 묶음 → 복제 시 머티리얼이 전부 동기화되는 문제가 있어 결국 카드와 콘텐츠를 분리 배치
    - 사용자 프로필 영역 UV 꼬임 문제 발생 → 별도 Plane 배치로 해결
- 풍선 배치
    - 개별 움직임을 위해 Static Mesh 결합 해제 후 import
- 소스 관리
    - 모든 소스는 미리 1:1 비율 편집
    - 폴더: video / photo 구분
    - 사진: Plane + Material 적용
    - 영상: Media Plate + 시퀀서 적용
- 구름
    - 단순 고정이 아니라 천천히 변화가 있도록 높이 조정
- 시퀀서
    - 풍선: 아래 → 위 이동 애니메이션
    - 카메라: 기본 각도 20도 위로 기울여 하늘이 잘 잡히도록 설정, 이후 자유로운 무빙
    - 오디오는 원곡 그대로 사용
- 조명
    - 메인: Directional Light
    - 풍선용: Rect Light 3개 (정면 + 양옆 30도)로 하이라이트 강화
    - 풍선용 반사판: Plane + Roughness 조절. 풍선 하부 그림자 완화
    - card용: Rect Light 3개(풍선용과 같은 설정)
- MRQ
    - 처음엔 H.264로 출력 → 에러 발생(약 1.5h 소모)
    - 최종: MOV(Apple ProRes)로 출력하여 문제 해결
- 나이아가라
    - 반짝이 효과는 본편 인터뷰 영상과 겹칠 예정이라 적용하지 않음

---

## 배운점

- 긴 영상(30초 이상)은 MOV(ProRes)로 출력해야 안정적이다. 대신 용량이 엄청나다
- 액터 그룹핑(컴포넌트 병합)은 단순 폴더링이 아니라 동작까지 공유된다 → 용도 구분 필요
- 블렌더에서 불필요하게 만든 부분(예: 카드 홈 파기, 프로필까지 모델링)은 UE에서 Plane으로 대체 가능하다
- 반사판 최고다 풍선이 훨씬 예뻐졌다

![](https://blog.kakaocdn.net/dna/cBvLgO/dJMcaaq7cio/AAAAAAAAAAAAAAAAAAAAAHZc1epKY-gvuy9gt1VVSBM579NibOmOj-aeNKpAa6ZB/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=SpMA0AvAfgNqrVmNrnGCpnRhvro%3D)
