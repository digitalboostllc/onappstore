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

  // Clean up prepared statements after each query
  client.$use(async (params, next) => {
    try {
      // Always clean up before executing a new query
      await client.$executeRaw`DEALLOCATE ALL`
      const result = await next(params)
      return result
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2010' || error.code === '26000') &&
        error.message.toLowerCase().includes('prepared statement')
      ) {
        // If we get a prepared statement error, try one more time
        await client.$executeRaw`DEALLOCATE ALL`
        return next(params)
      }
      throw error
    }
  })

  return client
}

// Always create a new instance in production
if (process.env.NODE_ENV === 'production') {
  delete globalForPrisma.prisma
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Cleanup handlers
const cleanup = async () => {
  if (prisma) {
    try {
      await prisma.$executeRaw`DEALLOCATE ALL`
    } catch (error) {
      console.error('Error deallocating statements:', error)
    }
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