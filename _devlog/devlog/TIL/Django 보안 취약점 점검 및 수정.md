---
layout: post
title: Django 보안 취약점 점검 및 수정
date: 2026-04-17
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Django
  - Python
  - Security
---
아침에 GeekNews를 보고 Django로 개발중인 서비스 보안 점검을 했다.

1. 로그인 메시지
	1. 기존: '기존에 n회 틀리면 잠김' 이라는 로그인 메시지를 사용했다.
	2. 문제점
		1. 공격자에게 ID가 유효한지 여부를 판단하는 근거가 될 수 있다. 
		2. 사용자 입장에서는 로그인 시 아이디가 틀린건지 비밀번호가 틀린건지 알고싶겠으나 UX와 보안이 충돌하는 지점이었다. 
	3. 해결 방법: 로그인 성공 전까지 계정 존재 여부 노출 없는 문구로 변경했고 잠금 시 '관리자 문의'하도록 알람 설정.
2. `settings.py`
	1. 기존: API_KEY 같은 중요한 정보는 `.env`에 넣어두고 있었다.
	2. 문제점
		1. 만약 `.env`가 없는 경우 `settings.py`에 설정된 default로 작동될 수 있다.
		2. SECRET_KEY의 default가 기본값이면 세션 쿠키 위조 가능해서 누구든 admin으로 로그인 가능 → 에러도 없이 조용히 돌아가서 모르고 지나칠 수 있음.
	3. 해결 방법: `settings.py`에서 default들을 지워 `.env`없으면 서버가 실행되지 않도록 했다.