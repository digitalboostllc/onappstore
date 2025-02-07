import { PrismaClient, Prisma } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production'
          ? process.env.DATABASE_URL // Use pooled connection
          : process.env.DIRECT_DATABASE_URL
      }
    },
    log: ['error', 'warn'],
  })

  let retryCount = 0
  const MAX_RETRIES = 1 // Reduced from 2
  const RETRY_DELAY = 20 // Reduced from 50ms

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    const startTime = Date.now()

    try {
      // For production, ensure clean connection state
      if (process.env.NODE_ENV === 'production') {
        await client.$executeRaw`DEALLOCATE ALL` // Clean up any lingering prepared statements
      }

      const result = await next(params)
      
      // Log slow queries in production
      const duration = Date.now() - startTime
      if (duration > 1000) { // Lowered threshold to 1s
        console.warn(`Slow query detected (${duration}ms):`, {
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
        console.warn(`Retrying database operation (attempt ${retryCount}/${MAX_RETRIES})`)
        
        // Clean up and retry
        try {
          await client.$executeRaw`DEALLOCATE ALL`
        } catch (cleanupError) {
          console.error('Error cleaning up prepared statements:', cleanupError)
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
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

      throw error
    } finally {
      retryCount = 0 // Reset retry count after each operation
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