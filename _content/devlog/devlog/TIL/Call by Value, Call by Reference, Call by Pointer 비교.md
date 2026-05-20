---
layout: post
title: Call by Value, Call by Reference, Call by Pointer 비교
date: 2026-04-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - C++
---
요약: 함수에 변수를 넘길 때 뭘 넘기냐.

---

**CallByValue — 값을 복사해서 넘김(Copy)**

```cpp
SwapByValue(num1, num2);
// num1, num2의 값(0, 99999)을 복사해서 넘김
// 함수 안에서 a, b를 바꿔도 원본 num1, num2는 그대로
```

```
main의 num1, num2  →  복사본 a, b
함수 안에서 a↔b 교환  →  복사본끼리만 교환
원본은 변화 없음 ❌
```

---

**CallByReference — 원본을 직접 넘김(Reference)**

```cpp
SwapByRefrence(num1, num2);
// num1, num2 자체를 넘김 (별명을 만드는 느낌)
// 함수 안의 a, b가 곧 num1, num2
```

```
a = num1 // num1의 별명. *없이 그냥 쓰면 됨
a↔b 교환 = num1↔num2 교환
원본 바뀜 ✅
```

---

**CallByPointer — 주소를 넘김(Pointer)**

```cpp
SwapByPointer(&num1, &num2);
// num1, num2의 방 번호를 넘김
// 함수 안에서 그 방에 직접 들어가서 값을 바꿈
```

```
a = &num1 // num1의 방 번호
*a = 그 방 안에 있는 값. *이 있어야 해당 value에 접근 가능
*a ↔ *b 교환 = num1↔num2 교환
원본 바뀜 ✅
```

---

**Reference와 Pointer 차이점**

1. null 가능 여부

```cpp
int& a = nullptr;  // ❌ Reference는 null 불가. 반드시 뭔가를 참조해야 함
int* a = nullptr;  // ✅ 포인터는 null 가능
```

2. 재할당 가능 여부

```cpp
int x = 1, y = 2;

int& a = x;
a = y;  // ❌ Reference는 한번 연결되면 바꿀 수 없음. 이건 x에 y값을 대입하는 것

int* a = &x;
a = &y;  // ✅ 포인터는 다른 변수로 바꿀 수 있음
```

3. 주소 연산 가능 여부

```cpp
int& a = x;
a++;  // ❌ 이건 x값을 1 증가시키는 것

int* a = &x;
a++;  // ✅ 포인터는 다음 메모리 주소로 이동 가능. 배열 순회할 때 씀
```

4. 함수에 배열을 변수로 넣을 때 사용할 경우
```cpp
int arrNums[5]={0, };
void FuncReference(int (&arrNums)[5]); // arrNums는 5개로 고정. 변경 불가능
void FuncPointer(int* arrNums); // arrNums 개수 변경 가능
```
