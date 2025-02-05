"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import * as z from "zod"

interface AppCommentFormProps {
  appId: string
  onSubmit: (values: { comment: string }) => void | Promise<void>
  placeholder?: string
  submitLabel?: string
  minLength?: number
  disabled?: boolean
}

export function AppCommentForm({ 
  appId, 
  onSubmit,
  placeholder = "Write a comment...",
  submitLabel = "Submit",
  minLength = 1,
  disabled = false,
}: AppCommentFormProps) {
  const formSchema = z.object({
    comment: z.string().min(minLength, {
      message: `Comment must be at least ${minLength} characters.`,
    }),
  })

  type FormData = z.infer<typeof formSchema>

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  })

  const handleSubmit = async (data: FormData) => {
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      console.error('Error submitting comment:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Comment</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={placeholder}
                      className="min-h-[100px] resize-none bg-background focus-visible:ring-primary/20 transition-colors hover:bg-muted/30"
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="bg-primary/90 hover:bg-primary transition-colors"
                disabled={disabled}
              >
                {submitLabel}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 