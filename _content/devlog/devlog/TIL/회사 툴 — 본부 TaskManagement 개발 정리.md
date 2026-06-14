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

본부 주간업무보고를 웹 기반 Task Management로 전환한 사내 툴. 기획은 본부장 주도, 개발은 Claude Code와 협업.

- **기간**: 2026.05.22 ~ 2026.06.12
- **스택**: Python · Django · Bootstrap · waitress
- **배포**: 회사 서버, 내부망 전용
- **주요 기능**: 대시보드 · 프로젝트별 주차 Task · 리스크 · 경영진 지시사항 · AI Summary (Anthropic API)
- **인증**: ERP 직원 정보 API 연동 (비밀번호를 별도 저장하지 않음)

---

## 1. 인증은 한 곳에 위임하라 (Don't duplicate auth)

**상황** — 이 앱(주간보고/TM)에는 비밀번호를 저장하지 않는다. 직원 계정·비밀번호의 원천은 시설관리(ERP/FM)다. TM은 로그인할 때 FM에 "이 아이디/비번 맞아?"라고 물어본다.

```python
# accounts/auth_backends.py
_http = requests.Session()           # 연결 재사용(keep-alive) — 매 로그인 새 TCP 안 맺음

class ERPVerifyBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        result = self._call_verify(username, password)   # FM verify API 호출
        if not result or not result.get("ok"):
            return None
        # 성공 → TM User를 찾거나 만들어 로그인 (비번은 TM에 저장 안 함)
        ...

    def _call_verify(self, username, password):
        resp = _http.post(settings.ERP_VERIFY_URL,
                          json={"username": username, "password": password},
                          headers={"X-Service-Key": settings.SERVICE_VERIFY_KEY},  # 서버끼리 인증
                          timeout=5)
        return resp.json() if resp.status_code == 200 else None
```

**배울 점**
- **같은 사실(직원·비번)을 두 시스템이 따로 저장하면 반드시 어긋난다.** 한 곳을 "원천"으로 정하고 나머지는 물어본다.
- 서버가 서버를 부를 땐 사람 로그인과 다른 인증이 필요하다 → **공유 시크릿**(`X-Service-Key`). 이 값은 코드가 아니라 `.env`에 둔다(절대 git에 안 올림).
- `requests.Session()`을 모듈 한 번만 만들어 재사용 = 커넥션 풀. 매 호출 `requests.post(...)`보다 빠르다.

---

## 2. 외부 API는 SDK 없이도 부른다 — 의존성은 적을수록 좋다

**상황** — AI 서머리에 Anthropic을 쓰려고 `pip install anthropic` 했더니, Python 3.14라서 **2023년 구버전(0.2.10)** 이 깔리며 `urllib3`·`idna`를 다운그레이드 → 다른 기능(ERP 호출)이
깨질 뻔했다. SDK를 버리고 그냥 HTTP로 직접 불렀다.

```python
# reports/ai_summary.py — SDK 없이 requests로 Anthropic Messages API 호출
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

**배울 점**
- **SDK가 항상 정답은 아니다.** SDK 하나가 수십 개 하위 패키지를 끌고 와 환경을 흔들 수 있다.
- 대부분의 API는 결국 **POST + JSON**이다. 문서만 보면 `requests`로 직접 부르는 게 더 단순하고 안전할 때가 많다.
- "라이브러리 깔았더니 다른 게 깨졌다"는 흔한 일 → **추가 의존성은 비용**이라고 생각하기.

---

## 3. 저장하지 말고 계산하라 (@property)

**상황** — 프로젝트 "상태"(진행중/완료/지연)를 DB 컬럼으로 저장하면, 진행률이 바뀔 때마다
상태도 따로 갱신해야 하고 → 안 맞는 순간(stale)이 생긴다. 그래서 **저장하지 않고 그때그때 계산**한다.

```python
# reports/services.py — 상태는 진행률·마감일에서 파생
def project_status(project):
    progress = project_progress(project)          # 가장 최근 주차의 진행률
    if progress >= 100:
        return "완료", 0
    if project.due_date and project.due_date < today:
        return "지연", (today - project.due_date).days
    if progress > 0:
        return "진행중", 0
    return "대기", 0
