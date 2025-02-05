"use client"

import * as React from "react"
import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { updateAppSettings } from "@/app/admin/settings/actions"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

const appSettingsSchema = z.object({
  appName: z.string().min(1, {
    message: "App name is required.",
  }),
  appDescription: z.string().min(1, {
    message: "App description is required.",
  }),
})

type AppSettingsValues = z.infer<typeof appSettingsSchema>

interface AppSettingsProps {
  settings: AppSettingsValues
}

export function AppSettings({ settings }: AppSettingsProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<AppSettingsValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: settings,
  })

  function onSubmit(data: AppSettingsValues) {
    startTransition(async () => {
      try {
        await updateAppSettings(data)
        toast({
          title: "Settings updated",
          description: "Your application settings have been updated.",
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
          name="appName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>App Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter app name" {...field} />
              </FormControl>
              <FormDescription>
                This is the name that will be displayed throughout your application.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="appDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>App Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter app description"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This description will be used in meta tags and the homepage.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
} 