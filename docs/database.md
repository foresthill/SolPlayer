# データベース運用（Prisma / Neon）

方針: **スキーマ変更は必ず `prisma migrate dev` でマイグレーションファイルを生成・適用し、
ファイルをコミットする**。`db push` は使わない（履歴が残らないため禁止。スクリプトも削除済み）。

## 全体像

```
開発:  schema.prisma を編集
       → pnpm db:migrate -- --name <変更名>   ← SQLファイル生成＋開発DBへ適用
       → prisma/migrations/ をコミット
本番:  Vercelビルドが自動で prisma migrate deploy を実行（未適用のSQLだけ順に適用）
```

- マイグレーション本体: `apps/web/prisma/migrations/<timestamp>_<name>/migration.sql`
- 本番適用スクリプト: `apps/web/scripts/migrate-deploy-if-db.mjs`
  （DATABASE_URLがある環境でのみ `migrate deploy`。ローカルのDB無しビルドはスキップ）

## 開発の手順

1. 開発用DBを用意する（おすすめ: Neonの**ブランチ機能**で本番から`dev`ブランチを作る。
   ローカルPostgresでも可）
2. `apps/web/.env.local` に開発用の接続文字列を設定
   ```
   DATABASE_URL=postgresql://...（開発用。-poolerなしの直接接続URL）
   ```
3. `apps/web/prisma/schema.prisma` を編集
4. マイグレーション生成＋適用:
   ```bash
   cd apps/web
   pnpm db:migrate -- --name add_favorite_flag   # 例
   ```
5. 生成された `prisma/migrations/2026xxxx_add_favorite_flag/migration.sql` を**必ずコミット**
6. PRマージ → Vercelビルドで本番へ自動適用

## スクリプト一覧（apps/web）

| コマンド | 用途 |
|---|---|
| `pnpm db:migrate -- --name <名前>` | マイグレーション生成＋開発DBへ適用（`prisma migrate dev`） |
| `pnpm db:deploy` | 未適用マイグレーションの適用のみ（`prisma migrate deploy`。本番相当の動作確認用） |
| `pnpm db:generate` | Prisma Clientの再生成 |
| `pnpm db:studio` | DBのGUIブラウズ |

## 禁止事項

- `prisma db push`（マイグレーションファイルが残らない）
- 適用済みマイグレーションファイルの編集・削除（修正は新しいマイグレーションで）
- 本番のDATABASE_URLを`.env.local`に入れて `migrate dev` すること
  （devはシャドウDBの作成・リセットを行うため本番URLでは絶対に実行しない）
- `-pooler` 付き接続URLでのマイグレーション（ロック取得に失敗する。直接接続URLを使う）

## 開発環境にDBが無い場合（Claude Codeコンテナ等）

`migrate dev` はDB接続が必須。DBに繋げない環境でスキーマを変更した場合は、
SQLをオフライン生成してコミットする（初回 `20260801000000_init` と同じ方式）:

```bash
cd apps/web
pnpm exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/$(date +%Y%m%d%H%M%S)_<変更名>/migration.sql
```

（ディレクトリを先に作ること。適用はVercelビルドの `migrate deploy` に任せる）

## トラブルシューティング

- **ログインで `AdapterError` / `The table public.Account does not exist`**
  → マイグレーション未適用。DATABASE_URLをVercelに設定して**Redeploy**
  （環境変数は既存デプロイに反映されないため再デプロイが必須）
- **ビルドの `migrate deploy` が `P1002`（ロック待ち）で失敗**
  → DATABASE_URLが `-pooler` 経由になっている。直接接続URLへ差し替え
- **`migrate deploy` がスキップされる**（「DATABASE_URL未設定のためマイグレーションをスキップ」）
  → 原因は主に2つ。
  1. **turboの環境変数フィルタ**: turbo 2系はstrictモードがデフォルトで、
     turbo.jsonの `tasks.build.env` に宣言していない環境変数をタスクへ渡さない。
     `"env": ["DATABASE_URL"]` の宣言が必要（設定済み。消さないこと）
  2. Vercelの環境変数の名前・適用環境（Production）の設定漏れ。
     Sensitive指定はビルドから読めない場合があるため、それでも解決しない場合は
     DATABASE_URLのSensitiveを外して再デプロイして切り分ける
