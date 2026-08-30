---
layout: post
title: Obsidian vault에서 코드만 빼기 — directory junction
date: 2026-08-30
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 빌드가 코드와 콘텐츠를 한 repo로 묶어야 하는데 Obsidian 검색은 포스트만 보고 싶을 때 — 물리적으로 쪼개는 대신 repo를 통째로 옮기고 콘텐츠만 junction으로 되비추는 법, 그 과정에서 밟은 함정들.
tags:
  - Obsidian
  - Windows
  - Git
---
이 블로그는 Obsidian으로 마크다운을 쓰는데, repo가 vault 안에 통째로 들어 있어서 `node_modules`·`src` 같은 코드까지 Obsidian이 인덱싱하고 있었다. 검색이 코드에 다 묻혔다. "코드는 vault에서 빼고 포스트만 남기고 싶다"를 푸는 과정을 정리한다.

---

## 못 하는 것부터 — 코드와 콘텐츠는 한 repo여야 한다

먼저 "코드 폴더만 딴 데로 옮기고 포스트만 남기기"는 안 된다. 빌드가 둘을 한 덩어리로 보기 때문이다.

- Astro는 `./_content`를 repo 루트 기준 상대경로로 읽는다
- Cloudflare Pages는 그 repo 하나를 통째로 빌드한다

그래서 `_content`와 코드가 서로 다른 폴더·repo로 갈라지면 빌드가 깨진다. 결론은 분리하지 말고 "보이는 범위"만 좁히자였다.

---

## junction — 프로그램이 진짜 폴더처럼 따라가는 별칭

### 바로가기(.lnk)와 무엇이 다른가

핵심 도구가 directory junction이다. 일반 바로가기(`.lnk`)는 "저기로 가라"고 적힌 쪽지라, 탐색기 더블클릭엔 반응해도 프로그램한테 "여기 폴더야" 하면 못 따라간다. junction은 파일시스템 수준에서 "이 경로 = 저 폴더"라고 못 박은 거라, 프로그램(Obsidian 포함)이 열면 진짜 그 폴더 내용이 나오고 읽기·쓰기가 다 된다. 복사본이 아니라 입구 둘, 방 하나다.

그래서 repo는 vault 밖으로 통째로 옮기고, vault 안엔 `_content`를 가리키는 junction만 두면 — Obsidian은 포스트만 보고(코드는 안 보임), 글을 쓰면 진짜 repo의 `_content`가 바뀌어 git·빌드가 그대로 먹는다.

### 만들기

관리자 권한이 필요 없다(심볼릭 링크와 달리 junction은 권한 불필요).

```powershell
# repo 통째로 이동 (같은 드라이브면 즉시)
Move-Item -LiteralPath $src -Destination $dst
# vault 옛 경로에 _content 만 되비추기
New-Item -ItemType Junction -Path "$src\_content" -Target "$dst\_content"
```

`_content`를 이렇게 걸면 포스트의 vault 경로(`...\kimlog0415.github.io\_content\...`)가 이전과 똑같이 유지된다. Obsidian 링크·검색 인덱스가 안 깨진다.

---

## Obsidian 쪽에서 알게 된 것

### vault가 코드까지 인덱싱하면 검색이 오염된다

검색을 덮은 진짜 범인은 `node_modules`였다. 거기 README.md가 수천 개라 검색 결과를 다 잡아먹는다. junction까지 안 가고 가볍게 끝내려면 방법이 세 가지다.

- Excluded files(설정 → 파일 및 링크): 코드 폴더 경로를 넣으면 검색·퀵스위처·그래프에서 빠진다. repo 구조는 안 건드림
- vault를 `_content`로 전환: vault가 블로그 전용이면 됨. 다른 노트도 섞인 vault면 불가
- junction: 폴더 트리에서까지 코드를 아예 안 보이게 하고 싶을 때

점(`.`)으로 시작하는 폴더(`.git`·`.astro`)는 Obsidian이 자동으로 무시한다.

### Obsidian Sync는 "앱이 감지한 변경"만 올린다

파일을 편집기가 아니라 파일시스템에서 직접 고치면(스크립트 등), Obsidian Sync가 바로 안 밀어준다. Sync는 데스크톱 Obsidian 앱이 그 변경을 읽어야 서버로 올리고, 그래야 모바일이 내려받는다. vault가 무거우면 앱의 파일 감시가 느려 이 지연이 더 커진다. 밖에서 고친 게 모바일에 안 뜨면, 데스크톱 앱에서 그 노트를 한 번 열어 주면 그때 올라간다.

---

## 옮기다 밟은 것

### 잠긴 폴더는 이동이 막힌다

`Move-Item`이 `used by another process`로 실패했다. 폴더를 붙잡고 있는 프로세스가 있으면 이름 바꾸기(이동)가 안 된다 — Obsidian(인덱싱), GitHub Desktop(폴더 감시), 그리고 그 폴더를 작업 디렉터리로 둔 셸까지. 그 폴더를 여는 것들을 다 닫아야 이동이 된다.

### 위험한 이동 전엔 백업부터

되돌리기 번거로운 파일 작업 전에 두 층으로 백업했다.

```bash
git push                                   # 추적 파일은 원격에
find _content -iname "draft-*.md" \
  | tar --force-local --null -czf backup.tar.gz -T -   # gitignore된 draft는 tar로
```

`node_modules`는 `npm install`로 복구되니 백업할 필요가 없다. `tar`가 `C:` 경로를 원격 호스트로 오해하면 `--force-local`을 붙인다.

### git 원격은 로컬 위치와 독립이다

로컬 폴더를 어디로 옮기든 git 원격 주소(remote)는 안 바뀐다. Cloudflare Pages는 그 원격(GitHub)에 연결돼 빌드하므로, 로컬 이동은 배포에 아무 영향이 없다. (반대로 GitHub 계정 자체를 옮기는 것은 별개다 — 그건 원격이 바뀌니 Cloudflare 연결을 새 repo로 다시 이어야 한다.)

---

## 정작 제일 중요한 교훈

### 도구는 그 repo를 root로 열어야 한다

옮기고 나서 편집기·Claude Code를 그 repo 폴더 자체를 root로 열지 않으면 방향을 잃는다. 상위 폴더나 옆 프로젝트를 root로 열면 블로그가 하위로 묻혀서 "왜 안 잡히지"가 된다. 이동 안내에 이걸 같이 적어 두지 않으면, 옮긴 뒤 도구가 엉뚱한 root로 떠서 다 옮긴 게 망가진 것처럼 보인다.

### 붙어 있어야 하는 건 쪼개지 말고, 뷰만 바꾼다

빌드가 한 덩어리로 봐야 하는 것(코드+콘텐츠)을 물리적으로 나누려 하면 파이프라인이 깨진다. 실제로 필요한 건 "안 보이게 하기"였는데, 그건 파일을 옮기지 않고 보이는 범위(Excluded files·junction)로 푸는 문제였다. 구조를 건드리기 전에 "정말 물리적으로 나눠야 하나, 뷰만 좁히면 되나"를 먼저 가른다.