```
리스크의 상태도 같은 원리(진행률 100%면 완료, 아니면 진행중)로 **@property**로 만들었다.
"실질 종료일"도 마찬가지 — 진행률이 100%가 된 시점을 계산하고, 아직이면 무한(없음).

**배울 점**
- **하나의 사실에서 유도되는 값은 저장하지 말고 유도하라.** 저장하면 "원본과 사본 동기화"라는
  버그 원천이 생긴다.
- 단, 계산 비용이 크거나 과거 시점을 박제해야 하면 그땐 저장(스냅샷)한다. — 트레이드오프.

---

## 4. 사용자 입력은 절대 믿지 마라 — "이스케이프 먼저, 변환 나중"

**상황** — AI 서머리가 마크다운(`##`, 표, `**굵게**`)으로 온다. 화면에 서식 있게 그리려면
HTML로 바꿔야 하는데, 그냥 `|safe`로 출력하면 **XSS**(악성 `<script>` 주입) 위험이 생긴다.

```python
# reports/templatetags/md_extras.py
@register.filter
def summary_md(text):
    lines = escape(text).split("\n")   # ← 먼저 전부 escape: <script> → &lt;script&gt;
    out = []
    for s in lines:
        if s.startswith("## "):
            out.append(f'<h6 class="fw-bold">{_inline(s[3:])}</h6>')   # 우리가 만든 태그만 살아남음
        elif s.startswith("- "):
            out.append(f"<li>{_inline(s[2:])}</li>")
        ...
    return mark_safe("\n".join(out))   # 우리가 통제한 HTML이라 안전
```

**배울 점**
- `|safe` / `mark_safe`는 **"이 HTML은 내가 책임진다"는 선언**이다. 사용자/AI가 만든 문자열에
  그냥 쓰면 안 된다.
- 안전한 순서: **① 입력을 통째로 escape → ② 내가 아는 패턴만 내 태그로 변환.** 그러면 주입 코드는
  무력화되고 서식만 남는다.
- 외부 마크다운 라이브러리 + 별도 sanitizer를 쓰는 길도 있지만, 필요한 문법이 적으면
  직접 변환이 더 단순하고 의존성도 0 (→ 2번과 같은 철학).

---

## 5. 자유 텍스트냐 외래키냐 — 그리고 "복사했으면 동기화는 내 책임"

**상황** — 지시사항의 "지시자". 등록된 사람 목록(마스터)에서 고르되, **미등록자도 직접 입력**
가능해야 했다. 그래서 외래키(FK) 대신 **자유 텍스트(CharField)에 이름을 복사**해 저장한다.

```html
<!-- 등록자는 자동완성, 미등록자는 그냥 타이핑 (datalist 콤보박스) -->
<input name="issuer" list="issuerOptions" placeholder="목록에서 선택하거나 직접 입력">
<datalist id="issuerOptions">
  {% for l in form.issuer_labels %}<option value="{{ l }}">{% endfor %}
</datalist>
```

복사해 저장하면 단점이 생긴다: 마스터에서 이름을 고쳐도 옛 지시사항엔 안 바뀐다.
그래서 **수정 시 직접 전파**한다.

```python
# reports/views.py issuer_edit — 라벨이 바뀌면 그 라벨을 쓰던 지시사항도 갱신
old_label = issuer.label                 # 폼 저장 전에 옛 값 캡처
issuer = form.save()
if issuer.label != old_label:
    Directive.objects.filter(issuer=old_label).update(issuer=issuer.label)
```

**배울 점**
- **FK = 정합성은 공짜지만 유연성이 떨어진다(반드시 마스터에 있어야 함).**
  **자유 텍스트 = 유연하지만 동기화를 내가 책임진다.** 요구사항("미등록자 허용")이 방식을 결정한다.
- 데이터를 **복사(비정규화)** 하기로 했으면, "원본이 바뀌면 사본도 바꾼다"를 코드로 보장해야 한다.

---

## 6. 권한은 코드에 박지 말고 데이터로 둬라

