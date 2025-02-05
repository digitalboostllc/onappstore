"use client"

import { CategoryWithStats } from "@/lib/categories"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { CategoryForm } from "@/components/admin/category-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { handleCreateCategory, handleUpdateCategory, handleDeleteCategory } from "./actions"
import { toast } from "sonner"
import { useState } from "react"
import { SyncCategories } from "./components/sync-categories"
import { Separator } from "@/components/ui/separator"

function TruncatedDescription({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const maxLength = 100 // Adjust this value to change the truncation length

  if (!description) return null
  if (description.length <= maxLength) return <CardDescription className="mt-1">{description}</CardDescription>

  return (
    <CardDescription className="mt-1">
      {isExpanded ? description : `${description.slice(0, maxLength)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-1 text-primary hover:underline focus:outline-none"
      >
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>
    </CardDescription>
  )
}

export default function AdminCategoriesPage({ 
  categories: initialCategories 
}: { 
  categories: CategoryWithStats[] 
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editStates, setEditStates] = useState<Record<string, boolean>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // Group categories by parent
  const mainCategories = categories.filter(cat => !cat.parentId)

  const categoryFormData = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    parentId: cat.parentId || undefined,
    iconName: cat.icon || undefined,
    description: cat.description || undefined
  }))

  const handleDelete = async (categoryId: string) => {
    try {
      setIsDeleting(categoryId)
      const result = await handleDeleteCategory(categoryId)
      
      if (result.success) {
        setCategories(prev => prev.filter(cat => 
          cat.id !== categoryId && cat.parentId !== categoryId
        ))
        toast.success("Category deleted")
      } else {
        toast.error(result.error || "Failed to delete category")
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleEditDialog = (categoryId: string, isOpen: boolean) => {
    setEditStates(prev => ({
      ...prev,
      [categoryId]: isOpen
    }))
  }

  const getIconComponent = (iconName?: string | null) => {
    if (!iconName) return null
    const Icon = (LucideIcons as any)[iconName]
    return Icon ? <Icon className="w-5 h-5" /> : null
  }

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader>
          <PageHeader.Title>Categories</PageHeader.Title>
          <PageHeader.Description>
            Manage app categories and their hierarchy
          </PageHeader.Description>
        </PageHeader>

        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Category</DialogTitle>
                <DialogDescription>
                  Add a new category for organizing apps.
                </DialogDescription>
              </DialogHeader>
              <CategoryForm 
                categories={categoryFormData.filter(c => !c.parentId)} 
                onSubmit={async (values) => {
                  const result = await handleCreateCategory(values)
                  if (result.success) {
                    setCategories(prev => [...prev, {
                      id: 'temp-id',
                      name: values.name,
                      parentId: values.parentId || null,
                      icon: values.iconName || null,
                      description: values.description || null,
                      appCount: 0,
                      subcategories: []
                    }])
                  }
                  return result
                }}
                onSuccess={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SyncCategories />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mainCategories.map(category => {
          const subcategories = categories.filter(cat => cat.parentId === category.id)
          const isExpanded = expandedCategories[category.id] ?? false // Default to collapsed instead of true

          return (
            <Card key={category.id} className="relative">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl bg-background text-primary shadow-sm")}>
                      {getIconComponent(category.icon) || <LucideIcons.LayoutGrid className="w-5 h-5" />}
                    </div>
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">
                        {category.appCount} {category.appCount === 1 ? 'app' : 'apps'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editStates[category.id]} onOpenChange={(isOpen) => toggleEditDialog(category.id, isOpen)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Category</DialogTitle>
                          <DialogDescription>
                            Update the category details.
                          </DialogDescription>
                        </DialogHeader>
                        <CategoryForm 
                          categories={categoryFormData.filter(c => !c.parentId && c.id !== category.id)} 
                          initialData={{
                            name: category.name,
                            parentId: category.parentId || undefined,
                            iconName: category.icon || undefined,
                            description: category.description || undefined
                          }}
                          onSubmit={async (values) => {
                            const result = await handleUpdateCategory(category.id, values)
                            if (result.success) {
                              setCategories(prev => prev.map(cat => {
                                if (cat.id === category.id) {
                                  return {
                                    ...cat,
                                    name: values.name,
                                    parentId: values.parentId || null,
                                    icon: values.iconName || null,
                                    description: values.description || null
                                  }
                                }
                                return cat
                              }))
                            }
                            return result
                          }}
                          onSuccess={() => toggleEditDialog(category.id, false)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => handleDelete(category.id)}
                      disabled={isDeleting === category.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {subcategories.length > 0 && (
                <>
                  <Separator className="my-0" />
                  <CardContent className="pt-4">
                    <div 
                      className="flex items-center justify-between mb-3 cursor-pointer group"
                      onClick={() => toggleExpanded(category.id)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                        )}
                        <div className="text-xs font-medium text-muted-foreground">
                          SUBCATEGORIES ({subcategories.length})
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="space-y-3">
                        {subcategories.map((subcategory, index) => (
                          <div key={subcategory.id}>
                            <div className="flex items-center justify-between group hover:bg-muted/50 p-2 rounded-lg transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-background border shadow-sm">
                                  {getIconComponent(subcategory.icon) || <LucideIcons.LayoutGrid className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {subcategory.name}
                                    <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {subcategory.appCount} {subcategory.appCount === 1 ? 'app' : 'apps'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Dialog open={editStates[subcategory.id]} onOpenChange={(isOpen) => toggleEditDialog(subcategory.id, isOpen)}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Subcategory</DialogTitle>
                                      <DialogDescription>
                                        Update the subcategory details.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <CategoryForm 
                                      categories={categoryFormData.filter(c => !c.parentId && c.id !== subcategory.id)} 
                                      initialData={{
                                        name: subcategory.name,
                                        parentId: subcategory.parentId || undefined,
                                        iconName: subcategory.icon || undefined,
                                        description: subcategory.description || undefined
                                      }}
                                      onSubmit={async (values) => {
                                        const result = await handleUpdateCategory(subcategory.id, values)
                                        if (result.success) {
                                          setCategories(prev => prev.map(cat => {
                                            if (cat.id === subcategory.id) {
                                              return {
                                                ...cat,
                                                name: values.name,
                                                parentId: values.parentId || null,
                                                icon: values.iconName || null,
                                                description: values.description || null
                                              }
                                            }
                                            return cat
                                          }))
                                        }
                                        return result
                                      }}
                                      onSuccess={() => toggleEditDialog(subcategory.id, false)}
                                    />
                                  </DialogContent>
                                </Dialog>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 px-2"
                                  onClick={() => handleDelete(subcategory.id)}
                                  disabled={isDeleting === subcategory.id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
} 