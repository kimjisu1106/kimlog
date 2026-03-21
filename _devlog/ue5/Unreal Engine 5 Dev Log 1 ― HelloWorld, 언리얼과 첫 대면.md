---
layout: post
title: Unreal Engine 5 Dev Log 1 ― HelloWorld, 언리얼과 첫 대면
date: 2025-08-28
categories:
  - devlog
  - ue5
  - summary
project: hello-world
project_name: Hello World
video_id: DV_3clCPYXw
status:
---
![](https://blog.kakaocdn.net/dna/xCa0e/dJMcagRUeQ4/AAAAAAAAAAAAAAAAAAAAAB5jbW_7RL4JH5wU0ft5aTphI-jj7YvOLufBxAAFb2GP/img.webp?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=PMLh1eR0b6TBuZAYJrx3x4M4I1o%3D)

## 오늘 한 일

언리얼엔진 설치  
회원가입부터 해야했던 완전 새로운 세상  
캐릭터 하나 화면에 세우기  
출근 전이라 시간이 없어서 세워놓고 끝. 이건 저장을 안했다.  
언리얼엔진 튜토리얼 영상 하나 보기  
내가 봤던 튜토리얼은 게임쪽 프리셋으로 진행된거다보니 재생을 하면 플레이어의 움직임을 구현할 수 있어서 신기했다.  
뭔가 만들어보기 도전

---

## 생각한 것

큐브로 만든 벽, 천장 + 스타터 세트에 있는 벽, 문, 창문을 이용해 집 만들기  
스케일을 조절해서 크기를 변경하는 방식이 좀 어색했다. 정확한 수치로 구현하는 방법이 있는지는 아직 모르겠지만 일단 당장 메뉴에 보이는건 스케일이라 그걸로 조절했더니 정확하게 벽과 벽 사이가 맞아떨어지는 느낌이 아니라 그냥 눈에 보이기에 그럴듯 한 정도로 맞출 수 밖에 없었다. 분명 뭔가 있을텐데...  
그나마 바닥에 붙이는건 단축키가 있어서 편리했다.

---

## 오브젝트

아무것도 없는 것보다는 오브젝트가 있는 것이 좋긴 했는데, 마켓같은데서 추가적으로 다운받아 사용가능하다고 본 것 같은데 내가 사용한 UE 5.3 버전에서 사용 가능한 현실 오브젝트를 아직 못찾았다. 이것도 분명 어딘가 있을텐데...

---

## 재질 바꿔보기

Material을 커버 갈아끼우듯이 바꿀 수 있는게 신기했다.  
다만 어정쩡하게 남는 부분을 추가적으로 큐브를 덧대어 메웠는데 그러다보니 스타터 세트에 있는 벽과 덧댄 큐브의 스케일이 맞지 않아 Material을 넣었을 때 패턴이 달라져서 그나마 티가 덜 나는 것으로 적용했다. 뭔가 방법이 있을테니 다른날 찾아봐야겠다.

---

## 벽에 조명을 달고 빛 구현하기

이거 생각보다 어려웠다.  
벽에 붙이는 조명을 선택했는데 그러다보니 직접적으로 조명에서 나오는 빛이 벽에 닿는 부분과 그 아래 등기구로 인한 그림자 지는 부분을 시각적으로 보면서 조정할 수 있는 건 좋긴 했지만 얼마나 퍼지는지 지금 내가 배치한 이 위치가 현실적으로 맞는 광원의 위치인지를 가늠하는게 쉽지 않았다.  
그래서 벽에 거는 등기구 이미지를 찾아보면서 맞춰보려고 했다.  
그림자가 좀 더 연했으면 좋겠는데 아직 방법을 몰라서 일단 색온도만 맞췄다.  
방 안에 조명 색을 설정할 때는 전구색 느낌으로 생각했는데 막상 설정하고보니 바깥 하늘이 너무 대낮이어서 좀 어색해보였다.  
밖은 대낮인데 실내는 시간이 더 흘러보이는 느낌.

---

## 카메라 무빙

이건 생각보다 많이 어렵진 않았다.  
After effect나 Cubase 등에서도 사용하는 방식과 유사했다.  
초반에 키를 찍고나서 값을 조절해야하는건지, 조절하고나서 키를 찍는건지가 좀 헷갈렸다.  
그리고 카메라가 들어가서 훑기엔 방이 너무 작았다.  
처음에 만들 때는 카메라 연출을 생각하지 않고 그냥 만들어서 그게 아쉬웠다.

---

## 랜더링

랜더링 자체는 어려운게 아니었는데, 카메라가 무빙한 것을 랜더링 하도록 설정하는 과정에서 조금 애를 먹었다. 카메라만 있다고 되는게 아니라 뭔가를 추가해야했는데 처음엔 그걸 잘 몰랐다.  
지금보니까 좀 더 화질 좋게 랜더링 했으면 좋았을걸 하는 아쉬움이 남는다.


![](https://scrap.kakaocdn.net/dn/b414aT/dJMb9kl7Rrn/b8kmgkIXn0A7j9LJFctjR1/img.jpg?width=480&height=360&face=0_0_480_360,https://scrap.kakaocdn.net/dn/Atg40/dJMb9b3M7oM/cGD1bVJnBVK9lFfqZdnA80/img.jpg?width=480&height=360&face=0_0_480_360,https://scrap.kakaocdn.net/dn/cEHdcB/dJMb9bvXkYc/2NuYYMhkxmrdysPyZfAaQ0/img.jpg?width=480&height=360&face=0_0_480_360)

---

## 결과

{% include youtube.html id=page.video_id %}

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
