import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

function getPrismaUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl) {
    return envUrl;
  }

  const candidates = [
    path.resolve(process.cwd(), 'packages/database/prisma/dev.db'),
    path.resolve(process.cwd(), '../../packages/database/prisma/dev.db'),
    path.resolve(process.cwd(), '../packages/database/prisma/dev.db')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `file:${candidate.replace(/\\/g, '/')}`;
    }
  }

  return undefined;
}

const resolvedUrl = getPrismaUrl();

export const prisma = new PrismaClient(
  resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : undefined
);
export * from '@prisma/client';
