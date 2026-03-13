---
layout: page
title: Android Studio
permalink: /android-studio/
---
## Projects

{% assign posts = site.devlog
  | where_exp: "p", "p.categories contains 'android-studio'"
  | where_exp: "p", "p.categories contains 'summary'"
  | where_exp: "p", "p.status contains 'public'"
  | where_exp: "p", "p.project"
  | sort: "date" | reverse %}

{% if posts.size == 0 %}
<p>아직 글이 없습니다.</p>
{% else %}
<ul class="devlog-list">
  {% for post in posts %}
  <li>{{ post.date | date: "%Y-%m-%d" }} ｜ <a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
{% endif %}

<hr>
## Dev Log

{% assign items = site.devlog
  | where_exp: "i", "i.status contains 'public'"
  | sort: "date"
  | reverse %}
{% assign devlog_posts = "" | split: "" %}
{% for post in items %}
  {% assign cats = post.categories | join: "," | downcase %}
  {% if cats contains "devlog" and cats contains "android-studio" %}
    {% assign devlog_posts = devlog_posts | push: post %}
  {% endif %}
{% endfor %}

{% if devlog_posts.size == 0 %}
<p>아직 글이 없습니다.</p>
{% else %}
<ul class="devlog-list">
  {% for post in devlog_posts %}
  <li>{{ post.date | date: "%Y-%m-%d" }} ｜ <a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
{% endif %}
