---
layout: post
title: 소설 타임라인 관리 도구 Lumior 1
date: 2026-07-08
categories:
  - apps
  - log
project: lumior
project_name: 소설 타임라인 관리 도구 Lumior
video_id:
app_url:
status:
tags:
  - Python
  - FastAPI
  - JavaScript
  - CSS
---
## 오늘 한 일

- 서버(FastAPI) + 파서 — vault를 매 요청 풀스캔해 item 배열로. frontmatter 값 캡처 정규식은 `[ \t]*`(개행 미포함)로, 빈 연호 값이 다음 줄 `Year`를 잘못 먹던 버그를 피함
- 포함 규칙 — 값이 비어도 `연호`/`Year` 필드 라인이 있으면 포함. 빈 템플릿을 점검(lint)이 "연호 없음"으로 잡게 하려는 의도
- 기존 뷰어 HTML 재활용 — 통째로 박혀 있던 `const DATA`를 `fetch('/api/timeline')`로 교체, 초기화 로직은 fetch가 끝난 뒤 실행되게 함수로 감쌈
- 점검 리포트 `/api/lint` 5종 + 뷰어 점검 탭, 각 항목에 걸린 이유(why) 라벨과 옵시디언 링크
- 인물축 스윔레인 — 고른 인물이 행, 시간 버킷이 열. 년/월/일 구분 단위 선택과 미상 항목 숨김 토글
- order 정렬, 창 포커스 시 자동 재조회(watchdog 없이)
- 해설집(ref) 중첩 — `ref` frontmatter가 가리키는 본문 아래에 작게(↳) 표기하고 자기 자리는 숨김
- 점검이 짚은 빈 연호 해설집 중, 원본과 제목이 완전히 일치하는 34개는 원본 날짜를 채움(백업 후 frontmatter만, 본문 미접촉)

---

## 막힌 부분

### 포함 규칙과 점검 취지가 서로 부딪혔다

CLAUDE.md엔 "연호와 Year가 둘 다 없으면 스킵"이라 적혀 있었는데, 값 기준으로 스킵하면 빈 템플릿이 전부 사라져 점검의 "연호 없음"이 0이 됐다. 정작 점검하려던 대상이 스킵되는 모순이었다. 값이 아니라 필드 존재 기준으로 바꿔, 값이 비어도 필드 라인이 있으면 포함하도록 했다.

```python
# 값이 비어도 연호/Year 필드가 있으면 포함 (빈 템플릿을 lint가 잡도록)
if not (_present(fm, "연호") or _present(fm, "Year")):
    return None
```

> 구 뷰어의 정적 스냅샷(1,174개)은 설정집 일부를 손으로 빼낸 결과라 규칙으로 재현되지 않았다. 라이브 스캔은 템플릿을 가진 설정 문서까지 포함하고, 그걸 점검이 노출하는 쪽으로 정리했다.

### 스윔레인 헤더가 첫 행과 겹쳐 보였다

가로 스크롤을 주려고 표 컨테이너에 `overflow-x: auto`만 걸었는데, CSS 규칙상 이게 `overflow-y`를 `auto`로 끌어올려 컨테이너가 세로 스크롤 영역이 돼 버렸다. 그 안에서 헤더의 `top: 60px`(페이지 헤더 높이 가정)가 컨테이너 기준으로 적용돼 헤더가 60px 밀려 첫 행과 겹쳤다. 컨테이너에 고정 높이를 줘 자체 스크롤 영역으로 만들고, 헤더는 `top: 0`으로 그 안에서 고정되게 했다.

```css
#swimMain { overflow: auto; height: calc(100vh - 60px); }
table.swim thead th { position: sticky; top: 0; }
table.swim .rowhdr { position: sticky; left: 0; }
```

### 해설집 24개가 타임라인에서 통째로 사라졌다

`ref`가 있는 해설집 50개 중 24개가 아예 안 떴다. frontmatter도 정상이고 연호·Year 필드도 있는데 제외됐다. 원인은 본문 어딘가의 깨진 UTF-8 바이트 하나였다. 엄격한 utf-8로 파일 전체를 읽다가 디코딩 실패로 파일이 통째로 스킵된 것이다. frontmatter만 쓰면 되니 관대하게 읽도록 바꿨다.

```python
# 본문 깨진 바이트 하나로 파일 전체가 스킵되던 버그
text = open(path, encoding="utf-8-sig", errors="replace").read()
```

---

## 다음에 할 일

- watchdog로 실시간 반영 (지금은 창 포커스 시 재조회로 대체)
- frontmatter 인라인 편집 — 뷰어에서 날짜 고치면 서버가 해당 md의 frontmatter만 수정(.bak 백업, 본문 미접촉)
- 원본을 자동으로 못 찾은 해설집(제목 불일치·요약형)은 점검에 남겨 수동 정리
- 배포/공유 — 옵시디언 플러그인 또는 File System Access 웹앱 방향 검토
