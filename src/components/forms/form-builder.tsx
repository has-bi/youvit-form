"use client"

import { useState } from "react"
import { Form } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { FormFieldBuilder } from "./form-field-builder"
import { FormPreview } from "./form-preview"
import { FormField } from "@/lib/validations"
import { toast } from "sonner"
import { Save, Eye, Settings } from "lucide-react"

interface FormBuilderProps {
  form: Form & {
    createdBy: {
      name: string | null
      email: string
    } | null
  }
}

export function FormBuilder({ form }: FormBuilderProps) {
  const [formData, setFormData] = useState({
    title: form.title,
    description: form.description || "",
    isActive: form.isActive,
  })
  
  const [formSchema, setFormSchema] = useState(() => {
    try {
      return form.schema as { fields: FormField[] }
    } catch {
      return { fields: [] }
    }
  })
  
  const [activeTab, setActiveTab] = useState<"builder" | "preview" | "settings">("builder")
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveForm = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          isActive: formData.isActive,
          schema: formSchema,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save form")
      }

      toast.success("Form saved successfully!")
    } catch (error) {
      toast.error("Failed to save form")
      console.error("Form save error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addField = (field: FormField) => {
    setFormSchema(prev => ({
      ...prev,
      fields: [...prev.fields, field]
    }))
  }

  const updateField = (index: number, field: FormField) => {
    setFormSchema(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? field : f)
    }))
  }

  const removeField = (index: number) => {
    setFormSchema(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }))
  }

  const moveField = (from: number, to: number) => {
    setFormSchema(prev => {
      const newFields = [...prev.fields]
      const [movedField] = newFields.splice(from, 1)
      newFields.splice(to, 0, movedField)
      return { ...prev, fields: newFields }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs and save button */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1">
          <Button
            variant={activeTab === "builder" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("builder")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Builder
          </Button>
          <Button
            variant={activeTab === "preview" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
        
        <Button onClick={handleSaveForm} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save Form"}
        </Button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "builder" && (
        <FormFieldBuilder
          fields={formSchema.fields}
          onAddField={addField}
          onUpdateField={updateField}
          onRemoveField={removeField}
          onMoveField={moveField}
        />
      )}

      {activeTab === "preview" && (
        <FormPreview
          title={formData.title}
          description={formData.description}
          fields={formSchema.fields}
        />
      )}

      {activeTab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
            <CardDescription>
              Configure your form's basic information and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="form-title">Form Title</Label>
              <Input
                id="form-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter form title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-description">Description</Label>
              <Textarea
                id="form-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description for your form..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="form-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="form-active">Form is active (accepting submissions)</Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}