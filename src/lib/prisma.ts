import { PrismaClient } from "@prisma/client"

/**
 * Serverless-Optimized Prisma Client
 * 
 * Build-time Considerations:
 * - Static Generation: Handles concurrent queries during build
 * - Connection Pool: One connection per static page
 * - Statement Cleanup: Aggressive cleanup between pages
 * 
 * Vercel Pro Plan Limits:
 * - Default timeout: 15 seconds
 * - Maximum timeout: 300 seconds
 * 
 * Key Optimizations:
 * 1. No Connection Reuse:
 *    - Create fresh connection for each request
 *    - Aggressively disconnect after each query
 *    - Prevent statement accumulation
 * 
 * 2. Statement Management:
 *    - No prepared statement caching
 *    - Force simple query protocol
 *    - Clear statements after each query
 * 
 * 3. Performance:
 *    - Minimal connection options
 *    - No connection pooling
 *    - Fast fail on errors
 * 
 * 4. Timeouts:
 *    - Query timeout: 14 seconds (below Vercel's 15s default)
 *    - Long query warning: 5 seconds
 *    - Disconnect timeout: 2 seconds
 */

// Global type for Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with minimal options
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    datasources: { db: { url: process.env.SUPABASE_POSTGRES_URL_NON_POOLING } },
  })

  // Track active queries to prevent conflicts
  const activeQueries = new Set<string>()

  // Aggressive middleware for serverless environment
  client.$use(async (params, next) => {
    const start = Date.now()
    const queryId = `${params.model}_${params.action}_${Date.now()}`

    // Wait if there's an active query for the same model/action
    while (activeQueries.has(`${params.model}_${params.action}`)) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Mark this query as active
    activeQueries.add(`${params.model}_${params.action}`)

    try {
      // Execute with timeout (14s to stay under Vercel's 15s default)
      const result = await Promise.race([
        next(params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout - exceeded 14s limit')), 14000)
        )
      ])

      // Log slow queries (over 5s)
      const duration = Date.now() - start
      if (duration > 5000) {
        console.warn('Long-running query detected:', {
          operation: params.action,
          model: params.model,
          duration: `${duration}ms`,
          warning: 'Query took more than 5 seconds'
        })
      }

      return result
    } catch (error) {
      // Enhanced error logging
      const duration = Date.now() - start
      console.error('Query error:', {
        operation: params.action,
        model: params.model,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })

      // Always disconnect on error
      await Promise.race([
        client.$disconnect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Disconnect timeout')), 2000)
        )
      ])
      
      throw error
    } finally {
      // Remove this query from active set
      activeQueries.delete(`${params.model}_${params.action}`)

      // Aggressive cleanup after each query
      try {
        // Only cleanup if no other queries are active
        if (activeQueries.size === 0) {
          await Promise.race([
            client.$executeRaw`DEALLOCATE ALL`,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cleanup timeout')), 2000)
            )
          ])

          // Force disconnect after cleanup
          await Promise.race([
            client.$disconnect(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Disconnect timeout')), 2000)
            )
          ])
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })

  return client
}

// Create singleton instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// Only store global instance in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Minimal cleanup function with timeout
const cleanup = async () => {
  try {
    await Promise.race([
      prisma.$disconnect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Final cleanup timeout')), 2000)
      )
    ])
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Essential process handlers
process.on('beforeExit', cleanup)
process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(0)
})

// Minimal error handlers
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