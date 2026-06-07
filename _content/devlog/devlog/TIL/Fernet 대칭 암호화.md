---
layout: post
title: Fernet 대칭 암호화
date: 2026-04-21
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Python
  - Security
---
### 대칭 암호화

- 같은 키로 잠그고 여는 방식.
	- 대칭  → 열쇠 하나로 잠그고 열기
	- 비대칭 → 잠그는 열쇠(공개키)랑 여는 열쇠(개인키)가 다름

---

### Fernet

Python `cryptography` 패키지에서 제공하는 대칭 암호화 방식.

```python
from cryptography.fernet import Fernet

key = Fernet.generate_key()  # 키 생성
f = Fernet(key)

# 암호화
token = f.encrypt(b"abc123")  # → "gAAAAABh..." 같은 암호문

# 복호화
original = f.decrypt(token)   # → "abc123"
```

**Fernet이 보장하는 것:**

```
1. 암호화  → 키 없으면 원본 못 봄
2. 무결성  → 암호문 조작되면 복호화 실패
3. 타임스탬프 → 언제 암호화됐는지 기록
```

---

현재 암호화/복호화는 Fernet으로 처리.
복호화된 비밀번호는 HTML DOM에 미리 노출하지 않고, 필요할 때 AJAX 요청으로 가져와 표시.