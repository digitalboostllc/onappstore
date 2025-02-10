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
    const MAX_RETRIES = 3
    let retries = 0

    while (retries < MAX_RETRIES) {
      try {
        const result = await next(params)
        return result
      } catch (error) {
        retries++
        console.error(`Database operation error (attempt ${retries}/${MAX_RETRIES}):`, error)
        
        // Check for prepared statement error
        if (error instanceof Error && 
            (error.message.includes('prepared statement') || 
             (error as any)?.code === '42P05')) {
          console.log('Handling prepared statement error...')
          
          try {
            // Force disconnect to clear prepared statements
            await client.$disconnect()
            
            // Wait before reconnecting
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Reconnect
            await client.$connect()
            
            // If this was the last retry, throw the error
            if (retries === MAX_RETRIES) {
              throw error
            }
            
            // Otherwise continue to retry
            continue
          } catch (reconnectError) {
            console.error('Error during reconnection:', reconnectError)
            throw error
          }
        }
        
        // For other types of errors, throw immediately
        throw error
      }
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
const cleanup = async () => {
  await prisma.$disconnect()
}

// Handle cleanup for different process events
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