**상황** — "AI 서머리는 admin만 생성"으로 코드에 박았더니, 실제 보고 주체(본부장)는 admin이
아니라 못 만든다. 그렇다고 코드를 본부장 이름으로 고치면 매번 배포해야 한다.
→ **User에 플래그**를 두고 admin이 런타임에 켠다.

```python
# accounts/models.py
can_generate_summary = models.BooleanField("AI 서머리 생성 권한", default=False)

# reports/views.py — 코드는 "권한 있나?"만 묻는다 (누구인지 모름)
if not (request.user.is_admin() or request.user.can_generate_summary):
    return redirect("weekly")
```

**배울 점**
- "**누가** 할 수 있나"를 코드에 적으면, 사람이 바뀔 때마다 코드를 고친다.
  코드는 "**권한이 있나**"만 묻고, **누구에게 권한을 줄지는 데이터(체크박스)** 로 빼라.
- 역할(admin/user)은 굵은 분류, 플래그(can_X)는 세밀한 예외. 둘을 섞어 쓴다.

---

## 7. 앱 전역 설정은 "싱글턴" 한 줄로

**상황** — AI 서머리 프롬프트를 관리자가 편집 가능하게 하려면 어딘가 한 곳에 저장해야 한다.
설정은 본질적으로 "한 행"이다.

```python
# reports/models.py
class SummaryConfig(models.Model):
    system_prompt = models.TextField(blank=True)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)   # 항상 pk=1 한 행만
        return obj
```
```python
# 쓸 때: 비어 있으면 코드 기본값으로 폴백
def get_system_prompt():
    return SummaryConfig.get_solo().system_prompt.strip() or DEFAULT_SYSTEM
```

**배울 점**
- "전역 설정 한 벌"이 필요하면 `get_or_create(pk=1)` 싱글턴이 가장 단순하다.
- **DB값 비면 코드 기본값으로 폴백** → 설정이 없어도 앱은 항상 동작한다. (설정은 "덮어쓰기"일 뿐)

---

## 8. 운영도 코드다 — 멱등한 재시작과 "고아 프로세스"

**상황** — 코드를 고치고 서버를 재시작했는데 반영이 안 됐다. 원인: 재시작 스크립트가
"포트가 이미 쓰이면 그냥 종료"여서, **죽지 않고 남은 옛 프로세스(고아)** 가 포트를 계속 잡고 있었다.

```bat
:: start_server.bat — "이미 떠 있으면 종료" → "8001 잡은 놈을 먼저 죽이고 시작"으로 변경
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001" ^| findstr "LISTENING"') do taskkill /F /PID %%a
:loop
"%~dp0venv\Scripts\waitress-serve.exe" --listen=0.0.0.0:8001 task_management.wsgi:application
timeout /t 3 & goto loop      :: 죽으면 3초 뒤 자동 재기동
```

**배울 점**
- 부모 프로세스를 죽여도 **자식이 살아남아(고아) 포트를 잡고 있는** 일이 흔하다.
- 재시작 스크립트는 **멱등**해야 한다 = 몇 번을 돌려도 "옛 거 정리 → 새 거 시작"으로 같은 결과.
  "이미 있으면 아무것도 안 함"은 재시작을 방해한다.
- 개발 서버(`runserver`)는 코드가 바뀌면 자동 반영되지만, **운영 서버(waitress)는 재시작해야**
  새 코드가 뜬다. "왜 안 바뀌지?"의 단골 원인.

---

## 9. 같은 검사를 매번 복붙하지 마라 — 횡단 관심사는 한 곳에

**상황** — "6시간 미사용 시 자동 로그아웃", "관리자 배지에 처리 대기 건수" 같은 건
모든 페이지에 걸린다. 뷰마다 넣으면 빠뜨리고 안 맞는다.

```python
# accounts/middleware.py — 모든 요청이 지나가는 길목에서 한 번에
class SessionIdleMiddleware:
    def __call__(self, request):
        last = request.session.get("last_activity")
        if last and (now - last) > SESSION_TIMEOUT_SECONDS:
            logout(request)                      # 만료 → 로그아웃
        request.session["last_activity"] = now   # 활동 시각 갱신
        return self.get_response(request)
```
```python
# reports/context_processors.py — 모든 템플릿에 admin 배지 숫자 자동 주입
def admin_alerts(request):
    if not request.user.is_admin():
        return {}
    return {"admin_alerts": {"total": pending + requests + errors + unregistered_issuers}}
```

