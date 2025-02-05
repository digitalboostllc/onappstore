"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/file-upload"
import { CategorySelect } from "@/components/apps/category-select"
import { CategoryWithStats } from "@/lib/categories"

const appFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().min(1, "Subcategory is required"),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tags: z.string().transform((str) => str.split(",").map((s) => s.trim())),
  icon: z.instanceof(File, { message: "App icon is required" }),
  screenshots: z.array(z.instanceof(File)).min(1, "At least one screenshot is required"),
  file: z.instanceof(File, { message: "App file is required" }),
})

type AppFormValues = z.infer<typeof appFormSchema>

interface AppFormProps {
  categories: CategoryWithStats[]
}

export function AppForm({ categories }: AppFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<AppFormValues>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      tags: [],
      icon: undefined,
      screenshots: [],
      file: undefined,
    },
  })

  async function onSubmit(data: AppFormValues) {
    try {
      setIsLoading(true)

      // Upload icon
      const iconFormData = new FormData()
      iconFormData.append("file", data.icon)
      const iconResponse = await fetch("/api/upload/icon", {
        method: "POST",
        body: iconFormData,
      })
      if (!iconResponse.ok) throw new Error("Failed to upload icon")
      const { url: iconUrl } = await iconResponse.json()

      // Upload screenshots
      const screenshotUrls = await Promise.all(
        data.screenshots.map(async (screenshot) => {
          const formData = new FormData()
          formData.append("file", screenshot)
          const response = await fetch("/api/upload/screenshot", {
            method: "POST",
            body: formData,
          })
          if (!response.ok) throw new Error("Failed to upload screenshot")
          const { url } = await response.json()
          return url
        })
      )

      // Upload app file
      const appFormData = new FormData()
      appFormData.append("file", data.file)
      const appResponse = await fetch("/api/upload/app", {
        method: "POST",
        body: appFormData,
      })
      if (!appResponse.ok) throw new Error("Failed to upload app")
      const { url: appUrl } = await appResponse.json()

      // Submit app data
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          icon: iconUrl,
          screenshots: screenshotUrls,
          file: appUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit app")
      }

      const app = await response.json()

      toast({
        title: "Success",
        description: "Your app has been submitted for review.",
      })

      router.push(`/apps/${app.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit app. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="p-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your app name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your app..."
                      {...field}
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <CategorySelect
                        categoryId={field.value}
                        subcategoryId={form.getValues().subcategoryId}
                        onCategoryChange={field.onChange}
                        onSubcategoryChange={(value) => form.setValue("subcategoryId", value)}
                        categories={categories}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subcategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <FormControl>
                      <CategorySelect
                        categoryId={form.getValues().categoryId}
                        subcategoryId={field.value}
                        onCategoryChange={(value) => form.setValue("categoryId", value)}
                        onSubcategoryChange={field.onChange}
                        categories={categories}
                        isSubcategorySelect
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter tags separated by commas"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Example: utility, productivity, tools
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Icon</FormLabel>
                  <FormControl>
                    <FileUpload
                      accept={[".png", ".jpg", ".jpeg"]}
                      maxSize={2 * 1024 * 1024} // 2MB
                      onUpload={(files) => field.onChange(files[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a square icon (512x512px recommended)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="screenshots"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Screenshots</FormLabel>
                  <FormControl>
                    <FileUpload
                      accept={[".png", ".jpg", ".jpeg"]}
                      maxSize={5 * 1024 * 1024} // 5MB
                      maxFiles={5}
                      onUpload={(files) => field.onChange(files)}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload at least one screenshot of your app
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App File</FormLabel>
                  <FormControl>
                    <FileUpload
                      accept={[".app", ".dmg", ".zip"]}
                      maxSize={500 * 1024 * 1024} // 500MB
                      onUpload={(files) => field.onChange(files[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload your app (.app, .dmg, or .zip)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit App"}
          </Button>
        </div>
      </form>
    </Form>
  )
} 