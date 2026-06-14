---
layout: post
title: 회사 툴 — 본부 TaskManagement 개발 정리
date: 2026-06-12
categories:
  - today-i-learn
project: company-task-management
project_name: 회사 툴 - Task Management
video_id:
app_url:
status:
tags:
  - Python
  - Django
---
## 개요

본부 주간업무보고를 웹 기반 Task Management로 전환한 사내 툴. 개발은 Claude Code와 협업.

- **기간**: 2026.05.22 ~ 2026.06.12
- **스택**: Python · Django · Bootstrap · waitress
- **배포**: 회사 서버, 내부망 전용
- **주요 기능**: 대시보드 · 프로젝트별 주차 Task · 리스크 · 경영진 지시사항 · AI Summary (Anthropic API)
- **인증**: ERP 직원 정보 API 연동 (비밀번호를 별도 저장하지 않음)

---

## 아키텍처

### 비밀번호는 한 시스템만 소유한다

이 앱에는 직원 비밀번호를 따로 저장하지 않는다. 원천은 ERP다. 로그인할 때 "이 아이디/비번 맞아?"라고 ERP에 물어보고, 맞으면 TM User를 찾거나 만들어 세션을 발급한다.

```python
_http = requests.Session()  # 모듈 단에서 한 번만 생성 — 커넥션 재사용

class ERPVerifyBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        result = self._call_verify(username, password)
        if not result or not result.get("ok"):
            return None
        ...  # 성공 → TM User 찾거나 생성, 비번은 TM DB에 없음
```

같은 사실을 두 시스템이 따로 저장하면 반드시 어긋난다. 원천 하나를 정하고 나머지는 물어보는 구조가 제일 단순하고 동기화 버그가 없다. 서버끼리 통신할 땐 사람 로그인과 별도 인증이 필요한데, `X-Service-Key` 같은 공유 시크릿을 헤더로 넘기고 이 값은 코드가 아닌 `.env`에 둔다.

---

### 유도되는 값은 저장하지 말고 계산한다

프로젝트 "상태"(진행중/완료/지연)를 DB 컬럼으로 저장하면, 진행률이 바뀔 때마다 상태도 따로 갱신해야 한다. 안 맞는 순간(stale)이 반드시 생긴다.

```python
def project_status(project):
    progress = project_progress(project)
    if progress >= 100:
        return "완료", 0
    if project.due_date and project.due_date < today:
        return "지연", (today - project.due_date).days
    if progress > 0:
        return "진행중", 0
    return "대기", 0
```

하나의 사실에서 유도되는 값은 저장하지 않는다. 저장하면 "원본과 사본 동기화"라는 버그 원천이 생긴다. 단, 계산 비용이 크거나 과거 시점을 박제해야 하면 그땐 저장(스냅샷)한다 — 트레이드오프다.

---

### 외부 데이터를 캐시하면 갱신 방아쇠도 같이 설계한다

TM은 직원 소속을 ERP에서 가져와 TM User에 사본으로 저장한다. "ERP에서 팀을 바꿨는데 TM에 안 떠요"라는 질문이 나왔다. 당연하다 — 사본은 자동으로 안 바뀐다.

```python
# 로그인할 때마다 ERP 응답으로 org 사본을 덮어씀 — 이벤트 기반 갱신
"org_team": org.get("team") or "",

# 즉시 반영이 필요할 때를 위한 수동 갱신 버튼 (admin 전용)
@admin_required
def user_sync_erp(request, pk):
    data = lookup_employee(target.erp_employee_id)
    target.org_team = (data.get("org") or {}).get("team") or ""
    target.save()
```

캐시를 두면 반드시 갱신 방아쇠를 같이 설계해야 한다. 보통 세 가지다: 이벤트 기반(여기선 "로그인할 때"), 수동(admin 버튼), 시간 기반(TTL). "ERP에서 바꿨는데 왜 안 바뀌지?"는 버그가 아니라 "이 사본은 언제 갱신되기로 했더라?"라는 설계 질문이다.

---

## 의존성

### SDK가 항상 정답은 아니다

`pip install anthropic`을 했더니 환경 문제로 구버전(0.2.10)이 깔리며 `urllib3`·`idna`를 다운그레이드해 ERP 호출이 깨질 뻔했다. SDK를 버리고 HTTP로 직접 불렀다.

