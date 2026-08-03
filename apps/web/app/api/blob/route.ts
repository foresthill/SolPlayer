import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/auth';

/**
 * クラウド保存（フェーズ3）: クライアント直接アップロードのトークン発行
 *
 * 曲の実体はブラウザから Vercel Blob へ直接アップロードする
 * （サーバレス関数のボディ上限4.5MBを回避するため、ここでは
 *  署名付きトークンの発行のみを行い、ファイル本体は経由しない）。
 *
 * 必要な環境変数: BLOB_READ_WRITE_TOKEN
 * （Vercelダッシュボード → Storage → Create Database → Blob で自動設定）
 */

export const dynamic = 'force-dynamic';

/** 1曲あたりの上限（無料枠を考慮しつつ高音質FLACも許容） */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 不審なパスを拒否（実パスはaddRandomSuffixで衝突・上書き不能）
        if (pathname.includes('..') || pathname.length > 300) {
          throw new Error('invalid pathname');
        }
        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/mp4',
            'audio/x-m4a',
            'audio/aac',
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/ogg',
            'application/octet-stream',
          ],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
      // アップロード完了通知（DB反映はクライアントの同期PUTで行うため何もしない）
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'upload error' },
      { status: 400 }
    );
  }
}
