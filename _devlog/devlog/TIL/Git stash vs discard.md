---
layout: post
title: Git stash vs discard
date: 2026-04-10
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
원고를 적는 Obsidian도 Sync 중이라 노트북과 데스크톱의 git hub에서 종종 충돌이 발생된다.
Changes를 지난번에 Discard했다가 원고를 날렸던 경험이 있어서 이번에는 Stash하고 Restore했다.

- `Discard`: 변경사항 날려버림 (복구 불가, 이번에는 Obsidian의 삭제된 파일 복구 기능으로 복구)
- `Stash`: 잠깐 보관해뒀다가 나중에 Restore로 꺼내올 수 있음

**원리** Stash → Pull(원격 파일 땡겨옴) → Restore(Stash 파일 꺼냄) → 변경사항이 Changes에 나타나 Commit 가능해짐.
**언제 쓰나?** Obsidian Sync처럼 외부에서 파일이 생긴 상태에서 pull 하려고 할 때 충돌 나면 Stash → Pull → Restore 순서로.
**사용법** GitHub Desktop의 changed file 우클릭 → Stash all changes