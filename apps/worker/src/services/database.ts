import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@yanera/database';
import { Pool } from 'pg';

let prismaInstance: PrismaClient | null = null;

export const getPrisma = () => {
  if (prismaInstance) return prismaInstance;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is undefined at runtime!');

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });

  return prismaInstance;
};

export const prisma = getPrisma();
