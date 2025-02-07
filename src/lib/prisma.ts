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
          ? process.env.SUPABASE_POSTGRES_URL_NON_POOLING // Use direct connection in production
          : process.env.SUPABASE_POSTGRES_PRISMA_URL
      }
    }
  })

  let retryCount = 0
  const MAX_RETRIES = 2
  const RETRY_DELAY = 50 // 50ms delay between retries

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    try {
      // In production, always deallocate before operations
      if (process.env.NODE_ENV === 'production') {
        try {
          await client.$executeRawUnsafe('DEALLOCATE ALL')
        } catch (e) {
          // Ignore deallocate errors
        }
      }

      const result = await next(params)
      return result
    } catch (error) {
      // Handle both connection and prepared statement errors
      if (
        error instanceof Error && 
        retryCount < MAX_RETRIES &&
        (error.message.includes('prepared statement') ||
         error.message.includes('42P05') ||
         error.message.includes('Connection terminated unexpectedly'))
      ) {
        retryCount++
        console.warn(`Database error, retrying (attempt ${retryCount}):`, error.message)
        
        try {
          // Clean up and reconnect
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

// In production, create new instances to avoid connection sharing
export const prisma = process.env.NODE_ENV === 'production'
  ? prismaClientSingleton()
  : globalForPrisma.prisma ?? prismaClientSingleton()

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

// Error handling
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