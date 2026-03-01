---
layout: default
title: Home
permalink: /
---
<h2>Latest Dev Log</h2>

<ul class="post-list">
  {% assign latest = site.devlog 
  | sort: "date" 
  | where_exp: "p", "p.categories contains 'devlog'" 
  | where_exp: "p", "p.status contains 'public'"
  | reverse 
  | slice: 0, 5 %}
  {% for post in latest %}
    <li>
      <div style="display:flex; gap:12px; align-items:center; text-decoration:none; font-weight:700;">
	      <span class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</span> ｜ <a class="post-link" href="{{ post.url }}">{{ post.title }}</a>
	  </div>
    </li>
  {% endfor %}
</ul>

<h2>Latest Videos</h2>

<ul class="post-list">
  {% assign vids = site.devlog
    | where_exp: "p", "p.video_id"
    | sort: "date"
    | reverse
    | slice: 0, 6
  %}
  {% if vids.size == 0 %}
    <p>No videos yet.</p>
  {% else %}
    {% for post in vids %}
      <li style="margin: 12px 0;">
        <a href="{{ post.url | relative_url }}" style="display:flex; gap:12px; align-items:center; text-decoration:none;">
          <img
            src="https://i.ytimg.com/vi/{{ post.video_id }}/hqdefault.jpg"
            alt="YouTube thumbnail"
            style="width: 240px; max-width: 40%; height: auto; border-radius: 8px;"
            loading="lazy"
          />
          <div>
			<div class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</div>
            <div style="font-weight:700;">{{ post.title }}</div>
          </div>
        </a>
      </li>
    {% endfor %}
  {% endif %}
</ul>
