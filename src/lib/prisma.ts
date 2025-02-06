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
          ? process.env.SUPABASE_POSTGRES_PRISMA_URL // Use pooled connection in production
          : process.env.SUPABASE_POSTGRES_PRISMA_URL // Use same URL in development
      }
    },
    // Add connection timeout and pool configuration
    connectionTimeout: 20000,
    pool: {
      min: 0,
      max: 1
    }
  } as Prisma.PrismaClientOptions)

  let retryCount = 0
  const MAX_RETRIES = 3
  const RETRY_DELAY = 100 // 100ms delay between retries

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    try {
      // For write operations, always deallocate
      if (
        process.env.NODE_ENV === 'production' &&
        ['create', 'update', 'delete', 'upsert'].includes(params.action)
      ) {
        try {
          await client.$executeRawUnsafe('DEALLOCATE ALL')
        } catch (e) {
          // Ignore errors from DEALLOCATE ALL
          console.warn('Failed to deallocate statements:', e)
        }
      }
      
      const result = await next(params)
      return result
    } catch (error) {
      // Handle prepared statement errors
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError && 
         (error.code === 'P2010' || error.code === 'P2028')) ||
        (error instanceof Error && 
         (error.message.includes('prepared statement') || 
          error.message.includes('Connection pool timeout')) &&
         retryCount < MAX_RETRIES)
      ) {
        retryCount++
        console.warn(`Retrying query after error (attempt ${retryCount}):`, error)
        
        try {
          // Try to deallocate all prepared statements
          await client.$executeRawUnsafe('DEALLOCATE ALL')
          // Force a new connection
          await client.$disconnect()
          await client.$connect()
        } catch (cleanupError) {
          console.warn('Failed to cleanup:', cleanupError)
        }
        
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount)) // Exponential backoff
        return next(params)
      }

      // Reset retry count after max retries or different error
      retryCount = 0
      throw error
    }
  })

  return client
}

// For production (Vercel serverless), always create a new instance
export const prisma = process.env.NODE_ENV === 'production' 
  ? prismaClientSingleton()
  : (globalForPrisma.prisma ?? prismaClientSingleton())

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

// Handle cleanup on various process events
process.on('beforeExit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Handle errors without exiting in production
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
  // In development, exit on serious errors
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