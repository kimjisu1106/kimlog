---
layout: post
title: subprocess.Popen으로 Windows 탐색기에 명령어를 전달
date: 2026-04-10
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Python
---
`subprocess.Popen(f'explorer /select,"{filepath}"')`

- `subprocess`: Python 안에서 다른 프로그램(프로세스)을 실행할 수 있게 해주는 모듈.
	- `subprocess.run()`: 실행 후 끝날 때까지 기다림
	- `subprocess.Popen()`: 실행 후 기다리지 않고 바로 다음 코드로 진행
- `f''`: `explorer /select, "경로"` 라는 명령어를 사용해야하는데 경로가 변수이기 때문에 f-string을 사용
- `explorer`: 탐색기를 실행. path에 등록되어있기 때문에 explorer.exe의 전체 경로를 적지 않아도 실행 가능.
	- Windows 전용. Mac은 `open`, Linux는 `xdg-open` 사용.
	- Windows: `explorer /select,"경로"`
	- Mac: `open -R "경로"` //`-R`이 `/select`와 같은 역할
	- Linux: `xdg-open "경로의 폴더"` // Linux는 파일 선택 기능이 없음
- `/select`: 파일이 선택된 상태
- `"{filepath}"`: 파일 경로에 공백이 있을 경우 파싱이 불가하기 때문에 큰따옴표로 묶음.
- `{filepath}`: 파일 경로 변수