**배울 점**
- **여러 곳에 똑같이 걸리는 로직**(인증·로깅·세션·공통 화면 데이터)은 뷰가 아니라
  **미들웨어 / 컨텍스트 프로세서** 같은 "길목"에 한 번 둔다.
- DRY는 단순히 "코드 줄이기"가 아니라 **"한 곳만 고치면 전부 반영"** = 빠뜨림 방지다.

---

## 10. 반복되는 권한 검사는 데코레이터로 (코드 리뷰 → 리팩터링 실제 사례)

**상황** — 코드 리뷰를 했더니, "관리자 아니면 막기" 똑같은 3줄이 **23곳**에 복붙돼 있었다.
이러면 정책(메시지·리다이렉트)을 바꿀 때 23곳을 다 고쳐야 하고, 새 관리자 화면에서 빠뜨리기 쉽다.

```python
# 지금 (23곳 복붙)
@login_required
def issuer_list(request):
    if not request.user.is_admin():
        messages.error(request, "접근 권한이 없습니다.")
        return redirect("dashboard")
    return render(...)
```
```python
# accounts/decorators.py — "관리자 아니면 차단"을 한 곳에 정의
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
# 적용 후 — 가드 3줄이 데코레이터 한 줄로
@login_required
@admin_required
def issuer_list(request):
    return render(...)
```

**배울 점**
- **데코레이터 = "함수에 공통 동작을 자동으로 끼워 넣는" 장치.** `@login_required`(로그인 강제)가
  바로 그 예. 같은 발상으로 `@admin_required`를 만들면 권한 검사를 함수마다 안 적어도 된다.
- 9번(미들웨어/컨텍스트 프로세서)이 **앱 전역** 공통 로직이라면, 데코레이터는 **함수 단위** 공통 로직이다. 적용 범위만 다르고 원리는 같다("한 곳에 정의, 여러 곳에 적용").
- **안전하게 리팩터링하는 법**: 기존 동작을 바꾸지 말 것. 이 변경은 "이미 관리자 전용이던 23개"의
  *모양만* 바꿨다 → 바꾼 뒤 **일반 사용자가 평소 화면은 그대로 들어가지고, 관리자 화면만 막히는지**를
  실제로 돌려 확인했다(behavior 동일 검증). "리팩터링 = 겉모습만, 동작은 그대로"가 핵심.

---

## 11. 외부 데이터를 "복사해서 보관"하면, **언제 갱신할지**를 정해야 한다 (cache invalidation)

**상황** — TM은 직원의 소속(본부/팀/파트)을 FM(원천)에서 가져와 **TM User에 사본으로 저장**한다.
그런데 "FM에서 팀을 바꿨는데 TM에 안 떠요"라는 질문이 나왔다. 당연하다 — 사본은 **자동으로 안 바뀐다.**
누군가 "언제 다시 가져올지"를 정해줘야 한다.

```python
# accounts/auth_backends.py — _sync_user: 로그인할 때마다 FM 응답으로 org 사본을 덮어씀(이벤트 기반 갱신)
"org_headquarter": org.get("headquarter") or "",
"org_team":        org.get("team") or "",
"org_part":        org.get("part") or "",
```
```python
# accounts/views.py — 그걸 못 기다릴 때를 위한 수동 갱신(admin 버튼)
@admin_required
def user_sync_erp(request, pk):
    data = lookup_employee(target.erp_employee_id)   # FM에 지금 값 물어봄
    target.org_team = (data.get("org") or {}).get("team") or ""
    ...
    target.save()
```

**배울 점**
- **캐시(사본)는 공짜가 아니다 — "낡을 수 있다(staleness)"는 비용이 따라온다.** 그래서 캐시를 두면
  반드시 **갱신 방아쇠(trigger)** 를 같이 설계해야 한다. 보통 셋 중 하나(또는 조합):
  - **이벤트 기반**: 어떤 일이 생길 때 갱신 (여기선 "로그인할 때마다") ← 기본
  - **수동**: 사람이 버튼으로 강제 갱신 (여기선 admin "ERP에서 동기화") ← 즉시 필요할 때
  - **시간 기반(TTL)**: N분마다/N시간마다 만료 (3번 항목의 그 캐시 얘기)
