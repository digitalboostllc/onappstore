"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface SyncFormProps {
  action: (formData: FormData) => Promise<void>
}

export function SyncForm({ action }: SyncFormProps) {
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()

  async function onSubmit(formData: FormData) {
    try {
      setIsPending(true)
      await action(formData)
      toast({
        title: "Sync completed",
        description: "Apps have been synchronized successfully.",
      })
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync apps",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form action={onSubmit}>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Syncing..." : "Sync Apps"}
      </Button>
    </form>
  )
} 