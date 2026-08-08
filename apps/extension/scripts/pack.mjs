// 配布用zipを作成する:
//   artifacts/solplayer-tune-chrome.zip  (Chrome/Edge用)
//   artifacts/solplayer-tune-firefox.zip (Firefox用: gecko設定入りmanifest)
// 事前に `pnpm build` で dist/ が生成されている前提。
import { execSync } from 'node:child_process';
import {
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const artifacts = resolve(root, 'artifacts');
rmSync(artifacts, { recursive: true, force: true });
mkdirSync(artifacts, { recursive: true });

// Chrome/Edge用: distをそのままzip
execSync(
  `python3 -m zipfile -c ${resolve(artifacts, 'solplayer-tune-chrome.zip')} content.js manifest.json icons`,
  { cwd: resolve(root, 'dist') }
);

// Firefox用: manifestにgecko設定（AMO署名に必要なID）を追加
const firefoxDir = resolve(root, 'dist-firefox');
rmSync(firefoxDir, { recursive: true, force: true });
mkdirSync(firefoxDir, { recursive: true });
cpSync(resolve(root, 'dist/content.js'), resolve(firefoxDir, 'content.js'));
cpSync(resolve(root, 'dist/icons'), resolve(firefoxDir, 'icons'), { recursive: true });
const manifest = JSON.parse(readFileSync(resolve(root, 'dist/manifest.json'), 'utf8'));
manifest.browser_specific_settings = {
  gecko: {
    id: 'solplayer-tune@foresthill.github.io',
    strict_min_version: '121.0',
    // AMOの必須申告: 本拡張はいかなるデータも収集・送信しない
    data_collection_permissions: { required: ['none'] },
  },
};
writeFileSync(resolve(firefoxDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
execSync(
  `python3 -m zipfile -c ${resolve(artifacts, 'solplayer-tune-firefox.zip')} content.js manifest.json icons`,
  { cwd: firefoxDir }
);

console.log('[extension] artifacts/ に配布用zipを作成しました');
