---
layout: post
title: OOP Object-Oriented Programming 객체 지향 프로그래밍
date: 2026-04-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
클래스(객체의 설계도) 별로 객체를 만들도록 하는 프로그래밍.
회사 툴 만들면서 이미 Django에서 Model로 사용 중이던 개념.
Class는 객체(Object, Instance)가 공통으로 사용할 변수와 함수를 정의한다.
Format 같은 개념으로 객체는 Class에 정의된 상태(state)와 동작(behavior)을 갖게 된다.
자식 Class는 부모 Class에 정의되지 않은 자기만의 Function이나 변수를 가질 수 있음.
객체는 Class에 정의된 변수와 함수만 사용 가능하다. 자식 Class에서 만든 객체는 부모 Class에서 정의된 것 + 자식 Class에 추가한 것 둘 다 사용 가능하다(상속)

| 구분            | 설계도             | 객체                    |
| ------------- | --------------- | --------------------- |
| Django        | Model           | Instance(DB의 Row에 대응) |
| C++ / UE5 C++ | Class           | Object/Instance       |
| UE5 Blueprint | Blueprint Class | Spawned Actor         |

## Python vs C++ 접근 제어 차이

- Python
	- 개발자들이 관례적으로 언더바를 이용해 구분하긴 하지만 C++처럼 컴파일러에서 관리하지 않는다.
```
a_field    # public (그냥 쓰면 됨)
_a_field   # protected 관례 (언더바 하나)
__a_field  # private 관례 (언더바 둘)
```
- C++
	- Private(Class 자신만 사용 가능), Public(누구나 사용 가능), Protected(자신과 자식만 사용 가능)으로 구분하며 엄격하게 컴파일러에서 관리한다.