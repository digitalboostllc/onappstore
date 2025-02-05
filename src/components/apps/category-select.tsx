"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { FolderIcon } from "lucide-react"
import type { CategoryWithStats } from "@/lib/categories"

interface CategorySelectProps {
  categoryId: string
  subcategoryId: string
  onCategoryChange: (value: string) => void
  onSubcategoryChange: (value: string) => void
  categories: CategoryWithStats[]
  isSubcategorySelect?: boolean
}

export function CategorySelect({ 
  categoryId, 
  subcategoryId,
  onCategoryChange, 
  onSubcategoryChange,
  categories,
  isSubcategorySelect = false
}: CategorySelectProps) {
  // Group categories by parent
  const mainCategories = categories.filter(cat => !cat.parentId)
  const subcategories = categories.filter(cat => cat.parentId === categoryId)

  // For subcategory select, always show "none" when no category is selected
  if (isSubcategorySelect) {
    const currentValue = !categoryId ? "none" : (subcategoryId || "none")
    const selectedCategory = categories.find(cat => cat.id === categoryId)
    
    return (
      <Select 
        value={currentValue}
        onValueChange={(value) => onSubcategoryChange(value === "none" ? "" : value)}
        disabled={!categoryId}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a subcategory..." />
        </SelectTrigger>
        <SelectContent>
          {selectedCategory ? (
            <>
              <SelectGroup key={selectedCategory.id}>
                <SelectLabel className="px-2 py-1.5 text-sm font-semibold">
                  {selectedCategory.name} Subcategories
                </SelectLabel>
                <SelectSeparator />
                <SelectItem value="none" className="text-muted-foreground">
                  None ({selectedCategory.name} - All)
                </SelectItem>
                {subcategories.map((subcategory) => (
                  <SelectItem 
                    key={subcategory.id} 
                    value={subcategory.id}
                    className="flex items-center gap-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>{subcategory.name}</span>
                      <span className="text-muted-foreground">
                        ({subcategory.appCount})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          ) : (
            <SelectItem value="none" className="text-muted-foreground">
              Select a category first
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Select 
      value={categoryId || "none"} 
      onValueChange={(value) => {
        const newValue = value === "none" ? "" : value
        onCategoryChange(newValue)
        // Always clear subcategory when parent category changes
        onSubcategoryChange("")
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a category..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup key="main-categories">
          <SelectLabel className="px-2 py-1.5 text-sm font-semibold">
            Main Categories
          </SelectLabel>
          <SelectSeparator />
          <SelectItem value="none" className="text-muted-foreground">
            None
          </SelectItem>
          {mainCategories.map((category) => (
            <SelectItem 
              key={category.id} 
              value={category.id}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <FolderIcon className="h-4 w-4 text-muted-foreground" />
                <span>{category.name}</span>
                <span className="text-muted-foreground">
                  ({category.appCount})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
} 