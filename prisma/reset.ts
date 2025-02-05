import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Cleaning up database...')
  
  // Delete all data in reverse order of dependencies
  await prisma.comment.deleteMany()
  await prisma.rating.deleteMany()
  await prisma.download.deleteMany()
  await prisma.favorite.deleteMany()
  await prisma.version.deleteMany()
  await prisma.app.deleteMany()
  await prisma.developer.deleteMany()
  await prisma.user.deleteMany()
  await prisma.siteSettings.deleteMany()

  console.log('✨ Database cleaned successfully!')
}

main()
  .catch((e) => {
    console.error('Error cleaning database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 