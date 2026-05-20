---
layout: post
title: const
date: 2026-04-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Programming
---
Constant의 줄임말. "변하지 않는 것"

선언할 때 정한 값이 바뀌지 않는다는 의미를 코드에 명시하는 것.
따라서 함수 안에서 그 변수의 값을 읽기만 한다면(readonly) const로 명시해 실수로 값이 변경되는 것을 방어할 수 있다.

특히 pointer나 reference같이 원본에 접근 가능한 타입에 사용.

```cpp
// 바꿀 애들
int* currentColumns      // 쓰기 가능
int& a                   // 쓰기 가능

// 읽기만 할 애들
const int* currentColumns  // 읽기만
const int& a               // 읽기만
```
