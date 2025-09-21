"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, CheckCircle, AlertCircle, Camera } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { getReadableErrorMessage } from "@/lib/utils"

// Form schema
const storeAuditSchema = z.object({
  audit_date: z.string().min(1, "Audit date is required"),
  employee_name: z.string().min(1, "Employee name is required"),
  store_location: z.string().min(1, "Store location is required"),
  before_image: z.string().url("Before image is required").optional().or(z.literal("")),
  after_image: z.string().url("After image is required").optional().or(z.literal("")),
  out_of_stock: z.array(z.string()).default([]),
  notes: z.string().max(200, "Notes must be 200 characters or fewer").optional(),
})

type StoreAuditFormData = z.infer<typeof storeAuditSchema>

interface Employee {
  id: string
  name: string
  position: string
  department: string
}

interface Store {
  id: string
  name: string
  location: string
  region: string
  manager: string
}

interface SimpleMerchandisingFormProps {
  onSuccess?: (data: any) => void
}

// Common out-of-stock items
const OUT_OF_STOCK_ITEMS = [
  "Product A - Vitamin C 1000mg",
  "Product B - Multivitamin",
  "Product C - Omega 3",
  "Product D - Probiotics",
  "Product E - Calcium + D3",
  "Product F - Iron Supplement", 
  "Product G - Magnesium",
  "Product H - Zinc",
  "Product I - B-Complex",
  "Product J - Vitamin D3"
]

