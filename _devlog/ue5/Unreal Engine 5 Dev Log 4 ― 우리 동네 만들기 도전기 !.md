---
layout: post
title: Unreal Engine 5 Dev Log 4 ― 우리 동네 만들기 도전기 !
date: 2025-09-15
categories:
  - devlog
  - ue5
  - summary
project: my-first-simcity
project_name: 우리 동네 만들기
video_id: 40FEFY3NUw4
redirect_to:
status: finished
---
## 요약
퇴근길에 본 분홍 구름 하늘 + 버스가 스쳐가는 교차로를 UE5로 재현.
제작 소요시간 약 18시간.

---

## 제작 동기

퇴근길에 본 하늘이 인상적이었다. 버스도 타이밍 좋게 지나가서 "움직임 있는 볼거리까지" 완벽다.
원본 영상을 기준 삼아, 눈에 보이는 요소들을 가능한 한 재현하는 것이 이번 프로젝트의 목표였다.

---

## 목표 설정

작업기간: 2025-09-13 ~ 2025-09-14(18h)
목표:
1. 도시 레이아웃(마켓 에셋 사용해보기 + 프리미티브)
2. 간판/조명
3. 전광판(Media Plate)
4. 하늘(SkyAtmosphere + Volumetric Cloud)

---
## 주요 작업

실제 작업 순서
블로킹 > 카메라 위치 설정 > 자동차 움직임 설정 > 하늘 > 오브제 에셋 교체 > 조명과 간판, 전광판 > 기타 디테일

1. 도시 환경 구축
	- 블로킹: Cube로 건물, 지하철 출구, 차량 등 오브제 자리 잡기 → 실제 영상+네이버 지도 치수로 스케일 근사치 적용
		- 층고: ~3m/층(천장고 2.5 + 구조 0.5)
	- 에셋 교체: 무료 City building/Vehicle 에셋을 스케일 재조정해 교체
		- 일부 건물은 외관 리모델링하듯 외벽에 Static Mesh를 덧씌워 수정
		- 지하철 출구는 유료 퀄리티 에셋 대신 프리미티브를 이용해 직접 간이 모델링(곡선→직선 대체)
	- 간판: 흰 텍스트 PNG를 Static Mesh 머티리얼로 적용, BaseColor/Emissive 조정
	- 버스 반사 간판: 시야에서 벗어난 간판이 큐브 모양으로 반사되는 문제 발생 → Static Mesh로 글자를 직접 만들고 액터 병합하여 임시 모델링 후 BaseColor/Emissive 설정
		문제 해결을 위해 한 것
			1) Reflection 처럼 보이는 Mesh 배치했으나 버스 곡면 반사까지는 구현되지 않음 → 실패
			2) Planar Reflection → 동일한 문제 발생. 실패
			3) 결국 모델링 → 적용
	- 전광판: MediaPlate + 영상. 밝기가 밝아 Material Instance EmissiveColor를 조절했다(VectorParameter * ScalarParameter)
		- 분홍색 영상에 적힌 문구 개인적인 재미 요소 :)
			- print("김로그의 네번째 영상.")
			- console.log("KimLog's 4th Video.");
			- fun main() {println("워니, 사랑해.")}
			- print("I love you, My sweet potato.")
			- console.log('Unreal Engine Dev Log with 챗지.');
2. 시퀀서
	1. 카메라: 하늘에서 틸 다운으로 하강, 줌만 미세 조정
	2. 차량 애니메이션: 직진(양방향) + 우회전(이동/회전)
	3. 전광판 타이밍: Media Plate 두 개를 컷 포인트에 맞춰 재생
	4. 오디오: 이번엔 DAW(Logic pro)에서 완성 후 import
3. 하늘 구현
	1. SkyAtmosphere + VolumetricCloud + Directional Light + Fog
	2. 내가 분석한 하늘
		1. 시간대는 19시 경. 
		2. 배경 약간 흐린 하늘색. 그러나 밝은 편. 
		3. 태양의 위치는 화면 기준 오른쪽 아래 큰 건물 뒷편. 
		4. 태양의 고도가 낮아졌으니 구름 상단은 흐린 흰색+푸른빛 보라 하단은 태양에 의한 분홍+오렌지
		5. 구름은 높고 가볍게 살짝 뭉쳐진. 하늘의 7-80%정도의 비중
	3. 구현된 하늘
		1. 하늘은 약간 하늘 색. 예상보단 어두운. : 건물이 원하는 만큼 어두워지게 하려다보니 좀 더 어두워짐
		2. 태양의 위치는 화면 기준 우측 하단. 그러나 건물 뒷편까지는 아니고 건물과 건물 사이에 비치게 배치됨.
		3. 구름 상부와 하부 색깔 차이가원하는 만큼 표현되지 않음.
		4. 구름 양과 높이는 비슷.
	4. 구름의 양과 태양의 고도는 비슷했지만, 구름 디테일과 하늘 밝기가 아쉬움
4. 렌더링
	1. Movie Render Queue에서 노출이 지나치게 낮게 나와  
    → 이번은 Sequencer Render로 출력(Logic에서 오디오 교체 할 예정이므로, mov)
5. 오디오/영상 편집
	1. Logic Pro: 교차로 앰비언스, 버스 도어/주행, 세단 패닝
	2. Vegas Pro: 작업 화면 타임랩스 간단 컷/속도 조절

---
## 배운점
1. 세부 디테일이 결과 퀄리티를 좌우한다.
2. 하늘이 어두워졌으니 차량 라이트가 들어가도 좋았을 것 같다
3. 오디오에 사람소리가 있으니 인물이 배치되었어야 한다.
4. 하늘 구현이 까다롭다.
5. 에디터 내 조작과 화면 이동에 익숙해졌다.
6. VectorParameter와 ScalarParameter 활용법에 익숙해졌다.
7. 메모리 관리와 맵 재활용 방법을 학습할 필요성을 느꼈다.

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