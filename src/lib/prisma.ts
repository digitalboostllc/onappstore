import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const connectionString = process.env.SUPABASE_POSTGRES_PRISMA_URL
  const url = connectionString ? `${connectionString}?pgbouncer=true&connection_limit=1` : undefined

  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url
      },
    }
  })
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Proper connection management for production
if (process.env.NODE_ENV === 'production') {
  let isConnected = false

  const connectWithRetry = async (retries = 5) => {
    try {
      if (!isConnected) {
        await prisma.$connect()
        isConnected = true
        console.log('Successfully connected to database')
      }
    } catch (error) {
      console.error('Error connecting to database:', error)
      if (retries > 0) {
        console.log(`Retrying connection... (${retries} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        await connectWithRetry(retries - 1)
      }
    }
  }

  // Initial connection
  connectWithRetry()

  // Proper cleanup and reconnection handling
  const cleanup = async () => {
    try {
      if (isConnected) {
        await prisma.$disconnect()
        isConnected = false
        console.log('Successfully disconnected from database')
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  // Handle various termination signals
  const signals = ['SIGTERM', 'SIGINT', 'beforeExit'] as const
  signals.forEach(signal => {
    process.on(signal, async () => {
      await cleanup()
      if (signal !== 'beforeExit') {
        process.exit(0)
      }
    })
  })

  // Handle uncaught errors
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error)
    await cleanup()
    process.exit(1)
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (error) => {
    console.error('Unhandled rejection:', error)
    await cleanup()
    process.exit(1)
  })
} 