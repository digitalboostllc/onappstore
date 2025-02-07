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
  const RETRY_DELAY = 100

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    const startTime = Date.now()

    try {
      // For production, ensure clean connection state
      if (process.env.NODE_ENV === 'production' && retryCount === 0) {
        await client.$disconnect()
        await client.$connect()
      }

      const result = await next(params)
      
      // Log slow queries in production
      const duration = Date.now() - startTime
      if (duration > 5000) {
        console.warn(`Long-running query detected (${duration}ms):`, {
          model: params.model,
          action: params.action,
          args: params.args,
        })
      }

      return result
    } catch (error) {
      // Handle connection errors
      if (
        error instanceof Error && 
        retryCount < MAX_RETRIES &&
        (error.message.includes('42P05') || // Prepared statement exists
         error.message.includes('Connection terminated'))
      ) {
        retryCount++
        console.warn(`Database error, retrying (attempt ${retryCount}):`, error.message)
        
        try {
          // Force a new connection
          await client.$disconnect()
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount))
          await client.$connect()
        } catch (reconnectError) {
          console.warn('Failed to reconnect:', reconnectError)
        }
        
        return next(params)
      }

      // Log all database errors in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Database error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          model: params.model,
          action: params.action,
          duration: Date.now() - startTime,
        })
      }

      retryCount = 0
      throw error
    } finally {
      // Reset retry count after operation completes or fails
      retryCount = 0
    }
  })

  return client
}

// In production, always create a new instance
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
    await prisma.$disconnect()
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

// Support both default and named exports
export default prisma 