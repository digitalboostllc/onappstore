import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.SUPABASE_POSTGRES_PRISMA_URL
      }
    }
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Ensure the Prisma Client is properly cleaned up when the app is shutting down
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export default prisma 