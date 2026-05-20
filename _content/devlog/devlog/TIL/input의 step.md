---
layout: post
title: input의 step
date: 2026-05-08
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - HTML
---
## input의 step="any"

HTML `<input>` 태그에서 `step="any"`는 숫자 입력 필드(`type="number"`, `range` 등)가 소수점 제한 없이 어떤 숫자든 허용하도록 설정하는 속성. 기본값(step="1")은 정수만 허용하지만, `any`를 사용하면 부동 소수점 숫자 입력을 제한 없이 받을 수 있다.

- **용도:** 소수점 입력 제한 해제 (예: 0.1, 0.001 등).
- **사용법:** `<input type="number" step="any">`.
- **효과:** `step`이 없으면 기본적으로 1 단위로 제한되어 정수만 유효성 검사를 통과하나, `any`는 모든 범위 내 숫자를 허용.
- **비교:** `step="0.1"`은 0.1 단위로만 입력 가능, `step="any"`는 0.12345... 등 모든 소수점 자리수 허용.