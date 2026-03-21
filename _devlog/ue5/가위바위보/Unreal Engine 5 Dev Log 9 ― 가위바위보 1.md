---
layout: post
title: Unreal Engine 5 Dev Log 9 ― 가위바위보 1
date: 2026-01-24
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

1. 오브제 제작하기
    1. Powerpoint 도형 및 이미지를 이용해 간단하게 오브제로 사용할 이미지를 제작했다

---

## 막힌 부분

1.   
    

---

## 다음에 할 일

1. 가위바위보 WBP 및 로직 구현

  

![](https://blog.kakaocdn.net/dna/dkQYXq/dJMcagYGmra/AAAAAAAAAAAAAAAAAAAAAI4UHpRp7_Tkz8t70UKv_HuW-b80S69HF-gZX5F3esVL/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=V%2FWjWFruWevew33MAaXEWaOwAys%3D)


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