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
    // Use pooled connection in production with serverless-optimized settings
    const url = process.env.SUPABASE_POSTGRES_PRISMA_URL
    if (!url) throw new Error('SUPABASE_POSTGRES_PRISMA_URL is not defined')
    return url + (url.includes('?') ? '&' : '?') + 
      'connection_limit=1&pool_timeout=0&connect_timeout=30'
  }
  // Use direct connection in development
  const devUrl = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!devUrl) throw new Error('SUPABASE_POSTGRES_URL_NON_POOLING is not defined')
  return devUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Function to clean up prepared statements
async function cleanupPreparedStatements(client: PrismaClient) {
  try {
    // First try to deallocate all
    await client.$executeRaw`DEALLOCATE ALL`
    
    // Then try to close all idle connections in the pool
    if (process.env.NODE_ENV === 'production') {
      await client.$executeRaw`SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE application_name = 'prisma' 
        AND state = 'idle'
        AND pid <> pg_backend_pid()`
    }
  } catch (error) {
    console.warn('Failed to cleanup:', error)
  }
}

const prismaClientSingleton = () => {
  const databaseUrl = getDatabaseUrl()
  
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: ['error', 'warn']
  })

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    const startTime = Date.now()

    try {
      // Always clean up prepared statements before operations
      await cleanupPreparedStatements(client)

      const result = await next(params)
      
      // Log slow queries in production
      const duration = Date.now() - startTime
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, {
          model: params.model,
          action: params.action,
          args: params.args,
        })
      }

      return result
    } catch (error) {
      // Handle connection errors
      if (error instanceof Error) {
        // Log all database errors in production
        if (process.env.NODE_ENV === 'production') {
          console.error('Database error:', {
            message: error.message,
            model: params.model,
            action: params.action,
            duration: Date.now() - startTime,
          })
        }

        // Clean up and retry for prepared statement errors
        if (error.message.includes('42P05')) {
          await cleanupPreparedStatements(client)
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100))
          return next(params)
        }
      }

      throw error
    } finally {
      // Always try to cleanup after operation
      await cleanupPreparedStatements(client)
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
    await cleanupPreparedStatements(prisma)
    await prisma.$disconnect()
  }
}

// Handle cleanup on process events
process.on('beforeExit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Error handling
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error)
  await cleanup()
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled Rejection:', error)
  await cleanup()
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

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