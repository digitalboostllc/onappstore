import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.SUPABASE_POSTGRES_PRISMA_URL
      }
    }
  })

  // Clean up prepared statements and reset the connection after each query
  client.$use(async (params, next) => {
    const result = await next(params)
    await client.$queryRaw`DEALLOCATE ALL`
    return result
  })

  return client
}

// Check if we're in a production environment
if (process.env.NODE_ENV === 'production') {
  // In production, create a new instance each time
  delete globalForPrisma.prisma
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// Cleanup connections
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Handle cleanup on unhandled errors
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error)
  await prisma.$disconnect()
  process.exit(1)
})

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled Rejection:', error)
  await prisma.$disconnect()
  process.exit(1)
})

export default prisma 