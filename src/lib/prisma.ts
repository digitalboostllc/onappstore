import { PrismaClient, Prisma } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.SUPABASE_POSTGRES_URL_NON_POOLING // Use non-pooling in production
          : process.env.SUPABASE_POSTGRES_PRISMA_URL
      }
    }
  })

  let retryCount = 0
  const MAX_RETRIES = 1

  // Handle prepared statements more efficiently
  client.$use(async (params, next) => {
    try {
      const result = await next(params)
      return result
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2010' || error.code === '26000') &&
        error.message.toLowerCase().includes('prepared statement') &&
        retryCount < MAX_RETRIES
      ) {
        retryCount++
        // Only deallocate if we encounter a prepared statement error
        await client.$executeRaw`DEALLOCATE ALL`
        const result = await next(params)
        retryCount = 0
        return result
      }
      throw error
    }
  })

  return client
}

// In production, create a new instance for each request
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Cleanup handler
const cleanup = async () => {
  if (prisma) {
    try {
      // Only deallocate on shutdown
      await prisma.$executeRaw`DEALLOCATE ALL`
    } catch (error) {
      console.error('Error deallocating statements:', error)
    } finally {
      await prisma.$disconnect()
    }
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

// Export both default and named export
export { prisma as default } 