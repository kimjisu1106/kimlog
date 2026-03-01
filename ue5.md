---
layout: page
title: Unreal Engine 5
permalink: /ue5/
---
## Projects
{% assign posts = site.devlog  
| where_exp: "p", "p.categories contains 'ue5'"  
| where_exp: "p", "p.categories contains 'summary'"  
| where_exp: "p", "p.project"  
| where_exp: "p", "p.status contains 'public'"  
| sort: "date" | reverse %}
  
{% for post in posts %}  
  
- {{ post.date | date: "%Y-%m-%d" }} ｜ [{{ post.title }}]({{ post.url | relative_url }})  
  
{% endfor %}

## Dev Log

{% assign items = site.devlog 
| where_exp: "i", "i.status contains 'public'"  
| sort: "date" 
| reverse %}  
{% assign count = 0 %}  
  
{% for post in items %}  
{% assign cats = post.categories | join: "," | downcase %}  
{% if cats contains "devlog" and cats contains "ue5" %}  
- {{ post.date | date: "%Y-%m-%d" }} ｜ [{{ post.title }}]({{ post.url | relative_url }})  
{% assign count = count | plus: 1 %}  
{% endif %}  
{% endfor %}  
  
{% if count == 0 %}  
아직 글이 없습니다.  
{% endif %}