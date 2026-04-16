---
layout: post
title: 쿼리 파라미터(Query Parameter). 기존 QR코드 재활용
date: 2026-04-16
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
회사 ERP 시설물 대장 개발 중, 시설물에 이미 붙어있는 QR코드를 교체하지 않고 재활용할 수 있는 방법 발견.

---

**상황**
기존 유지보수 서비스에서 붙여놓은 QR코드가 시설물마다 부착되어 있음. 스캔하니 URL에 `companyNo`와 `equipNo`가 노출됨. 쿼리 파라미터(Query Parameter)

```
https://[외부서비스]/readQR.do?companyNo=nnnn&equipNo=nnnn
```

---

**아이디어**
새 QR코드를 다시 제작/부착하는 대신, 기존 QR코드의 `equipNo`를 새 ERP의 시설물 식별자로 매핑하면 됨.

```
기존 QR 스캔
→ equipNo=nnnn 추출
→ 내 ERP에서 oldEquipNo=nnnn인 시설물 조회
→ 시설물 대장 페이지로 이동
```

---

**장점**
- QR코드 재출력 불필요
- 시설물마다 새로 부착 불필요
- 기존 인프라 그대로 활용 가능