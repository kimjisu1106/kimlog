---
layout: post
title: Post 잔디 분석하기
date: 2026-04-12
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
1. 카테고리를 받아서 `_cat`에 넣고 post가 해당 categories를 포함하는지 검사한다. 포함되면 `graph_posts`에 devlog에서 해당되는 posts를 넣고, 포함되는게 없으면 devlog 전체 출력

```liquid
{% if include.category %} 

  {% assign _cat = include.category %}
  
  {% assign graph_posts = site.devlog | where_exp: "p", "p.categories contains _cat" %}
  
{% else %}

  {% assign graph_posts = site.devlog %}
  
{% endif %}
```

2. graph의 id 생성. 카테고리를 받아서 `graph_id`에 넣고 기본값은 "all"로 지정. ex) category가 "ue5"면 id는 "graph-ue5", 없으면 "graph-all"
```liquid
{% assign graph_id = include.category | default: "all" %}

<div class="til-graph" id="graph-{{ graph_id }}"></div>
```

3. graph_posts에서 날짜만 추출해서 JS 배열로 만든다. Jekyll이 빌드 시점에 렌더링 → 결과는 `["2026-03-28", "2026-03-27", ...]` 형태

```JavaScript
(function () {
  var postDates = [{% for post in graph_posts %}"{{ post.date | date: "%Y-%m-%d" }}"{% unless forloop.last %},{% endunless %}{% endfor %}];
```

4. 날짜별 포스트 수를 counts 객체에 저장한다. `ex) { "2026-03-28": 2, "2026-03-27": 1 }`
```JavaScript
  var counts = {};
  postDates.forEach(function (d) {
    counts[d] = (counts[d] || 0) + 1;
  });
```

5. 날짜만 필요하니까 시간을 00:00:00으로 초기화
```JavaScript
  var today = new Date();

  today.setHours(0, 0, 0, 0);
```

6. 그래프 시작일 계산: 오늘이 속한 주의 일요일에서 51주 전 → 총 52주(364일)치 그래프
  
```JavaScript
  var start = new Date(today);
  start.setDate(start.getDate() - start.getDay());
  start.setDate(start.getDate() - 51 * 7);
```

  7. graph_id에 해당하는 div를 가져온다
```JavaScript
  var container = document.getElementById('graph-{{ graph_id }}');
```

  8. Date 객체를 "YYYY-MM-DD" 형식의 문자열로 변환. counts의 키와 형식을 맞추기 위해 사용
```JavaScript
  function toLocalDateStr(dt) {
    var y = dt.getFullYear();
    var m = String(dt.getMonth() + 1).padStart(2, '0');
    var day = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
```

  8. 52열(주) x 7행(요일) 그리드 생성
```JavaScript
  for (var w = 0; w < 52; w++) {
    var col = document.createElement('div');
    col.className = 'til-graph-col';
    for (var d = 0; d < 7; d++) {
    
# 해당 셀의 날짜 계산
      var date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      var dateStr = toLocalDateStr(date);

# 해당 날짜의 포스트 수 (없으면 0)
      var count = counts[dateStr] || 0;

# 셀 생성. count에 따라 클래스를 다르게 부여 (0~4) 
# CSS에서 til-cell--0 ~ til-cell--4 로 색깔 정의
      var cell = document.createElement('div');
      cell.className = 'til-cell til-cell--' + Math.min(count, 4);

# 마우스 호버 시 날짜와 포스트 수 표시
      cell.title = dateStr + (count > 0 ? ' (' + count + ')' : '');
      col.appendChild(cell);
    }
    container.appendChild(col);
  }

```