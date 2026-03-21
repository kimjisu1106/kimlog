---
layout: post
title: Unreal Engine 5 Dev Log 8 ― 가챠, 캡슐 머신, 놀이기구 1
date: 2025-12-14
categories:
  - devlog
  - ue5
project: gacha-machine
project_name: Gacha Machine
video_id:
redirect_to:
status:
---
## 오늘 한 일

1. 블렌더로 가챠 머신 및 관련 object 만들기

---

## 막힌 부분

1. 현재는 딱히 모르겠음. 일단 on going.

---

## 다음에 할 일

1. UE5에 asset 배치하기

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