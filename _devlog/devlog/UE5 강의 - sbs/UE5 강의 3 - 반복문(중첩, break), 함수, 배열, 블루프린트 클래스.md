---
layout: post
title: UE5 강의 3 - 반복문(중첩, break), 함수, 배열, 블루프린트 클래스
date: 2026-01-10
categories:
  - today-i-learn
project: ue5-class-sbs
project_name: UnrealEngine5 Class
video_id:
app_url:
status:
---
## 오늘 한 일

1. 언리얼 블루프린트 기초
    1. 반복문
        1. 중첩: 반복문 안에 반복문을 사용하는 것  
            
		![](/assets/images/for-posts/ue5-20260110_01.png)
		![](/assets/images/for-posts/ue5-20260110_02.png)
            
        2. Break(제어)
    2. 함수
    3. 배열(자료구조)
2. 블루프린트 클래스: 재사용 및 확장이 가능. 레벨 블루프린트와 달리 특정 레벨에 종속되지 않음. 상속 가능.
3. [실습] 중첩 반복문 활용(구구단 출력하기)  
		![](/assets/images/for-posts/ue5-20260110_03.png)
		![](/assets/images/for-posts/ue5-20260110_04.png)
4. [실습] 구구단 출력 변경하기  
		![](/assets/images/for-posts/ue5-20260110_05.png)
		![](/assets/images/for-posts/ue5-20260110_06.png)
5. [실습] 구구단 출력 결과값을 캐싱 처리, 함수  
    ```
    ArrCachedResults(배열 변수)  
    구구단 결과값(72개)  
    파라미터로 구구단 번호를 입력받음. (단, 리턴값없음 바로 출력, 파라미터( 2 ~ 9) 값을 가질 수 있음  
    (함수이름: PrintResult, 파라미터 이름: Index)  
    인덱스 접근  
    입력값이 5인 경우 출력값  
    결과(5단의 결과값만 출력(단, 연산은 없다. 캐싱된 결과값에서 가져온다))
    ```
	![](/assets/images/for-posts/ue5-20260110_07.png)
	![](/assets/images/for-posts/ue5-20260110_08.png)
	![](/assets/images/for-posts/ue5-20260110_09.png)
	![](/assets/images/for-posts/ue5-20260110_10.png)

입력값이 8인 경우
	![](/assets/images/for-posts/ue5-20260110_11.png)

---

## 어려웠던 점

1. 자릿수를 출력하라는게 무슨 뜻인지 몰랐다. 주어진 숫자를 낱개로 분해해서 출력하라는 의미였다.

---

## 배운 점

1. 자릿수: 주어진 숫자를 각각 낱개로 분해한 것
2. 자릿값: 보여지는 숫자의 가치. 예를들어 53은 5와 3이라는 숫자이지만 자리에 의해 5는 50으로 3은 3의 가치를 갖게 된다.
3. 초기화는 앞쪽에 하는 것이 좋음
4. 퓨어함수(read only): return value만 있는 것

---

## 해야 할 일

1.