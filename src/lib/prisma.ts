import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.SUPABASE_POSTGRES_PRISMA_URL + "?pgbouncer=true&connection_limit=1&pool_timeout=0&connect_timeout=300"
      },
    }
  })
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.SUPABASE_POSTGRES_PRISMA_URL + "?pgbouncer=true&connection_limit=1&pool_timeout=0&connect_timeout=300"
        },
      }
    })
  }
  prisma = (global as any).prisma
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
} 