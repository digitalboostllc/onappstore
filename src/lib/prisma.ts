import { PrismaClient } from "@prisma/client"

/**
 * Optimized Prisma Client for Vercel Serverless
 * 
 * Vercel-Specific Considerations:
 * 1. Cold Starts:
 *    - Functions can be cold-started frequently
 *    - Need to minimize initialization time
 *    - Connection should be lazy-loaded
 * 
 * 2. Connection Limits:
 *    - Vercel has concurrent execution limits
 *    - Each instance should handle connection efficiently
 *    - Need to prevent connection leaks
 * 
 * 3. Edge Functions:
 *    - Some routes may use edge functions
 *    - Database connections should be region-aware
 *    - Keep latency low with direct connections
 * 
 * 4. Resource Constraints:
 *    - Limited memory per instance
 *    - Limited execution time
 *    - Need to optimize resource usage
 */

// Singleton type definition
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimized client configuration
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    // Only log errors in production
    log: process.env.NODE_ENV === 'production' 
      ? ['error']
      : ['query', 'error', 'warn'],

    // Database connection configuration
    datasources: {
      db: {
        url: process.env.SUPABASE_POSTGRES_URL_NON_POOLING
      }
    }
  })

  // Optimized middleware for Vercel's environment
  client.$use(async (params, next) => {
    const start = Date.now()

    try {
      // Add query timeout for Vercel's 10s limit
      const result = await Promise.race([
        next(params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout - exceeded 9s limit')), 9000)
        )
      ])

      // Log slow queries in production
      const duration = Date.now() - start
      if (duration > 1000) { // Log queries taking more than 1s
        console.warn('Slow query detected:', {
          operation: params.action,
          model: params.model,
          duration: `${duration}ms`
        })
      }

      return result
    } catch (error) {
      // Enhanced error logging
      console.error('Database operation error:', {
        operation: params.action,
        model: params.model,
        args: params.args,
        duration: `${Date.now() - start}ms`,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : 'Unknown error'
      })
      throw error
    }
  })

  return client
}

// Singleton instance with lazy initialization
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// Development-only global instance
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Efficient cleanup with timeout
const cleanup = async () => {
  try {
    await Promise.race([
      prisma.$disconnect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Disconnect timeout - exceeded 5s')), 5000)
      )
    ])
  } catch (e) {
    console.error('Cleanup error:', e)
  }
}

// Minimal process handlers
process.on('beforeExit', cleanup)
process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(0)
})

// Production-safe error handling
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

export default prisma 