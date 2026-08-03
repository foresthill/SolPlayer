/**
 * クラウド保存（フェーズ3）: 曲の実体をVercel Blobへアップロードする
 *
 * サーバレス関数のボディ上限(4.5MB)を回避するため、/api/blob で
 * 発行されるトークンを使ってブラウザからBlobストアへ直接アップロードする。
 * 未ログイン時は /api/blob が401を返すため、その旨のエラーになる。
 */

import { upload } from '@vercel/blob/client';

/** ファイル名をBlobパスに使える安全な形へ */
function safeName(name: string): string {
  return name.replace(/[^\w.\-()\[\] ぁ-んァ-ン一-龠ー]/g, '_').slice(0, 120);
}

export async function uploadTrackBlob(options: {
  trackId: string;
  fileName: string;
  blob: Blob;
}): Promise<string> {
  const result = await upload(
    // 実際の保存先プレフィックス(userId/)はサーバー側トークン発行時に検証される
    `${options.trackId}/${safeName(options.fileName || 'track')}`,
    options.blob,
    {
      access: 'public',
      handleUploadUrl: '/api/blob',
      contentType: options.blob.type || 'application/octet-stream',
    }
  );
  return result.url;
}
