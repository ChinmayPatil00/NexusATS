import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({where: {email: 'admin@nexus.com'}});
  console.log('Admin user ID:', user?.id);
  const jobs = await prisma.job.findMany({orderBy: {createdAt: 'desc'}, take: 5});
  console.log('Latest 5 jobs:', jobs.map(j => ({title: j.title, userId: j.userId})));
}

main().finally(() => prisma.$disconnect());
