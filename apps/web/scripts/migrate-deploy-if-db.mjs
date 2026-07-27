// DATABASE_URLがある環境（Vercel等）でのみ prisma migrate deploy を実行する。
// ローカルでDB未設定でもビルドが通るようにするためのガード。
import { execSync } from 'node:child_process';

if (process.env.DATABASE_URL) {
  console.log('[migrate] DATABASE_URL検出。prisma migrate deployを実行します');
  execSync('prisma migrate deploy', { stdio: 'inherit' });
} else {
  console.log('[migrate] DATABASE_URL未設定のためマイグレーションをスキップ');
}