export function SimpleMerchandisingForm({ onSuccess }: SimpleMerchandisingFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [beforeImageUploading, setBeforeImageUploading] = useState(false)
  const [afterImageUploading, setAfterImageUploading] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const form = useForm<StoreAuditFormData>({
    resolver: zodResolver(storeAuditSchema),
    defaultValues: {
      audit_date: new Date().toISOString().split('T')[0],
      employee_name: "",
      store_location: "",
      before_image: "",
      after_image: "",
      out_of_stock: [],
      notes: "",
    },
  })

  const notesValue = form.watch('notes') || ''

  // Fetch employees and stores data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/sheets-data')
        if (response.ok) {
          const data = await response.json()
          setEmployees(data.employees || [])
          setStores(data.stores || [])
        } else {
          console.error('Failed to fetch spreadsheet data')
          toast.error("Failed to load data")
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error("Error loading form")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Image upload function
  const uploadImage = async (file: File, fieldName: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fieldId', fieldName)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const result = await response.json()
    return result.url
  }

  // Handle image uploads
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'before_image' | 'after_image'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    const setUploading = fieldName === 'before_image' ? setBeforeImageUploading : setAfterImageUploading

    try {
      setUploading(true)
      const imageUrl = await uploadImage(file, fieldName)
      form.setValue(fieldName, imageUrl)
      toast.success("Image uploaded successfully")
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error("Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  // Handle out of stock items
  const handleOutOfStockChange = (item: string, checked: boolean) => {
    const currentItems = form.getValues('out_of_stock')
    if (checked) {
      form.setValue('out_of_stock', [...currentItems, item])
    } else {
      form.setValue('out_of_stock', currentItems.filter(i => i !== item))
    }
  }

  // Form submission
  const onSubmit = async (data: StoreAuditFormData) => {
    setSubmitting(true)
    setSubmissionError(null)
    form.clearErrors(["employee_name", "store_location"])

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: 'merchandising-day-vol-2',
          data: data,
        }),
      })

      if (!response.ok) {
        const errorMessage = await getReadableErrorMessage(
          response,
          "We couldn't submit the form. Please review the highlighted fields."
        )
        throw new Error(errorMessage)
      }

      const result = await response.json()
      toast.success("Form submitted successfully!")
      setSubmissionError(null)
      
      if (onSuccess) {
        onSuccess(result)
      }

      // Reset form
      form.reset()
    } catch (error) {
      console.error('Submission error:', error)
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't submit the form. Please review the highlighted fields."

      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes('employee')) {
        form.setError('employee_name', { type: 'manual', message })
      }

      if (lowerMessage.includes('store')) {
        form.setError('store_location', { type: 'manual', message })
      }

      setSubmissionError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
      {/* Background Characters */}
      <div className="absolute left-4 bottom-4 opacity-20 hidden lg:block">
        <Image 
          src="/images/velma 3d.png" 
          alt="" 
          width={120} 
          height={120}
          className="select-none pointer-events-none"
        />
      </div>
      <div className="absolute right-4 bottom-4 opacity-20 hidden lg:block">
        <Image 
          src="/images/tony 3d.png" 
          alt="" 
          width={120} 
          height={120}
          className="select-none pointer-events-none"
        />
      </div>

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <Card className="shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Merchandising Day Vol 2
            </CardTitle>
            <p className="text-gray-600">Complete your store audit</p>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {submissionError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submissionError}
              </div>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audit_date" className="font-medium">Audit Date</Label>
                  <Input
                    id="audit_date"
                    type="date"
                    {...form.register("audit_date")}
                    className="h-11"
                  />
                  {form.formState.errors.audit_date && (
                    <p className="text-red-500 text-sm">{form.formState.errors.audit_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee_name" className="font-medium">Employee Name</Label>
                  <Controller
                    name="employee_name"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.name}>
                              {employee.name} - {employee.position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.employee_name && (
                    <p className="text-red-500 text-sm">{form.formState.errors.employee_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_location" className="font-medium">Store Location</Label>
                <Controller
                  name="store_location"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={`${store.name} - ${store.location}`}>
                            {store.name} - {store.location} ({store.region})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.store_location && (
                  <p className="text-red-500 text-sm">{form.formState.errors.store_location.message}</p>
                )}
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Before Image</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
                    {form.watch('before_image') ? (
                      <div className="space-y-2">
                        <img 
                          src={form.watch('before_image')} 
                          alt="Before" 
                          className="w-full h-32 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue('before_image', '')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'before_image')}
                          className="hidden"
                          id="before_image_input"
                          disabled={beforeImageUploading}
                        />
                        <label
                          htmlFor="before_image_input"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          {beforeImageUploading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                          ) : (
                            <Camera className="w-8 h-8 text-gray-400 mb-2" />
                          )}
                          <span className="text-sm text-gray-600">
                            {beforeImageUploading ? 'Uploading...' : 'Upload before image'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">After Image</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-pink-400 transition-colors">
                    {form.watch('after_image') ? (
                      <div className="space-y-2">
                        <img 
                          src={form.watch('after_image')} 
                          alt="After" 
                          className="w-full h-32 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue('after_image', '')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'after_image')}
                          className="hidden"
                          id="after_image_input"
                          disabled={afterImageUploading}
                        />
                        <label
                          htmlFor="after_image_input"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          {afterImageUploading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                          ) : (
                            <Camera className="w-8 h-8 text-gray-400 mb-2" />
                          )}
                          <span className="text-sm text-gray-600">
                            {afterImageUploading ? 'Uploading...' : 'Upload after image'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Out of Stock Items */}
              <div className="space-y-3">
                <Label className="font-medium">Out of Stock Items</Label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {OUT_OF_STOCK_ITEMS.map((item) => (
                      <div key={item} className="flex items-center space-x-2">
                        <Checkbox
                          id={`stock_${item}`}
                          checked={form.watch('out_of_stock').includes(item)}
                          onCheckedChange={(checked) => handleOutOfStockChange(item, !!checked)}
                        />
                        <Label 
                          htmlFor={`stock_${item}`}
                          className="text-sm cursor-pointer"
                        >
                          {item}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-medium">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Any additional observations or comments..."
                  rows={4}
                  maxLength={200}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 text-right">
                  {notesValue.length}/200 characters
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-medium"
                disabled={submitting || beforeImageUploading || afterImageUploading}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submit Audit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
