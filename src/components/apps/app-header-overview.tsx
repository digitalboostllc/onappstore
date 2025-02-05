"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCurrentUser } from "@/hooks/use-current-user"
import { cleanUrl, cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Pencil, Save, X, Upload, Loader2, ShieldCheck, ChevronRight, FolderIcon, Hash } from "lucide-react"
import type { AppWithDetails } from "@/lib/services/app-service"
import { Card, CardContent } from "@/components/ui/card"
import { CategorySelect } from "./category-select"
import { TagInput } from "./tag-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { AppScreenshots } from "./app-screenshots"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Heading from '@tiptap/extension-heading'
import TiptapLink from '@tiptap/extension-link'
import CodeBlock from '@tiptap/extension-code-block'
import { Toggle } from "@/components/ui/toggle"
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon,
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Code,
  Sparkles,
} from "lucide-react"
import { CategoryWithStats } from "@/lib/categories"
import React from "react"

interface AppHeaderOverviewProps {
  app: AppWithDetails
  categories: CategoryWithStats[]
  onUpdate?: (updatedApp: AppWithDetails) => void
}

export function AppHeaderOverview({ app: initialApp, categories, onUpdate }: AppHeaderOverviewProps) {
  const user = useCurrentUser()
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [app, setApp] = useState(initialApp)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(app.name)
  const [categoryId, setCategoryId] = useState(app.categoryId || "")
  const [subcategoryId, setSubcategoryId] = useState(app.subcategoryId || "")
  const [tags, setTags] = useState(app.tags || [])
  const [companyName, setCompanyName] = useState(app.developer?.companyName || "")
  const [verified, setVerified] = useState(app.developer?.verified || false)
  const [shortDescription, setShortDescription] = useState(app.shortDescription || "")

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        heading: false,
      }),
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TiptapLink.configure({
        openOnClick: false,
      }),
      CodeBlock,
    ],
    content: app.fullContent || app.description || "",
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[200px] p-4',
      },
    },
  })

  // Update editor content when app changes
  useEffect(() => {
    if (editor && (app.fullContent || app.description)) {
      editor.commands.setContent(app.fullContent || app.description || "")
    }
  }, [editor, app.fullContent, app.description])

  const handleSave = async () => {
    if (!name) return
    
    setIsSaving(true)
    try {
      const content = editor?.getHTML() || ""
      
      const response = await fetch(`/api/admin/apps/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          tags,
          shortDescription,
          fullContent: content,
          description: content,
          developer: {
            companyName,
            verified
          }
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to update app')
      }

      const updatedApp = await response.json()
      setApp(updatedApp)
      setName(updatedApp.name)
      setCategoryId(updatedApp.categoryId || "")
      setSubcategoryId(updatedApp.subcategoryId || "")
      setTags(updatedApp.tags || [])
      setCompanyName(updatedApp.developer?.companyName || "")
      setVerified(updatedApp.developer?.verified || false)
      setShortDescription(updatedApp.shortDescription || "")
      
      if (editor) {
        editor.commands.setContent(updatedApp.fullContent || updatedApp.description || "")
      }
      
      if (onUpdate) {
        onUpdate(updatedApp)
      }

      toast({
        title: "Success",
        description: "App updated successfully",
      })

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating app:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update app. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setName(app.name)
    setCategoryId(app.categoryId || "")
    setSubcategoryId(app.subcategoryId || "")
    setTags(app.tags || [])
    setCompanyName(app.developer?.companyName || "")
    setVerified(app.developer?.verified || false)
    setShortDescription(app.shortDescription || "")
    setIsEditing(false)
  }

  const handleContentSave = async () => {
    if (!editor) return
    
    const content = editor.getHTML()
    console.log("Saving content:", content)
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/apps/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullContent: content,
          description: content,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update content')
      }

      const updatedApp = await response.json()
      setApp(updatedApp)
      
      if (onUpdate) {
        onUpdate(updatedApp)
      }

      toast({
        title: "Success",
        description: "Content updated successfully",
      })
      
      setIsEditingContent(false)
    } catch (error) {
      console.error("Error updating content:", error)
      toast({
        title: "Error",
        description: "Failed to update content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const setLink = () => {
    if (!editor) return

    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }

    const url = window.prompt('URL')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const enhanceWithAI = async () => {
    if (!editor) return
    
    // Get selected text or full content if nothing is selected
    const selectedText = editor.state.selection.empty 
      ? editor.getHTML()
      : editor.state.doc.cut(
          editor.state.selection.from,
          editor.state.selection.to
        ).textContent
    
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/ai/enhance-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to enhance content')
      }

      const { enhancedContent } = await response.json()
      
      // If there's a selection, replace only the selected content
      if (!editor.state.selection.empty) {
        editor.chain()
          .focus()
          .deleteSelection()
          .insertContent(enhancedContent)
          .run()
      } else {
        // If no selection, replace entire content
        editor.commands.setContent(enhancedContent)
      }
      
      toast({
        title: "Success",
        description: "Content enhanced with AI",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enhance content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/apps" className="hover:text-foreground">
          Apps
        </Link>
        <ChevronRight className="h-4 w-4" />
        {app.category && (
          <>
            <Link 
              href={`/categories?category=${app.category.id}`} 
              className="hover:text-foreground"
            >
              {app.category.name}
            </Link>
            {app.subcategory && (
              <>
                <ChevronRight className="h-4 w-4" />
                <Link 
                  href={`/categories?category=${app.category.id}&subcategory=${app.subcategory.id}`} 
                  className="hover:text-foreground"
                >
                  {app.subcategory.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-foreground">{app.name}</span>
      </div>

      <Card>
        <CardContent className="p-6 space-y-8">
          {/* App Header Section */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border bg-muted">
              {app.icon ? (
                <Image
                  src={app.icon}
                  alt={app.name}
                  className="object-cover"
                  fill
                  sizes="128px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>App Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <CategorySelect
                        categoryId={categoryId}
                        subcategoryId={subcategoryId}
                        onCategoryChange={setCategoryId}
                        onSubcategoryChange={setSubcategoryId}
                        categories={categories}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategory</Label>
                      <CategorySelect
                        categoryId={categoryId}
                        subcategoryId={subcategoryId}
                        onCategoryChange={() => {}}
                        onSubcategoryChange={setSubcategoryId}
                        categories={categories}
                        isSubcategorySelect
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Input
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      disabled={isSaving}
                      placeholder="Brief description of the app"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <TagInput
                      value={tags}
                      onChange={setTags}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Developer Company Name</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified"
                      checked={verified}
                      onCheckedChange={(checked) => setVerified(checked as boolean)}
                      disabled={isSaving}
                    />
                    <Label htmlFor="verified">Verified Developer</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">
                          {app.name}
                        </h1>
                        {app.versions?.[0]?.version && (
                          <span className="text-base font-medium text-muted-foreground">
                            v{app.versions[0].version}
                          </span>
                        )}
                      </div>
                      {app.developer?.companyName && (
                        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                          <span>{app.developer.companyName}</span>
                          {app.developer.verified && (
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      )}
                      {app.category && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1.5">
                            <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <Link 
                              href={`/categories?category=${app.category.id}`} 
                              className="hover:text-foreground"
                            >
                              {app.category.name}
                            </Link>
                            {app.subcategory && (
                              <>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <Link 
                                  href={`/categories?category=${app.category.id}&subcategory=${app.subcategory.id}`} 
                                  className="hover:text-foreground"
                                >
                                  {app.subcategory.name}
                                </Link>
                              </>
                            )}
                          </Badge>
                          {app.tags && app.tags.length > 0 && app.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1.5">
                              <Hash className="h-3 w-3" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {user?.isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {app.shortDescription && (
                    <p className="mt-2 text-muted-foreground">
                      {app.shortDescription}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Full Content Section */}
          {(app.fullContent || app.description) && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight">About {app.name}</h2>
                {user?.isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsEditingContent(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isEditingContent ? (
                <div className="border rounded-lg mb-4">
                  <div className="flex flex-wrap items-center gap-1 p-1 border-b">
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('bold')}
                      onPressedChange={() => editor?.chain().focus().toggleBold().run()}
                    >
                      <BoldIcon className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('italic')}
                      onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
                    >
                      <ItalicIcon className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('underline')}
                      onPressedChange={() => editor?.chain().focus().toggleUnderline().run()}
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </Toggle>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('bulletList')}
                      onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
                    >
                      <List className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('orderedList')}
                      onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Toggle>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('heading', { level: 1 })}
                      onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    >
                      <Heading1 className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('heading', { level: 2 })}
                      onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                      <Heading2 className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('heading', { level: 3 })}
                      onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    >
                      <Heading3 className="h-4 w-4" />
                    </Toggle>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('link')}
                      onPressedChange={setLink}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={editor?.isActive('codeBlock')}
                      onPressedChange={() => editor?.chain().focus().toggleCodeBlock().run()}
                    >
                      <Code className="h-4 w-4" />
                    </Toggle>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={enhanceWithAI}
                      disabled={isSaving}
                      className="gap-1.5"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isSaving ? 'Enhancing...' : 'Enhance with AI'}
                    </Button>
                  </div>
                  <EditorContent editor={editor} className="min-h-[200px]" />
                  <div className="flex justify-end gap-2 p-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingContent(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleContentSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>ul]:mb-4 [&>ol]:mb-4"
                  dangerouslySetInnerHTML={{ 
                    __html: app.fullContent || app.description || ""
                  }} 
                />
              )}
            </div>
          )}

          {/* Changelog Section */}
          {app.versions?.[0] && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                What's New in version {app.versions[0].version}
              </h2>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {app.versions[0].changelog ? (
                  <div dangerouslySetInnerHTML={{ __html: app.versions[0].changelog }} />
                ) : (
                  <p className="text-sm text-muted-foreground">No release notes available for this version.</p>
                )}
              </div>
            </div>
          )}

          {/* Screenshots Section */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Screenshots</h2>
              <AppScreenshots app={app} onUpdate={onUpdate} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 