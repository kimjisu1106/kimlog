import { defineConfig } from 'astro/config';

// KimLog 블로그 — Jekyll에서 이관. URL 1:1 보존이 최우선이라
// trailingSlash 'always' + build.format 'directory'로 Jekyll permalink(/:path/)를 그대로 재현한다.
export default defineConfig({
  site: 'https://kimlog.pages.dev',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
