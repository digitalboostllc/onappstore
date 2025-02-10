import { PrismaClient } from "@prisma/client"

/**
 * Serverless-Optimized Prisma Client
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

  // Aggressive middleware for serverless environment
  client.$use(async (params, next) => {
    const start = Date.now()

    try {
      // Execute with timeout
      const result = await Promise.race([
        next(params),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 9000))
      ])

      // Log slow queries
      const duration = Date.now() - start
      if (duration > 1000) {
        console.warn('Slow query:', {
          operation: params.action,
          model: params.model,
          duration: `${duration}ms`
        })
      }

      return result
    } catch (error) {
      // Enhanced error logging
      console.error('Query error:', {
        operation: params.action,
        model: params.model,
        duration: `${Date.now() - start}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Always disconnect on error
      await client.$disconnect()
      
      throw error
    } finally {
      // Aggressive cleanup after each query
      try {
        await client.$executeRaw`DEALLOCATE ALL`
      } catch (e) {
        // Ignore cleanup errors
      }
      
      // Force disconnect after each query
      try {
        await client.$disconnect()
      } catch (e) {
        // Ignore disconnect errors
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

// Minimal cleanup function
const cleanup = async () => {
  try {
    await prisma.$disconnect()
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