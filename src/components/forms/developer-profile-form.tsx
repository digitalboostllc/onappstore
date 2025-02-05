"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import { Developer } from "@prisma/client"

const developerProfileSchema = z.object({
  companyName: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
})

type DeveloperProfileSchema = z.infer<typeof developerProfileSchema>

interface DeveloperProfileFormProps {
  developer: Developer & {
    user: {
      website: string | null
      bio: string | null
    }
  }
}

export function DeveloperProfileForm({ developer }: DeveloperProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<DeveloperProfileSchema>({
    resolver: zodResolver(developerProfileSchema),
    defaultValues: {
      companyName: developer.companyName || "",
      website: developer.user.website || "",
      bio: developer.user.bio || "",
    },
  })

  function onSubmit(data: DeveloperProfileSchema) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/developer/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error("Failed to update profile")
        }

        toast({
          title: "Success",
          description: "Your profile has been updated.",
        })

        router.refresh()
      } catch (error) {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Your company name" {...field} />
              </FormControl>
              <FormDescription>
                The name of your company or organization (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormDescription>
                Your company or personal website (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about yourself and your apps"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description about you or your company (max 500 characters)
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