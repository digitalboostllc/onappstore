import { PrismaClient } from "@prisma/client"
import fs from 'fs'
import path from 'path'
import { headers } from 'next/headers'

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

/**
 * Database Operation Logger
 * Tracks all database operations, errors, and performance metrics
 */
class DbLogger {
  private static logFile = process.env.NODE_ENV === 'production' 
    ? '/tmp/prisma-ops.log'  // Use /tmp in production (Vercel)
    : path.join(process.cwd(), 'prisma-ops.log')

  private static formatLogEntry(entry: any): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] ${JSON.stringify(entry)}\n`
  }

  private static async getRequestContext() {
    try {
      const headersList = await headers()
      return {
        path: headersList.get('x-invoke-path') || 'unknown',
        method: headersList.get('x-invoke-method') || 'unknown',
        host: headersList.get('host') || 'unknown',
        userAgent: headersList.get('user-agent') || 'unknown'
      }
    } catch (e) {
      return {
        path: 'unknown',
        method: 'unknown',
        host: 'unknown',
        userAgent: 'unknown'
      }
    }
  }

  static async log(type: 'info' | 'error' | 'warn', data: any) {
    const logEntry = {
      type,
      environment: process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || 'local',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'local',
      request: await this.getRequestContext(),
      ...data
    }

    // Always console log in development
    if (process.env.NODE_ENV !== 'production') {
      console[type](logEntry)
    }

    // Write to log file
    try {
      fs.appendFileSync(this.logFile, this.formatLogEntry(logEntry))
    } catch (e) {
      console.error('Failed to write to log file:', e)
    }
  }

  static async getRecentLogs(lines: number = 100): Promise<string[]> {
    try {
      if (!fs.existsSync(this.logFile)) return []
      const data = fs.readFileSync(this.logFile, 'utf8')
      return data.split('\n').filter(Boolean).slice(-lines)
    } catch (e) {
      console.error('Failed to read log file:', e)
      return []
    }
  }

  static async clearLogs(): Promise<boolean> {
    try {
      // Create backup before clearing
      if (fs.existsSync(this.logFile)) {
        const backupFile = `${this.logFile}.${Date.now()}.backup`
        fs.copyFileSync(this.logFile, backupFile)
        fs.writeFileSync(this.logFile, '') // Clear the file
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to clear logs:', e)
      return false
    }
  }

  static async rotateLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile)
        // Rotate if file is larger than 10MB
        if (stats.size > 10 * 1024 * 1024) {
          const backupFile = `${this.logFile}.${Date.now()}.backup`
          fs.renameSync(this.logFile, backupFile)
        }
      }
    } catch (e) {
      console.error('Failed to rotate logs:', e)
    }
  }
}

// Create Prisma client with minimal options
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    datasources: { db: { url: process.env.SUPABASE_POSTGRES_URL_NON_POOLING } },
  })

  // Track active connections and queries
  const state = {
    activeConnections: 0,
    totalQueries: 0,
    errors: 0
  }

  // Aggressive middleware for serverless environment
  client.$use(async (params, next) => {
    const queryId = Math.random().toString(36).substring(7)
    const start = Date.now()

    // Log query start
    DbLogger.log('info', {
      event: 'query_start',
      queryId,
      operation: params.action,
      model: params.model,
      args: params.args,
      activeConnections: ++state.activeConnections,
      totalQueries: ++state.totalQueries
    })

    try {
      // Execute with timeout
      const result = await Promise.race([
        next(params),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 9000))
      ])

      // Log successful query
      const duration = Date.now() - start
      DbLogger.log('info', {
        event: 'query_success',
        queryId,
        operation: params.action,
        model: params.model,
        duration: `${duration}ms`,
        activeConnections: state.activeConnections
      })

      // Log slow queries
      if (duration > 1000) {
        DbLogger.log('warn', {
          event: 'slow_query',
          queryId,
          operation: params.action,
          model: params.model,
          duration: `${duration}ms`,
          threshold: '1000ms'
        })
      }

      return result
    } catch (error) {
      // Log error details
      state.errors++
      DbLogger.log('error', {
        event: 'query_error',
        queryId,
        operation: params.action,
        model: params.model,
        duration: `${Date.now() - start}ms`,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : 'Unknown error',
        totalErrors: state.errors
      })

      // Always disconnect on error
      await client.$disconnect()
      
      throw error
    } finally {
      // Log cleanup attempt
      DbLogger.log('info', {
        event: 'cleanup_start',
        queryId,
        operation: params.action
      })

      // Aggressive cleanup after each query
      try {
        await client.$executeRaw`DEALLOCATE ALL`
      } catch (e) {
        DbLogger.log('warn', {
          event: 'cleanup_error',
          queryId,
          error: e instanceof Error ? e.message : 'Unknown error',
          phase: 'deallocate'
        })
      }
      
      // Force disconnect after each query
      try {
        await client.$disconnect()
        state.activeConnections--
        DbLogger.log('info', {
          event: 'cleanup_success',
          queryId,
          activeConnections: state.activeConnections
        })
      } catch (e) {
        DbLogger.log('warn', {
          event: 'cleanup_error',
          queryId,
          error: e instanceof Error ? e.message : 'Unknown error',
          phase: 'disconnect'
        })
      }

      // Rotate logs if needed
      await DbLogger.rotateLogs()
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

// Export logger for external use
export const dbLogger = DbLogger

// Minimal cleanup function with logging
const cleanup = async () => {
  try {
    await prisma.$disconnect()
    DbLogger.log('info', {
      event: 'global_cleanup',
      status: 'success'
    })
  } catch (e) {
    DbLogger.log('error', {
      event: 'global_cleanup',
      status: 'error',
      error: e instanceof Error ? e.message : 'Unknown error'
    })
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

// Error handlers with logging
process.on('uncaughtException', async (error) => {
  DbLogger.log('error', {
    event: 'uncaught_exception',
    error: error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : 'Unknown error'
  })
  await cleanup()
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

process.on('unhandledRejection', async (error) => {
  DbLogger.log('error', {
    event: 'unhandled_rejection',
    error: error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : 'Unknown error'
  })
  await cleanup()
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

export default prisma 