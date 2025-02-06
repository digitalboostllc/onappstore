import { PrismaClient, Prisma } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.SUPABASE_POSTGRES_PRISMA_URL
      }
    }
  })

  // Clean up prepared statements after each query
  client.$use(async (params, next) => {
    try {
      const result = await next(params)
      // Only deallocate if it's a query operation
      if (params.action === 'queryRaw' || params.action === 'executeRaw') {
        await client.$executeRaw`DEALLOCATE ALL`
      }
      return result
    } catch (error) {
      // If the error is about a non-existent prepared statement, retry the operation
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2010' &&
        error.message.includes('prepared statement')
      ) {
        await client.$executeRaw`DEALLOCATE ALL`
        return next(params)
      }
      throw error
    }
  })

  return client
}

// In production, create a new instance each time to avoid prepared statement issues
if (process.env.NODE_ENV === 'production') {
  delete globalForPrisma.prisma
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// Cleanup handlers
const cleanup = async () => {
  if (prisma) {
    await prisma.$executeRaw`DEALLOCATE ALL`
    await prisma.$disconnect()
  }
}

// Handle cleanup on various process events
process.on('beforeExit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error)
  await cleanup()
  process.exit(1)
})

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled Rejection:', error)
  await cleanup()
  process.exit(1)
})

export default prisma 