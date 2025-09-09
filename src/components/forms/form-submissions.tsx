"use client"

import { useState } from "react"
import { Submission, User } from "@prisma/client"
import { FormField } from "@/lib/validations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Download, Eye, FileText, User as UserIcon } from "lucide-react"

interface FormSubmissionsProps {
  submissions: (Submission & {
    user: {
      name: string | null
      email: string
    }
  })[]
  formSchema: FormField[]
}

export function FormSubmissions({ submissions, formSchema }: FormSubmissionsProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<typeof submissions[0] | null>(null)

  const formatSubmissionData = (data: any) => {
    if (!data || typeof data !== 'object') return {}
    return data
  }

  const getFieldLabel = (fieldId: string) => {
    const field = formSchema.find(f => f.id === fieldId)
    return field?.label || fieldId
  }

  const exportToCSV = () => {
    if (!submissions.length || !formSchema.length) return

    // Create CSV headers
    const headers = ["Submission ID", "User", "Email", "Submitted At", ...formSchema.map(f => f.label)]
    
    // Create CSV rows
    const rows = submissions.map(submission => {
      const data = formatSubmissionData(submission.data)
      return [
        submission.id,
        submission.user.name || "N/A",
        submission.user.email,
        new Date(submission.createdAt).toLocaleString(),
        ...formSchema.map(field => data[field.id] || "")
      ]
    })

    // Convert to CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n")

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "form-submissions.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Submissions ({submissions.length})</CardTitle>
            <CardDescription>
              All form responses from users
            </CardDescription>
          </div>
          {submissions.length > 0 && (
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground">
              Submissions will appear here once users start filling out your form
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {submission.user.name || "Anonymous"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {submission.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(submission.createdAt).toLocaleDateString()} at{" "}
                          {new Date(submission.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {Object.entries(formatSubmissionData(submission.data)).slice(0, 2).map(([key, value]) => (
                          <div key={key}>
                            {getFieldLabel(key)}: {String(value)}
                          </div>
                        ))}
                        {Object.keys(formatSubmissionData(submission.data)).length > 2 && (
                          <div className="text-xs">...and more</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Submission Details</DialogTitle>
                            <DialogDescription>
                              Submitted by {submission.user.name || submission.user.email} on{" "}
                              {new Date(submission.createdAt).toLocaleDateString()}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {Object.entries(formatSubmissionData(submission.data)).map(([fieldId, value]) => (
                              <div key={fieldId} className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {getFieldLabel(fieldId)}
                                  </Badge>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="text-sm">
                                    {Array.isArray(value) ? value.join(", ") : String(value)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}