import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production'
          ? process.env.SUPABASE_POSTGRES_PRISMA_URL
          : process.env.SUPABASE_POSTGRES_URL_NON_POOLING
      }
    }
  })

  // Middleware for handling database operations
  client.$use(async (params, next) => {
    try {
      const result = await next(params)
      return result
    } catch (error) {
      console.error('Database operation error:', error)
      
      // Disconnect on error to clear prepared statements
      if (error instanceof Error && error.message.includes('prepared statement')) {
        try {
          await client.$disconnect()
          // Reconnect after a short delay
          setTimeout(async () => {
            try {
              await client.$connect()
            } catch (reconnectError) {
              console.error('Failed to reconnect:', reconnectError)
            }
          }, 1000)
        } catch (disconnectError) {
          console.warn('Failed to disconnect:', disconnectError)
        }
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

// Handle cleanup on process events
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

// Error handling
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error)
  await prisma.$disconnect()
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled Rejection:', error)
  await prisma.$disconnect()
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

export default prisma 