import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

/**
 * Auth.js設定（フェーズ2: Googleログイン）
 *
 * 必要な環境変数: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / AUTH_SECRET / DATABASE_URL
 * （apps/web/.env.example 参照。本番はVercelのEnvironment Variables）
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'database' },
  trustHost: true,
});
