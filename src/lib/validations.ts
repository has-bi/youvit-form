import { z } from "zod";

export const roleSchema = z.enum(["USER", "ADMIN"]);

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: roleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = z.object({
  email: z.string().email().refine(
    (email) => email.endsWith("@youvit.co.id"),
    {
      message: "Email must be from @youvit.co.id domain",
    }
  ),
  name: z.string().min(1, "Name is required"),
  role: roleSchema.optional(),
});

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text",
    "textarea", 
    "select",
    "checkbox",
    "radio",
    "file",
    "date",
    "email",
    "number"
  ]),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
});

export const formSchemaSchema = z.object({
  fields: z.array(formFieldSchema).optional().default([]),
  settings: z.object({
    allowMultipleSubmissions: z.boolean().default(false),
    requireAuth: z.boolean().default(true),
    showProgressBar: z.boolean().default(false),
  }).optional(),
});

export const createFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  schema: formSchemaSchema,
  isActive: z.boolean().default(true),
});

export const submitFormSchema = z.object({
  formId: z.string(),
  data: z.record(z.string(), z.any()),
  files: z.array(z.object({
    success: z.boolean().optional(),
    url: z.string(),
    fileName: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
});

export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  fieldId: z.string(),
});

export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchema = z.infer<typeof formSchemaSchema>;
export type CreateFormInput = z.infer<typeof createFormSchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;