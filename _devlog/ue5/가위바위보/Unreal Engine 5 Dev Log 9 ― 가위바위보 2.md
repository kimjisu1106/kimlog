---
layout: post
title: Unreal Engine 5 Dev Log 9 ― 가위바위보 2
date: 2026-01-25
categories:
  - devlog
  - ue5
project: rock-paper-scissors
project_name: Rock Paper Scissors
video_id:
redirect_to:
status: finished
---
## 오늘 한 일

1. 가위바위보 WBP 및 로직 구현

---

## 막힌 부분

1. if(result == win), 룰렛 점수 얻고나서 마지막에 표기되는 GetPoint 값이 print 상에 찍힌 것과 일치하지 않음  
    > 마지막에 랜덤으로 정하는게 아닌 애초에 하나를 정해두는 방식으로 변경(SelectedPoint)

---

## 다음에 할 일

1. 가위바위보 WBP 및 로직 보강

![](https://blog.kakaocdn.net/dna/54qYS/dJMcacILYVo/AAAAAAAAAAAAAAAAAAAAAMmMO0PrbdQclKXh-Q19iQnR4LaEXZw4hyMgcNEX1v95/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=k5aMNvpNtocdoW4Gaha2%2Bmga5Zk%3D)

---

{% assign current_project = page.project | default: post.project %}  
  
{% assign related = site.devlog  
| where_exp: "p", "p.categories contains 'ue5'"  
| where_exp: "p", "p.project == current_project"  
| sort: "date"  
%}  
  
{% if related.size > 1 %}  
## Related Post
  
{% for item in related %}  
{% unless item.url == page.url %}  
- {{ item.date | date: "%Y-%m-%d" }} · [{{ item.title }}]({{ item.url | relative_url }})  
{% endunless %}  
{% endfor %}  
{% endif %}