```python
resp = requests.post(
    "https://api.anthropic.com/v1/messages",
    headers={"x-api-key": settings.ANTHROPIC_API_KEY,
             "anthropic-version": "2023-06-01",
             "content-type": "application/json"},
    json={"model": model, "max_tokens": 1500,
          "system": get_system_prompt(),
          "messages": [{"role": "user", "content": user_content}]},
    timeout=120,
)
content = "".join(b["text"] for b in resp.json()["content"] if b["type"] == "text")
```

대부분의 API는 결국 POST + JSON이다. SDK 하나가 수십 개 하위 패키지를 끌고 와 환경을 흔들 수 있다. 필요한 게 단순한 API 호출 하나라면 직접 부르는 게 더 단순하고 안전할 때가 많다.

---

## 보안

### escape 먼저, 내 패턴만 HTML로

AI 서머리가 마크다운(`**굵게**`, `## 제목`)으로 온다. 이걸 그냥 `|safe`로 출력하면 XSS가 뚫린다.

```python
@register.filter
def summary_md(text):
    lines = escape(text).split("\n")  # 전부 escape 먼저 → <script> → &lt;script&gt;
    out = []
    for s in lines:
        if s.startswith("## "):
            out.append(f'<h6 class="fw-bold">{_inline(s[3:])}</h6>')  # 내 태그만 삽입
        elif s.startswith("- "):
            out.append(f"<li>{_inline(s[2:])}</li>")
        ...
    return mark_safe("\n".join(out))  # 우리가 만든 태그만 살아남음
```

`mark_safe`는 "이 HTML은 내가 책임진다"는 선언이다. AI나 사용자가 만든 문자열에 바로 붙이면 안 된다. 안전한 순서는 하나뿐이다 — 통째로 escape 먼저, 그다음 내가 아는 패턴만 내 태그로 변환.

---

## 데이터 설계

### FK냐 자유 텍스트냐 — 요구사항이 정한다

지시사항의 "지시자"를 등록된 사람 목록에서 고르되, 미등록자도 직접 입력 가능해야 했다. FK 대신 자유 텍스트로 이름을 복사해 저장했다.

```html
<input name="issuer" list="issuerOptions" placeholder="목록에서 선택하거나 직접 입력">
<datalist id="issuerOptions">
  {% for l in form.issuer_labels %}<option value="{{ l }}">{% endfor %}
</datalist>
```

복사해 저장하면 마스터에서 이름을 고쳐도 옛 지시사항엔 안 바뀐다. 그래서 수정 시 직접 전파한다.

```python
old_label = issuer.label
issuer = form.save()
if issuer.label != old_label:
    Directive.objects.filter(issuer=old_label).update(issuer=issuer.label)
```

FK는 정합성이 보장되지만 반드시 마스터에 있어야 한다. 자유 텍스트는 유연하지만 동기화를 내가 책임진다. 요구사항("미등록자 허용")이 방식을 결정한다.

---

### 권한은 코드에 박지 말고 데이터로

"AI 서머리는 admin만 생성"으로 코드에 박았더니, 실제 보고 주체(본부장)는 admin이 아니라 못 만들었다. 그렇다고 코드에 이름을 박으면 사람이 바뀔 때마다 배포해야 한다.

```python
# User 모델에 플래그 추가
can_generate_summary = models.BooleanField("AI 서머리 생성 권한", default=False)

# 뷰는 "권한 있나"만 묻는다 — 누구인지 모름
if not (request.user.is_admin() or request.user.can_generate_summary):
    return redirect("weekly")
```

"누가 할 수 있나"를 코드에 적으면, 사람이 바뀔 때마다 코드를 고친다. 코드는 "권한이 있나"만 묻고, 누구에게 권한을 줄지는 데이터(체크박스)로 뺀다.

---

### 전역 설정은 get_or_create(pk=1) 싱글턴으로

AI 서머리 프롬프트를 관리자가 편집 가능하게 하려면 어딘가 한 곳에 저장해야 한다. 설정은 본질적으로 "한 행"이다.

```python
class SummaryConfig(models.Model):
    system_prompt = models.TextField(blank=True)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

def get_system_prompt():
    return SummaryConfig.get_solo().system_prompt.strip() or DEFAULT_SYSTEM
```

"전역 설정 한 벌"이 필요하면 `get_or_create(pk=1)` 싱글턴이 가장 단순하다. DB값이 비어 있으면 코드 기본값으로 폴백해서, 설정이 없어도 앱은 항상 동작한다.

