// Astro 이관 정적 passthrough — 루트 assets/apps를 Astro public/으로 복사한다.
// Jekyll은 루트에서 서빙, Astro는 public/에서 서빙하므로 병존을 위해 복사(public/은 gitignore).
// dev·build 앞에 자동 실행(predev/prebuild).
import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));

async function copyDir(src, dest) {
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
}

// assets: images + fonts만. main.scss는 Jekyll 전용 소스 — Astro CSS는 /design 툴이 담당.
await mkdir(join(root, 'public/assets'), { recursive: true });
await copyDir(join(root, 'assets/images'), join(root, 'public/assets/images'));
await copyDir(join(root, 'assets/fonts'), join(root, 'public/assets/fonts'));

// 정적 웹앱 3종 — 내부 app_url(/apps/pdf-editor/index.html 등)이 그대로 resolve되게.
await mkdir(join(root, 'public/apps'), { recursive: true });
for (const app of ['image-converter', 'pdf-compressor', 'pdf-editor']) {
  await copyDir(join(root, `apps/${app}`), join(root, `public/apps/${app}`));
}

console.log('[copy-static] assets(images,fonts) + apps → public/ done');
