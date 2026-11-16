---
title: ShapeKit 7
date: 2026-11-15
permalink: "b0d5ff7f"
categories:
  - log
  - apps
project: shapekit
project_name: ShapeKit
description: 윈도우 기본 모양이던 ShapeKit 바탕화면 바로가기에 탭 아이콘과 같은 수국 그림을 건 날.
tags:
  - Python
  - Windows
---
## 오늘 한 일

- 바탕화면 ShapeKit 바로가기 아이콘을 수국 그림으로 바꿨다. 윈도우 기본 모양이던 것을 Claude가 바꾸자고 했고, 바꾸기로 했다
  - 브라우저 탭에 쓰던 수국 아이콘(64×64)을 그대로 키워 썼다. 탭과 바로가기가 같은 그림이라 어느 쪽에서 봐도 같은 도구로 보인다
- 설정이 다른 두 결과를 한 화면에 나란히 놓고 비교하는 화면은 만들지 않기로 했다
  - 이유: 지금 그 화면을 기다리는 작업이 없다. 카드를 번갈아 보는 것으로 된다

---

## 막힌 부분

- 바로가기는 png를 아이콘으로 받지 않는다
  - 해결: 아이콘 전용 형식(.ico)으로 따로 만들어 걸었다. 프로젝트 폴더에 같이 둔다
