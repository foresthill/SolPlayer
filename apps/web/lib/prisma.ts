import { PrismaClient } from '@prisma/client';

// 開発時のホットリロードでコネクションが増殖しないようシングルトンにする
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