---

## 코드 패턴

### 횡단 관심사는 길목에 한 번

"6시간 미사용 시 자동 로그아웃", "관리자 배지 미처리 건수" 같은 건 모든 페이지에 걸린다. 뷰마다 넣으면 빠뜨린다.

```python
# 모든 요청이 지나가는 길목
class SessionIdleMiddleware:
    def __call__(self, request):
        last = request.session.get("last_activity")
        if last and (now - last) > SESSION_TIMEOUT_SECONDS:
            logout(request)
        request.session["last_activity"] = now
        return self.get_response(request)

# 모든 템플릿에 admin 배지 숫자 자동 주입
def admin_alerts(request):
    if not request.user.is_admin():
        return {}
    return {"admin_alerts": {"total": pending + requests + errors}}
```

미들웨어는 "모든 요청"에 걸리는 로직(인증·세션), 컨텍스트 프로세서는 "모든 템플릿"에 필요한 데이터에 쓴다. DRY는 코드 줄이기가 아니라 "한 곳만 고치면 전부 반영" = 빠뜨림 방지다.

---

### 반복되는 권한 검사는 데코레이터 하나로

"관리자 아니면 차단" 3줄이 뷰 23곳에 복붙돼 있었다. 메시지 하나 바꾸려면 23곳을 다 고쳐야 하고, 새 관리자 화면에서 빠뜨리기도 쉽다.

```python
# accounts/decorators.py
def admin_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_admin():
            messages.error(request, "접근 권한이 없습니다.")
            return redirect("dashboard")
        return view(request, *args, **kwargs)
    return wrapper
```

```python
# 적용 후 — 가드 3줄이 한 줄로
@login_required
@admin_required
def issuer_list(request):
    return render(...)
```

`@login_required`가 로그인을 강제하는 것처럼, 같은 발상으로 `@admin_required`를 만들면 권한 검사를 함수마다 안 적어도 된다. 리팩터링 이후에는 일반 사용자가 평소 화면은 그대로 들어가지고 관리자 화면만 막히는지 실제로 돌려봤다 — 리팩터링은 동작 그대로, 모양만 바뀌는 것이어야 한다.

---

## 운영

### 재시작 스크립트는 멱등하게

코드를 고치고 서버를 재시작했는데 반영이 안 됐다. 재시작 스크립트가 "포트가 이미 쓰이면 그냥 종료"여서, 죽지 않고 남은 옛 프로세스(고아)가 포트를 계속 잡고 있었다.

```bat
:: 포트를 잡고 있는 프로세스를 먼저 죽이고 시작
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":xxxx" ^| findstr "LISTENING"') do taskkill /F /PID %%a
:loop
"%~dp0venv\Scripts\waitress-serve.exe" --listen=0.0.0.0:xxxx task_management.wsgi:application
timeout /t 3 & goto loop
```

재시작 스크립트는 멱등해야 한다 — 몇 번을 돌려도 "옛 거 정리 → 새 거 시작"으로 같은 결과가 나와야 한다. 개발 서버(`runserver`)는 코드 변경을 자동 감지하지만, 운영 서버(waitress)는 재시작해야 새 코드가 뜬다. "왜 안 바뀌지?"의 단골 원인이다.

---

## 디자인

### 값은 변수 한 곳에, 이름은 의미로

글씨 크기가 페이지마다 제각각(`.7em`, `.75rem`, `.8rem`, `.875rem`)이라 들쭉날쭉했다. CSS 변수 한 곳에 정의하고 화면은 그 변수를 참조하게 바꿨다.

```css
:root { --fs-xs: .75rem; --fs-sm: .875rem; --fs-base: 1rem; --fs-lg: 1.125rem; }
body { font-size: var(--fs-base); }
.fs-sm { font-size: var(--fs-sm); }
```

```html
<td class="fs-sm text-muted">{{ task.week }}</td>
```

스케일을 여러 번 바꿨는데 그때마다 `:root` 4줄만 고치면 188곳이 전부 반영됐다. 이름은 값이 아니라 의미로 짓는다 — `.fs-12`보다 `.fs-sm`이 낫다. 나중에 "작은 걸 13px로" 바꿔도 이름이 거짓말 안 한다. 선택지를 4개(xs/sm/base/lg)로 고정하면 "이번엔 몇 px로 할까" 고민 자체가 사라지고 화면이 저절로 통일된다.
