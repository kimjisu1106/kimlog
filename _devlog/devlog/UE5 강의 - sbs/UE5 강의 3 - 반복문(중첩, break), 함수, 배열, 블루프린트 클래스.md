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
            
            ![](https://blog.kakaocdn.net/dna/dwpxmS/dJMcabwFA5Y/AAAAAAAAAAAAAAAAAAAAAFZOt7oFNs5WX3ifc8vXTRzF4aOMXnRcyG3cSWSKt9Px/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=R3qHIN3B1crMeNXfDcVu0QQs%2B4s%3D)
            
            ![](https://blog.kakaocdn.net/dna/yVB1e/dJMcab4vN5a/AAAAAAAAAAAAAAAAAAAAADI0AKfIaurK2Uf3hd8v0hg0ptDzGxJCXKeDoyu0U4K3/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=lsSjetA1Bm4QS5UDqT7qh2CONLw%3D)
            
        2. Break(제어)
    2. 함수
    3. 배열(자료구조)
2. 블루프린트 클래스: 재사용 및 확장이 가능. 레벨 블루프린트와 달리 특정 레벨에 종속되지 않음. 상속 가능.
3. [실습] 중첩 반복문 활용(구구단 출력하기)  
    
    ![](https://blog.kakaocdn.net/dna/U5Oqs/dJMcac98BZF/AAAAAAAAAAAAAAAAAAAAAK_ZcZcjW7enYKr7W2M1f_c0Vnc6YCQZjEE_0MVBS-X0/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=uF1%2FBKlDPFSQSpeXT53qbFA8%2BPk%3D)
    
    ![](https://blog.kakaocdn.net/dna/b5Vrxu/dJMcahKr8lO/AAAAAAAAAAAAAAAAAAAAAKTtANKqcI-Ztr_bnID7oK4rrEic9GUkUNEWLWOzh0OD/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=8pLcU9MgLEnJYPhXWmU6dlCBuQs%3D)
    
      
      
    
4. [실습] 구구단 출력 변경하기  
    
    ![](https://blog.kakaocdn.net/dna/bmN2k6/dJMcag5P04E/AAAAAAAAAAAAAAAAAAAAAFxTn74Uj2Rjn0Q5EfdalJHqyyswoLnqVevJAK8Fg_bq/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=JXw69i0nQ2cHrQD45R%2B6XaYzblI%3D)
    
    ![](https://blog.kakaocdn.net/dna/bfOxRE/dJMcaaLjsn1/AAAAAAAAAAAAAAAAAAAAAM4qOov6mVmO561J88NsG8x6obLkY7gVUYmg1K05YrOL/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=I8b1TxNX2V%2FWTWOrpIfWz6uzylQ%3D)
    
      
      
      
    
5. [실습] 구구단 출력 결과값을 캐싱 처리, 함수  
    ArrCachedResults(배열 변수)  
    구구단 결과값(72개)  
    파라미터로 구구단 번호를 입력받음. (단, 리턴값없음 바로 출력, 파라미터( 2 ~ 9) 값을 가질 수 있음  
    (함수이름: PrintResult, 파라미터 이름: Index)  
    인덱스 접근  
    입력값이 5인 경우 출력값  
    결과(5단의 결과값만 출력(단, 연산은 없다. 캐싱된 결과값에서 가져온다))

![](https://blog.kakaocdn.net/dna/cE7TLM/dJMcadVwuca/AAAAAAAAAAAAAAAAAAAAAGwmPwR1yh6-LMW6rvybiax9qcEFdS98XNEWOeJoLhG7/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=C52yxeQ%2FwF1i5NZDcdAwn0jsTNA%3D)

![](https://blog.kakaocdn.net/dna/kzJYc/dJMcacI9euc/AAAAAAAAAAAAAAAAAAAAAPWRLYkTUbvrBZ_lb1vWuBq80vKhj-NMWNE0VG3XqWXZ/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=mT2uqSqD5s8yBwOebtZ%2Fvrieu7Q%3D)

![](https://blog.kakaocdn.net/dna/eoSz0M/dJMcaflykH0/AAAAAAAAAAAAAAAAAAAAACaeXqvr-aZ_KG0tIMONJ5EapmFqVAeHglrAKuzM8XA4/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=QopdI35XMo%2FahP8rmpjbn%2B%2Bje5E%3D)

![](https://blog.kakaocdn.net/dna/cWllA0/dJMcadBbVTg/AAAAAAAAAAAAAAAAAAAAAKklkastKx6UrtOysMHDFJABLnsyWM0HAxQsI0srfEDW/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=fvUgCJWPjU6oVOpzlVeKMHR88kc%3D)

입력값이 8인 경우

![](https://blog.kakaocdn.net/dna/zInzR/dJMcabQYrtl/AAAAAAAAAAAAAAAAAAAAAGTrFEnod7woZ9yfBSe4vPelyJi-n9UTdRE3GUFojL0I/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=NDeGYueuuIN%2FU0u3FpdbyKuRCbA%3D)

---

## 어려웠던 점

1. 자릿수를 출력하라는게 무슨 뜻인지 몰랐다. 주어진 숫자를 낱개로 분해해서 출력하라는 의미였다.

---

## 배운 점

1. 자릿수: 주어진 숫자를 각각 낱개로 분해한 것
2. 자릿값: 보여지는 숫자의 가치. 예를들어 53은 5와 3이라는 숫자이지만 자리에 의해 5는 50으로 3은 3의 가치를 갖게 된다.

---

## 해야 할 일

1.