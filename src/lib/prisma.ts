import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  })
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export { prisma }

if (process.env.NODE_ENV === 'production') {
  prisma.$connect()
    .then(() => {
      console.log('Successfully connected to database')
    })
    .catch((error: Error) => {
      console.error('Error connecting to database:', error)
    })

  const cleanup = async () => {
    try {
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  // Handle cleanup
  process.on('beforeExit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
} 