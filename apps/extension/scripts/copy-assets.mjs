// manifest等の静的アセットをdistへコピーする
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
cpSync('public/manifest.json', 'dist/manifest.json');
console.log('[extension] dist/ にmanifestをコピーしました');
