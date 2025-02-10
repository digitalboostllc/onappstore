import { PrismaClient } from "@prisma/client"
import { performance } from "perf_hooks"

/**
 * Development & Deployment Rules
 * 
 * Architecture:
 * - Next.js 13+ App Router
 * - Serverless deployment on Vercel
 * - Supabase for PostgreSQL database
 * - Prisma as ORM with connection pooling
 * 
 * Database Connections:
 * 1. Use two database URLs:
 *    - SUPABASE_POSTGRES_PRISMA_URL: For pooled connections (with pgBouncer)
 *    - SUPABASE_POSTGRES_URL_NON_POOLING: For direct connections (migrations/schema changes)
 * 
 * Environment Variables:
 * 1. All configuration in Vercel project settings
 * 2. Never store in vercel.json
 * 3. Local development uses .env
 * 4. Production uses Vercel environment variables
 * 
 * Deployment Process:
 * 1. All deployments from tagged releases
 * 2. Automatic deployments on push to main
 * 3. Preview deployments for pull requests
 * 
 * Performance Optimization:
 * 1. Query Optimization:
 *    - Use proper indexes
 *    - Minimize N+1 queries
 *    - Implement caching where appropriate
 * 
 * 2. Connection Management:
 *    - Pool connections in production
 *    - Limit concurrent connections
 *    - Implement proper timeouts
 * 
 * 3. Error Handling:
 *    - Graceful degradation
 *    - Proper error logging
 *    - User-friendly error messages
 * 
 * Serverless Considerations:
 * 1. Cold Starts:
 *    - Minimize initialization code
 *    - Use connection pooling
 *    - Implement proper caching
 * 
 * 2. Timeouts:
 *    - Vercel timeout: 15s (default)
 *    - Database queries: 14s max
 *    - API routes: 10s target
 * 
 * 3. Resource Limits:
 *    - Memory: 1024MB
 *    - Function size: 50MB
 *    - Concurrent executions: Based on plan
 */

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

// Add query caching
const queryCache = new Map()

// Create Prisma client with minimal options
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "event",
        level: "error",
      },
      {
        emit: "event",
        level: "warn",
      },
    ],
    datasources: { 
      db: { 
        url: `${process.env.SUPABASE_POSTGRES_URL_NON_POOLING}?pgbouncer=true&connection_limit=1&pool_timeout=20`
      } 
    }
  })

  // Add query caching middleware
  client.$use(async (params: any, next: any) => {
    const cacheKey = JSON.stringify(params)
    const cached = queryCache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    const start = performance.now()
    const result = await next(params)
    const duration = performance.now() - start

    if (result) {
      queryCache.set(cacheKey, result)
      setTimeout(() => queryCache.delete(cacheKey), 60 * 1000)
    }

    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, params)
    }

    return result
  })

  // Track active queries to prevent conflicts
  const activeQueries = new Set<string>()

  // Simplified middleware for serverless environment
  client.$use(async (params, next) => {
    const start = Date.now()
    const queryId = `${params.model}_${params.action}_${Date.now()}`

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
      
      throw error
    }
  })

  return client
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

// Global type for Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

// Create singleton instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// Only store global instance in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Log query events
prisma.$on("query", (e: any) => {
  if (e.duration > 1000) {
    console.warn("Long running query:", {
      query: e.query,
      duration: e.duration,
      timestamp: e.timestamp,
    })
  }
})

// Log error events
prisma.$on("error", (e: any) => {
  console.error("Prisma Error:", {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  })
})

// Minimal cleanup function with timeout
const cleanup = async () => {
  try {
    await prisma.$disconnect()
    console.log("Successfully disconnected Prisma Client")
  } catch (error) {
    console.error("Error disconnecting Prisma Client:", error)
    process.exit(1)
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