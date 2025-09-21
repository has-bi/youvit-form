"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { FormField } from "@/lib/validations"
import { getReadableErrorMessage } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CheckCircle, Loader2 } from "lucide-react"

interface PublicFormRendererProps {
  form: {
    id: string
    title: string
    description: string | null
    schema: any
  }
}

export function PublicFormRenderer({ form }: PublicFormRendererProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, any>>({})
  const [sheetsData, setSheetsData] = useState<{employees: any[], stores: any[]}>({employees: [], stores: []})
  const [isLoadingSheetsData, setIsLoadingSheetsData] = useState(true)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  
  const formSchema = form.schema as { fields: FormField[], headerImage?: string }
  const fields = formSchema?.fields || []
  const headerImage = formSchema?.headerImage

  // Create dynamic validation schema based on form fields
  const validationSchema = z.object(
    fields.reduce((acc, field) => {
      let fieldSchema: z.ZodTypeAny = z.string()

      // Handle different field types
      if (field.type === "email") {
        fieldSchema = z.string().email("Please enter a valid email address")
      } else if (field.type === "number") {
        fieldSchema = z.coerce.number()
      } else if (field.type === "checkbox") {
        if ((field as any).multiple) {
          fieldSchema = z.array(z.string()).default([])
        } else {
          fieldSchema = z.boolean()
        }
      }

      // Handle required fields
      if (field.required) {
        if (field.type === "checkbox") {
          if ((field as any).multiple) {
            fieldSchema = (fieldSchema as z.ZodArray<any>).min(1, "At least one option must be selected")
          } else {
            fieldSchema = (fieldSchema as z.ZodBoolean).refine(
              (val) => val === true,
              { message: "This field is required" }
            )
          }
        } else {
          fieldSchema = (fieldSchema as z.ZodString).min(1, "This field is required")
        }
      } else {
        fieldSchema = fieldSchema.optional()
      }

      acc[field.id] = fieldSchema
      return acc
    }, {} as Record<string, z.ZodTypeAny>)
  )

  const formMethods = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: fields.reduce((acc, field) => {
      if (field.type === "checkbox") {
        acc[field.id] = (field as any).multiple ? [] : false
      } else {
        acc[field.id] = ""
      }
      return acc
    }, {} as Record<string, any>),
  })

  // Fetch sheets data on component mount
  useEffect(() => {
    async function fetchSheetsData() {
      try {
        const response = await fetch('/api/sheets-data')
        if (response.ok) {
          const data = await response.json()
          setSheetsData(data)
        }
      } catch (error) {
        console.error('Failed to fetch sheets data:', error)
      } finally {
        setIsLoadingSheetsData(false)
      }
    }

    fetchSheetsData()
  }, [])

  const handleFileUpload = async (file: File, fieldId: string) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fieldId', fieldId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      setUploadedFiles(prev => ({
        ...prev,
        [fieldId]: result
      }))
      
      return result.url
    } catch (error) {
      console.error('File upload error:', error)
      toast.error('File upload failed')
      return null
    }
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    setSubmissionError(null)
    formMethods.clearErrors()
    
    try {
      // Add uploaded files to form data
      const finalData = {
        ...data,
        ...uploadedFiles
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: form.id,
          data: finalData,
          files: Object.values(uploadedFiles),
        }),
      })

      if (!response.ok) {
        const errorMessage = await getReadableErrorMessage(
          response,
          "We couldn't submit the form. Please check your answers and try again."
        )
        throw new Error(errorMessage)
      }

      setIsSubmitted(true)
      setSubmissionError(null)
      toast.success("Form submitted successfully!")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't submit the form. Please try again."

      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes("employee")) {
        formMethods.setError("employee_name" as any, {
          type: "manual",
          message,
        })
      }

      if (lowerMessage.includes("store")) {
        formMethods.setError("store_location" as any, {
          type: "manual",
          message,
        })
      }

      setSubmissionError(message)
      toast.error(message)
      console.error("Form submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const fieldError = formMethods.formState.errors[field.id]

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className="block text-sm font-medium text-gray-900 mb-2">
          {field.label}{field.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </Label>

        {field.type === "text" && (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            {...formMethods.register(field.id)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg h-11 px-3 text-gray-900 placeholder-gray-500 transition-colors"
          />
        )}

        {field.type === "textarea" && (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            {...formMethods.register(field.id)}
            disabled={isSubmitting}
            rows={4}
            className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg p-3 text-gray-900 placeholder-gray-500 resize-none transition-colors"
          />
        )}

        {field.type === "email" && (
          <Input
            id={field.id}
            type="email"
            placeholder={field.placeholder || "Enter your email..."}
            {...formMethods.register(field.id)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg h-11 px-3 text-gray-900 placeholder-gray-500 transition-colors"
          />
        )}

        {field.type === "number" && (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            {...formMethods.register(field.id)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg h-11 px-3 text-gray-900 placeholder-gray-500 transition-colors"
          />
        )}

        {field.type === "date" && (
          <Input
            id={field.id}
            type="date"
            {...formMethods.register(field.id)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg h-11 px-3 text-gray-900 transition-colors"
          />
        )}

        {field.type === "select" && (
          <Select
            disabled={isSubmitting || isLoadingSheetsData}
            onValueChange={(value) => formMethods.setValue(field.id, value)}
          >
            <SelectTrigger className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg h-11 px-3 transition-colors">
              <SelectValue placeholder={
                isLoadingSheetsData ? "Loading..." : 
                field.placeholder || "Select an option..."
              } />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              {(() => {
                // Dynamic options based on field ID
                if (field.id === 'employee_name') {
                  return sheetsData.employees.map((employee) => (
                    <SelectItem 
                      key={employee.id} 
                      value={employee.name}
                      className="hover:bg-gray-50 focus:bg-gray-50 text-gray-900"
                    >
                      {employee.name}
                    </SelectItem>
                  ))
                } else if (field.id === 'store_location') {
                  return sheetsData.stores.map((store) => (
                    <SelectItem 
                      key={store.id} 
                      value={store.name}
                      className="hover:bg-gray-50 focus:bg-gray-50 text-gray-900"
                    >
                      {store.name}
                    </SelectItem>
                  ))
                } else if (field.options) {
                  // Fallback to static options
                  return field.options.map((option, index) => (
                    <SelectItem 
                      key={index} 
                      value={option}
                      className="hover:bg-gray-50 focus:bg-gray-50 text-gray-900"
                    >
                      {option}
                    </SelectItem>
                  ))
                }
                return []
              })()}
            </SelectContent>
          </Select>
        )}

        {field.type === "radio" && field.options && (
          <RadioGroup
            disabled={isSubmitting}
            onValueChange={(value) => formMethods.setValue(field.id, value)}
            className="space-y-3"
          >
            {field.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} className="focus:ring-2 focus:ring-blue-500" />
                <Label htmlFor={`${field.id}-${index}`} className="text-sm text-gray-700 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {field.type === "checkbox" && !(field as any).multiple && !(field as any).options && (
          <div className="flex items-center space-x-3">
            <Checkbox
              id={field.id}
              disabled={isSubmitting}
              checked={formMethods.watch(field.id)}
              onCheckedChange={(checked) => formMethods.setValue(field.id, checked)}
              className="focus:ring-2 focus:ring-blue-500"
            />
            <Label htmlFor={field.id} className="text-sm text-gray-700 cursor-pointer">
              {field.placeholder || field.label}
            </Label>
          </div>
        )}

        {field.type === "file" && (
          <div className="space-y-2">
            <div className="relative">
              <Input
                id={field.id}
                type="file"
                accept={(field as any).accept || "image/*"}
                disabled={isSubmitting}
                className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg h-11 px-3 transition-colors cursor-pointer file:h-7 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-500 file:text-white file:text-sm file:font-medium hover:file:bg-blue-600 file:cursor-pointer file:transition-colors"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    toast.info('Uploading file...')
                    const url = await handleFileUpload(file, field.id)
                    if (url) {
                      formMethods.setValue(field.id, url)
                      toast.success('File uploaded successfully!')
                    }
                  }
                }}
              />
            </div>
            {uploadedFiles[field.id] && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  {uploadedFiles[field.id].fileName}
                </span>
              </div>
            )}
          </div>
        )}

        {field.type === "checkbox" && (field as any).multiple && (field as any).options && (
          <div className="space-y-3">
            {(field as any).options.map((option: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <Checkbox
                  id={`${field.id}-${index}`}
                  disabled={isSubmitting}
                  className="mt-0.5 focus:ring-2 focus:ring-blue-500"
                  checked={(formMethods.watch(field.id) || []).includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = formMethods.watch(field.id)
                    const validCurrentValues = Array.isArray(currentValues) ? currentValues : []
                    let newValues
                    if (checked) {
                      newValues = [...validCurrentValues, option.value]
                    } else {
                      newValues = validCurrentValues.filter((v: string) => v !== option.value)
                    }
                    formMethods.setValue(field.id, newValues)
                  }}
                />
                <div className="flex-1">
                  <Label htmlFor={`${field.id}-${index}`} className="font-medium text-gray-900 cursor-pointer leading-tight">
                    {option.label}
                  </Label>
                  {option.placeholder && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {option.placeholder}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {fieldError && (
          <p className="text-sm text-red-600 mt-1">
            {fieldError.message?.toString()}
          </p>
        )}
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border border-gray-200 shadow-lg bg-white">
            <CardContent className="text-center p-10">
              <div className="mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <div className="w-12 h-1 bg-green-500 mx-auto rounded-full"></div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                Submission Successful!
              </h2>
              
              <p className="text-gray-600 mb-6 leading-relaxed text-base">
                Your <strong>{form.title}</strong> has been submitted successfully and saved to our system.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Data Saved Successfully</span>
                </div>
                <div className="text-xs text-green-600 space-y-1">
                  <p>✓ Form data saved successfully</p>
                  <p>✓ Files uploaded to cloud storage</p>
                  <p>✓ Data recorded for processing</p>
                </div>
              </div>


              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-500 mb-2">Submission Details</p>
                <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 space-y-1">
                  <p>Form ID: {form.id.slice(-8).toUpperCase()}</p>
                  <p>Submitted: {new Date().toLocaleString('en-US', { 
                    timeZone: 'Asia/Jakarta',
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}</p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Submit Another Response
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="px-6 pt-8 pb-6">
            {headerImage && (
              <div className="flex justify-center mb-8">
                <img
                  src={headerImage}
                  alt="Form Header"
                  className="h-12 object-contain"
                />
              </div>
            )}
            <CardTitle className="text-2xl font-medium text-gray-900 text-center leading-tight">
              {form.title}
            </CardTitle>
            {form.description && (
              <CardDescription className="text-gray-600 text-center mt-3 text-base leading-relaxed">
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="px-6 pb-8">
            {submissionError && (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submissionError}
              </div>
            )}
            <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-5">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              This form has no fields configured.
            </div>
          ) : (
            <>
              {fields.map(renderField)}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 text-base font-medium bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </>
          )}
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
