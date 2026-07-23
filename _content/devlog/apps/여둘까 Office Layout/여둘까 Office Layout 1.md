---
layout: post
title: 여둘까 Office Layout 1
date: 2026-06-17
categories:
  - apps
  - log
project: office-layout
project_name: 여둘까 Office Layout
video_id:
app_url: https://office-layout.pages.dev
status: finished
tags:
  - JavaScript
  - HTML
---
## 오늘 한 일

- 시작: 사무실 책상·집기 배치 단일 HTML 도구 첫 커밋 + CLAUDE.md 작성(좌표 모델·단일 파일 제약·코드 구조 정리)
- 그룹 기능: 책상+의자 세트 묶음 이동/복제/삭제, 그룹 전체 크기 표시, 드래그 시 간격 틀어짐·겹침 버그 수정(leader 가드), 테두리 두께가 크기에 더해지던 문제 수정
- 편집 편의: 회전 핸들 hover 커서, 내 그룹 목록, 실행취소/다시실행(Ctrl+Z/Y), 프리셋 수치 편집, Ctrl+C/V 복사·붙여넣기, Ctrl+S 저장
	- 이유: 마우스 없이도 익숙한 단축키로 조작할 수 있도록.
- 저장/파일: 프로젝트 이름 저장·다른 이름으로 저장, 같은 파일 덮어쓰기(File System Access API), 미저장 변경 시 이탈 경고, 프리셋 편집값을 JSON에 저장·복원, 메인 파일을 `index.html`로 변경(Cloudflare Pages)
- 측정/선택: 거리 측정값 영구 표시·개별 삭제, 선택 가구 파란 하이라이트
- 내보내기: 이미지 내보내기 옵션 모달(측정/선택표시 포함 여부)
- 보안: 프로젝트 파일 암호화(Web Crypto AES-GCM), 불러온 JSON 이름의 XSS 차단 + PBKDF2 강화, 모달 공통 클래스·캔버스 폰트 상수화 리팩터

---

## 막힌 부분

- 그룹 생성 후 크기를 확인하니 설정한 것보다 커져 있음
	- 방안: 테두리 두께가 크기에 더해지던 계산 오류 수정
- 그룹을 드래그하면 도형 간 간격이 틀어지거나 겹침
	- 방안: leader 가드 추가로 해결

---

## 다음에 할 일

- 실 사용자들에게 피드백 요청하기