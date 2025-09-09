"use client"

import { useState } from "react"
import { FormField } from "@/lib/validations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, GripVertical, Edit3 } from "lucide-react"
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

interface FormFieldBuilderProps {
  fields: FormField[]
  onAddField: (field: FormField) => void
  onUpdateField: (index: number, field: FormField) => void
  onRemoveField: (index: number) => void
  onMoveField: (from: number, to: number) => void
}

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file", label: "File Upload" },
  { value: "date", label: "Date" },
] as const

export function FormFieldBuilder({
  fields,
  onAddField,
  onUpdateField,
  onRemoveField,
  onMoveField,
}: FormFieldBuilderProps) {
  const [editingField, setEditingField] = useState<number | null>(null)
  const [newField, setNewField] = useState<Partial<FormField>>({
    type: "text",
    label: "",
    placeholder: "",
    required: false,
  })

  // const handleDragEnd = (result: any) => {
  //   if (!result.destination) return
  //   onMoveField(result.source.index, result.destination.index)
  // }

  const handleAddField = () => {
    if (!newField.label) return
    
    const field: FormField = {
      id: `field_${Date.now()}`,
      type: newField.type as FormField["type"],
      label: newField.label,
      placeholder: newField.placeholder || "",
      required: newField.required || false,
      options: newField.type === "select" || newField.type === "radio" ? newField.options : undefined,
    }
    
    onAddField(field)
    setNewField({
      type: "text",
      label: "",
      placeholder: "",
      required: false,
    })
  }

  const handleUpdateField = (index: number, updates: Partial<FormField>) => {
    const existingField = fields[index]
    const updatedField = { ...existingField, ...updates }
    onUpdateField(index, updatedField)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add new field */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Field</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select
              value={newField.type}
              onValueChange={(value) => setNewField(prev => ({ ...prev, type: value as FormField["type"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Label *</Label>
            <Input
              value={newField.label}
              onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Field label..."
            />
          </div>

          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={newField.placeholder}
              onChange={(e) => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
              placeholder="Placeholder text..."
            />
          </div>

          {(newField.type === "select" || newField.type === "radio") && (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <Textarea
                value={newField.options?.join("\n") || ""}
                onChange={(e) => setNewField(prev => ({ 
                  ...prev, 
                  options: e.target.value.split("\n").filter(Boolean) 
                }))}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              checked={newField.required}
              onCheckedChange={(checked) => setNewField(prev => ({ ...prev, required: checked }))}
            />
            <Label>Required field</Label>
          </div>

          <Button onClick={handleAddField} disabled={!newField.label} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </CardContent>
      </Card>

      {/* Existing fields */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Form Fields ({fields.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No fields added yet. Use the panel on the left to add your first field.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{field.label}</span>
                            <Badge variant="secondary">{field.type}</Badge>
                            {field.required && <Badge variant="destructive">Required</Badge>}
                          </div>
                          {field.placeholder && (
                            <p className="text-sm text-muted-foreground">
                              Placeholder: {field.placeholder}
                            </p>
                          )}
                          {field.options && field.options.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Options: {field.options.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(editingField === index ? null : index)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveField(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick edit inline */}
                    {editingField === index && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => handleUpdateField(index, { required: checked })}
                          />
                          <Label className="text-xs">Required</Label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}