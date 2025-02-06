import { PrismaClient, Prisma } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production'
          ? process.env.SUPABASE_POSTGRES_PRISMA_URL
          : process.env.SUPABASE_POSTGRES_PRISMA_URL
      }
    }
  })

  let retryCount = 0
  const MAX_RETRIES = 3
  const RETRY_DELAY = 100 // 100ms delay between retries

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    try {
      // Always deallocate in production before any operation
      if (process.env.NODE_ENV === 'production') {
        try {
          await client.$executeRawUnsafe('DEALLOCATE ALL')
        } catch (e) {
          console.warn('Failed to deallocate statements:', e)
        }
      }
      
      return await next(params)
    } catch (error) {
      // Handle prepared statement errors
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError && 
         (error.code === 'P2010' || error.code === 'P2028')) ||
        (error instanceof Error && 
         (error.message.includes('prepared statement') || 
          error.message.includes('already exists'))) &&
        retryCount < MAX_RETRIES
      ) {
        retryCount++
        console.warn(`Retrying query after error (attempt ${retryCount}):`, error)
        
        try {
          // More aggressive cleanup
          await client.$executeRawUnsafe('DEALLOCATE ALL')
          await client.$disconnect()
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount))
          await client.$connect()
        } catch (cleanupError) {
          console.warn('Failed to cleanup:', cleanupError)
        }
        
        return next(params)
      }

      retryCount = 0
      throw error
    }
  })

  return client
}

// Always create a new instance in production to avoid state conflicts
export const prisma = process.env.NODE_ENV === 'production'
  ? prismaClientSingleton()
  : globalForPrisma.prisma ?? prismaClientSingleton()

// Only cache the instance in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Cleanup handler
const cleanup = async () => {
  if (prisma) {
    try {
      await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (error) {
      console.warn('Error during cleanup:', error)
    } finally {
      await prisma.$disconnect()
    }
  }
}

// Handle cleanup on process events
process.on('beforeExit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Production error handling without exiting
if (process.env.NODE_ENV === 'production') {
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error)
    await cleanup()
  })

  process.on('unhandledRejection', async (error) => {
    console.error('Unhandled Rejection:', error)
    await cleanup()
  })
} else {
  // Development error handling with exit
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
}

export { prisma as default } 