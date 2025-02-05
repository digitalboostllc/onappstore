"use client"

import * as React from "react"
import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { updateStorageSettings } from "@/app/admin/settings/actions"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

const storageSettingsSchema = z.object({
  storageProvider: z.enum(["local", "s3", "cloudinary"]),
  maxFileSize: z.coerce.number().min(1),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
})

type StorageSettingsValues = z.infer<typeof storageSettingsSchema>

interface StorageSettingsProps {
  settings: Partial<StorageSettingsValues>
}

export function StorageSettings({ settings }: StorageSettingsProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<StorageSettingsValues>({
    resolver: zodResolver(storageSettingsSchema),
    defaultValues: {
      storageProvider: "local",
      maxFileSize: 100,
      ...settings,
    },
  })

  const provider = form.watch("storageProvider")

  function onSubmit(data: StorageSettingsValues) {
    startTransition(async () => {
      try {
        await updateStorageSettings(data)
        toast({
          title: "Settings updated",
          description: "Your storage settings have been updated.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update settings. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="storageProvider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Provider</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="local">Local Storage</SelectItem>
                  <SelectItem value="s3">Amazon S3</SelectItem>
                  <SelectItem value="cloudinary">Cloudinary</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose where to store uploaded files.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxFileSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max File Size (MB)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="100"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Maximum file size allowed for uploads in megabytes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {provider === "s3" && (
          <>
            <FormField
              control={form.control}
              name="accessKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key ID</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter access key ID"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secretAccessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Access Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter secret access key"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket Name</FormLabel>
                  <FormControl>
                    <Input placeholder="my-bucket" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="us-east-1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {provider === "cloudinary" && (
          <>
            <FormField
              control={form.control}
              name="accessKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cloud Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter cloud name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secretAccessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Secret</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter API secret"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
} 