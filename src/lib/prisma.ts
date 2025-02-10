import { PrismaClient } from "@prisma/client"

/**
 * Prisma Client Configuration for Serverless Environment
 * 
 * Key Points:
 * 1. Serverless Functions:
 *    - Each invocation runs in isolation
 *    - Short-lived connections are preferred
 *    - No need for connection pooling in traditional sense
 * 
 * 2. PostgreSQL Prepared Statements:
 *    - Statements are cached at session level
 *    - In serverless, we want to minimize statement caching
 *    - Better to disable statement preparation for serverless
 * 
 * 3. Connection Strategy:
 *    - Use direct connections instead of pooling
 *    - Keep connections simple and stateless
 *    - Rely on PostgreSQL's native connection handling
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production'
          ? process.env.SUPABASE_POSTGRES_URL_NON_POOLING  // Use non-pooling in production
          : process.env.SUPABASE_POSTGRES_URL_NON_POOLING  // Use non-pooling in development
      }
    },
    // Disable query caching and prepared statements
    previewFeatures: ['nativeTypes'],
    __internal: {
      useUds: false,
      // Disable prepared statements
      disableQueryParameterParsing: true
    }
  } as any)

  // Simple middleware for error logging
  client.$use(async (params, next) => {
    try {
      const result = await next(params)
      return result
    } catch (error) {
      console.error('Database operation error:', error)
      throw error
    }
  })

  return client
}

// Singleton pattern with global instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// Store instance on global object in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Simple cleanup function
const cleanup = async () => {
  await prisma.$disconnect()
}

// Basic process cleanup
process.on('beforeExit', cleanup)
process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(0)
})

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

export default prisma 