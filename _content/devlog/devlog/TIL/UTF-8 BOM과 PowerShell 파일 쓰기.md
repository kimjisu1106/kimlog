---
layout: post
title: UTF-8 BOM과 PowerShell 파일 쓰기
date: 2026-07-03
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - PowerShell
  - Jekyll
---
## 인코딩

### BOM이란

BOM(Byte Order Mark)은 파일 맨 앞에 붙는 3바이트(`EF BB BF`)다. 원래 "이 파일은 UTF-8이에요"라고 알려주는 표시인데, UTF-8은 바이트 순서가 고정되어 있어서 사실 BOM이 없어도 알 수 있다. 그래서 요즘은 안 쓰는 게 표준이지만, Windows 생태계 일부 도구가 여전히 BOM을 기본으로 붙인다.

눈에 보이지 않아서 에디터에서는 멀쩡해 보여도 파일 내부는 이렇게 시작한다.

```
EF BB BF 2D 2D 2D ...
         --- (frontmatter 시작)
```

---

### Jekyll은 BOM 있는 파일의 frontmatter를 파싱하지 못한다

Jekyll은 파일이 `---`으로 시작해야 frontmatter로 인식한다. BOM이 앞에 붙으면 파일이 `EF BB BF ---`로 시작하게 되어 Jekyll이 frontmatter를 찾지 못하고, 해당 포스트를 그냥 평문으로 처리한다. 결과적으로 포스트가 컬렉션에서 사라져 목록에서 보이지 않는다.

---

## PowerShell

### .NET의 UTF8 인코딩은 기본으로 BOM을 붙인다

PowerShell에서 파일을 쓸 때 흔히 쓰는 방식:

```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
```

`System.Text.Encoding.UTF8`은 .NET에서 BOM 포함 UTF-8이 기본이다. Obsidian이 BOM 없이 만든 파일을 이 방식으로 수정하면, 수정할 때마다 BOM이 추가된다.

BOM 없는 UTF-8로 쓰려면 다음과 같이 하면 된다.

```powershell
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
```

---

## 함정

### BOM은 눈에 안 보이고 증상이 멀리서 나타난다

파일을 에디터로 열면 멀쩡하고, 로컬 Jekyll 빌드에서도 경고 없이 넘어가는 경우가 있다. 증상은 "포스트가 목록에서 안 보임"처럼 멀리서 나타나서 원인을 찾기 어렵다.

확인하려면 파일 첫 3바이트를 직접 확인해야 한다.

```python
with open("file.md", "rb") as f:
    print(f.read(3).hex())  # "efbbbf" 이면 BOM 있음
```
