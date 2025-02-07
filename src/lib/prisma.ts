import { PrismaClient, Prisma } from "@prisma/client"

// Validate environment variables
const validateEnvVariables = () => {
  const requiredEnvVars = {
    development: ['SUPABASE_POSTGRES_URL_NON_POOLING'],
    production: ['SUPABASE_POSTGRES_PRISMA_URL']
  }

  const environment = process.env.NODE_ENV || 'development'
  const required = requiredEnvVars[environment as keyof typeof requiredEnvVars]

  const missing = required.filter(env => !process.env[env])
  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables for ${environment}: ${missing.join(', ')}\n` +
      `Please ensure these are set in your Vercel project settings.`
    )
  }
}

// Get database URL based on environment
const getDatabaseUrl = () => {
  validateEnvVariables()
  
  if (process.env.NODE_ENV === 'production') {
    // Use pooled connection in production
    return process.env.SUPABASE_POSTGRES_PRISMA_URL
  }
  // Use direct connection in development
  return process.env.SUPABASE_POSTGRES_URL_NON_POOLING
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const databaseUrl = getDatabaseUrl()
  
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
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

/**
 * CHANGELOG
 * ---------
 * Latest Update (2024-02-07):
 * - Switched to pooled connections in production (DATABASE_URL)
 * - Added DEALLOCATE ALL before operations
 * - Reduced MAX_RETRIES from 2 to 1
 * - Reduced RETRY_DELAY from 50ms to 20ms
 * - Added better cleanup during retries
 * - Improved error logging
 * - Lowered slow query threshold to 1000ms
 * 
 * Previous Updates:
 * - Added support for both named and default exports
 * - Implemented connection pooling
 * - Added retry mechanism for failed queries
 * - Added cleanup handlers for process events
 * - Added error logging in production
 * - Added slow query detection
 * 
 * Known Issues:
 * - Prepared statement conflicts (42P05) still occurring occasionally
 * - Connection termination issues in high-load scenarios
 * 
 * TODO:
 * - Consider implementing connection pooling with pg-pool
 * - Add metrics collection for query performance
 * - Implement circuit breaker pattern for database operations
 * - Add more granular error handling for specific error codes
 */ 