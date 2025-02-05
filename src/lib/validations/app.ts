import * as z from "zod"

export const appFormSchema = z.object({
  name: z.string().min(2, {
    message: "App name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  categoryId: z.string({
    required_error: "Please select a category.",
  }),
  subcategoryId: z.string({
    required_error: "Please select a subcategory.",
  }),
  website: z.string().url({
    message: "Please enter a valid URL.",
  }).optional().or(z.literal("")),
  tags: z.array(z.string()).min(1, {
    message: "Please add at least one tag.",
  }).max(5, {
    message: "You can only add up to 5 tags.",
  }),
  icon: z.object({
    url: z.string(),
    key: z.string(),
  }).optional(),
  screenshots: z.array(z.object({
    url: z.string(),
    key: z.string(),
  })).min(1, {
    message: "Please add at least one screenshot.",
  }).max(5, {
    message: "You can only add up to 5 screenshots.",
  }),
  version: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/, {
      message: "Version must be in semver format (e.g., 1.0.0)",
    }),
    changelog: z.string().min(10, {
      message: "Changelog must be at least 10 characters.",
    }),
    file: z.object({
      url: z.string(),
      key: z.string(),
      size: z.number(),
      sha256: z.string(),
    }),
    minOsVersion: z.string(),
  }),
})

export type AppFormValues = z.infer<typeof appFormSchema> 