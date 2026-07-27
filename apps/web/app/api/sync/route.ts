import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * アカウント同期API（フェーズ2: メタデータのみ）
 *
 * GET  /api/sync — ログインユーザーのプレイリスト/トラック/マイプリセットを返す
 * PUT  /api/sync — クライアントの全メタデータ状態でサーバー側を置き換える
 *                  （単一ユーザー規模のため全置換のシンプル設計。
 *                   端末間の統合はクライアント側でIndexedDBへマージ後にPUTされる）
 *
 * 曲の実体(Blob)は同期しない（フェーズ3のクラウド保存で対応予定）。
 */

export const dynamic = 'force-dynamic';

interface SyncPlaylist {
  id: string;
  name: string;
  order: number;
}

interface SyncTrack {
  id: string;
  title: string;
  artist?: string | null;
  kind?: 'local' | 'youtube';
  videoId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  order: number;
  playlistId: string;
}

interface SyncPayload {
  playlists: SyncPlaylist[];
  tracks: SyncTrack[];
  presetHz: number[];
}

const MAX_ITEMS = 5000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const [playlists, tracks, presets] = await Promise.all([
    prisma.playlist.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
    prisma.track.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
    prisma.frequencyPreset.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
  ]);

  return NextResponse.json({
    playlists: playlists.map((p) => ({ id: p.id, name: p.name, order: p.order })),
    tracks: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      kind: t.kind === 'YOUTUBE' ? 'youtube' : 'local',
      videoId: t.videoId,
      fileName: t.fileName,
      fileSize: t.fileSize,
      order: t.order,
      playlistId: t.playlistId,
    })),
    presetHz: presets.map((p) => p.hz),
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let payload: SyncPayload;
  try {
    payload = (await request.json()) as SyncPayload;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (
    !Array.isArray(payload.playlists) ||
    !Array.isArray(payload.tracks) ||
    !Array.isArray(payload.presetHz) ||
    payload.playlists.length > MAX_ITEMS ||
    payload.tracks.length > MAX_ITEMS ||
    payload.presetHz.length > MAX_ITEMS
  ) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const playlistIds = new Set(payload.playlists.map((p) => p.id));

  await prisma.$transaction([
    // このユーザーの既存データを全置換
    prisma.track.deleteMany({ where: { userId } }),
    prisma.playlist.deleteMany({ where: { userId } }),
    prisma.frequencyPreset.deleteMany({ where: { userId } }),

    prisma.playlist.createMany({
      data: payload.playlists.map((p) => ({
        id: String(p.id),
        name: String(p.name).slice(0, 200),
        order: Number(p.order) || 0,
        userId,
      })),
    }),
    prisma.track.createMany({
      // 所属プレイリストが送られてこないトラックは外部キー違反になるため除外
      data: payload.tracks
        .filter((t) => playlistIds.has(t.playlistId))
        .map((t) => ({
          id: String(t.id),
          title: String(t.title).slice(0, 500),
          artist: t.artist ? String(t.artist).slice(0, 500) : null,
          kind: t.kind === 'youtube' ? ('YOUTUBE' as const) : ('LOCAL' as const),
          videoId: t.videoId ? String(t.videoId).slice(0, 20) : null,
          fileName: t.fileName ? String(t.fileName).slice(0, 500) : null,
          fileSize:
            typeof t.fileSize === 'number' && Number.isFinite(t.fileSize)
              ? Math.floor(t.fileSize)
              : null,
          order: Number(t.order) || 0,
          playlistId: String(t.playlistId),
          userId,
        })),
    }),
    prisma.frequencyPreset.createMany({
      data: [...new Set(payload.presetHz)]
        .filter((hz) => typeof hz === 'number' && hz >= 400 && hz <= 480)
        .map((hz) => ({ hz, userId })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
