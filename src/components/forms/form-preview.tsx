"use client"

import { FormField } from "@/lib/validations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"

interface FormPreviewProps {
  title: string
  description?: string
  fields: FormField[]
}

export function FormPreview({ title, description, fields }: FormPreviewProps) {
  const renderField = (field: FormField) => {
    const fieldId = `preview-${field.id}`

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={fieldId} className="flex items-center gap-2">
          {field.label}
          {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
        </Label>

        {field.type === "text" && (
          <Input
            id={fieldId}
            placeholder={field.placeholder}
            disabled
          />
        )}

        {field.type === "textarea" && (
          <Textarea
            id={fieldId}
            placeholder={field.placeholder}
            disabled
            rows={3}
          />
        )}

        {field.type === "email" && (
          <Input
            id={fieldId}
            type="email"
            placeholder={field.placeholder || "Enter your email..."}
            disabled
          />
        )}

        {field.type === "number" && (
          <Input
            id={fieldId}
            type="number"
            placeholder={field.placeholder}
            disabled
          />
        )}

        {field.type === "date" && (
          <Input
            id={fieldId}
            type="date"
            disabled
          />
        )}

        {field.type === "select" && (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === "radio" && field.options && (
          <RadioGroup disabled>
            {field.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldId}-${index}`} />
                <Label htmlFor={`${fieldId}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {field.type === "checkbox" && (
          <div className="flex items-center space-x-2">
            <Checkbox id={fieldId} disabled />
            <Label htmlFor={fieldId}>
              {field.placeholder || field.label}
            </Label>
          </div>
        )}

        {field.type === "file" && (
          <Input
            id={fieldId}
            type="file"
            disabled
          />
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{title || "Untitled Form"}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
          <div className="text-sm text-muted-foreground">
            This is a preview of your form. Form submissions are disabled in preview mode.
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fields added yet. Use the Builder tab to add form fields.
            </div>
          ) : (
            <>
              {fields.map(renderField)}
              <Button disabled className="w-full">
                Submit Form (Preview Mode)
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}