import { PrismaClient } from "@prisma/client"

/**
 * Known Issues & Solutions:
 * 1. Prepared Statement Errors (42P05):
 *    - Problem: PostgreSQL throws "prepared statement already exists" errors
 *    - Cause: Connection pooling can lead to statement conflicts
 *    - Solution: Implement retry logic with disconnect/reconnect cycle
 * 
 * 2. Connection Management:
 *    - Problem: Connections not properly cleaned up in serverless environment
 *    - Solution: Proper cleanup handlers for various process events
 * 
 * 3. Production vs Development:
 *    - Problem: Different connection requirements for prod/dev
 *    - Solution: Use pooled connections in production, direct in development
 * 
 * 4. Error Handling:
 *    - Problem: Generic error handling doesn't address specific database issues
 *    - Solution: Specific error handling for different types of database errors
 * 
 * 5. Connection Pooling Issues:
 *    - Problem: Prepared statements accumulate in pooled connections
 *    - Solution: Implement connection pool settings and statement cleanup
 * 
 * 6. Cache Management:
 *    - Problem: Cached connections may retain prepared statements
 *    - Solution: Clear connection cache on errors and implement statement timeout
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  // Configure client with appropriate logging and database URL
  const client = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        // Use connection pooling in production, direct connection in development
        url: process.env.NODE_ENV === 'production'
          ? process.env.SUPABASE_POSTGRES_PRISMA_URL  // Pooled connections
          : process.env.SUPABASE_POSTGRES_URL_NON_POOLING  // Direct connection
      }
    },
    // Add connection pool configuration
    // These settings help manage connection lifecycle
    connectionLimit: 20,
    pool: {
      min: 0,
      max: 5,
      createTimeoutMillis: 3000,
      acquireTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
    }
  } as any) // Type assertion needed for custom pool options

  // Initialize connection state
  let isConnected = false

  // Middleware for handling database operations and errors
  client.$use(async (params, next) => {
    const MAX_RETRIES = 3
    let retries = 0

    // Function to handle reconnection
    const reconnect = async () => {
      try {
        if (isConnected) {
          await client.$disconnect()
          isConnected = false
        }
        
        // Clear any existing prepared statements
        try {
          await client.$executeRaw`DEALLOCATE ALL`
        } catch (e) {
          // Ignore errors from DEALLOCATE as connection might be closed
        }

        // Add delay to ensure connection is fully closed
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Establish fresh connection
        await client.$connect()
        isConnected = true

        // Set statement timeout to prevent hanging prepared statements
        await client.$executeRaw`SET statement_timeout = 30000`
      } catch (error) {
        console.error('Reconnection failed:', error)
        throw error
      }
    }

    while (retries < MAX_RETRIES) {
      try {
        // Ensure we're connected before executing
        if (!isConnected) {
          await reconnect()
        }

        const result = await next(params)
        return result
      } catch (error) {
        retries++
        console.error(`Database operation error (attempt ${retries}/${MAX_RETRIES}):`, error)
        
        // Handle various database errors
        if (error instanceof Error && (
          error.message.includes('prepared statement') || 
          (error as any)?.code === '42P05' ||
          error.message.includes('Connection pool closed') ||
          error.message.includes('Connection not established')
        )) {
          console.log('Handling database connection error...')
          
          // Always try to reconnect on these errors
          await reconnect()
          
          if (retries === MAX_RETRIES) {
            throw error
          }
          continue
        }
        
        throw error
      }
    }
  })

  return client
}

// Singleton pattern to maintain a single instance in production
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// In development, store the instance on the global object
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Enhanced cleanup function
const cleanup = async () => {
  try {
    // Try to clean up prepared statements before disconnecting
    await prisma.$executeRaw`DEALLOCATE ALL`
  } catch (e) {
    // Ignore cleanup errors
  }
  await prisma.$disconnect()
}

// Proper cleanup for different process termination scenarios
process.on('beforeExit', cleanup)
process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(0)
})

// Handle uncaught errors
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