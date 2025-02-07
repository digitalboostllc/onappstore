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
  const RETRY_DELAY = 100 // Increased delay for better stability

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    const startTime = Date.now()

    try {
      const result = await next(params)
      
      // Log slow queries in production
      const duration = Date.now() - startTime
      if (duration > 5000) { // Log queries taking more than 5 seconds
        console.warn(`Long-running query detected (${duration}ms):`, {
          model: params.model,
          action: params.action,
          args: params.args,
        })
      }

      return result
    } catch (error) {
      // Handle connection and statement errors
      if (
        error instanceof Error && 
        retryCount < MAX_RETRIES &&
        (error.message.includes('prepared statement') ||
         error.message.includes('42P05') ||
         error.message.includes('Connection terminated'))
      ) {
        retryCount++
        console.warn(`Database error, retrying (attempt ${retryCount}):`, error.message)
        
        try {
          await client.$disconnect()
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount)) // Exponential backoff
          await client.$connect()
        } catch (cleanupError) {
          console.warn('Failed to reconnect:', cleanupError)
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
    }
  })

  return client
}

// In production, create new instance but maintain connection
export const prisma = process.env.NODE_ENV === 'production'
  ? prismaClientSingleton()
  : globalForPrisma.prisma ?? prismaClientSingleton()

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

export { prisma as default } 