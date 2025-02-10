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
    }
  })

  // Middleware for handling database operations and errors
  client.$use(async (params, next) => {
    // Implement retry mechanism for handling transient errors
    const MAX_RETRIES = 3
    let retries = 0

    while (retries < MAX_RETRIES) {
      try {
        const result = await next(params)
        return result
      } catch (error) {
        retries++
        console.error(`Database operation error (attempt ${retries}/${MAX_RETRIES}):`, error)
        
        // Handle the "prepared statement already exists" error (42P05)
        // This occurs when PostgreSQL's session-level prepared statements conflict
        if (error instanceof Error && 
            (error.message.includes('prepared statement') || 
             (error as any)?.code === '42P05')) {
          console.log('Handling prepared statement error...')
          
          try {
            // Force disconnect to clear all prepared statements from the session
            await client.$disconnect()
            
            // Add delay to ensure connection is fully closed
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Establish fresh connection
            await client.$connect()
            
            // If we've exhausted all retries, give up and throw
            if (retries === MAX_RETRIES) {
              throw error
            }
            
            // Otherwise, try the operation again
            continue
          } catch (reconnectError) {
            console.error('Error during reconnection:', reconnectError)
            throw error
          }
        }
        
        // For non-prepared statement errors, throw immediately
        throw error
      }
    }
  })

  return client
}

// Singleton pattern to maintain a single instance in production
// This helps prevent connection leaks in serverless environments
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// In development, store the instance on the global object
// This prevents hot-reload from creating multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Centralized cleanup function for consistent connection handling
const cleanup = async () => {
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

// Handle uncaught errors to prevent connection leaks
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