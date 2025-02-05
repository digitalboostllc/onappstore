const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedFilterOptions() {
  // Clear existing filter options
  await prisma.filterOption.deleteMany()

  // Seed sort options
  const sortOptions = [
    { label: "Popular", value: "popular", order: 1, isDefault: true },
    { label: "Recent", value: "recent", order: 2, isDefault: false },
    { label: "Downloads", value: "downloads", order: 3, isDefault: false },
    { label: "Rating", value: "rating", order: 4, isDefault: false }
  ]

  for (const option of sortOptions) {
    await prisma.filterOption.create({
      data: {
        type: "sort",
        ...option,
        isEnabled: true
      },
    })
  }

  // Seed price options
  const priceOptions = [
    { label: "All", value: "all", order: 1, isDefault: true },
    { label: "Free", value: "free", order: 2, isDefault: false },
    { label: "Paid", value: "paid", order: 3, isDefault: false },
  ]

  for (const option of priceOptions) {
    await prisma.filterOption.create({
      data: {
        type: "price",
        ...option,
        isEnabled: true
      },
    })
  }

  // Seed time options
  const timeOptions = [
    { label: "All Time", value: "all", order: 1, isDefault: true },
    { label: "Today", value: "today", order: 2, isDefault: false },
    { label: "This Week", value: "week", order: 3, isDefault: false },
    { label: "This Month", value: "month", order: 4, isDefault: false },
    { label: "This Year", value: "year", order: 5, isDefault: false }
  ]

  for (const option of timeOptions) {
    await prisma.filterOption.create({
      data: {
        type: "time",
        ...option,
        isEnabled: true
      },
    })
  }

  // Seed rating options
  const ratingOptions = [
    { label: "All", value: "all", order: 1, isDefault: true },
    { label: "& up", value: "5", stars: 5, order: 2, isDefault: false },
    { label: "& up", value: "4", stars: 4, order: 3, isDefault: false },
    { label: "& up", value: "3", stars: 3, order: 4, isDefault: false },
    { label: "& up", value: "2", stars: 2, order: 5, isDefault: false },
    { label: "& up", value: "1", stars: 1, order: 6, isDefault: false }
  ]

  for (const option of ratingOptions) {
    await prisma.filterOption.create({
      data: {
        type: "rating",
        ...option,
        isEnabled: true
      },
    })
  }

  console.log('Filter options seeded successfully')
}

async function main() {
  try {
    await seedFilterOptions()
  } catch (error) {
    console.error('Error seeding data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main() 