- 왜 사본을 두냐? → 매번 FM에 묻지 않아도 화면을 그릴 수 있고(빠름), FM이 잠깐 죽어도 TM은 동작한다(견고).
  대신 그 대가가 staleness. **"속도·견고함 ↔ 최신성"의 트레이드오프**를 의식적으로 고르는 것.
- "FM에서 바꿨는데 왜 안 바뀌지?"는 버그가 아니라 **설계 질문**이다 — "이 사본은 언제 갱신되기로 했더라?"

---

## 12. 디자인 토큰 — "값은 한 곳에, 이름은 의미로" (변수의 진가)

**상황** — 글씨 크기가 페이지마다 제각각(.7em, .75rem, .8rem, .875rem, .small…)이라 들쭉날쭉했다.
이걸 정리하면서, 크기를 **CSS 변수 한 곳**에 정의하고 화면은 그 변수를 참조하게 바꿨다.

```css
/* base.html — 크기 정의는 여기 한 곳(= 디자인 토큰) */
:root { --fs-xs: .75rem; --fs-sm: .875rem; --fs-base: 1rem; --fs-lg: 1.125rem; }
body { font-size: var(--fs-base); }
.fs-sm { font-size: var(--fs-sm); }    /* 화면은 클래스 이름만 씀 */
```
```html
<!-- 템플릿 188곳: 숫자(px/rem)를 직접 안 쓰고 의미 이름만 -->
<td class="fs-sm text-muted">{{ task.week }}</td>
```

**배울 점**
- 이 작업 중 사용자가 스케일을 **여러 번 바꿨다**(작은=12 → 보통=14 → "아니 base=16으로"…).
  그때마다 188곳을 고쳤다면 지옥이었을 텐데, 클래스가 **변수를 참조**하니 매번 **base.html 4줄만**
  고치면 전부 반영됐다. 이게 **디자인 토큰(=의미 있는 값에 이름 붙여 한 곳에 모음)** 의 핵심 가치다.
- **이름은 값이 아니라 의미로**: `.fs-12`(px값)보다 `.fs-sm`(small=의미)가 낫다. 나중에 "작은 걸
  13px로" 바꿔도 `.fs-sm` 이름은 그대로 → 이름이 거짓말 안 함. (반대로 px 이름은 값 바뀌면 이름도 갈이)
- **선택지를 강제로 줄이면 일관성이 따라온다**: 폰트 크기를 4개(xs/sm/base/lg)로 고정 → "이번엔
  몇 px로 할까" 고민 자체가 사라지고 화면이 저절로 통일된다. (CSS뿐 아니라 색·간격도 같은 원리)

---

## 한 줄 요약 모음

1. 같은 사실은 한 시스템만 소유 — 나머지는 물어본다(인증 위임).
2. 추가 의존성은 비용 — HTTP API는 `requests`로 충분.
3. 유도되는 값은 저장 말고 계산(@property).
4. 사용자 입력은 escape 먼저, 내 태그만 변환(XSS).
5. FK냐 자유텍스트냐는 요구사항이 정한다 — 복사했으면 동기화는 내 책임.
6. "누가"는 데이터로, 코드는 "권한 있나"만 묻는다.
7. 전역 설정은 `get_or_create(pk=1)` 싱글턴 + 코드 기본값 폴백.
8. 운영 스크립트는 멱등하게, 운영 서버는 재시작해야 반영.
9. 횡단 관심사는 미들웨어/컨텍스트 프로세서 한 곳에.
10. 반복되는 권한 검사는 데코레이터로 — 리팩터링은 동작 그대로, 모양만.
11. 외부 데이터를 사본으로 캐시하면 "언제 갱신할지"(이벤트/수동/TTL)를 반드시 설계하라.
12. 값은 변수(디자인 토큰) 한 곳에, 이름은 의미로 — 선택지를 줄이면 일관성이 따라온다.
