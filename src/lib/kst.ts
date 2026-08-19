// KST(Asia/Seoul) 날짜 유틸. 빌드 머신 TZ(Cloudflare는 UTC)와 무관하게 KST 기준으로 계산한다.
// toISOString() 금지 — UTC 오프셋 때문에 날짜가 하루 밀린다.

// 'YYYY-MM-DD' frontmatter는 z.coerce.date()로 UTC 자정 Date가 되므로 UTC 컴포넌트로 되읽는다.
export function postDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 빌드 시각 기준 KST 오늘(YYYY-MM-DD). en-CA + timeZone으로 머신 TZ 무관하게 뽑는다.
export function todayKSTStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// future:false + timezone:Asia/Seoul 재현 — 미래 KST 글은 날짜가 지난 다음 빌드까지 숨김.
export function isPublished(d: Date): boolean {
  return postDateStr(d) <= todayKSTStr();
}
