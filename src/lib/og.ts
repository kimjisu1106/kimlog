import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SITE = 'https://kimlog.pages.dev';

// project 썸네일(/assets/images/{project}.png)이 있으면 그걸, 없으면 profile.png.
// 존재 검사는 항상 있는 소스 assets/images 기준(복사 타이밍 무관).
export function ogImage(project?: string): string {
  if (project) {
    const src = fileURLToPath(new URL(`../../assets/images/${project}.png`, import.meta.url));
    if (existsSync(src)) return `${SITE}/assets/images/${project}.png`;
  }
  return `${SITE}/assets/images/profile.png`;
}
