---
layout: post
title: DSL (Domain Specific Language)과 GPL (General Purpose Language)
date: 2026-04-15
categories:
  - today-i-learn
project: today-i-learn
project_name:
video_id:
app_url:
status:
---
## DSL (Domain Specific Language)

특정 도메인(영역)의 문제를 해결하기 위해 최적화된 '전용 언어'
🌟악보를 그릴 때 오선에 표기하는 음표들과 비슷한 개념(음악이라는 영역에서는 표준어보다 훨씬 빠르고 정확하게 소통 가능)

- 특징: 범용 언어(GPL)보다 표현력이 높고, 해당 분야의 전문가라면 프로그래밍 지식이 적어도 이해하기 쉬움.
- 장점:
	- 가독성이 좋고 생산성이 높음. (예: SQL 한 줄이면 끝날 DB 조회를 C++로 짜려면 수십 줄이 필요함)
	- 복잡한 내부 로직을 몰라도 해당 도메인의 지식만 있으면 코드를 짤 수 있게 해준다.

| 도구            | DSL 예시                     | 목적          |
| ------------- | -------------------------- | ----------- |
| Appsheet      | `[연관 업체].[업체명]`            | 노코드 앱 로직 구현 |
| Excel         | `=IF(A1>0, "양수", "음수")`    | 스프레드시트 수식   |
| Jekyll/Liquid | `{% assign x = "hello" %}` | 템플릿 렌더링     |
| SQL           | `SELECT * FROM users`      | DB 조회       |
SQL도 따지면 DB 전용 DSL이고,
Liquid도 Jekyll 전용 DSL.
직접 만들 수도 있음 — ChordSheet의 커스텀 파일 포맷도 일종의 DSL.


---
## GPL (General Purpose Language)

다양한 분야에서 범용적으로 사용할 수 있는 '범용 언어'

- 특징: 실행 로직, 메모리 관리, 입출력 등 컴퓨터의 전반적인 기능을 수행할 수 있음.
- 예시: Python, C++, Java, Kotlin, Swift, Go 등.
- 확장성: 
	- JavaScript: 초기엔 웹 브라우저 조작 전용(Scripting)에 가까웠으나, 생태계가 확장되며 현재는 서버, 앱, AI 등 모든 분야에서 쓰임.
    - Python: 데이터 분석 DSL처럼 쓰일 때도 있지만, 태생은 GPL임.