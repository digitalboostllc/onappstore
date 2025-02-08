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
          ? process.env.DATABASE_URL // Use pooled connection for better performance
          : process.env.DIRECT_DATABASE_URL
      }
    }
  })

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    const startTime = Date.now()
    const TIMEOUT = 8000 // 8 seconds timeout to stay under Vercel's limit

    try {
      // Wrap the operation in a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database operation timeout'))
        }, TIMEOUT)
      })

      const operationPromise = next(params)
      const result = await Promise.race([operationPromise, timeoutPromise])
      
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
      // Handle errors
      if (error instanceof Error) {
        console.error('Database operation error:', error.message)
        
        // Always disconnect on error to clear prepared statements
        try {
          await client.$disconnect()
        } catch (disconnectError) {
          console.warn('Failed to disconnect:', disconnectError)
        }
        
        throw error
      }
      throw error
    }
  })

  return client
}

// In production, create new instance but maintain connection
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

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

export { prisma as default } 