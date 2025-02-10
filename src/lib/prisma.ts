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
    },

    // Performance optimizations
    __internal: {
      useUds: false, // Disable Unix domain sockets
      disableQueryParameterParsing: true, // Prevent prepared statements
      engineProtocol: 'json-rpc', // More efficient protocol
    },

    // Query engine configuration
    engineConfig: {
      connectionTimeout: 10000, // 10 seconds
      requiredTransactionIsolationLevel: 'ReadCommitted' // Optimal for serverless
    }
  } as any)

  // Optimized middleware
  client.$use(async (params, next) => {
    try {
      // Add query timeout for Vercel's 10s limit
      const result = await Promise.race([
        next(params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 9000)
        )
      ])
      return result
    } catch (error) {
      // Log error with params for debugging
      console.error('Database operation error:', {
        operation: params.action,
        model: params.model,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
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