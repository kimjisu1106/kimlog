---
layout: post
title: C++에서 함수의 선언과 정의
date: 2026-03-28
categories:
  - today-i-learn
  - ue5
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
C++은 컴파일을 위에서 아래로 단일 방향으로 하기 때문에 함수 사용 시 선언부와 정의부가 존재한다. 나중에 이런 함수가 나올거라고 미리 알려주는 것.

선언 없이 함수 사용 시 컴파일러가 `Print()`를 만났을 때 뭔지 모르기 때문에 에러가 난다.
```cpp
int main()
{
    Print();  // Print가 뭔지 모름
}

void Print()  // 이건 main보다 아래에 있음
{
    ...
}
```

선언을 미리 해두면 컴파일러가 무슨 함수인지 알게됨.
```cpp
void Print();  // "이런 함수 나중에 나올거야"

int main()
{
    Print();  // ✅ 아 그 함수구나
}

void Print()  // 실제 내용은 여기
{
    ...
}
```

정의를 main보다 위에 쓰면 선언이 필요 없다.
```cpp
// 정의를 main보다 위에 쓰면 선언 필요 없음
void Print()
{
    ...
}

int main()
{
    Print();  // ✅
}
```

그럴경우 시각적으로 직관적이지 않기에 선언부와 정의부를 나누어 작성한다. 
UE5 C++에서는 `*.h(선언)`와 `*.cpp(실행, 정의)`로 나뉜다.

```
선언 (목차)   → "어떤 함수들이 있는지" 한눈에 보임
main (흐름)   → "프로그램이 어떻게 돌아가는지" 먼저 파악
정의 (내용)   → 실제 구현은 아래서 찾아보면 됨
```
