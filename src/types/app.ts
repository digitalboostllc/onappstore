import { Category } from "@prisma/client"

export interface App {
  id: string
  name: string
  description: string
  icon: string | null
  screenshots: string[]
  category: Category
  tags: string[]
  website: string | null
  createdAt: Date
  updatedAt: Date
  published: boolean
  developerId: string
  developer: {
    id: string
    companyName: string | null
    verified: boolean
    user: {
      name: string | null
      image: string | null
    }
  }
  versions: {
    id: string
    version: string
    changelog: string | null
    createdAt: Date
    fileUrl: string
    fileSize: bigint
    sha256Hash: string
    minOsVersion: string
    downloads: {
      id: string
    }[]
  }[]
  reviews: {
    id: string
    rating: number
    comment: string
    createdAt: Date
    user: {
      name: string | null
      image: string | null
    }
  }[]
  _count: {
    reviews: number
    favorites: number
  }
} 