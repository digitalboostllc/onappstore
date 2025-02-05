"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, Copy, Check } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useCallback, useState } from "react"
import { useToast } from "@/components/ui/use-toast"

const importFormSchema = z.object({
  source: z.enum(["macupdate", "torrentmac"]),
  noLimit: z.boolean().default(false),
  limit: z.coerce
    .number({
      required_error: "Import limit is required",
      invalid_type_error: "Import limit must be a number",
    })
    .int("Import limit must be a whole number")
    .positive("Import limit must be a positive number")
    .min(1, "Import limit must be at least 1")
    .max(1000, "Import limit cannot exceed 1000"),
})

const testImportSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
})

type ImportFormValues = z.infer<typeof importFormSchema>
type TestImportFormValues = z.infer<typeof testImportSchema>

export function ImportForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = React.useState(0)
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [isComplete, setIsComplete] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState("")
  const [testResult, setTestResult] = React.useState<any>(null)
  const [isTesting, setIsTesting] = React.useState(false)
  const pollInterval = React.useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const [copiedJobId, setCopiedJobId] = React.useState(false)
  const [copiedUrl, setCopiedUrl] = React.useState(false)

  React.useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [])

  const startPolling = useCallback(async (id: string) => {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes with 5-second intervals
    const interval = 5000 // 5 seconds

    // Set the jobId immediately when polling starts
    setJobId(id)

    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/admin/import?jobId=${id}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            const refreshResponse = await fetch('/api/auth/session')
            if (!refreshResponse.ok) {
              throw new Error("Session expired. Please log in again.")
            }
          } else {
            throw new Error("Failed to get job status")
          }
        }

        const job = await response.json()
        
        // Update progress and status message
        if (job.total > 0) {
          const progressPercent = Math.round((job.progress / job.total) * 100)
          setProgress(progressPercent)
          setStatusMessage(`Progress: ${job.progress}/${job.total} apps`)
        }
        
        if (job.status === "completed") {
          setIsLoading(false)
          setIsComplete(true)
          setProgress(100)
          setStatusMessage(`Successfully imported ${job.progress} apps`)
          toast({
            title: "Import completed",
            description: `Successfully imported ${job.progress} apps`,
          })
          return
        }
        
        if (job.status === "failed") {
          setIsLoading(false)
          setIsComplete(true)
          setStatusMessage(job.error || "Import failed")
          toast({
            title: "Import failed",
            description: job.error || "Unknown error occurred",
            variant: "destructive",
          })
          return
        }
        
        // Continue polling if still processing
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(checkProgress, interval)
        } else {
          setIsLoading(false)
          setStatusMessage("Import timed out")
          toast({
            title: "Import timed out",
            description: "The import process took too long. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Polling error:", error)
        // Don't stop polling on network errors, try again
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(checkProgress, interval)
        } else {
          setIsLoading(false)
          setStatusMessage("Error checking import status")
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to check import status",
            variant: "destructive",
          })
        }
      }
    }

    checkProgress()
  }, [toast])

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      source: "macupdate",
      noLimit: false,
      limit: 10,
    },
    mode: "onChange",
  })

  const watchNoLimit = form.watch("noLimit")
  const watchLimit = form.watch("limit")

  const testForm = useForm<TestImportFormValues>({
    resolver: zodResolver(testImportSchema),
    defaultValues: {
      url: "",
    },
  })

  const startImport = async () => {
    try {
      setIsLoading(true)
      setProgress(0) // Reset progress
      setIsComplete(false) // Reset completion status
      setStatusMessage("Starting import...") // Set initial status
      
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ 
          limit: watchLimit,
          importAll: watchNoLimit
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start import")
      }

      const { jobId } = await response.json()
      
      // Set jobId immediately after getting response
      setJobId(jobId)
      setStatusMessage("Import started. You can use this Job ID to track the import progress:")
      
      toast({
        title: "Import started",
        description: `Import started with Job ID: ${jobId}. The process will continue in the background.`,
      })
      
      startPolling(jobId)
    } catch (error) {
      setIsLoading(false)
      setStatusMessage("Import failed to start")
      setJobId(null) // Reset jobId on error
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start import",
        variant: "destructive",
      })
    }
  }

  async function onTestSubmit(data: TestImportFormValues) {
    setIsTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch("/api/admin/import/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: data.url }),
      })

      if (!response.ok) {
        throw new Error("Failed to test import")
      }

      const result = await response.json()
      setTestResult(result)
      
      toast({
        title: "Test successful",
        description: "App data has been fetched successfully.",
      })
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Failed to test import. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'jobId' | 'url') => {
    await navigator.clipboard.writeText(text)
    if (type === 'jobId') {
      setCopiedJobId(true)
      setTimeout(() => setCopiedJobId(false), 2000)
    } else {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(startImport)} className="space-y-6">
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="macupdate">MacUpdate.com</SelectItem>
                    <SelectItem value="torrentmac">TorrentMac.net</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the source website to import apps from.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="noLimit"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Import all apps</FormLabel>
                  <FormDescription>
                    Check this to import all available apps without a limit.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {!watchNoLimit && (
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Import Limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter a number between 1 and 1000"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty input for better UX
                        field.onChange(value === "" ? "" : parseInt(value, 10));
                      }}
                      disabled={isLoading}
                      min={1}
                      max={1000}
                      className={form.formState.errors.limit ? "border-red-500" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of apps to import (1-1000).
                  </FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
          )}

          {jobId && (
            <div className="mb-4 text-xs text-muted-foreground">
              <div className="bg-muted/50 rounded-md p-2 flex items-center gap-2">
                <span className="font-mono truncate">
                  {`${window.location.origin}/api/admin/import?jobId=${jobId}`}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`${window.location.origin}/api/admin/import?jobId=${jobId}`, 'url')}
                  className="shrink-0 hover:text-primary"
                >
                  {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {(isLoading || progress > 0) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">
                {statusMessage}
              </p>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full" onClick={startImport}>
            {isLoading ? (
              <>
                {isComplete ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isComplete ? "Import Complete" : "Importing..."}
              </>
            ) : (
              "Start Import"
            )}
          </Button>
        </form>
      </Form>

      <Separator />

      <div className="bg-muted/50 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Test Import</h2>
          <Badge variant="outline" className="text-xs">Testing Only</Badge>
        </div>
        <Form {...testForm}>
          <form onSubmit={testForm.handleSubmit(onTestSubmit)} className="space-y-6">
            <FormField
              control={testForm.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://www.macupdate.com/app/mac/..." 
                      {...field}
                      disabled={isTesting}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a MacUpdate or TorrentMac app URL to test the import without saving to database.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isTesting}>
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Import"
              )}
            </Button>
          </form>
        </Form>

        {testResult && (
          <Card className="mt-6 border-muted-foreground/20">
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {testResult.icon && (
                      <img 
                        src={testResult.icon} 
                        alt={testResult.name} 
                        className="w-16 h-16 rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="text-xl font-semibold">{testResult.name}</h3>
                      {testResult.version && (
                        <Badge variant="secondary">v{testResult.version}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Description</h4>
                    {testResult.description?.length > 200 ? (
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap font-mono">
                        {testResult.description}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">{testResult.description}</p>
                    )}
                  </div>

                  {testResult.requirements && (
                    <div className="space-y-2">
                      <h4 className="font-medium">System Requirements</h4>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap font-mono">
                        {testResult.requirements}
                      </pre>
                    </div>
                  )}

                  {testResult.otherRequirements && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Other Requirements</h4>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap font-mono">
                        {testResult.otherRequirements}
                      </pre>
                    </div>
                  )}

                  {testResult.screenshots?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Screenshots</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {testResult.screenshots.map((screenshot: string, i: number) => (
                          <img 
                            key={i}
                            src={screenshot}
                            alt={`Screenshot ${i + 1}`}
                            className="rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium">Raw Data</h4>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 