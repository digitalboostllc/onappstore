import { PrismaClient } from '@prisma/client'
import { processImportJob } from './queue'
import { AppData } from './scraper'

declare const jest: typeof import('@jest/globals').jest
declare const describe: typeof import('@jest/globals').describe
declare const it: typeof import('@jest/globals').it
declare const expect: typeof import('@jest/globals').expect
declare const beforeEach: typeof import('@jest/globals').beforeEach

// Mock the external dependencies
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      upsert: jest.fn(),
    },
    developer: {
      upsert: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    vendor: {
      upsert: jest.fn(),
    },
    app: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    job: {
      update: jest.fn(),
    },
  }
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  }
})

// Mock the scraper function
jest.mock('./scraper', () => ({
  scrapeMacUpdate: jest.fn(),
}))

describe('processImportJob', () => {
  let prisma: any
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    prisma = new PrismaClient()
    
    // Setup default successful responses
    prisma.user.upsert.mockResolvedValue({ id: 'system' })
    prisma.developer.upsert.mockResolvedValue({ id: 'system' })
    prisma.job.update.mockResolvedValue({})
  })

  it('should correctly process parent and child categories', async () => {
    // Mock app data with parent and child categories
    const mockApps: AppData[] = [{
      name: 'Test App',
      description: 'Test Description',
      fullContent: 'Full content',
      category: {
        name: 'File Management',
        parentName: 'System Utilities',
        macUpdateId: '17',
        subcategoryMacUpdateId: '268'
      },
      website: 'https://test.com',
      icon: 'icon.png',
      screenshots: ['screen1.png'],
      version: '1.0',
      requirements: 'macOS 10.15',
    }]

    // Mock the scraper to return our test apps
    require('./scraper').scrapeMacUpdate.mockResolvedValue(mockApps)

    // Mock finding the parent category
    prisma.category.findFirst
      .mockResolvedValueOnce({ // First call for parent category
        id: 'parent-id',
        name: 'System Utilities',
        children: [{
          id: 'sub-id',
          name: 'File Management',
          parentId: 'parent-id'
        }],
        parent: null,
        macUpdateId: '17'
      })
      .mockResolvedValueOnce({ // Second call for subcategory
        id: 'sub-id',
        name: 'File Management',
        parent: {
          id: 'parent-id',
          name: 'System Utilities'
        },
        macUpdateId: '268'
      })

    // Mock app creation
    prisma.app.findFirst.mockResolvedValue(null)
    prisma.app.create.mockResolvedValue({
      id: 'new-app-id',
      name: 'Test App',
      categoryId: 'parent-id',
      subcategoryId: 'sub-id'
    })

    // Run the import
    await processImportJob('test-job-id', 1)

    // Verify category lookups
    expect(prisma.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { macUpdateId: '17' },
            { macUpdateId: '268' }
          ]
        },
        include: {
          parent: true,
          children: true
        }
      })
    )

    // Verify app creation with correct category IDs
    expect(prisma.app.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test App',
          categoryId: 'parent-id',
          subcategoryId: 'sub-id',
          developerId: 'system',
          description: 'Test Description',
          fullContent: 'Full content',
          website: 'https://test.com',
          icon: 'icon.png',
          published: false,
          screenshots: ['screen1.png'],
          requirements: 'macOS 10.15',
          versions: {
            create: {
              version: '1.0',
              changelog: '',
              minOsVersion: 'macOS 10.15',
              fileUrl: '',
              fileSize: BigInt(0),
              sha256Hash: '',
            }
          }
        })
      })
    )
  })

  it('should handle missing categories gracefully', async () => {
    // Mock app data with missing category info
    const mockApps: AppData[] = [{
      name: 'Test App',
      description: 'Test Description',
      fullContent: 'Full content',
      category: {
        name: 'Unknown Category',
        parentName: null,
        macUpdateId: null,
        subcategoryMacUpdateId: null
      },
      website: 'https://test.com',
      icon: 'icon.png',
      screenshots: ['screen1.png'],
      version: '1.0',
      requirements: 'macOS 10.15',
    }]

    require('./scraper').scrapeMacUpdate.mockResolvedValue(mockApps)
    
    // Mock category creation for unknown category
    prisma.category.findFirst.mockResolvedValue(null)
    prisma.category.create.mockResolvedValue({
      id: 'new-category-id',
      name: 'Unknown Category'
    })

    // Mock app creation
    prisma.app.findFirst.mockResolvedValue(null)
    prisma.app.create.mockResolvedValue({
      id: 'new-app-id',
      name: 'Test App'
    })

    // Run the import
    await processImportJob('test-job-id', 1)

    // Verify standalone category creation
    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Unknown Category',
          macUpdateId: null
        })
      })
    )

    // Verify app creation with standalone category
    expect(prisma.app.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test App',
          categoryId: 'new-category-id',
          subcategoryId: null,
          developerId: 'system'
        })
      })
    )
  })

  it('should skip duplicate apps', async () => {
    // Mock app data
    const mockApps: AppData[] = [{
      name: 'Existing App',
      description: 'Test Description',
      fullContent: 'Full content',
      category: {
        name: 'Test Category',
        parentName: null,
        macUpdateId: '123',
        subcategoryMacUpdateId: null
      },
      website: 'https://test.com',
      icon: 'icon.png',
      screenshots: ['screen1.png'],
      version: '1.0',
      requirements: 'macOS 10.15',
    }]

    require('./scraper').scrapeMacUpdate.mockResolvedValue(mockApps)

    // Mock finding existing app
    prisma.app.findFirst.mockResolvedValue({
      id: 'existing-app-id',
      name: 'Existing App'
    })

    // Run the import
    await processImportJob('test-job-id', 1)

    // Verify app creation was not called
    expect(prisma.app.create).not.toHaveBeenCalled()
  })

  it('should handle invalid app data', async () => {
    // Mock invalid app data
    const mockApps: AppData[] = [{
      name: '', // Invalid - empty name
      description: 'Test Description',
      fullContent: 'Full content',
      category: {
        name: 'Test Category',
        parentName: null,
        macUpdateId: '123',
        subcategoryMacUpdateId: null
      },
      website: 'https://test.com',
      icon: 'icon.png',
      screenshots: ['screen1.png'],
      version: '1.0',
      requirements: 'macOS 10.15',
    }]

    require('./scraper').scrapeMacUpdate.mockResolvedValue(mockApps)

    // Run the import
    await processImportJob('test-job-id', 1)

    // Verify no app creation was attempted
    expect(prisma.app.create).not.toHaveBeenCalled()
  })
}) 
