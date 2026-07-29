// manifest・アイコン等の静的アセットをdistへコピーする
import { cpSync, mkdirSync, rmSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
// 過去ビルドの残骸が混ざらないよう、コピー先の静的アセットは作り直す
rmSync('dist/icons', { recursive: true, force: true });
cpSync('public', 'dist', { recursive: true });
console.log('[extension] dist/ にpublic配下（manifest・icons）をコピーしました');
