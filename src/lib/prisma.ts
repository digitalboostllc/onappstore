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
      return await next(params)
    } catch (error) {
      // Only retry on specific database errors
      if (
        error instanceof Error && 
        retryCount < MAX_RETRIES &&
        (error.message.includes('Connection pool timeout') ||
         error.message.includes('Connection terminated unexpectedly'))
      ) {
        retryCount++
        console.warn(`Database connection error, retrying (attempt ${retryCount})`)
        
        try {
          await client.$disconnect()
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          await client.$connect()
        } catch (reconnectError) {
          console.warn('Failed to reconnect:', reconnectError)
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